<template>
  <view class="page">
    <view v-if="entry" class="detail">
      <button class="back-chip" @click="goBack">
        <text class="back-arrow">←</text>
        <text>返回</text>
      </button>

      <view class="hero" :class="paperThemeClass">
        <view class="hero-glow"></view>
        <view class="hero-flower flower-a"></view>
        <view class="hero-flower flower-b"></view>
        <view class="paper-pin"></view>
        <view class="hero-copy">
          <text class="date">{{ formatDate(entry.date) }}</text>
          <text class="title">{{ mood.emoji }} {{ mood.label }}</text>
          <text class="meta">{{ weatherText }} · {{ formatTime(entry.createdAt) }}</text>
        </view>
        <button class="edit" @click="editDiary">编辑</button>
      </view>

      <view class="letter-wrap" :class="paperThemeClass">
        <view class="paper-tape tape-left"></view>
        <view class="paper-tape tape-right"></view>
        <view class="content-card">
          <view class="paper-texture"></view>
          <view class="paper-lines"></view>
          <view class="paper-margin"></view>
          <view class="paper-corner"></view>
          <view class="paper-petal petal-a"></view>
          <view class="paper-petal petal-b"></view>
          <view class="paper-petal petal-c"></view>
          <text class="content">{{ entry.content || '这篇日记没有写文字。' }}</text>
        </view>
      </view>

      <view v-if="entry.images.length" class="image-card" :class="paperThemeClass">
        <view class="image-card-glow"></view>
        <text class="image-title">今日相片</text>
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
      <MooEmptyArt />
      <text class="empty-title">没有找到这篇日记</text>
      <text class="empty-text">也许它已经被删除，或者还没有同步回来。</text>
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
import MooEmptyArt from '@/components/MooEmptyArt.vue'

const entry = ref(null)
const diaryId = ref('')
const WEATHER_THEME_IDS = new Set(['sunny', 'cloudy', 'rainy', 'snowy', 'foggy'])
const MOOD_THEME_IDS = new Set(['happy', 'calm', 'sad', 'tired', 'angry'])

const mood = computed(() => entry.value ? getMood(entry.value.moodId) : getMood('calm'))
const weatherText = computed(() => {
  if (!entry.value) return '未选天气'
  const weather = getWeather(entry.value.weatherId)
  return weather ? `${weather.icon} ${weather.label}` : '未选天气'
})
const weatherTheme = computed(() => {
  const id = entry.value?.weatherId
  return WEATHER_THEME_IDS.has(id) ? id : 'cloudy'
})
const moodTheme = computed(() => {
  const id = entry.value?.moodId
  return MOOD_THEME_IDS.has(id) ? id : 'calm'
})
const paperThemeClass = computed(() => `weather-${weatherTheme.value} mood-${moodTheme.value}`)

function refresh() {
  entry.value = diaryId.value ? getDiary(diaryId.value) : null
}

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/today/index' })
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
  background:
    radial-gradient(circle at 12% 8%, rgba(247, 237, 200, 0.42), transparent 34%),
    radial-gradient(circle at 88% 18%, rgba(220, 239, 230, 0.52), transparent 30%),
    linear-gradient(180deg, #fbfdfb 0%, #f6f9f7 100%);
}

.back-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  width: auto;
  height: 64rpx;
  margin: 0 0 20rpx;
  padding: 0 24rpx;
  border-radius: 999px;
  color: $moo-primary;
  background: $moo-white;
  box-shadow: $moo-shadow;
  font-size: 25rpx;
  font-weight: 700;
}

.back-arrow {
  font-size: 30rpx;
  line-height: 1;
}

.hero {
  --hero-start: #ffffff;
  --hero-mid: #eef5f0;
  --hero-end: #f7edc8;
  --hero-glow: rgba(255, 255, 255, 0.56);
  --hero-pin: rgba(255, 255, 255, 0.5);
  --hero-flower: #f7dce3;

  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 34rpx 160rpx 32rpx 30rpx;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--hero-start) 0%, var(--hero-mid) 52%, var(--hero-end) 100%);
  box-shadow: 0 16rpx 42rpx rgba(71, 94, 115, 0.1);
}

