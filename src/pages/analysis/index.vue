<template>
  <view class="page">
    <view class="summary">
      <text class="summary-title">情绪复盘</text>
      <text class="summary-text">{{ summary }}</text>
    </view>

    <view class="stats">
      <view class="stat">
        <text class="stat-number">{{ total }}</text>
        <text class="stat-label">总记录</text>
      </view>
      <view class="stat">
        <text class="stat-number">{{ topMood.label }}</text>
        <text class="stat-label">高频心情</text>
      </view>
      <view class="stat">
        <text class="stat-number">{{ streakDays }}</text>
        <text class="stat-label">连续天数</text>
      </view>
    </view>

    <view class="month-review">
      <view>
        <text class="review-kicker">{{ monthLabel }}回顾</text>
        <text class="review-title">{{ monthlySummary }}</text>
      </view>
      <view class="review-grid">
        <view class="review-item">
          <text>{{ monthDiaries.length }}</text>
          <text>本月记录</text>
        </view>
        <view class="review-item">
          <text>{{ topMood.label }}</text>
          <text>最多心情</text>
        </view>
        <view class="review-item">
          <text>{{ topMonthTag }}</text>
          <text>高频标签</text>
        </view>
        <view class="review-item">
          <text>{{ topWeather }}</text>
          <text>常见天气</text>
        </view>
      </view>
    </view>

    <view class="panel streak-panel">
      <view class="panel-head">
        <view class="panel-head-main">
          <text class="panel-title">连续打卡</text>
          <text class="panel-note">{{ streakSubtitle }}</text>
        </view>
        <text class="panel-sub">近 28 天</text>
      </view>
      <view class="streak-overview">
        <view class="streak-total">
          <text class="streak-number">{{ streakDays }}</text>
          <text class="streak-unit">天</text>
        </view>
        <text class="streak-copy">{{ streakEncouragement }}</text>
      </view>
      <view class="streak-grid">
        <view
          v-for="cell in streakCells"
          :key="cell.key"
          class="streak-cell"
          :class="['level-' + cell.level, { today: cell.isToday }]"
        >
          <text class="streak-day">{{ cell.day }}</text>
          <text v-if="cell.count" class="streak-count">{{ cell.count }}</text>
        </view>
      </view>
      <view class="streak-legend">
        <text>少</text>
        <view class="legend-box level-0"></view>
        <view class="legend-box level-1"></view>
        <view class="legend-box level-2"></view>
        <view class="legend-box level-3"></view>
        <text>多</text>
      </view>
    </view>

    <view class="panel">
      <view class="panel-head">
        <text class="panel-title">本周心情波动</text>
        <text class="panel-sub">越高越明亮</text>
      </view>
      <canvas canvas-id="trendCanvas" id="trendCanvas" class="canvas"></canvas>
    </view>

    <view class="panel">
      <view class="panel-head">
        <text class="panel-title">本月情绪占比</text>
        <text class="panel-sub">{{ monthLabel }}</text>
      </view>
      <canvas canvas-id="pieCanvas" id="pieCanvas" class="pie-canvas"></canvas>
      <view class="legend">
        <view v-for="item in moodCounts" :key="item.id" class="legend-item">
          <view class="legend-dot" :style="{ background: item.color }"></view>
          <text>{{ item.label }} {{ item.count }}</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <view class="panel-head">
        <text class="panel-title">高频标签</text>
        <text class="panel-sub">最近主题</text>
      </view>
      <view v-if="tagCounts.length" class="tag-stats">
        <view v-for="tag in tagCounts" :key="tag.name" class="tag-row">
          <view class="tag-name">
            <text>#{{ tag.name }}</text>
            <text>{{ tag.count }} 次</text>
          </view>
          <view class="tag-bar">
            <view class="tag-fill" :style="{ width: `${tag.percent}%` }"></view>
          </view>
        </view>
      </view>
      <text v-else class="empty-tags">还没有标签数据</text>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getDiaries, mergeLatestFromServer } from '@/utils/storage'
import { MOODS, getMood, getWeather } from '@/utils/constants'
import { toDateKey } from '@/utils/date'
import { requireUnlock } from '@/utils/locker'

const diaries = ref([])
const total = computed(() => diaries.value.length)
const now = new Date()
const todayKey = toDateKey()
const monthLabel = `${now.getMonth() + 1} 月`
const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

