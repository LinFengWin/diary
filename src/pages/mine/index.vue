<template>
  <view class="page">
    <view class="profile" @click="goAccount">
      <text class="avatar">☁️</text>
      <view class="profile-main">
        <text class="name">{{ user ? user.username : '临风日记' }}</text>
        <text class="desc">账号、同步和存储服务</text>
      </view>
      <view class="profile-right">
        <text class="profile-status">账号管理</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <text class="group-title">本机安全</text>
    <view class="panel">
      <view class="row">
        <view>
          <text class="row-title">本机隐私锁</text>
          <text class="row-sub">{{ passwordEnabled ? '已开启，只保护当前设备，5 分钟内免重复输入' : '未开启，和账号密码相互独立' }}</text>
        </view>
        <switch :checked="passwordEnabled" color="#6F95BF" @change="togglePassword" />
      </view>
    </view>

    <text class="group-title">数据与标签</text>
    <view class="panel tag-panel">
      <view class="tag-head">
        <view>
          <text class="row-title">我的常用标签</text>
          <text class="row-sub">编辑器会优先显示这些标签</text>
        </view>
        <text class="state-pill">{{ customTags.length }}</text>
      </view>
      <view class="tag-input-row">
        <input v-model="newTag" class="input tag-input" placeholder="新增标签" />
        <button class="tag-add" @click="handleAddTag">添加</button>
      </view>
      <view v-if="customTags.length" class="tag-list">
        <text v-for="tag in customTags" :key="tag" class="tag-chip" @click="handleRemoveTag(tag)">
          #{{ tag }} ×
        </text>
      </view>
      <text v-else class="hint">还没有自定义标签，先添加几个你常用的主题。</text>
    </view>

    <view class="stats">
      <view class="stat" @click="total > 0 && showAllDiaries()">
        <text>{{ total }}</text>
        <text>可见日记</text>
      </view>
      <view class="stat" @click="handleViewHidden">
        <text class="private-label">{{ hiddenTotal }}</text>
        <text>私密日记</text>
      </view>
    </view>

    <view v-if="showHiddenDiaries && hiddenDiaries.length" class="hidden-list">
      <view class="section-head">
        <text class="section-title">私密日记（{{ hiddenDiaries.length }}）</text>
        <text class="close-link" @click="closeHiddenDiaries">关闭</text>
      </view>
      <view v-for="item in hiddenDiaries" :key="item.id" class="entry" @click="openDiary(item.id)">
        <text class="entry-emoji">{{ getMood(item.moodId).emoji }}</text>
        <view class="entry-main">
          <text class="entry-title">{{ getMood(item.moodId).label }} · {{ formatDate(item.date) }}</text>
          <text class="entry-content">{{ item.content ? (item.content.length > 40 ? item.content.slice(0, 40) + '...' : item.content) : '没有写文字' }}</text>
        </view>
        <text class="private-badge">私密</text>
      </view>
    </view>

    <view v-if="pinPanelVisible" class="pin-mask">
      <view class="pin-card">
        <template v-if="pinMode === 'view-hidden'">
          <text class="pin-title">查看私密日记</text>
          <text class="pin-subtitle">输入账号密码验证身份</text>
          <input v-model="accountPassword" class="input" password placeholder="输入登录密码" />
          <view class="login-actions">
            <button class="primary" @click="verifyAccountPassword">验证</button>
            <button class="secondary" @click="cancelPin">取消</button>
          </view>
        </template>
        <template v-else>
          <text class="pin-title">{{ pinTitle }}</text>
          <text class="pin-subtitle">{{ pinSubtitle }}</text>
          <view class="pin-dots">
            <view
              v-for="index in 4"
              :key="index"
              class="pin-dot"
              :class="{ active: pinInput.length >= index }"
            ></view>
          </view>
          <view class="pin-keypad">
            <button
              v-for="number in keypadNumbers"
              :key="number"
              class="pin-key"
              hover-class="pin-key-hover"
              @click="appendPin(number)"
            >
              {{ number }}
            </button>
            <button class="pin-key ghost" hover-class="pin-key-hover" @click="cancelPin">取消</button>
            <button class="pin-key" hover-class="pin-key-hover" @click="appendPin('0')">0</button>
            <button class="pin-key ghost" hover-class="pin-key-hover" @click="deletePin">删除</button>
          </view>
          <button class="pin-confirm" hover-class="pin-confirm-hover" @click="confirmPin">
            {{ pinMode === 'set' ? '开启隐私锁' : '确认关闭' }}
          </button>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { currentUser } from '@/utils/account'
import { request } from '@/utils/api'
import {
  disablePassword,
  getAllDiaries,
  isPasswordEnabled,
  mergeLatestFromServer,
  setPassword,
  verifyPassword
} from '@/utils/storage'
import { getMood } from '@/utils/constants'
import { formatDate } from '@/utils/date'
import { markUnlocked, requireUnlock } from '@/utils/locker'
import { addCustomTag, getCustomTags, removeCustomTag } from '@/utils/tags'