.hero-glow {
  position: absolute;
  right: -70rpx;
  top: -80rpx;
  width: 250rpx;
  height: 250rpx;
  border-radius: 50%;
  background: var(--hero-glow);
}

.hero-copy,
.edit {
  position: relative;
  z-index: 1;
}

.hero-copy {
  min-width: 0;
}

.paper-pin {
  position: absolute;
  right: 34rpx;
  bottom: -32rpx;
  width: 150rpx;
  height: 150rpx;
  border-radius: 50%;
  background: var(--hero-pin);
}

.hero-flower {
  position: absolute;
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background:
    radial-gradient(circle, #ffffff 0%, #ffffff 18%, transparent 19%),
    radial-gradient(circle at 50% 8%, var(--hero-flower) 0%, var(--hero-flower) 18%, transparent 19%),
    radial-gradient(circle at 92% 50%, var(--hero-flower) 0%, var(--hero-flower) 18%, transparent 19%),
    radial-gradient(circle at 50% 92%, var(--hero-flower) 0%, var(--hero-flower) 18%, transparent 19%),
    radial-gradient(circle at 8% 50%, var(--hero-flower) 0%, var(--hero-flower) 18%, transparent 19%);
  opacity: 0.78;
}

.flower-a {
  right: 172rpx;
  top: 26rpx;
}

.flower-b {
  left: 28rpx;
  bottom: 18rpx;
  transform: scale(0.72) rotate(18deg);
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
  position: absolute;
  top: 34rpx;
  right: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 116rpx;
  height: 62rpx;
  margin: 0;
  padding: 0;
  border-radius: 999px;
  color: #ffffff;
  background: $moo-primary;
  font-size: 25rpx;
  line-height: 1;
}

.content-card,
.image-card {
  margin-top: 20rpx;
  padding: 28rpx;
  border-radius: 18px;
  box-shadow: $moo-shadow;
}

.letter-wrap {
  --paper-spine: rgba(247, 220, 227, 0.32);
  --paper-start: #fffdf7;
  --paper-end: #fffaf1;
  --paper-border: rgba(231, 221, 196, 0.78);
  --paper-shadow: rgba(71, 94, 115, 0.12);
  --paper-texture-a: rgba(247, 237, 200, 0.35);
  --paper-texture-b: rgba(220, 239, 230, 0.32);
  --paper-texture-c: rgba(221, 232, 242, 0.24);
  --paper-line: rgba(111, 149, 191, 0.12);
  --paper-rule-height: 64rpx;
  --paper-rule-gap: 46rpx;
  --paper-rule-mark: 47rpx;
  --paper-margin: rgba(247, 220, 227, 0.9);
  --paper-corner: #f1e8cc;
  --tape-left-bg: rgba(247, 220, 227, 0.7);
  --tape-right-bg: rgba(220, 239, 230, 0.8);
  --petal-a-bg: rgba(247, 220, 227, 0.72);
  --petal-b-bg: rgba(247, 237, 200, 0.78);
  --petal-c-bg: rgba(220, 239, 230, 0.84);
  --petal-radius: 50% 50% 50% 10%;

  position: relative;
  margin-top: 28rpx;
  padding-top: 24rpx;
}

.paper-tape {
  position: absolute;
  top: 0;
  z-index: 4;
  width: 118rpx;
  height: 42rpx;
  border-radius: 8rpx;
  background: var(--tape-left-bg);
  box-shadow: 0 8rpx 20rpx rgba(71, 94, 115, 0.08);
}

.tape-left {
  left: 40rpx;
  transform: rotate(-7deg);
}

.tape-right {
  right: 44rpx;
  background: var(--tape-right-bg);
  transform: rotate(6deg);
}

.content-card {
  position: relative;
  overflow: hidden;
  min-height: 320rpx;
  margin-top: 0;
  padding: 62rpx 42rpx 54rpx 58rpx;
  border: 1px solid var(--paper-border);
  border-radius: 20px;
  background:
    linear-gradient(90deg, var(--paper-spine) 0, var(--paper-spine) 10rpx, transparent 10rpx, transparent 100%),
    linear-gradient(180deg, var(--paper-start) 0%, var(--paper-end) 100%);
  box-shadow:
    0 22rpx 48rpx var(--paper-shadow),
    inset 0 0 0 1rpx rgba(255, 255, 255, 0.72);
}

.paper-texture {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 18% 22%, var(--paper-texture-a) 0, var(--paper-texture-a) 2rpx, transparent 3rpx),
    radial-gradient(circle at 76% 70%, var(--paper-texture-b) 0, var(--paper-texture-b) 2rpx, transparent 3rpx),
    radial-gradient(circle at 52% 38%, var(--paper-texture-c) 0, var(--paper-texture-c) 2rpx, transparent 3rpx);
  background-size: 110rpx 96rpx;
  opacity: 0.7;
}

