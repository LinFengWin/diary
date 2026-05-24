<template>
  <view class="page">
    <view class="top">
      <view>
        <text class="hello">{{ greeting }}</text>
        <text class="date">{{ todayLabel }}</text>
      </view>
    </view>

    <view class="today-card" @click="goEditor">
      <view class="today-left">
        <text class="today-emoji">{{ todayDiary ? moodOf(todayDiary).emoji : '📝' }}</text>
        <view class="today-copy">
          <text class="today-title">{{ todayDiary ? moodOf(todayDiary).label : '今天心情怎么样？' }}</text>
          <text class="today-sub">{{ todayDiary ? preview(todayDiary.content) : '轻轻写一点，也算照顾自己' }}</text>
        </view>
      </view>
      <text class="today-action">写</text>
    </view>

    <view class="quick-row">
      <view class="quick quick-blue" @click="goEditor">
        <text class="quick-icon">＋</text>
        <text class="quick-title">写日记</text>
      </view>
      <view class="quick quick-mint" @click="goCalendar">
        <text class="quick-icon">⌁</text>
        <text class="quick-title">日历归档</text>
      </view>
      <view class="quick quick-pink" @click="goSearch">
        <text class="quick-icon">⌕</text>
        <text class="quick-title">搜索日记</text>
      </view>
      <view class="quick quick-yellow" @click="goAlbum">
        <text class="quick-icon">□</text>
        <text class="quick-title">图片相册</text>
      </view>
    </view>

    <view class="section-head">
      <text class="section-title">最近记录</text>
      <text class="section-more" @click="goCalendar">全部</text>
    </view>

    <view v-if="diaries.length" class="list">
      <view v-for="item in diaries" :key="item.id" class="diary-card" @click="openDiary(item.id)">
        <view class="card-head">
          <text class="card-emoji">{{ moodOf(item).emoji }}</text>
          <view class="card-meta">
            <text class="card-date">{{ formatDate(item.date) }} · {{ weatherOf(item) }}</text>
            <text class="card-mood">{{ moodOf(item).label }}</text>
          </view>
        </view>
        <text class="card-content">{{ preview(item.content) }}</text>
        <view v-if="item.images.length" class="thumbs">
          <image v-for="img in item.images.slice(0, 3)" :key="img" :src="img" mode="aspectFill" class="thumb" />
        </view>
        <view v-if="item.tags.length" class="tags">
          <text v-for="tag in item.tags" :key="tag" class="tag">#{{ tag }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <text class="empty-icon">🌱</text>
      <text class="empty-title">还没有日记</text>
      <text class="empty-text">从今天的一句话开始。</text>
    </view>

    <button class="fab" @click="goEditor">＋</button>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { getDiaries, getDiariesByDate } from '@/utils/storage'
import { getMood, getWeather } from '@/utils/constants'
import { formatDate, toDateKey } from '@/utils/date'
import { requireUnlock } from '@/utils/locker'

const diaries = ref([])
const todayDiary = ref(null)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早安'
  if (hour < 14) return '午间好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const todayLabel = computed(() => formatDate(toDateKey()))

function refresh() {
  diaries.value = getDiaries().slice(0, 12)
  todayDiary.value = getDiariesByDate(toDateKey())[0] || null
}

function moodOf(item) {
  return getMood(item.moodId)
}

function weatherOf(item) {
  const weather = getWeather(item.weatherId)
  return weather ? `${weather.icon} ${weather.label}` : '未选天气'
}

function preview(content) {
  if (!content) return '留白也可以被记录'
  return content.length > 56 ? `${content.slice(0, 56)}...` : content
}

function goEditor() {
  uni.navigateTo({ url: '/pages/editor/index' })
}

function openDiary(id) {
  uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
}

function goCalendar() {
  uni.switchTab({ url: '/pages/calendar/index' })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/index' })
}

function goAlbum() {
  uni.navigateTo({ url: '/pages/album/index' })
}

onShow(async () => {
  const ok = await requireUnlock()
  if (ok) refresh()
})

onPullDownRefresh(() => {
  refresh()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 34rpx 30rpx 150rpx;
  box-sizing: border-box;
}

.top { margin-bottom: 28rpx; }

.hello {
  display: block;
  color: $moo-text;
  font-size: 46rpx;
  font-weight: 700;
}

.date {
  display: block;
  margin-top: 8rpx;
  color: $moo-muted;
  font-size: 25rpx;
}

.today-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-radius: 20px;
  background: $moo-primary-light;
  box-shadow: $moo-shadow;
}

