<template>
  <view class="page">
    <view class="date-card">
      <picker class="date-picker" mode="date" :value="form.date" :end="todayKey" @change="changeDate">
        <view class="date-content">
          <text class="date-label">日记日期</text>
          <text class="date-value">{{ formatDate(form.date) }}</text>
          <text class="date-hint">点击选择日期，默认今天</text>
        </view>
      </picker>
      <button v-if="form.date !== todayKey" class="today-button" @click="pickToday">今天</button>
    </view>

    <view v-if="draftStatus" class="draft-tip">
      <text>{{ draftStatus }}</text>
      <text class="draft-clear" @click="clearDraft">清除草稿</text>
    </view>

    <view class="panel">
      <text class="label">心情</text>
      <view class="option-grid">
        <view
          v-for="mood in MOODS"
          :key="mood.id"
          class="option"
          :class="{ active: form.moodId === mood.id }"
          @click="form.moodId = mood.id"
        >
          <text class="option-icon">{{ mood.emoji }}</text>
          <text class="option-text">{{ mood.label }}</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <text class="label">天气</text>
      <view class="weather-row">
        <view
          v-for="weather in WEATHERS"
          :key="weather.id"
          class="weather"
          :class="{ active: form.weatherId === weather.id }"
          @click="form.weatherId = weather.id"
        >
          <text>{{ weather.icon }}</text>
          <text>{{ weather.label }}</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <textarea
        v-model="form.content"
        class="textarea"
        maxlength="-1"
        :placeholder="textareaPlaceholder"
        auto-height
      />
    </view>

    <view class="panel">
      <view class="panel-head">
        <text class="label">图片</text>
        <text class="add-link" @click="chooseImages">添加</text>
      </view>
      <view v-if="form.images.length" class="images">
        <view v-for="(img, index) in form.images" :key="img" class="image-wrap">
          <image :src="normalizeAssetUrl(img)" mode="aspectFill" class="image" @click="previewImage(index)" />
          <text class="remove" @click.stop="removeImage(index)">×</text>
        </view>
      </view>
      <text v-else class="muted">可以放几张今日碎片。</text>
    </view>

    <view class="panel">
      <text class="label">常用标签</text>
      <view class="tag-grid">
        <text
          v-for="tag in selectableTags"
          :key="tag"
          class="tag-chip"
          :class="{ active: selectedTags.includes(tag) }"
          @click="toggleTag(tag)"
        >
          #{{ tag }}
        </text>
      </view>
      <input v-model="tagText" class="input" placeholder="自定义标签，用逗号分隔" />
    </view>

    <view class="private-row">
      <view>
        <text class="private-title">私密隐藏</text>
        <text class="private-text">开启后不在首页和统计里展示</text>
      </view>
      <switch :checked="form.hidden" color="#6F95BF" @change="form.hidden = $event.detail.value" />
    </view>

    <view class="actions">
      <button v-if="form.id" class="delete" @click="removeDiary">删除</button>
      <button class="save" @click="submit">保存</button>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { MOODS, WEATHERS } from '@/utils/constants'
import { formatDate, isFutureDate, toDateKey } from '@/utils/date'
import { deleteDiary, getAllDiaries, getDiary, saveDiary } from '@/utils/storage'
import { requireUnlock } from '@/utils/locker'
import { normalizeAssetUrl, uploadImage } from '@/utils/api'
import { STORAGE_KEYS } from '@/utils/constants'
import { getManagedTags } from '@/utils/tags'

const form = reactive({
  id: '',
  moodId: 'calm',
  weatherId: 'sunny',
  content: '',
  images: [],
  tags: [],
  hidden: false,
  date: toDateKey()
})

const tagText = ref('')
const selectedTags = ref([])
const managedTags = ref([])
const draftStatus = ref('')
const draftKey = ref('')
const draftReady = ref(false)
const shouldSaveDraft = ref(true)
let draftTimer = null

const selectableTags = computed(() => {
  const all = [...managedTags.value, ...form.tags]
  return Array.from(new Set(all.filter(Boolean)))
})

const todayKey = toDateKey()

const textareaPlaceholder = computed(() => (
  form.date === todayKey ? '把今天放在这里...' : '把这一天放在这里...'
))

function refreshManagedTags() {
  managedTags.value = getManagedTags(getAllDiaries())
}

function currentDraftKey(id = form.id, date = form.date) {
  return `${STORAGE_KEYS.DRAFT_PREFIX}${id || `new_${date}`}`
}

function snapshot() {
  return {
    ...form,
    tags: composeTags(),
    tagText: tagText.value,
    selectedTags: selectedTags.value,
    savedAt: new Date().toISOString()
  }
}