.paper-lines {
  position: absolute;
  left: 58rpx;
  right: 34rpx;
  top: 62rpx;
  bottom: 54rpx;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent var(--paper-rule-gap),
    var(--paper-line) var(--paper-rule-gap),
    var(--paper-line) var(--paper-rule-mark),
    transparent var(--paper-rule-mark),
    transparent var(--paper-rule-height)
  );
}

.paper-margin {
  position: absolute;
  left: 42rpx;
  top: 58rpx;
  bottom: 44rpx;
  width: 2rpx;
  border-radius: 999px;
  background: var(--paper-margin);
}

.paper-corner {
  position: absolute;
  right: 0;
  top: 0;
  width: 74rpx;
  height: 74rpx;
  border-bottom-left-radius: 18px;
  background: linear-gradient(135deg, rgba(238, 243, 246, 0.12) 0%, rgba(238, 243, 246, 0.12) 50%, var(--paper-corner) 51%, var(--paper-corner) 100%);
  box-shadow: -8rpx 8rpx 18rpx rgba(71, 94, 115, 0.08);
}

.paper-petal {
  position: absolute;
  border-radius: var(--petal-radius);
  background: var(--petal-a-bg);
}

.petal-a {
  right: 46rpx;
  bottom: 52rpx;
  width: 28rpx;
  height: 38rpx;
  transform: rotate(24deg);
}

.petal-b {
  right: 78rpx;
  bottom: 40rpx;
  width: 20rpx;
  height: 30rpx;
  background: var(--petal-b-bg);
  transform: rotate(-28deg);
}

.petal-c {
  right: 56rpx;
  bottom: 24rpx;
  width: 18rpx;
  height: 26rpx;
  background: var(--petal-c-bg);
  transform: rotate(68deg);
}

/* Weather sets the paper base; mood sets the accents. */
.hero.weather-sunny {
  --hero-start: #fffefa;
  --hero-mid: #fff3c9;
  --hero-end: #dcefe6;
  --hero-glow: rgba(255, 255, 255, 0.62);
  --hero-pin: rgba(255, 250, 231, 0.58);
}

.letter-wrap.weather-sunny {
  --paper-start: #fffdf4;
  --paper-end: #fff8df;
  --paper-border: rgba(234, 211, 144, 0.68);
  --paper-shadow: rgba(135, 101, 34, 0.1);
  --paper-texture-a: rgba(247, 218, 130, 0.38);
  --paper-texture-b: rgba(220, 239, 230, 0.33);
  --paper-texture-c: rgba(247, 220, 227, 0.24);
  --paper-line: rgba(186, 151, 74, 0.13);
  --paper-corner: #f5e5ae;
}

.image-card.weather-sunny {
  --image-start: #fffef8;
  --image-end: #fff8df;
}

.hero.weather-cloudy {
  --hero-start: #ffffff;
  --hero-mid: #eef5f8;
  --hero-end: #dcefe6;
  --hero-glow: rgba(255, 255, 255, 0.56);
  --hero-pin: rgba(244, 249, 248, 0.62);
}

.letter-wrap.weather-cloudy {
  --paper-start: #fcfeff;
  --paper-end: #f3f8f7;
  --paper-border: rgba(206, 225, 225, 0.72);
  --paper-shadow: rgba(71, 94, 115, 0.1);
  --paper-texture-a: rgba(220, 239, 230, 0.32);
  --paper-texture-b: rgba(221, 232, 242, 0.34);
  --paper-texture-c: rgba(247, 237, 200, 0.22);
  --paper-line: rgba(102, 130, 154, 0.12);
  --paper-corner: #dcebe8;
}