.today-left {
  display: flex;
  min-width: 0;
  align-items: center;
}

.today-emoji {
  margin-right: 24rpx;
  font-size: 72rpx;
}

.today-copy {
  min-width: 0;
}

.today-title {
  display: block;
  color: $moo-text;
  font-size: 32rpx;
  font-weight: 700;
}

.today-sub {
  display: block;
  margin-top: 10rpx;
  color: #6f7d87;
  font-size: 25rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.today-action {
  flex: 0 0 auto;
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  color: #ffffff;
  background: $moo-primary;
  text-align: center;
  line-height: 68rpx;
  font-size: 25rpx;
}

.quick-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18rpx;
  margin-top: 22rpx;
}

.quick {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 108rpx;
  padding: 0 24rpx;
  border-radius: $moo-radius;
  box-shadow: $moo-shadow;
}

.quick-blue {
  background: #ffffff;
}

.quick-mint {
  background: $moo-mint;
}

.quick-pink {
  background: $moo-pink;
}

.quick-yellow {
  background: $moo-yellow;
}

.quick-icon {
  width: 50rpx;
  height: 50rpx;
  border-radius: 50%;
  color: #ffffff;
  background: $moo-primary;
  text-align: center;
  line-height: 50rpx;
  font-size: 28rpx;
}

.quick-title {
  color: $moo-text;
  font-size: 27rpx;
  font-weight: 600;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 40rpx 4rpx 18rpx;
}

.section-title {
  color: $moo-text;
  font-size: 31rpx;
  font-weight: 700;
}

.section-more {
  color: $moo-primary;
  font-size: 25rpx;
}

.diary-card {
  margin-bottom: 18rpx;
  padding: 26rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.card-head {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.card-emoji {
  margin-right: 16rpx;
  font-size: 46rpx;
}

.card-meta {
  min-width: 0;
}

.card-date,
.card-mood {
  display: block;
}

.card-date {
  color: $moo-muted;
  font-size: 23rpx;
}

.card-mood {
  margin-top: 4rpx;
  color: $moo-text;
  font-size: 27rpx;
  font-weight: 600;
}

.card-content {
  display: block;
  color: #4d4d4d;
  font-size: 27rpx;
  line-height: 1.7;
}

.thumbs {
  display: flex;
  gap: 10rpx;
  margin-top: 18rpx;
}

.thumb {
  width: 142rpx;
  height: 142rpx;
  border-radius: 14rpx;
  background: $moo-soft;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 18rpx;
}

.tag {
  padding: 7rpx 18rpx;
  border-radius: 999px;
  color: $moo-primary;
  background: $moo-primary-light;
  font-size: 22rpx;
}

.empty {
  padding-top: 120rpx;
  text-align: center;
}

.empty-icon,
.empty-title,
.empty-text {
  display: block;
}

.empty-icon {
  font-size: 76rpx;
}

.empty-title {
  margin-top: 18rpx;
  color: $moo-text;
  font-size: 30rpx;
  font-weight: 700;
}

.empty-text {
  margin-top: 10rpx;
  color: $moo-muted;
  font-size: 25rpx;
}

.fab {
  position: fixed;
  right: 34rpx;
  bottom: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  color: #ffffff;
  background: $moo-primary;
  box-shadow: 0 18rpx 42rpx rgba(111, 149, 191, 0.34);
  font-size: 46rpx;
}

@media screen and (min-width: 768px) {
  .page {
    padding: 24px 18px 126px;
  }

  .top {
    margin-bottom: 22px;
  }

  .hello {
    font-size: 26px;
  }

  .date {
    font-size: 14px;
  }

  .today-card {
    padding: 18px;
  }

  .today-emoji {
    font-size: 38px;
  }

  .today-title {
    font-size: 19px;
  }

  .today-sub {
    font-size: 14px;
  }

  .quick-row {
    gap: 10px;
    margin-top: 16px;
  }

  .quick {
    min-height: 58px;
    padding: 0 12px;
  }

  .quick-title {
    font-size: 15px;
  }

  .section-head {
    margin: 28px 2px 14px;
  }

  .diary-card {
    margin-bottom: 12px;
    padding: 18px;
  }

  .card-content {
    min-height: 0;
  }
}
</style>