const monthDiaries = computed(() => diaries.value.filter(item => item.date.startsWith(monthPrefix)))

const diaryDateCounts = computed(() => {
  const map = new Map()
  diaries.value.forEach(item => {
    if (!item.date) return
    map.set(item.date, (map.get(item.date) || 0) + 1)
  })
  return map
})

const moodCounts = computed(() => {
  return MOODS.map(mood => ({
    ...mood,
    count: monthDiaries.value.filter(item => item.moodId === mood.id).length
  }))
})

const tagCounts = computed(() => {
  const map = new Map()
  diaries.value.forEach(item => {
    ;(item.tags || []).forEach(tag => map.set(tag, (map.get(tag) || 0) + 1))
  })
  const rows = Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
  const max = rows[0]?.count || 1
  return rows.map(item => ({
    ...item,
    percent: Math.max(8, Math.round((item.count / max) * 100))
  }))
})

const topMood = computed(() => {
  return [...moodCounts.value].sort((a, b) => b.count - a.count)[0] || MOODS[1]
})

const topMonthTag = computed(() => {
  const map = new Map()
  monthDiaries.value.forEach(item => {
    ;(item.tags || []).forEach(tag => map.set(tag, (map.get(tag) || 0) + 1))
  })
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '还没有'
})

const topWeather = computed(() => {
  const map = new Map()
  monthDiaries.value.forEach(item => map.set(item.weatherId, (map.get(item.weatherId) || 0) + 1))
  const weatherId = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
  const weather = getWeather(weatherId)
  return weather ? `${weather.icon} ${weather.label}` : '还没有'
})

const streakDays = computed(() => {
  const counts = diaryDateCounts.value
  if (!counts.size) return 0
  const day = new Date()
  if (!counts.has(todayKey)) day.setDate(day.getDate() - 1)
  let count = 0
  while (counts.has(toDateKey(day))) {
    count += 1
    day.setDate(day.getDate() - 1)
  }
  return count
})

const streakCells = computed(() => {
  const counts = diaryDateCounts.value
  const today = new Date()
  return Array.from({ length: 28 }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (27 - index))
    const key = toDateKey(day)
    const count = counts.get(key) || 0
    return {
      key,
      day: day.getDate(),
      count,
      isToday: key === todayKey,
      level: Math.min(3, count)
    }
  })
})

const hasTodayEntry = computed(() => diaryDateCounts.value.has(todayKey))

const streakSubtitle = computed(() => {
  if (!total.value) return '写下第一篇后开始点亮'
  if (hasTodayEntry.value) return '今天已经点亮'
  if (streakDays.value) return '今天写一篇就能续上'
  return '从今天重新开始也很好'
})

const streakEncouragement = computed(() => {
  if (!total.value) return '这里会记录你最近 28 天的书写节奏。'
  if (streakDays.value >= 14) return '这已经是一条很稳定的记录习惯。'
  if (streakDays.value >= 7) return '一周不断更，节奏已经被你照顾起来了。'
  if (streakDays.value >= 3) return '连续几天留下了线索，继续慢慢写。'
  if (streakDays.value > 0) return hasTodayEntry.value ? '今天已经接上了。' : '今天写一篇，这条线就能继续。'
  return '今天写下第一句，就会重新开始累计。'
})

const summary = computed(() => {
  if (!total.value) return '还没有足够的数据。先写几篇，复盘会慢慢变清晰。'
  if (topMood.value.id === 'happy') return '最近开心出现得最多，记得把这些让你发光的小事留下来。'
  if (topMood.value.id === 'calm') return '最近整体比较平稳，这种安定感很值得被看见。'
  if (topMood.value.id === 'sad') return '最近难过偏多，可以给自己安排一点低负担的休息。'
  if (topMood.value.id === 'tired') return '疲惫被频繁记录，睡眠和节奏也许值得优先照顾。'
  return '最近生气偏多，先把边界和需求写下来，情绪会更容易安放。'
})