.image-card.weather-cloudy {
  --image-start: #ffffff;
  --image-end: #f4f9f8;
}

.hero.weather-rainy {
  --hero-start: #f8fbff;
  --hero-mid: #dfeaf5;
  --hero-end: #dcefe6;
  --hero-glow: rgba(255, 255, 255, 0.48);
  --hero-pin: rgba(232, 241, 248, 0.64);
}

.letter-wrap.weather-rainy {
  --paper-start: #fbfdff;
  --paper-end: #eef6fb;
  --paper-border: rgba(184, 207, 226, 0.72);
  --paper-shadow: rgba(60, 91, 122, 0.12);
  --paper-texture-a: rgba(201, 221, 238, 0.38);
  --paper-texture-b: rgba(220, 239, 230, 0.28);
  --paper-texture-c: rgba(180, 203, 226, 0.28);
  --paper-line: rgba(79, 119, 160, 0.14);
  --paper-corner: #d8e7f2;
}

.image-card.weather-rainy {
  --image-start: #fbfdff;
  --image-end: #eff6fb;
}

.hero.weather-snowy {
  --hero-start: #ffffff;
  --hero-mid: #edf7fb;
  --hero-end: #f1edf8;
  --hero-glow: rgba(255, 255, 255, 0.7);
  --hero-pin: rgba(250, 252, 255, 0.66);
}

.letter-wrap.weather-snowy {
  --paper-start: #ffffff;
  --paper-end: #f6fbfd;
  --paper-border: rgba(208, 225, 233, 0.72);
  --paper-shadow: rgba(78, 101, 122, 0.1);
  --paper-texture-a: rgba(225, 239, 247, 0.42);
  --paper-texture-b: rgba(233, 228, 244, 0.36);
  --paper-texture-c: rgba(220, 239, 230, 0.24);
  --paper-line: rgba(114, 145, 170, 0.11);
  --paper-corner: #e3edf6;
}

.image-card.weather-snowy {
  --image-start: #ffffff;
  --image-end: #f5fbfd;
}

.hero.weather-foggy {
  --hero-start: #ffffff;
  --hero-mid: #f0f3f2;
  --hero-end: #e6eee9;
  --hero-glow: rgba(255, 255, 255, 0.54);
  --hero-pin: rgba(245, 247, 246, 0.62);
}

.letter-wrap.weather-foggy {
  --paper-start: #fffefe;
  --paper-end: #f5f7f5;
  --paper-border: rgba(212, 222, 218, 0.76);
  --paper-shadow: rgba(73, 89, 91, 0.09);
  --paper-texture-a: rgba(226, 232, 229, 0.38);
  --paper-texture-b: rgba(220, 239, 230, 0.24);
  --paper-texture-c: rgba(221, 232, 242, 0.22);
  --paper-line: rgba(111, 132, 132, 0.1);
  --paper-corner: #e4e9e5;
}

.image-card.weather-foggy {
  --image-start: #ffffff;
  --image-end: #f5f7f5;
}

.hero.mood-happy {
  --hero-flower: #f3cb69;
}

.letter-wrap.mood-happy {
  --paper-spine: rgba(247, 210, 116, 0.34);
  --paper-margin: rgba(238, 189, 84, 0.72);
  --tape-left-bg: rgba(247, 237, 200, 0.78);
  --tape-right-bg: rgba(220, 239, 230, 0.82);
  --petal-a-bg: rgba(247, 210, 116, 0.78);
  --petal-b-bg: rgba(247, 220, 227, 0.72);
  --petal-c-bg: rgba(220, 239, 230, 0.82);
  --petal-radius: 50% 50% 50% 12%;
}

.image-card.mood-happy {
  --image-glow: rgba(247, 210, 116, 0.48);
}

.hero.mood-calm {
  --hero-flower: #b9d7e8;
}

.letter-wrap.mood-calm {
  --paper-spine: rgba(221, 232, 242, 0.38);
  --paper-margin: rgba(145, 184, 205, 0.64);
  --tape-left-bg: rgba(221, 232, 242, 0.76);
  --tape-right-bg: rgba(220, 239, 230, 0.82);
  --petal-a-bg: rgba(221, 232, 242, 0.78);
  --petal-b-bg: rgba(220, 239, 230, 0.8);
  --petal-c-bg: rgba(247, 237, 200, 0.64);
  --petal-radius: 50%;
}

