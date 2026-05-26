<template>
  <view class="page">
    <view class="profile">
      <text class="avatar">☁️</text>
      <view>
        <text class="name">{{ user ? user.username : '自用 Moo 日记' }}</text>
        <text class="desc">{{ user ? '已登录，日记会自动保存到 SQLite 数据库' : '登录后使用真实数据库永久保存日记' }}</text>
      </view>
    </view>

    <text class="group-title">存储服务</text>
    <view class="panel account-panel" @click="expandApiBase = true">
      <view class="api-summary" v-if="!expandApiBase">
        <text class="panel-title">存储服务地址</text>
        <text class="api-url">{{ currentApiBase }}</text>
      </view>
      <template v-else>
        <text class="panel-title">存储服务地址</text>
        <input v-model="apiBase" class="input" placeholder="例如 http://192.168.1.104:8787" @click.stop />
        <view class="login-actions api-actions">
          <button class="primary" @click.stop="saveApiBase">保存地址</button>
          <button class="secondary" @click.stop="testCurrentApiBase">测试连接</button>
          <button class="secondary" @click.stop="collapseApiBase">收起</button>
        </view>
        <text v-if="apiTestText" class="api-status" :class="{ ok: apiTestOk }">{{ apiTestText }}</text>
        <view v-if="apiSuggestedBases.length" class="api-suggestions">
          <text
            v-for="url in apiSuggestedBases"
            :key="url"
            class="api-chip"
            @click.stop="applySuggestedApiBase(url)"
          >
            {{ url }}
          </text>
        </view>
        <text class="hint">不同设备要看到同一账号的图片，请填写同一个后端服务地址。当前是 {{ currentApiBase }}</text>
      </template>
    </view>

    <text class="group-title">账号</text>
    <view v-if="!user" class="panel account-panel">
      <text class="panel-title">账号登录</text>
      <input v-model="username" class="input" placeholder="账号：字母、数字或下划线" />
      <input v-model="password" class="input" password placeholder="密码，至少 4 位" />
      <view class="login-actions">
        <button class="primary" @click="handleLogin">登录</button>
        <button class="secondary" @click="handleRegister">注册</button>
      </view>
      <text class="hint">登录后，日记、图片路径和标签都会保存到后端 SQLite 数据库。</text>
    </view>

    <view v-else class="panel">
      <view class="row" @click="handleFlushPending">
        <view>
          <text class="row-title">数据库状态</text>
          <text class="row-sub">{{ hasPendingSync() ? '有未同步的数据，点击立即同步' : '当前账号的数据会自动读写 SQLite，无需手动同步' }}</text>
        </view>
        <text class="state-pill" :class="{ pending: hasPendingSync() }">{{ hasPendingSync() ? '待同步' : '已连接' }}</text>
      </view>
      <view class="divider"></view>
      <view class="row" @click="handleLogout">
        <view>
          <text class="row-title danger">退出登录</text>
          <text class="row-sub">只退出账号，不删除数据库中的日记</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <text class="group-title">安全</text>
    <view class="panel">
      <view class="row">
        <view>
          <text class="row-title">数字密码锁</text>
          <text class="row-sub">{{ passwordEnabled ? '已开启，5 分钟内免重复输入' : '未开启' }}</text>
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
            {{ pinMode === 'set' ? '开启密码锁' : '确认关闭' }}
          </button>
        </template>
      </view>
    </view>

    <view class="stats">
      <view class="stat" @click="total > 0 && showAllDiaries()">
        <text>{{ total }}</text>
        <text>全部日记</text>
      </view>
      <view class="stat stat-plain" @click="handleViewHidden">
        <text class="private-label">私密日记</text>
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
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { currentUser, login, logout, register } from '@/utils/account'
import { getApiBase, request, setApiBase as saveApiBaseValue, testApiBase } from '@/utils/api'
import {
  disablePassword,
  flushPendingSync,
  getAllDiaries,
  hasPendingSync,
  isPasswordEnabled,
  mergeLatestFromServer,
  replaceDiaries,
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
const username = ref('')
const password = ref('')
const apiBase = ref('')
const pinPanelVisible = ref(false)
const pinMode = ref('set')
const pinInput = ref('')
const expandApiBase = ref(false)
const showHiddenDiaries = ref(false)
const hiddenDiaries = ref([])
const accountPassword = ref('')
const apiTestText = ref('')
const apiTestOk = ref(false)
const apiSuggestedBases = ref([])
const customTags = ref([])
const newTag = ref('')
const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const currentApiBase = ref(getApiBase())

const pinTitle = computed(() => {
  if (pinMode.value === 'set') return '设置数字密码'
  return '验证当前密码'
})

const pinSubtitle = computed(() => {
  if (pinMode.value === 'set') return '请输入 4 位数字，以后进入私密内容会先验证'
  return '关闭密码锁前，需要先输入当前 4 位密码'
})

function refresh() {
  user.value = currentUser()
  passwordEnabled.value = isPasswordEnabled()
  syncApiBaseState()
  expandApiBase.value = false
  const diaries = getAllDiaries()
  total.value = diaries.filter(item => !item.hidden).length
  hiddenTotal.value = diaries.filter(item => item.hidden).length
  customTags.value = getCustomTags()
}

function syncApiBaseState() {
  currentApiBase.value = getApiBase()
  apiBase.value = currentApiBase.value
}

function updateApiSuggestions(result) {
  apiSuggestedBases.value = Array.isArray(result?.lanUrls)
    ? result.lanUrls.filter(url => url && url !== apiBase.value)
    : []
}

async function handleFlushPending() {
  if (!hasPendingSync()) return
  uni.showLoading({ title: '同步中...' })
  try {
    const count = await flushPendingSync()
    uni.hideLoading()
    if (count > 0) {
      uni.showToast({ title: `已同步 ${count} 篇`, icon: 'success' })
    } else {
      uni.showToast({ title: '没有待同步的数据', icon: 'none' })
    }
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '同步失败', icon: 'none' })
  }
}