const monthlySummary = computed(() => {
  if (!monthDiaries.value.length) return '这个月还空着，留给第一篇日记一个温柔开场。'
  if (monthDiaries.value.length >= 20) return '这个月你很认真地照看了自己，很多小事都被稳稳留下来了。'
  if (topMood.value.id === 'happy') return '这个月的亮色不少，开心的片段值得被反复看见。'
  if (topMood.value.id === 'sad') return '这个月有些低落，被记录下来本身就是一种整理。'
  if (topMood.value.id === 'tired') return '这个月疲惫感偏明显，节奏和休息可以被放到更前面。'
  return '这个月的情绪线条比较柔和，继续慢慢写就好。'
})

function refresh() {
  diaries.value = getDiaries()
  nextTick(() => {
    drawTrend()
    drawPie()
  })
}

function drawTrend() {
  const ctx = uni.createCanvasContext('trendCanvas')
  const width = 315
  const height = 170
  ctx.clearRect(0, 0, width, height)
  ctx.setStrokeStyle('#E8EEF3')
  ctx.setLineWidth(1)
  for (let i = 0; i < 4; i += 1) {
    const y = 22 + i * 38
    ctx.beginPath()
    ctx.moveTo(12, y)
    ctx.lineTo(width - 12, y)
    ctx.stroke()
  }

  const points = []
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date()
    day.setDate(day.getDate() - i)
    const key = toDateKey(day)
    const entries = diaries.value.filter(item => item.date === key)
    const avg = entries.length
      ? entries.reduce((sum, item) => sum + getMood(item.moodId).score, 0) / entries.length
      : 0
    points.push({ label: `${day.getMonth() + 1}/${day.getDate()}`, value: avg })
  }

  ctx.setStrokeStyle('#6F95BF')
  ctx.setLineWidth(3)
  ctx.beginPath()
  points.forEach((point, index) => {
    const x = 22 + index * 45
    const y = point.value ? 150 - point.value * 24 : 150
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  points.forEach((point, index) => {
    const x = 22 + index * 45
    const y = point.value ? 150 - point.value * 24 : 150
    ctx.setFillStyle(point.value ? '#6F95BF' : '#CBD6DE')
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.setFillStyle('#999999')
    ctx.setFontSize(10)
    ctx.fillText(point.label, x - 14, 166)
  })
  ctx.draw()
}

function drawPie() {
  const ctx = uni.createCanvasContext('pieCanvas')
  const totalCount = moodCounts.value.reduce((sum, item) => sum + item.count, 0)
  const cx = 160
  const cy = 92
  const radius = 68
  ctx.clearRect(0, 0, 320, 190)

  if (!totalCount) {
    ctx.setFillStyle('#E8EEF3')
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.setFillStyle('#999999')
    ctx.setFontSize(12)
    ctx.fillText('暂无数据', cx - 24, cy + 4)
    ctx.draw()
    return
  }

  let start = -Math.PI / 2
  moodCounts.value.forEach(item => {
    if (!item.count) return
    const angle = (item.count / totalCount) * Math.PI * 2
    ctx.setFillStyle(item.color)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, start, start + angle)
    ctx.closePath()
    ctx.fill()
    start += angle
  })
  ctx.setFillStyle('#FFFFFF')
  ctx.beginPath()
  ctx.arc(cx, cy, 34, 0, Math.PI * 2)
  ctx.fill()
  ctx.draw()
}