.image-card.mood-calm {
  --image-glow: rgba(221, 232, 242, 0.5);
}

.hero.mood-sad {
  --hero-flower: #a8c8dc;
}

.letter-wrap.mood-sad {
  --paper-spine: rgba(186, 211, 229, 0.36);
  --paper-margin: rgba(118, 159, 190, 0.58);
  --tape-left-bg: rgba(206, 224, 237, 0.78);
  --tape-right-bg: rgba(220, 239, 230, 0.72);
  --petal-a-bg: rgba(171, 204, 226, 0.72);
  --petal-b-bg: rgba(221, 232, 242, 0.76);
  --petal-c-bg: rgba(220, 239, 230, 0.72);
  --petal-radius: 50% 50% 62% 62%;
}

.image-card.mood-sad {
  --image-glow: rgba(171, 204, 226, 0.44);
}

.hero.mood-tired {
  --hero-flower: #cfc2e8;
}

.letter-wrap.mood-tired {
  --paper-spine: rgba(233, 228, 244, 0.45);
  --paper-margin: rgba(179, 159, 211, 0.52);
  --tape-left-bg: rgba(233, 228, 244, 0.8);
  --tape-right-bg: rgba(247, 237, 200, 0.64);
  --petal-a-bg: rgba(207, 194, 232, 0.68);
  --petal-b-bg: rgba(221, 232, 242, 0.72);
  --petal-c-bg: rgba(247, 220, 227, 0.58);
  --petal-radius: 46% 54% 48% 52%;
}

.image-card.mood-tired {
  --image-glow: rgba(207, 194, 232, 0.42);
}

.hero.mood-angry {
  --hero-flower: #ebb0b9;
}

.letter-wrap.mood-angry {
  --paper-spine: rgba(247, 220, 227, 0.42);
  --paper-margin: rgba(218, 122, 132, 0.54);
  --tape-left-bg: rgba(247, 220, 227, 0.82);
  --tape-right-bg: rgba(247, 237, 200, 0.7);
  --petal-a-bg: rgba(235, 176, 185, 0.74);
  --petal-b-bg: rgba(247, 210, 116, 0.62);
  --petal-c-bg: rgba(220, 239, 230, 0.68);
  --petal-radius: 54% 46% 56% 18%;
}

.image-card.mood-angry {
  --image-glow: rgba(235, 176, 185, 0.44);
}

.content {
  position: relative;
  z-index: 1;
  display: block;
  color: #3f4b4a;
  font-size: 32rpx;
  line-height: var(--paper-rule-height);
  white-space: pre-wrap;
  word-break: break-word;
  letter-spacing: 0;
}

.image-card {
  --image-start: #ffffff;
  --image-end: #f8fbf8;
  --image-glow: rgba(247, 237, 200, 0.55);

  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, var(--image-start) 0%, var(--image-end) 100%);
}

.image-card-glow {
  position: absolute;
  right: -66rpx;
  top: -70rpx;
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: var(--image-glow);
}

.image-title {
  position: relative;
  z-index: 1;
  display: block;
  margin-bottom: 18rpx;
  color: $moo-text;
  font-size: 28rpx;
  font-weight: 800;
}

.photo {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  margin-bottom: 18rpx;
  padding: 10rpx;
  border-radius: 20rpx;
  border: 1px solid rgba(231, 236, 232, 0.9);
  background: $moo-soft;
  box-shadow: 0 12rpx 28rpx rgba(71, 94, 115, 0.1);
  box-sizing: border-box;
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
  margin-top: 80rpx;
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
  font-size: 30rpx;
  font-weight: 800;
}

.empty-text {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.55;
}

@media screen and (min-width: 768px) {
  .page {
    padding: 24px 32px 56px;
  }

  .detail,
  .empty {
    max-width: 720px;
    margin-left: auto;
    margin-right: auto;
  }

  .back-chip {
    height: 38px;
    margin-bottom: 16px;
    padding: 0 16px;
    gap: 6px;
    font-size: 14px;
  }

  .back-arrow {
    font-size: 18px;
  }
}
</style>
