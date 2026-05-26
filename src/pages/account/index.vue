<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">账号管理</text>
      <text class="hero-sub">{{ user ? '管理同步、天气缓存和存储服务' : '登录后可在多设备同步日记' }}</text>
    </view>

    <text class="group-title">存储服务</text>
    <view class="panel service-card">
      <view class="service-head">
        <view class="service-title-wrap">
          <text class="panel-title compact">存储服务</text>
          <text class="row-sub">{{ serviceStatusDescription }}</text>
        </view>
        <text class="state-pill" :class="{ pending: apiConnectionState === 'fail', checking: apiConnectionState === 'checking' }">
          {{ serviceStatusText }}
        </text>
      </view>
      <view class="service-address">
        <text class="address-label">当前地址</text>
        <text class="address-value">{{ currentApiBase }}</text>
      </view>
      <view v-if="expandApiBase" class="api-editor">
        <input v-model="apiBase" class="input" placeholder="例如 http://192.168.1.104:8787" />
        <view class="login-actions api-actions">
          <button class="primary" @click="saveApiBase">保存地址</button>
          <button class="secondary" @click="testCurrentApiBase">测试连接</button>
          <button class="secondary" @click="collapseApiBase">取消</button>
        </view>
        <text v-if="apiTestText" class="api-status" :class="{ ok: apiTestOk }">{{ apiTestText }}</text>
        <view v-if="apiSuggestedBases.length" class="api-suggestions">
          <text
            v-for="url in apiSuggestedBases"
            :key="url"
            class="api-chip"
            @click="applySuggestedApiBase(url)"
          >
            {{ url }}
          </text>
        </view>
        <text class="hint">同一账号在不同设备使用时，要填写同一个后端服务地址。</text>
      </view>
      <view v-else class="service-actions">
        <button class="secondary" @click="testSavedApiBase">
          {{ apiConnectionState === 'checking' ? '测试中' : '测试连接' }}
        </button>
        <button class="primary" @click="openApiEditor">修改地址</button>
      </view>
    </view>

    <text class="group-title">账号</text>
    <view v-if="!user" class="panel account-panel">
      <view class="auth-tabs">
        <text class="auth-tab" :class="{ active: authMode === 'login' }" @click="switchAuthMode('login')">登录账号</text>
        <text class="auth-tab" :class="{ active: authMode === 'register' }" @click="switchAuthMode('register')">创建账号</text>
      </view>
      <text class="auth-title">{{ authTitle }}</text>
      <text class="auth-subtitle">{{ authSubtitle }}</text>
      <input v-model="username" class="input" placeholder="账号：字母、数字或下划线" />
      <view class="password-field">
        <input
          v-model="password"
          class="input password-input"
          :password="!passwordVisible"
          placeholder="账号密码，至少 4 位"
        />
        <text class="password-toggle" @click="passwordVisible = !passwordVisible">
          {{ passwordVisible ? '隐藏' : '显示' }}
        </text>
      </view>
      <button class="auth-submit" @click="handleAuthSubmit">{{ authButtonText }}</button>
      <text class="hint">账号密码用于登录和同步；本机隐私锁只保护当前设备。</text>
    </view>

    <view v-else class="panel account-center">
      <view class="account-head">
        <view>
          <text class="panel-title compact">账号中心</text>
          <text class="row-sub">当前账号：{{ user.username }}</text>
        </view>
        <text class="state-pill">{{ hasPendingSync() ? '待同步' : '已同步' }}</text>
      </view>
      <view class="account-grid">
        <view class="account-metric">
          <text>当前账号</text>
          <text>{{ user.username }}</text>
        </view>
        <view class="account-metric">
          <text>后端连接</text>
          <text>{{ serviceStatusText }}</text>
        </view>
        <view class="account-metric">
          <text>上次同步</text>
          <text>{{ lastSyncText }}</text>
        </view>
        <view class="account-metric">
          <text>天气缓存</text>
          <text>{{ weatherCacheText }}</text>
        </view>
        <view class="account-metric">
          <text>数据库日记</text>
          <text>{{ diaryTotal }} 篇</text>
        </view>
        <view class="account-metric">
          <text>私密日记</text>
          <text>{{ hiddenTotal }} 篇</text>
        </view>
      </view>
      <view class="divider"></view>
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
          <text class="row-sub">只退出当前设备，不删除云端日记</text>
        </view>
        <text class="arrow">›</text>
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
  flushPendingSync,
  getAllDiaries,
  hasPendingSync,
  mergeLatestFromServer,
  replaceDiaries
} from '@/utils/storage'
import { STORAGE_KEYS, getWeather } from '@/utils/constants'
import { toDateKey } from '@/utils/date'
import { requireUnlock } from '@/utils/locker'

const total = ref(0)
const hiddenTotal = ref(0)
const user = ref(null)
const username = ref('')
const password = ref('')
const authMode = ref('login')
const passwordVisible = ref(false)
const apiBase = ref('')
const expandApiBase = ref(false)
const apiTestText = ref('')
const apiTestOk = ref(false)
const apiConnectionState = ref('unknown')
const apiSuggestedBases = ref([])
const lastSyncAt = ref(0)
const weatherCacheText = ref('未登录')
const currentApiBase = ref(getApiBase())

