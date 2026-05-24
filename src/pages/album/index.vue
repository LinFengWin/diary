<template>
  <view class="page">
    <view class="head">
      <text class="title">图片相册</text>
      <text class="sub">{{ photos.length }} 张日记图片</text>
    </view>

    <view v-if="photos.length" class="grid">
      <view v-for="(photo, index) in photos" :key="photo.src" class="photo-card">
        <image :src="photo.src" mode="aspectFill" class="photo" @click="preview(index)" />
        <view class="photo-info" @click="openDiary(photo.diaryId)">
          <text>{{ formatDate(photo.date) }}</text>
          <text>{{ getMood(photo.moodId).emoji }} {{ getMood(photo.moodId).label }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <text class="empty-icon">🖼️</text>
      <text>还没有日记图片</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMood } from '@/utils/constants'
import { formatDate } from '@/utils/date'
import { getDiaries } from '@/utils/storage'
import { requireUnlock } from '@/utils/locker'

const photos = ref([])

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
  padding-top: 160rpx;
  color: $moo-muted;
  text-align: center;
  font-size: 28rpx;
}

.empty-icon {
  display: block;
  margin-bottom: 18rpx;
  font-size: 70rpx;
}
</style>
