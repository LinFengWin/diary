<template>
  <view class="page">
    <view class="month-bar">
      <button class="nav" @click="changeMonth(-1)">‹</button>
      <view class="month-title">
        <text>{{ currentYear }} 年 {{ currentMonth }} 月</text>
        <text class="month-sub">{{ monthDiaryCount }} 篇日记 · 未来日期不可补记</text>
      </view>
      <button class="nav" @click="changeMonth(1)">›</button>
    </view>

    <view class="calendar">
      <view v-for="week in weeks" :key="week" class="week">{{ week }}</view>
      <view
        v-for="(cell, index) in cells"
        :key="index"
        class="day"
        :class="{
          blank: !cell,
          selected: cell && cell.key === selectedDate,
          today: cell && cell.key === todayKey,
          future: cell && isFutureDate(cell.key),
          recorded: cell && markedDates.has(cell.key)
        }"
        :style="cellStyle(cell)"
        @click="cell && selectDate(cell)"
      >
        <template v-if="cell">
          <text class="day-number">{{ cell.day }}</text>
          <text v-if="calendarMeta[cell.key]?.mood" class="mood-mark">
            {{ calendarMeta[cell.key].mood.emoji }}
          </text>
          <text v-if="calendarMeta[cell.key]?.holiday" class="holiday">
            {{ calendarMeta[cell.key].holiday }}
          </text>
        </template>
      </view>
    </view>

    <view class="section-head">
      <text class="section-title">{{ selectedDate ? formatDate(selectedDate) : '请选择已到日期' }}</text>
      <text class="write-link" :class="{ disabled: !canWriteSelected }" @click="writeSelected">
        {{ canWriteSelected ? '补记' : '不可补记' }}
      </text>
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
      <text>{{ canWriteSelected ? '这天还没有记录' : '未来日期还不能写日记' }}</text>
      <button v-if="canWriteSelected" @click="writeSelected">写一篇</button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getDiaries, getDiariesByDate } from '@/utils/storage'
import { getMood } from '@/utils/constants'
import {
  compareDateKey,
  formatDate,
  formatTime,
  getHolidayLabel,
  getMonthGrid,
  isFutureDate,
  pad,
  toDateKey
} from '@/utils/date'
import { requireUnlock } from '@/utils/locker'

const now = new Date()
const todayKey = toDateKey()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)
const selectedDate = ref(todayKey)
const markedDates = ref(new Set())
const selectedList = ref([])
const calendarMeta = ref({})
const monthDiaryCount = ref(0)
const weeks = ['日', '一', '二', '三', '四', '五', '六']

const cells = computed(() => getMonthGrid(currentYear.value, currentMonth.value))
const canWriteSelected = computed(() => selectedDate.value && !isFutureDate(selectedDate.value))

function monthPrefix(year = currentYear.value, month = currentMonth.value) {
  return `${year}-${pad(month)}`
}

function isFutureMonth(year, month) {
  return compareDateKey(`${year}-${pad(month)}-01`, `${todayKey.slice(0, 7)}-01`) > 0
}

function defaultSelectedDate(year, month) {
  if (isFutureMonth(year, month)) return ''
  const prefix = monthPrefix(year, month)
  return prefix === todayKey.slice(0, 7) ? todayKey : `${prefix}-01`
}

function dominantMood(diaries) {
  const count = {}
  diaries.forEach(item => {
    count[item.moodId] = (count[item.moodId] || 0) + 1
  })
  const moodId = Object.keys(count).sort((a, b) => count[b] - count[a])[0]
  return moodId ? getMood(moodId) : null
}

function refresh() {
  const prefix = monthPrefix()
  const groups = {}
  getDiaries().forEach(item => {
    if (!item.date?.startsWith(prefix)) return
    groups[item.date] = groups[item.date] || []
    groups[item.date].push(item)
  })

  const meta = {}
  cells.value.forEach(cell => {
    if (!cell) return
    const diaries = groups[cell.key] || []
    meta[cell.key] = {
      mood: dominantMood(diaries),
      holiday: getHolidayLabel(cell.key)
    }
  })

  calendarMeta.value = meta
  markedDates.value = new Set(Object.keys(groups))
  monthDiaryCount.value = Object.values(groups).reduce((sum, list) => sum + list.length, 0)
  selectedList.value = selectedDate.value ? getDiariesByDate(selectedDate.value) : []
}

function changeMonth(step) {
  const next = new Date(currentYear.value, currentMonth.value - 1 + step, 1)
  currentYear.value = next.getFullYear()
  currentMonth.value = next.getMonth() + 1
  selectedDate.value = defaultSelectedDate(currentYear.value, currentMonth.value)
  refresh()
}

function selectDate(cell) {
  if (isFutureDate(cell.key)) {
    uni.showToast({ title: '未来日期不能勾选或补记', icon: 'none' })
    return
  }
  selectedDate.value = cell.key
  selectedList.value = getDiariesByDate(cell.key)
}

function cellStyle(cell) {
  if (!cell || cell.key === selectedDate.value || isFutureDate(cell.key)) return ''
  const mood = calendarMeta.value[cell.key]?.mood
  return mood ? `background:${mood.color};` : ''
}

function openDiary(id) {
  uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
}

function writeSelected() {
  if (!canWriteSelected.value) {
    uni.showToast({ title: '未来日期不能补记', icon: 'none' })
    return
  }
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
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  height: 86rpx;
  border-radius: 15px;
  color: $moo-text;
  background: $moo-bg;
  text-align: center;
  font-size: 26rpx;
  box-sizing: border-box;
}

.day.blank {
  background: transparent;
}

.day.today {
  color: $moo-primary;
  font-weight: 800;
}

.day.selected {
  color: #ffffff;
  background: $moo-primary;
}

.day.future {
  color: #b8c1c8;
  background: #f1f3f4;
}

.day-number {
  line-height: 1;
}

.mood-mark {
  position: absolute;
  right: 6rpx;
  top: 4rpx;
  font-size: 20rpx;
  line-height: 1;
}

.holiday {
  display: block;
  max-width: 100%;
  margin-top: 7rpx;
  padding: 0 6rpx;
  color: #d45d66;
  font-size: 18rpx;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-sizing: border-box;
}

.selected .holiday {
  color: #ffffff;
}

.future .holiday,
.future .mood-mark {
  opacity: 0.55;
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

.write-link.disabled {
  color: #aeb7bd;
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
