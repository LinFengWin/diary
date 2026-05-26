<template>
  <view class="page">
    <view class="head">
      <text class="title">图片相册</text>
      <text class="sub">{{ photos.length }} 张日记图片</text>
    </view>

    <view v-if="groups.length" class="timeline">
      <view v-for="group in groups" :key="group.key" class="month-group">
        <view class="month-head">
          <text>{{ group.label }}</text>
          <text>{{ group.items.length }} 张</text>
        </view>
        <view class="grid">
          <view v-for="photo in group.items" :key="photo.src" class="photo-card">
            <image :src="photo.src" mode="aspectFill" class="photo" @click="preview(photo.index)" />
            <view class="photo-info" @click="openDiary(photo.diaryId)">
              <text>{{ formatDate(photo.date) }}</text>
              <text>{{ getMood(photo.moodId).emoji }} {{ getMood(photo.moodId).label }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <MooEmptyArt />
      <text class="empty-title">还没有日记图片</text>
      <text class="empty-text">写日记时加几张照片，这里会自动按月份整理。</text>
      <button class="empty-action" @click="goEditor">去写一篇</button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMood } from '@/utils/constants'
import { formatDate } from '@/utils/date'
import { getDiaries } from '@/utils/storage'
import { requireUnlock } from '@/utils/locker'
import MooEmptyArt from '@/components/MooEmptyArt.vue'

const photos = ref([])

const groups = computed(() => {
  const map = new Map()
  photos.value.forEach((photo, index) => {
    const key = String(photo.date || '').slice(0, 7) || 'unknown'
    const label = key === 'unknown' ? '未记录日期' : `${key.replace('-', ' 年 ')} 月`
    if (!map.has(key)) map.set(key, { key, label, items: [] })
    map.get(key).items.push({ ...photo, index })
  })
  return Array.from(map.values())
})

function refresh() {
  photos.value = getDiaries()
    .flatMap(diary => (diary.images || []).map(src => ({
      src,
      diaryId: diary.id,
      date: diary.date,
      moodId: diary.moodId
    })))
}

function preview(index) {
  uni.previewImage({
    current: photos.value[index].src,
    urls: photos.value.map(item => item.src)
  })
}

function openDiary(id) {
  uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
}

function goEditor() {
  uni.navigateTo({ url: '/pages/editor/index' })
}

onShow(async () => {
  const ok = await requireUnlock()
  if (ok) refresh()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 30rpx;
  box-sizing: border-box;
}

.head {
  margin-bottom: 24rpx;
}

.title,
.sub {
  display: block;
}

.title {
  color: $moo-text;
  font-size: 40rpx;
  font-weight: 800;
}

.sub {
  margin-top: 8rpx;
  color: $moo-muted;
  font-size: 25rpx;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.month-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
  color: $moo-text;
  font-size: 29rpx;
  font-weight: 800;
}

.month-head text:last-child {
  color: $moo-muted;
  font-size: 22rpx;
  font-weight: 500;
}

.photo-card {
  overflow: hidden;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.photo {
  width: 100%;
  height: 260rpx;
  background: $moo-soft;
}

.photo-info {
  padding: 14rpx 16rpx 18rpx;
}

.photo-info text {
  display: block;
  color: $moo-muted;
  font-size: 22rpx;
  line-height: 1.5;
}

.photo-info text:last-child {
  color: $moo-text;
  font-weight: 700;
}

.empty {
  margin-top: 60rpx;
  padding: 76rpx 34rpx;
  border-radius: 22px;
  color: $moo-muted;
  background: $moo-white;
  box-shadow: $moo-shadow;
  text-align: center;
}

.empty-title,
.empty-text {
  display: block;
}

.empty-title {
  color: $moo-text;
  font-size: 30rpx;
  font-weight: 800;
}

.empty-text {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.55;
}

.empty-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 190rpx;
  height: 72rpx;
  margin: 26rpx auto 0;
  border-radius: 999px;
  color: #ffffff;
  background: $moo-primary;
  font-size: 25rpx;
}
</style>