const passwordEnabled = ref(false)
const total = ref(0)
const hiddenTotal = ref(0)
const user = ref(null)
const pinPanelVisible = ref(false)
const pinMode = ref('set')
const pinInput = ref('')
const showHiddenDiaries = ref(false)
const hiddenDiaries = ref([])
const accountPassword = ref('')
const customTags = ref([])
const newTag = ref('')
const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const pinTitle = computed(() => {
  if (pinMode.value === 'set') return '设置本机隐私锁'
  return '验证当前密码'
})

const pinSubtitle = computed(() => {
  if (pinMode.value === 'set') return '请输入 4 位数字，只用于保护当前设备。'
  return '关闭本机隐私锁前，需要先输入当前 4 位数字。'
})

function refresh() {
  user.value = currentUser()
  passwordEnabled.value = isPasswordEnabled()
  const diaries = getAllDiaries()
  total.value = diaries.filter(item => !item.hidden).length
  hiddenTotal.value = diaries.filter(item => item.hidden).length
  customTags.value = getCustomTags()
}

function goAccount() {
  uni.navigateTo({ url: '/pages/account/index' })
}

function handleAddTag() {
  const tag = newTag.value.trim().replace(/^#/, '')
  if (!tag) {
    uni.showToast({ title: '请输入标签', icon: 'none' })
    return
  }
  customTags.value = addCustomTag(tag)
  newTag.value = ''
  uni.showToast({ title: '标签已添加', icon: 'success' })
}

function handleRemoveTag(tag) {
  customTags.value = removeCustomTag(tag)
}

function handleViewHidden() {
  if (!hiddenTotal.value) {
    uni.showToast({ title: '没有私密日记', icon: 'none' })
    return
  }
  accountPassword.value = ''
  pinMode.value = 'view-hidden'
  pinPanelVisible.value = true
}

async function verifyAccountPassword() {
  if (!accountPassword.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }
  uni.showLoading({ title: '验证中...' })
  try {
    await request('/api/verify-password', {
      method: 'POST',
      data: { password: accountPassword.value }
    })
    uni.hideLoading()
    pinPanelVisible.value = false
    accountPassword.value = ''
    hiddenDiaries.value = getAllDiaries().filter(item => item.hidden)
    showHiddenDiaries.value = true
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '密码不正确', icon: 'none' })
  }
}

function showAllDiaries() {
  uni.switchTab({ url: '/pages/calendar/index' })
}

function closeHiddenDiaries() {
  showHiddenDiaries.value = false
  hiddenDiaries.value = []
}

function openDiary(id) {
  uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
}

function openPinPanel(mode) {
  pinMode.value = mode
  pinInput.value = ''
  pinPanelVisible.value = true
}

function appendPin(number) {
  if (pinInput.value.length >= 4) return
  pinInput.value += number
}

function deletePin() {
  pinInput.value = pinInput.value.slice(0, -1)
}

function cancelPin() {
  pinPanelVisible.value = false
  pinInput.value = ''
  refresh()
}

function confirmPin() {
  const pin = pinInput.value
  if (!/^\d{4}$/.test(pin)) {
    uni.showToast({ title: '请输入 4 位数字', icon: 'none' })
    return
  }

  if (pinMode.value === 'set') {
    setPassword(pin)
    markUnlocked()
    uni.showToast({ title: '已开启', icon: 'success' })
    cancelPin()
    return
  }

  if (!verifyPassword(pin)) {
    pinInput.value = ''
    uni.showToast({ title: '密码不正确', icon: 'none' })
    return
  }

  disablePassword()
  uni.showToast({ title: '已关闭', icon: 'success' })
  cancelPin()
}

function togglePassword(event) {
  openPinPanel(event.detail.value ? 'set' : 'disable')
}