function saveApiBase() {
  saveApiBaseValue(apiBase.value)
  collapseApiBase()
  uni.showToast({ title: '地址已保存', icon: 'success' })
}

async function testCurrentApiBase() {
  apiTestText.value = '正在测试连接...'
  apiTestOk.value = false
  try {
    const result = await testApiBase(apiBase.value)
    updateApiSuggestions(result)
    apiTestOk.value = true
    apiTestText.value = `连接正常：${result.database || 'storage'}`
  } catch (error) {
    apiSuggestedBases.value = []
    apiTestText.value = error.message || '连接失败'
  }
}

function applySuggestedApiBase(url) {
  apiBase.value = url
  apiTestText.value = ''
  apiTestOk.value = false
}

function collapseApiBase() {
  expandApiBase.value = false
  apiTestText.value = ''
  apiTestOk.value = false
  apiSuggestedBases.value = []
  syncApiBaseState()
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

function validateAccount() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return false
  }
  return true
}

async function handleLogin() {
  if (!validateAccount()) return
  try {
    const result = await login(username.value, password.value)
    replaceDiaries(result.diaries || [])
    uni.showToast({ title: '已连接数据库', icon: 'success' })
    password.value = ''
    refresh()
  } catch (error) {
    uni.showToast({ title: error.message || '登录失败', icon: 'none' })
  }
}

async function handleRegister() {
  if (!validateAccount()) return
  try {
    const result = await register(username.value, password.value)
    replaceDiaries(result.diaries || [])
    uni.showToast({ title: '注册成功', icon: 'success' })
    password.value = ''
    refresh()
  } catch (error) {
    uni.showToast({ title: error.message || '注册失败', icon: 'none' })
  }
}

async function handleLogout() {
  await logout()
  closeHiddenDiaries()
  uni.showToast({ title: '已退出', icon: 'success' })
  refresh()
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

.group-title {
  display: block;
  margin: 30rpx 6rpx 14rpx;
  color: $moo-muted;
  font-size: 23rpx;
  font-weight: 700;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background: #ffffff;
  font-size: 42rpx;
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

.panel {
  margin-bottom: 18rpx;
  padding: 0 24rpx;
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.account-panel {
  padding: 26rpx 24rpx;
}

.api-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.api-url {
  color: $moo-muted;
  font-size: 22rpx;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-title {
  display: block;
  margin-bottom: 18rpx;
  color: $moo-text;
  font-size: 29rpx;
  font-weight: 800;
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

.login-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
  margin-top: 12rpx;
}

.api-actions {
  grid-template-columns: 1fr 1fr 1fr;
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

.hint {
  display: block;
  margin-top: 18rpx;
  color: $moo-muted;
  font-size: 22rpx;
  line-height: 1.5;
}

.api-status {
  display: block;
  margin-top: 16rpx;
  color: #d45d66;
  font-size: 23rpx;
}

.api-status.ok {
  color: $moo-primary;
}

.api-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}

.api-chip {
  max-width: 100%;
  padding: 8rpx 14rpx;
  overflow: hidden;
  border-radius: 999px;
  color: $moo-primary;
  background: $moo-primary-light;
  font-size: 21rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 126rpx;
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

.row-title.danger {
  color: #d45d66;
}

.row-sub {
  margin-top: 8rpx;
  color: $moo-muted;
  font-size: 23rpx;
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

.state-pill.pending {
  color: #d45d66;
  background: #f7dce3;
}

.divider {
  height: 1rpx;
  background: #eef2f4;
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

.stat-plain {
  display: flex;
  align-items: center;
  justify-content: center;
}

.private-label {
  color: #d45d66 !important;
  font-size: 26rpx !important;
  font-weight: 600 !important;
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
  font-size: 36rpx;
  flex-shrink: 0;
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
  padding: 4rpx 12rpx;
  border-radius: 999px;
  color: #d45d66;
  background: rgba(212, 93, 102, 0.12);
  font-size: 20rpx;
  flex-shrink: 0;
}
</style>
