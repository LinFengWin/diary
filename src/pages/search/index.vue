<template>
  <view class="page">
    <view class="search-box">
      <input v-model="keyword" class="search-input" placeholder="搜索文字、标签、日期" confirm-type="search" />
    </view>

    <view class="filters">
      <view
        v-for="mood in allMoods"
        :key="mood.id"
        class="filter"
        :class="{ active: moodId === mood.id }"
        @click="moodId = mood.id"
      >
        <text>{{ mood.emoji }}</text>
        <text>{{ mood.label }}</text>
      </view>
    </view>

    <view v-if="hotTags.length" class="tag-panel">
      <text class="panel-title">高频标签</text>
      <view class="tag-list">
        <text
          v-for="tag in hotTags"
          :key="tag.name"
          class="tag"
          :class="{ active: keyword === tag.name }"
          @click="keyword = tag.name"
        >
          #{{ tag.name }} {{ tag.count }}
        </text>
      </view>
    </view>

    <view class="section-head">
      <text>结果 {{ results.length }}</text>
      <text class="clear" @click="clearFilters">清空</text>
    </view>

    <view v-if="results.length" class="list">
      <view v-for="item in results" :key="item.id" class="card" @click="openDiary(item.id)">
        <view class="card-head">
          <text class="emoji">{{ getMood(item.moodId).emoji }}</text>
          <view class="card-meta">
            <text class="title">{{ getMood(item.moodId).label }} · {{ formatDate(item.date) }}</text>
            <text class="sub">{{ item.tags.map(tag => `#${tag}`).join(' ') || '没有标签' }}</text>
          </view>
        </view>
        <text class="content">{{ item.content || '这篇日记没有文字。' }}</text>
      </view>
    </view>

    <view v-else class="empty">
      <MooEmptyArt />
      <text class="empty-title">没有匹配的日记</text>
      <text class="empty-text">换个关键词、标签或心情试试看。</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { MOODS, getMood } from '@/utils/constants'
import { formatDate } from '@/utils/date'
import { getDiaries } from '@/utils/storage'
import { requireUnlock } from '@/utils/locker'
import MooEmptyArt from '@/components/MooEmptyArt.vue'

const diaries = ref([])
const keyword = ref('')
const moodId = ref('all')
const allMoods = [{ id: 'all', label: '全部', emoji: '⌁' }, ...MOODS]

const hotTags = computed(() => {
  const map = new Map()
  diaries.value.forEach(item => {
    ;(item.tags || []).forEach(tag => map.set(tag, (map.get(tag) || 0) + 1))
  })
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
})

const results = computed(() => {
  const word = keyword.value.trim().toLowerCase()
  return diaries.value.filter(item => {
    if (moodId.value !== 'all' && item.moodId !== moodId.value) return false
    if (!word) return true
    const haystack = [
      item.content,
      item.date,
      getMood(item.moodId).label,
      ...(item.tags || [])
    ].join(' ').toLowerCase()
    return haystack.includes(word)
  })
})

function clearFilters() {
  keyword.value = ''
  moodId.value = 'all'
}

function openDiary(id) {
  uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
}

onShow(async () => {
  const ok = await requireUnlock()
  if (ok) diaries.value = getDiaries()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 30rpx;
  box-sizing: border-box;
}

.search-box {
  padding: 18rpx 22rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.search-input {
  height: 58rpx;
  color: $moo-text;
  font-size: 28rpx;
}

.filters {
  display: flex;
  gap: 12rpx;
  margin: 22rpx 0;
  overflow-x: auto;
  white-space: nowrap;
}

.filter {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  height: 68rpx;
  padding: 0 18rpx;
  border-radius: 999px;
  color: $moo-muted;
  background: $moo-white;
  box-shadow: $moo-shadow;
  font-size: 24rpx;
}

.filter.active {
  color: $moo-text;
  background: $moo-primary-light;
}

.tag-panel {
  padding: 24rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.panel-title {
  display: block;
  margin-bottom: 16rpx;
  color: $moo-text;
  font-size: 28rpx;
  font-weight: 800;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.tag {
  padding: 8rpx 16rpx;
  border-radius: 999px;
  color: $moo-primary;
  background: $moo-primary-light;
  font-size: 22rpx;
}

.tag.active {
  color: #ffffff;
  background: $moo-primary;
}

.section-head {
  display: flex;
  justify-content: space-between;
  margin: 32rpx 4rpx 18rpx;
  color: $moo-text;
  font-size: 28rpx;
  font-weight: 800;
}

.clear {
  color: $moo-primary;
  font-size: 24rpx;
  font-weight: 400;
}

.card {
  margin-bottom: 16rpx;
  padding: 24rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.emoji {
  font-size: 42rpx;
}

.card-meta {
  min-width: 0;
}

.title,
.sub,
.content {
  display: block;
}

.title {
  color: $moo-text;
  font-size: 27rpx;
  font-weight: 800;
}

.sub {
  margin-top: 6rpx;
  color: $moo-muted;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content {
  color: #5d666d;
  font-size: 26rpx;
  line-height: 1.6;
}

.empty {
  margin-top: 36rpx;
  padding: 72rpx 34rpx;
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
  margin-top: 18rpx;
  color: $moo-text;
  font-size: 29rpx;
  font-weight: 800;
}

.empty-text {
  margin-top: 10rpx;
  font-size: 24rpx;
}
</style>
