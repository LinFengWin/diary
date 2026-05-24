<template>
  <view class="page">
    <view class="month-bar">
      <button class="nav" @click="changeMonth(-1)">‹</button>
      <view class="month-title">
        <text>{{ currentYear }} 年 {{ currentMonth }} 月</text>
        <text class="month-sub">{{ selectedList.length }} 篇选中日期记录</text>
      </view>
      <button class="nav" @click="changeMonth(1)">›</button>
    </view>

    <view class="calendar">
      <view v-for="week in weeks" :key="week" class="week">{{ week }}</view>
      <view
        v-for="(cell, index) in cells"
        :key="index"
        class="day"
        :class="{ blank: !cell, selected: cell && cell.key === selectedDate, today: cell && cell.key === todayKey }"
        @click="cell && selectDate(cell.key)"
      >
        <text v-if="cell">{{ cell.day }}</text>
        <view v-if="cell && markedDates.has(cell.key)" class="dot"></view>
      </view>
    </view>

    <view class="section-head">
      <text class="section-title">{{ formatDate(selectedDate) }}</text>
      <text class="write-link" @click="writeSelected">补记</text>
    </view>

    <view v-if="selectedList.length" class="list">
      <view v-for="item in selectedList" :key="item.id" class="entry" @click="openDiary(item.id)">
        <text class="entry-emoji">{{ getMood(item.moodId).emoji }}</text>
        <view class="entry-main">
          <text class="entry-title">{{ getMood(item.moodId).label }} · {{ formatTime(item.createdAt) }}</text>
          <text class="entry-content">{{ item.content || '没有写文字，只留下了一点心情。' }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <text>这天还没有记录</text>
      <button @click="writeSelected">写一篇</button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getDiariesByDate, getDiaryDates } from '@/utils/storage'
import { getMood } from '@/utils/constants'
import { formatDate, formatTime, getMonthGrid, toDateKey } from '@/utils/date'
import { requireUnlock } from '@/utils/locker'

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)
const selectedDate = ref(toDateKey())
const markedDates = ref(new Set())
const selectedList = ref([])
const todayKey = toDateKey()
const weeks = ['日', '一', '二', '三', '四', '五', '六']

const cells = computed(() => getMonthGrid(currentYear.value, currentMonth.value))

function refresh() {
  markedDates.value = getDiaryDates(currentYear.value, currentMonth.value)
  selectedList.value = getDiariesByDate(selectedDate.value)
}

function changeMonth(step) {
  const next = new Date(currentYear.value, currentMonth.value - 1 + step, 1)
  currentYear.value = next.getFullYear()
  currentMonth.value = next.getMonth() + 1
  selectedDate.value = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`
  refresh()
}

function selectDate(date) {
  selectedDate.value = date
  selectedList.value = getDiariesByDate(date)
}

function openDiary(id) {
  uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
}

function writeSelected() {
  uni.navigateTo({ url: `/pages/editor/index?date=${selectedDate.value}` })
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

.month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 74rpx;
  height: 74rpx;
  border-radius: 50%;
  color: $moo-primary;
  background: $moo-white;
  box-shadow: $moo-shadow;
  font-size: 44rpx;
}

.month-title {
  text-align: center;
  color: $moo-text;
  font-size: 34rpx;
  font-weight: 700;
}

.month-sub {
  display: block;
  margin-top: 6rpx;
  color: $moo-muted;
  font-size: 22rpx;
  font-weight: 400;
}

.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10rpx;
  padding: 22rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.week {
  height: 50rpx;
  color: $moo-muted;
  text-align: center;
  line-height: 50rpx;
  font-size: 23rpx;
}

.day {
  position: relative;
  height: 74rpx;
  border-radius: 15px;
  color: $moo-text;
  background: $moo-bg;
  text-align: center;
  line-height: 74rpx;
  font-size: 26rpx;
}

.day.blank {
  background: transparent;
}

.day.today {
  color: $moo-primary;
  font-weight: 700;
}

.day.selected {
  color: #ffffff;
  background: $moo-primary;
}

.dot {
  position: absolute;
  left: 50%;
  bottom: 10rpx;
  width: 8rpx;
  height: 8rpx;
  margin-left: -4rpx;
  border-radius: 50%;
  background: #f0b9c7;
}

.selected .dot {
  background: #ffffff;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 36rpx 4rpx 18rpx;
}

.section-title {
  color: $moo-text;
  font-size: 30rpx;
  font-weight: 700;
}

.write-link {
  color: $moo-primary;
  font-size: 25rpx;
}

.entry {
  display: flex;
  gap: 18rpx;
  margin-bottom: 16rpx;
  padding: 24rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.entry-emoji {
  font-size: 44rpx;
}

.entry-main {
  min-width: 0;
  flex: 1;
}

.entry-title {
  display: block;
  color: $moo-text;
  font-size: 27rpx;
  font-weight: 700;
}

.entry-content {
  display: block;
  margin-top: 10rpx;
  color: #5d666d;
  font-size: 25rpx;
  line-height: 1.55;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  padding: 70rpx 0;
  color: $moo-muted;
  text-align: center;
  font-size: 26rpx;
}

.empty button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 180rpx;
  height: 72rpx;
  margin: 24rpx auto 0;
  border-radius: 999px;
  color: #ffffff;
  background: $moo-primary;
  font-size: 25rpx;
}
</style>
