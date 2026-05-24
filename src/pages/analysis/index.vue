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
        <text class="stat-label">近 7 天记录</text>
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
import { getDiaries } from '@/utils/storage'
import { MOODS, getMood } from '@/utils/constants'
import { toDateKey } from '@/utils/date'
import { requireUnlock } from '@/utils/locker'

const diaries = ref([])
const total = computed(() => diaries.value.length)
const now = new Date()
const monthLabel = `${now.getMonth() + 1} 月`

const moodCounts = computed(() => {
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return MOODS.map(mood => ({
    ...mood,
    count: diaries.value.filter(item => item.date.startsWith(monthPrefix) && item.moodId === mood.id).length
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

const streakDays = computed(() => {
  let count = 0
  for (let i = 0; i < 7; i += 1) {
    const day = new Date()
    day.setDate(day.getDate() - i)
    if (diaries.value.some(item => item.date === toDateKey(day))) count += 1
  }
  return count
})

const summary = computed(() => {
  if (!total.value) return '还没有足够的数据。先写几篇，复盘会慢慢变清晰。'
  if (topMood.value.id === 'happy') return '最近开心出现得最多，记得把这些让你发光的小事留下来。'
  if (topMood.value.id === 'calm') return '最近整体比较平稳，这种安定感很值得被看见。'
  if (topMood.value.id === 'sad') return '最近难过偏多，可以给自己安排一点低负担的休息。'
  if (topMood.value.id === 'tired') return '疲惫被频繁记录，睡眠和节奏也许值得优先照顾。'
  return '最近生气偏多，先把边界和需求写下来，情绪会更容易安放。'
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
  if (ok) refresh()
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

.panel-title {
  color: $moo-text;
  font-size: 29rpx;
  font-weight: 800;
}

.panel-sub {
  color: $moo-muted;
  font-size: 22rpx;
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
