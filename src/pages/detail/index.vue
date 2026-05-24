<template>
  <view class="page">
    <view v-if="entry" class="detail">
      <view class="hero">
        <view>
          <text class="date">{{ formatDate(entry.date) }}</text>
          <text class="title">{{ mood.emoji }} {{ mood.label }}</text>
          <text class="meta">{{ weatherText }} · {{ formatTime(entry.createdAt) }}</text>
        </view>
        <button class="edit" @click="editDiary">编辑</button>
      </view>

      <view class="content-card">
        <text class="content">{{ entry.content || '这篇日记没有写文字。' }}</text>
      </view>

      <view v-if="entry.images.length" class="image-card">
        <image
          v-for="(img, index) in entry.images"
          :key="img"
          :src="img"
          mode="widthFix"
          class="photo"
          @click="preview(index)"
        />
      </view>

      <view v-if="entry.tags.length" class="tags">
        <text v-for="tag in entry.tags" :key="tag" class="tag">#{{ tag }}</text>
      </view>

      <view v-if="entry.hidden" class="private-note">这篇日记已设为私密隐藏</view>
    </view>

    <view v-else class="empty">
      <text>没有找到这篇日记</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMood, getWeather } from '@/utils/constants'
import { formatDate, formatTime } from '@/utils/date'
import { getDiary } from '@/utils/storage'
import { requireUnlock } from '@/utils/locker'

const entry = ref(null)
const diaryId = ref('')

const mood = computed(() => entry.value ? getMood(entry.value.moodId) : getMood('calm'))
const weatherText = computed(() => {
  if (!entry.value) return '未选天气'
  const weather = getWeather(entry.value.weatherId)
  return weather ? `${weather.icon} ${weather.label}` : '未选天气'
})

function refresh() {
  entry.value = diaryId.value ? getDiary(diaryId.value) : null
}

function editDiary() {
  uni.navigateTo({ url: `/pages/editor/index?id=${entry.value.id}` })
}

function preview(index) {
  uni.previewImage({
    current: entry.value.images[index],
    urls: entry.value.images
  })
}

onLoad(query => {
  diaryId.value = query.id || ''
  refresh()
})

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

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 30rpx;
  border-radius: 20px;
  background: $moo-primary-light;
  box-shadow: $moo-shadow;
}

.date,
.title,
.meta {
  display: block;
}

.date {
  color: #66737c;
  font-size: 25rpx;
}

.title {
  margin-top: 12rpx;
  color: $moo-text;
  font-size: 42rpx;
  font-weight: 800;
}

.meta {
  margin-top: 10rpx;
  color: #66737c;
  font-size: 24rpx;
}

.edit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 116rpx;
  height: 62rpx;
  border-radius: 999px;
  color: #ffffff;
  background: $moo-primary;
  font-size: 25rpx;
}

.content-card,
.image-card {
  margin-top: 20rpx;
  padding: 28rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.content {
  display: block;
  color: #424b52;
  font-size: 31rpx;
  line-height: 1.9;
  white-space: pre-wrap;
}

.photo {
  display: block;
  width: 100%;
  margin-bottom: 18rpx;
  border-radius: 16rpx;
  background: $moo-soft;
}

.photo:last-child {
  margin-bottom: 0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 22rpx;
}

.tag {
  padding: 9rpx 18rpx;
  border-radius: 999px;
  color: $moo-primary;
  background: $moo-primary-light;
  font-size: 24rpx;
}

.private-note {
  margin-top: 20rpx;
  color: #d45d66;
  text-align: center;
  font-size: 24rpx;
}

.empty {
  padding-top: 160rpx;
  color: $moo-muted;
  text-align: center;
  font-size: 28rpx;
}
</style>