function applyDraft(draft) {
  if (!draft) return
  fill({
    ...draft,
    id: draft.id || form.id,
    date: draft.date || form.date
  })
  tagText.value = draft.tagText || ''
  selectedTags.value = Array.isArray(draft.selectedTags) ? draft.selectedTags : selectedTags.value
  draftStatus.value = '已恢复未保存草稿'
}

function saveDraftNow() {
  if (!draftReady.value || !shouldSaveDraft.value) return
  const data = snapshot()
  const hasContent = data.content || data.images.length || data.tags.length
  if (!hasContent) return
  uni.setStorageSync(draftKey.value, data)
  draftStatus.value = '草稿已自动保存'
}

function scheduleDraft() {
  if (!draftReady.value) return
  clearTimeout(draftTimer)
  draftTimer = setTimeout(saveDraftNow, 500)
}

function clearDraft() {
  uni.removeStorageSync(draftKey.value)
  draftStatus.value = ''
}

function fill(entry) {
  form.id = entry.id || ''
  form.moodId = entry.moodId || 'calm'
  form.weatherId = entry.weatherId || 'sunny'
  form.content = entry.content || ''
  form.images = Array.isArray(entry.images) ? entry.images : []
  form.tags = Array.isArray(entry.tags) ? entry.tags : []
  form.hidden = !!entry.hidden
  form.date = entry.date || toDateKey()
  const baseTags = new Set(getManagedTags(getAllDiaries()))
  selectedTags.value = form.tags.filter(tag => baseTags.has(tag))
  tagText.value = form.tags.filter(tag => !baseTags.has(tag)).join(',')
}

function updateDraftKeyForDate(date) {
  if (form.id) return
  const nextKey = currentDraftKey('', date)
  if (draftKey.value && draftKey.value !== nextKey) {
    uni.removeStorageSync(draftKey.value)
  }
  draftKey.value = nextKey
}

function setDiaryDate(date) {
  if (!date) return
  if (isFutureDate(date)) {
    uni.showToast({ title: '未来日期不能补记', icon: 'none' })
    return
  }
  form.date = date
  updateDraftKeyForDate(date)
}

function changeDate(event) {
  setDiaryDate(event.detail.value)
}

function pickToday() {
  setDiaryDate(todayKey)
}

function composeTags() {
  const customTags = tagText.value
    .split(/[,，\s]/)
    .map(item => item.trim())
    .filter(Boolean)
  return Array.from(new Set([...selectedTags.value, ...customTags]))
}

function toggleTag(tag) {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter(item => item !== tag)
  } else {
    selectedTags.value = selectedTags.value.concat(tag)
  }
}

function chooseImages() {
  uni.chooseImage({
    count: 9,
    sizeType: ['compressed'],
    async success(result) {
      const paths = result.tempFilePaths || []
      if (!paths.length) return

      uni.showLoading({ title: '上传图片...' })
      try {
        const urls = []
        for (const filePath of paths) {
          urls.push(await uploadImage(filePath))
        }
        form.images = form.images.concat(urls)
        uni.hideLoading()
        uni.showToast({ title: '图片已上传', icon: 'success' })
      } catch (error) {
        uni.hideLoading()
        uni.showToast({ title: error.message || '图片上传失败', icon: 'none' })
      }
    }
  })
}

function previewImage(index) {
  const urls = form.images.map(normalizeAssetUrl)
  uni.previewImage({
    current: urls[index],
    urls
  })
}

function removeImage(index) {
  form.images.splice(index, 1)
}