const diaryTotal = computed(() => total.value + hiddenTotal.value)
const authTitle = computed(() => authMode.value === 'login' ? '欢迎回来' : '创建你的日记账号')
const authSubtitle = computed(() => (
  authMode.value === 'login'
    ? '登录后会从 SQLite 数据库同步你的日记。'
    : '账号创建后，当前设备会自动连接到新账号。'
))
const authButtonText = computed(() => authMode.value === 'login' ? '登录' : '创建账号')

const serviceStatusText = computed(() => {
  if (apiConnectionState.value === 'ok') return '已连接'
  if (apiConnectionState.value === 'checking') return '检查中'
  if (apiConnectionState.value === 'fail') return '连接失败'
  return '待检查'
})

const serviceStatusDescription = computed(() => {
  if (apiConnectionState.value === 'ok') return '后端服务可用，日记和图片会写入数据库。'
  if (apiConnectionState.value === 'checking') return '正在确认后端服务是否可用。'
  if (apiConnectionState.value === 'fail') return '当前地址暂时连不上，可以修改或重新测试。'
  return '默认使用当前设备同地址的 8787 端口。'
})

const lastSyncText = computed(() => formatRelativeTime(lastSyncAt.value))

function formatRelativeTime(value) {
  const timestamp = Number(value || 0)
  if (!timestamp) return '尚未同步'
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function refresh() {
  user.value = currentUser()
  syncApiBaseState()
  expandApiBase.value = false
  const diaries = getAllDiaries()
  total.value = diaries.filter(item => !item.hidden).length
  hiddenTotal.value = diaries.filter(item => item.hidden).length
  lastSyncAt.value = Number(uni.getStorageSync(STORAGE_KEYS.LAST_AUTO_SYNC) || 0)
  if (!user.value) weatherCacheText.value = '未登录'
}

function syncApiBaseState() {
  currentApiBase.value = getApiBase()
  apiBase.value = currentApiBase.value
}

function switchAuthMode(mode) {
  authMode.value = mode
  password.value = ''
}

function openApiEditor() {
  syncApiBaseState()
  expandApiBase.value = true
  apiTestText.value = ''
  apiTestOk.value = false
  apiSuggestedBases.value = []
}

function updateApiSuggestions(result) {
  apiSuggestedBases.value = Array.isArray(result?.lanUrls)
    ? result.lanUrls.filter(url => url && url !== apiBase.value)
    : []
}

async function testSavedApiBase() {
  apiConnectionState.value = 'checking'
  try {
    const result = await testApiBase(currentApiBase.value)
    updateApiSuggestions(result)
    apiConnectionState.value = 'ok'
  } catch {
    apiSuggestedBases.value = []
    apiConnectionState.value = 'fail'
  }
}

async function refreshWeatherCacheStatus() {
  if (!user.value) {
    weatherCacheText.value = '未登录'
    return
  }
  weatherCacheText.value = '检查中'
  try {
    const result = await request(`/api/weather?date=${toDateKey()}`)
    const weather = getWeather(result?.weather?.weatherId)
    weatherCacheText.value = weather ? `${weather.icon} ${weather.label}` : '今日暂无缓存'
  } catch {
    weatherCacheText.value = '读取失败'
  }
}

async function handleFlushPending() {
  if (!hasPendingSync()) return
  uni.showLoading({ title: '同步中...' })
  try {
    const count = await flushPendingSync()
    uni.hideLoading()
    lastSyncAt.value = Date.now()
    uni.setStorageSync(STORAGE_KEYS.LAST_AUTO_SYNC, lastSyncAt.value)
    uni.showToast({ title: count > 0 ? `已同步 ${count} 篇` : '没有待同步的数据', icon: count > 0 ? 'success' : 'none' })
    refresh()
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '同步失败', icon: 'none' })
  }
}

function saveApiBase() {
  const saved = saveApiBaseValue(apiBase.value)
  currentApiBase.value = saved
  apiBase.value = saved
  expandApiBase.value = false
  apiTestText.value = ''
  apiTestOk.value = false
  apiSuggestedBases.value = []
  uni.showToast({ title: '地址已保存', icon: 'success' })
  testSavedApiBase()
}

async function testCurrentApiBase() {
  apiTestText.value = '正在测试连接...'
  apiTestOk.value = false
  try {
    const result = await testApiBase(apiBase.value)
    updateApiSuggestions(result)
    apiTestOk.value = true
    apiTestText.value = `连接正常：${result.database || 'storage'}`
    if (apiBase.value === currentApiBase.value) apiConnectionState.value = 'ok'
  } catch (error) {
    apiSuggestedBases.value = []
    apiTestText.value = error.message || '连接失败'
    if (apiBase.value === currentApiBase.value) apiConnectionState.value = 'fail'
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

function validateAccount() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return false
  }
  return true
}

function handleAuthSubmit() {
  if (authMode.value === 'login') handleLogin()
  else handleRegister()
}