onShow(async () => {
  const ok = await requireUnlock()
  if (!ok) return
  try {
    await mergeLatestFromServer({ force: true })
  } catch (error) {
    // Mine still shows local cache when the backend is temporarily unreachable.
  }
  refresh()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 30rpx;
  box-sizing: border-box;
}

.profile {
  display: flex;
  align-items: center;
  gap: 22rpx;
  margin-bottom: 24rpx;
  padding: 30rpx;
  border-radius: 20px;
  background: $moo-primary-light;
  box-shadow: $moo-shadow;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background: #ffffff;
  font-size: 42rpx;
}

.profile-main {
  min-width: 0;
  flex: 1;
}

.profile-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.profile-status {
  padding: 8rpx 16rpx;
  border-radius: 999px;
  color: $moo-primary;
  background: #ffffff;
  font-size: 21rpx;
  font-weight: 700;
}

.name,
.desc {
  display: block;
}

.name {
  color: $moo-text;
  font-size: 33rpx;
  font-weight: 800;
}

.desc {
  margin-top: 8rpx;
  color: #66737c;
  font-size: 24rpx;
}

.group-title {
  display: block;
  margin: 30rpx 6rpx 14rpx;
  color: $moo-muted;
  font-size: 23rpx;
  font-weight: 700;
}

.panel {
  margin-bottom: 18rpx;
  padding: 0 24rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 126rpx;
  gap: 18rpx;
}

.row-title,
.row-sub {
  display: block;
}

.row-title {
  color: $moo-text;
  font-size: 28rpx;
  font-weight: 700;
}

.row-sub {
  margin-top: 8rpx;
  color: $moo-muted;
  font-size: 23rpx;
  line-height: 1.45;
}

.arrow {
  color: #b7c2cb;
  font-size: 46rpx;
}

.state-pill {
  padding: 8rpx 18rpx;
  border-radius: 999px;
  color: $moo-primary;
  background: $moo-primary-light;
  font-size: 22rpx;
  font-weight: 700;
}

.input {
  height: 82rpx;
  margin-bottom: 14rpx;
  padding: 0 20rpx;
  border-radius: 14px;
  color: $moo-text;
  background: $moo-bg;
  font-size: 26rpx;
  box-sizing: border-box;
}

.tag-panel {
  padding: 24rpx;
}

.tag-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.tag-input-row {
  display: grid;
  grid-template-columns: 1fr 144rpx;
  gap: 14rpx;
}

.tag-input {
  margin-bottom: 0;
}

.tag-add {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 82rpx;
  border-radius: 999px;
  color: #ffffff;
  background: $moo-primary;
  font-size: 26rpx;
  font-weight: 700;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.tag-chip {
  padding: 9rpx 18rpx;
  border-radius: 999px;
  color: $moo-primary;
  background: $moo-primary-light;
  font-size: 23rpx;
}

.hint {
  display: block;
  margin-top: 18rpx;
  color: $moo-muted;
  font-size: 22rpx;
  line-height: 1.5;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-top: 20rpx;
}

.stat {
  padding: 26rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
  text-align: center;
}

.stat text:first-child {
  display: block;
  color: $moo-primary;
  font-size: 42rpx;
  font-weight: 800;
}

.stat text:last-child {
  display: block;
  margin-top: 8rpx;
  color: $moo-muted;
  font-size: 23rpx;
}

.private-label {
  color: #d45d66 !important;
}

.hidden-list {
  margin-top: 20rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-title {
  color: $moo-text;
  font-size: 28rpx;
  font-weight: 700;
}

.close-link {
  color: $moo-primary;
  font-size: 24rpx;
}

.entry {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 12rpx;
  padding: 20rpx;
  border-radius: $moo-radius-sm;
  background: $moo-pink;
}

.entry-emoji {
  flex-shrink: 0;
  font-size: 36rpx;
}

.entry-main {
  min-width: 0;
  flex: 1;
}

.entry-title {
  display: block;
  color: $moo-text;
  font-size: 24rpx;
  font-weight: 700;
}

.entry-content {
  display: block;
  margin-top: 4rpx;
  color: #5d666d;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.private-badge {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 999px;
  color: #d45d66;
  background: rgba(212, 93, 102, 0.12);
  font-size: 20rpx;
}

.pin-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36rpx;
  background: rgba(36, 48, 56, 0.28);
  box-sizing: border-box;
}

.pin-card {
  width: 100%;
  max-width: 620rpx;
  max-height: calc(100vh - 120rpx);
  padding: 34rpx 28rpx 30rpx;
  overflow-y: auto;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 18rpx 46rpx rgba(52, 68, 78, 0.2);
  box-sizing: border-box;
}

.pin-title,
.pin-subtitle {
  display: block;
  text-align: center;
}

.pin-title {
  color: $moo-text;
  font-size: 34rpx;
  font-weight: 900;
}

.pin-subtitle {
  margin-top: 10rpx;
  color: $moo-muted;
  font-size: 24rpx;
  line-height: 1.45;
}

.pin-dots {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin: 30rpx 0 26rpx;
}

.pin-dot {
  width: 17rpx;
  height: 17rpx;
  border-radius: 50%;
  background: #dce5ec;
}

.pin-dot.active {
  background: $moo-primary;
}

.pin-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.pin-key {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 78rpx;
  border-radius: 16px;
  color: $moo-text;
  background: #f4f7f8;
  font-size: 32rpx;
  font-weight: 800;
}

.pin-key::after,
.pin-confirm::after {
  border: 0;
}

.pin-key.ghost {
  color: #77848d;
  font-size: 25rpx;
  font-weight: 700;
}

.pin-key-hover {
  background: #e9f2fa;
}

.pin-confirm {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  margin-top: 16rpx;
  border-radius: 999px;
  color: #ffffff;
  background: $moo-primary;
  font-size: 28rpx;
  font-weight: 800;
}

.pin-confirm-hover {
  background: #5e83aa;
}

.login-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
  margin-top: 12rpx;
}

.primary,
.secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 82rpx;
  border-radius: 999px;
  font-size: 27rpx;
  font-weight: 700;
}

.primary {
  color: #ffffff;
  background: $moo-primary;
}

.secondary {
  color: $moo-primary;
  background: $moo-primary-light;
}
</style>