async function submit() {
  if (isFutureDate(form.date)) {
    uni.showToast({ title: '未来日期不能补记', icon: 'none' })
    return
  }
  uni.showLoading({ title: '保存到数据库...' })
  try {
    const saved = await saveDiary({
      ...form,
      tags: composeTags()
    })
    shouldSaveDraft.value = false
    clearDraft()
    uni.hideLoading()
    uni.showToast({ title: '已保存到数据库', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/detail/index?id=${saved.id}` })
    }, 350)
  } catch (error) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}

function removeDiary() {
  uni.showModal({
    title: '删除这篇日记？',
    content: '删除后无法从本地恢复。',
    confirmColor: '#D45D66',
    success(result) {
      if (!result.confirm) return
      uni.showLoading({ title: '正在删除...' })
      deleteDiary(form.id)
        .then(() => {
          shouldSaveDraft.value = false
          clearDraft()
          uni.hideLoading()
          uni.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 450)
        })
        .catch(error => {
          uni.hideLoading()
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        })
    }
  })
}

onLoad(query => {
  refreshManagedTags()
  if (query.date) {
    if (isFutureDate(query.date)) {
      form.date = toDateKey()
      uni.showToast({ title: '未来日期不能补记，已回到今天', icon: 'none' })
    } else {
      form.date = query.date
    }
  }
  if (query.id) {
    const entry = getDiary(query.id)
    if (entry) fill(entry)
  }

  draftKey.value = currentDraftKey()
  const draft = uni.getStorageSync(draftKey.value)
  if (draft) {
    uni.showModal({
      title: '发现未保存草稿',
      content: '是否恢复上次未保存的内容？',
      confirmText: '恢复',
      cancelText: '忽略',
      success(result) {
        if (result.confirm) applyDraft(draft)
        else uni.removeStorageSync(draftKey.value)
        draftReady.value = true
      }
    })
  } else {
    draftReady.value = true
  }
})

onShow(async () => {
  await requireUnlock()
  refreshManagedTags()
})

onUnload(() => {
  saveDraftNow()
})

watch(
  () => [form.moodId, form.weatherId, form.content, form.images, form.hidden, form.date, tagText.value, selectedTags.value],
  scheduleDraft,
  { deep: true }
)
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 28rpx 30rpx 150rpx;
  box-sizing: border-box;
}

.date-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 20rpx;
  padding: 24rpx 26rpx;
  border-radius: $moo-radius;
  color: $moo-text;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.date-picker {
  min-width: 0;
  flex: 1;
}

.date-content {
  min-width: 0;
}

.date-label,
.date-value,
.date-hint {
  display: block;
}

.date-label {
  color: $moo-muted;
  font-size: 22rpx;
  font-weight: 600;
}

.date-value {
  margin-top: 8rpx;
  color: $moo-text;
  font-size: 34rpx;
  font-weight: 800;
}

.date-hint {
  margin-top: 8rpx;
  color: $moo-muted;
  font-size: 23rpx;
  font-weight: 400;
}

.today-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 110rpx;
  height: 62rpx;
  border-radius: 999px;
  color: $moo-primary;
  background: $moo-primary-light;
  font-size: 24rpx;
  font-weight: 700;
}

.draft-tip {
  display: flex;
  justify-content: space-between;
  margin-bottom: 18rpx;
  padding: 16rpx 22rpx;
  border-radius: 14px;
  color: $moo-primary;
  background: $moo-primary-light;
  font-size: 23rpx;
}

.draft-clear {
  color: #d45d66;
}

.panel {
  margin-bottom: 20rpx;
  padding: 26rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  display: block;
  margin-bottom: 20rpx;
  color: $moo-text;
  font-size: 28rpx;
  font-weight: 700;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12rpx;
}

.option {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  height: 118rpx;
  border-radius: 16px;
  background: $moo-bg;
}

.option.active {
  background: $moo-primary-light;
  box-shadow: inset 0 0 0 2rpx $moo-primary;
}

.option-icon {
  font-size: 42rpx;
}

.option-text {
  margin-top: 8rpx;
  color: $moo-text;
  font-size: 22rpx;
}

.weather-row {
  display: flex;
  gap: 12rpx;
}

.weather {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  flex-direction: column;
  height: 92rpx;
  border-radius: 15px;
  color: $moo-muted;
  background: $moo-bg;
  font-size: 23rpx;
}

.weather.active {
  color: $moo-text;
  background: $moo-yellow;
}

.textarea {
  width: 100%;
  min-height: 260rpx;
  color: $moo-text;
  font-size: 30rpx;
  line-height: 1.8;
}

.add-link {
  color: $moo-primary;
  font-size: 25rpx;
}

.muted {
  color: $moo-muted;
  font-size: 25rpx;
}

.images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.image-wrap {
  position: relative;
  height: 200rpx;
}

.image {
  width: 100%;
  height: 100%;
  border-radius: 14rpx;
  background: $moo-soft;
}

.remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.45);
  text-align: center;
  line-height: 34rpx;
  font-size: 30rpx;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.tag-chip {
  padding: 10rpx 18rpx;
  border-radius: 999px;
  color: $moo-primary;
  background: $moo-primary-light;
  font-size: 23rpx;
}

.tag-chip.active {
  color: #ffffff;
  background: $moo-primary;
}

.input {
  height: 78rpx;
  color: $moo-text;
  font-size: 27rpx;
}

.private-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  padding: 24rpx 26rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.private-title,
.private-text {
  display: block;
}

.private-title {
  color: $moo-text;
  font-size: 28rpx;
  font-weight: 700;
}

.private-text {
  margin-top: 8rpx;
  color: $moo-muted;
  font-size: 23rpx;
}

.actions {
  display: flex;
  gap: 18rpx;
}

.save,
.delete {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 94rpx;
  border-radius: 999px;
  font-size: 29rpx;
  font-weight: 700;
}

.save {
  flex: 1;
  color: #ffffff;
  background: $moo-primary;
}

.delete {
  width: 190rpx;
  color: #d45d66;
  background: $moo-pink;
}
</style>