async function handleLogin() {
  if (!validateAccount()) return
  try {
    const result = await login(username.value, password.value)
    replaceDiaries(result.diaries || [])
    uni.showToast({ title: '已连接数据库', icon: 'success' })
    password.value = ''
    refresh()
    testSavedApiBase()
    refreshWeatherCacheStatus()
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
    authMode.value = 'login'
    refresh()
    testSavedApiBase()
    refreshWeatherCacheStatus()
  } catch (error) {
    uni.showToast({ title: error.message || '注册失败', icon: 'none' })
  }
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '只退出当前设备，不会删除云端日记。',
    confirmText: '退出',
    confirmColor: '#d45d66',
    success: async result => {
      if (!result.confirm) return
      await logout()
      uni.showToast({ title: '已退出', icon: 'success' })
      refresh()
    }
  })
}

onShow(async () => {
  const ok = await requireUnlock()
  if (!ok) return
  try {
    await mergeLatestFromServer({ force: true })
  } catch (error) {
    // Account center still shows local cache when the backend is temporarily unreachable.
  }
  refresh()
  testSavedApiBase()
  refreshWeatherCacheStatus()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 30rpx;
  box-sizing: border-box;
}

.hero {
  margin-bottom: 24rpx;
  padding: 30rpx;
  border-radius: 20px;
  background: $moo-primary-light;
  box-shadow: $moo-shadow;
}

.hero-title,
.hero-sub {
  display: block;
}

.hero-title {
  color: $moo-text;
  font-size: 36rpx;
  font-weight: 900;
}

.hero-sub {
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
  border-radius: $moo-radius;
  background: $moo-white;
  box-shadow: $moo-shadow;
}

.service-card,
.account-center,
.account-panel {
  padding: 26rpx 24rpx;
}

.service-head,
.account-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.service-title-wrap {
  min-width: 0;
}

.panel-title {
  display: block;
  margin-bottom: 18rpx;
  color: $moo-text;
  font-size: 29rpx;
  font-weight: 800;
}

.panel-title.compact {
  margin-bottom: 0;
}

.row-sub {
  display: block;
  margin-top: 8rpx;
  color: $moo-muted;
  font-size: 23rpx;
  line-height: 1.45;
}

.service-address {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin: 22rpx 0 18rpx;
  padding: 18rpx 20rpx;
  border-radius: 14px;
  background: $moo-bg;
}

.address-label,
.address-value {
  display: block;
}

.address-label {
  flex-shrink: 0;
  color: $moo-muted;
  font-size: 22rpx;
}

.address-value {
  min-width: 0;
  overflow: hidden;
  color: $moo-text;
  font-size: 23rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 6rpx;
  border-radius: 999px;
  background: $moo-bg;
}

.auth-tab {
  height: 66rpx;
  border-radius: 999px;
  color: $moo-muted;
  text-align: center;
  font-size: 25rpx;
  font-weight: 700;
  line-height: 66rpx;
}

.auth-tab.active {
  color: $moo-text;
  background: #ffffff;
  box-shadow: 0 8rpx 20rpx rgba(71, 94, 115, 0.08);
}

.auth-title,
.auth-subtitle {
  display: block;
}

.auth-title {
  margin-top: 24rpx;
  color: $moo-text;
  font-size: 32rpx;
  font-weight: 900;
}

.auth-subtitle {
  margin: 8rpx 0 20rpx;
  color: $moo-muted;
  font-size: 23rpx;
  line-height: 1.45;
}

.password-field {
  position: relative;
}

.password-input {
  padding-right: 104rpx;
}

.password-toggle {
  position: absolute;
  right: 18rpx;
  top: 0;
  height: 82rpx;
  color: $moo-primary;
  font-size: 23rpx;
  font-weight: 700;
  line-height: 82rpx;
}

.auth-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  margin-top: 12rpx;
  border-radius: 999px;
  color: #ffffff;
  background: $moo-primary;
  font-size: 28rpx;
  font-weight: 800;
}

.login-actions,
.service-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
  margin-top: 12rpx;
}

.api-actions {
  grid-template-columns: 1fr 1fr 1fr;
}

.api-editor {
  margin-top: 18rpx;
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

.state-pill {
  flex-shrink: 0;
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

.state-pill.checking {
  color: #8c6d2f;
  background: #f7edc8;
}

.account-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14rpx;
  margin: 22rpx 0;
}

.account-metric {
  min-width: 0;
  padding: 18rpx;
  border-radius: 14px;
  background: $moo-bg;
}

.account-metric text:first-child,
.account-metric text:last-child {
  display: block;
}

.account-metric text:first-child {
  color: $moo-muted;
  font-size: 21rpx;
}

.account-metric text:last-child {
  margin-top: 8rpx;
  overflow: hidden;
  color: $moo-text;
  font-size: 25rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.divider {
  height: 1rpx;
  background: #eef2f4;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 126rpx;
}

.row-title {
  display: block;
  color: $moo-text;
  font-size: 28rpx;
  font-weight: 700;
}

.row-title.danger {
  color: #d45d66;
}

.arrow {
  color: #b7c2cb;
  font-size: 46rpx;
}
</style>