onShow(async () => {
  const ok = await requireUnlock()
  if (ok) {
    try {
      await mergeLatestFromServer()
    } catch (error) {
      // Keep showing the local cache if the backend is temporarily unreachable.
    }
    refresh()
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 30rpx 30rpx 80rpx;
  box-sizing: border-box;
}

.summary {
  padding: 30rpx;
  border-radius: 20px;
  background: $moo-primary-light;
  box-shadow: $moo-shadow;
}

.summary-title {
  display: block;
  color: $moo-text;
  font-size: 34rpx;
  font-weight: 800;
}

.summary-text {
  display: block;
  margin-top: 14rpx;
  color: #5b6770;
  font-size: 27rpx;
  line-height: 1.65;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
  margin: 22rpx 0;
}

.month-review {
  margin-bottom: 22rpx;
  padding: 30rpx;
  border-radius: 22px;
  background: linear-gradient(135deg, #ffffff 0%, #f7edc8 45%, #dde8f2 100%);
  box-shadow: $moo-shadow;
}

.review-kicker,
.review-title {
  display: block;
}

.review-kicker {
  color: #6f7d87;
  font-size: 23rpx;
  font-weight: 700;
}

.review-title {
  margin-top: 10rpx;
  color: $moo-text;
  font-size: 29rpx;
  font-weight: 800;
  line-height: 1.55;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14rpx;
  margin-top: 22rpx;
}

.review-item {
  padding: 18rpx;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
}

.review-item text:first-child {
  display: block;
  color: $moo-primary;
  font-size: 28rpx;
  font-weight: 900;
}

.review-item text:last-child {
  display: block;
  margin-top: 6rpx;
  color: $moo-muted;
  font-size: 21rpx;
}

.stat {
  min-height: 116rpx;
  padding: 18rpx 12rpx;
  border-radius: $moo-radius-sm;
  background: $moo-white;
  box-shadow: $moo-shadow;
  text-align: center;
}

.stat-number,
.stat-label {
  display: block;
}

.stat-number {
  color: $moo-primary;
  font-size: 31rpx;
  font-weight: 800;
}

.stat-label {
  margin-top: 10rpx;
  color: $moo-muted;
  font-size: 22rpx;
}

.panel {
  margin-top: 20rpx;
  padding: 26rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.panel-head-main {
  min-width: 0;
}

.panel-title {
  display: block;
  color: $moo-text;
  font-size: 29rpx;
  font-weight: 800;
}

.panel-note {
  display: block;
  margin-top: 6rpx;
  color: #6f7d87;
  font-size: 21rpx;
}

.panel-sub {
  color: $moo-muted;
  font-size: 22rpx;
}

.streak-panel {
  background: linear-gradient(180deg, #ffffff 0%, #fbfcf7 100%);
}

.streak-overview {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 20rpx;
  padding-bottom: 18rpx;
  border-bottom: 1px solid #edf1f4;
}

.streak-total {
  display: flex;
  align-items: flex-end;
  flex-shrink: 0;
}

.streak-number {
  color: $moo-primary;
  font-size: 58rpx;
  font-weight: 900;
  line-height: 1;
}

.streak-unit {
  margin-left: 8rpx;
  color: $moo-text;
  font-size: 25rpx;
  font-weight: 800;
}

.streak-copy {
  color: #5b6770;
  text-align: right;
  font-size: 24rpx;
  line-height: 1.45;
}

.streak-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10rpx;
}

.streak-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 54rpx;
  border-radius: 12rpx;
  color: #7b8992;
  background: #f1f4f2;
  box-sizing: border-box;
}

.streak-cell.level-1 {
  color: #496656;
  background: #dcefe6;
}

.streak-cell.level-2 {
  color: #375444;
  background: #b7dbc8;
}

.streak-cell.level-3 {
  color: #ffffff;
  background: #7fb497;
}

.streak-cell.today {
  box-shadow: inset 0 0 0 3rpx #6f95bf;
}

.streak-day {
  font-size: 19rpx;
  line-height: 1;
}

.streak-count {
  position: absolute;
  right: 5rpx;
  bottom: 3rpx;
  font-size: 15rpx;
  line-height: 1;
}

.streak-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  margin-top: 16rpx;
  color: $moo-muted;
  font-size: 20rpx;
}

.legend-box {
  width: 22rpx;
  height: 22rpx;
  border-radius: 6rpx;
  background: #f1f4f2;
}

.legend-box.level-1 {
  background: #dcefe6;
}

.legend-box.level-2 {
  background: #b7dbc8;
}

.legend-box.level-3 {
  background: #7fb497;
}

.canvas {
  width: 100%;
  height: 340rpx;
}

.pie-canvas {
  width: 100%;
  height: 360rpx;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx 22rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  color: #5b6770;
  font-size: 23rpx;
}

.legend-dot {
  width: 18rpx;
  height: 18rpx;
  margin-right: 8rpx;
  border-radius: 50%;
}

.tag-stats {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.tag-name {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
  color: #5b6770;
  font-size: 24rpx;
}

.tag-bar {
  height: 16rpx;
  overflow: hidden;
  border-radius: 999px;
  background: $moo-soft;
}

.tag-fill {
  height: 100%;
  border-radius: 999px;
  background: $moo-primary;
}

.empty-tags {
  display: block;
  padding: 24rpx 0;
  color: $moo-muted;
  text-align: center;
  font-size: 24rpx;
}
</style>
