<template>
  <view class="page">
    <view class="profile">
      <text class="avatar">☁️</text>
      <view>
        <text class="name">{{ user ? user.username : '自用 Moo 日记' }}</text>
        <text class="desc">{{ user ? '已登录，SQLite 会保存你的日记' : '本地加密 · 登录后永久写入数据库' }}</text>
      </view>
    </view>

    <view class="panel account-panel">
      <text class="panel-title">存储服务地址</text>
      <input v-model="apiBase" class="input" placeholder="例如 http://192.168.1.104:8787" />
      <view class="login-actions">
        <button class="primary" @click="saveApiBase">保存地址</button>
        <button class="secondary" @click="resetApiBase">自动地址</button>
      </view>
      <text class="hint">真机小程序建议填写电脑局域网 IP，当前默认是 {{ currentApiBase }}</text>
    </view>

    <view v-if="!user" class="panel account-panel">
      <text class="panel-title">账号登录</text>
      <input v-model="username" class="input" placeholder="账号：字母、数字或下划线" />
      <input v-model="password" class="input" password placeholder="密码，至少 4 位" />
      <view class="login-actions">
        <button class="primary" @click="handleLogin">登录</button>
        <button class="secondary" @click="handleRegister">注册</button>
      </view>
      <text class="hint">登录后，数据会保存到项目的 server/data/moo-diary.sqlite。</text>
    </view>

    <view v-else class="panel">
      <view class="row" @click="syncUpload">
        <view>
          <text class="row-title">同步到数据库</text>
          <text class="row-sub">把当前本地日记写入 SQLite</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="divider"></view>
      <view class="row" @click="syncDownload">
        <view>
          <text class="row-title">从数据库恢复</text>
          <text class="row-sub">用 SQLite 保存的数据覆盖本地缓存</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="divider"></view>
      <view class="row" @click="backupDatabase">
        <view>
          <text class="row-title">备份 SQLite</text>
          <text class="row-sub">复制一份带时间戳的数据库文件</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="divider"></view>
      <view class="row" @click="handleLogout">
        <view>
          <text class="row-title danger">退出登录</text>
          <text class="row-sub">只退出账号，不删除本地日记</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="panel">
      <view class="row">
        <view>
          <text class="row-title">数字密码锁</text>
          <text class="row-sub">{{ passwordEnabled ? '已开启，密码以哈希保存' : '未开启' }}</text>
        </view>
        <switch :checked="passwordEnabled" color="#6F95BF" @change="togglePassword" />
      </view>
    </view>

    <view v-if="pinPanelVisible" class="pin-mask">
      <view class="pin-card">
        <text class="pin-title">{{ pinMode === 'set' ? '设置数字密码' : '验证当前密码' }}</text>
        <text class="pin-subtitle">{{ pinMode === 'set' ? '请输入 4 位数字，以后进入私密内容会先验证' : '关闭密码锁前，需要先输入当前 4 位密码' }}</text>
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
      </view>
    </view>

    <view class="panel">
      <view class="row" @click="copyBackup">
        <view>
          <text class="row-title">本地 JSON 备份</text>
          <text class="row-sub">复制日记备份到剪贴板</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="divider"></view>
      <view class="row" @click="pasteBackup">
        <view>
          <text class="row-title">导入 JSON 备份</text>
          <text class="row-sub">从剪贴板恢复以前导出的内容</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="stats">
      <view class="stat">
        <text>{{ total }}</text>
        <text>全部日记</text>
      </view>
      <view class="stat">
        <text>{{ hiddenTotal }}</text>
        <text>私密日记</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { currentUser, login, logout, register } from '@/utils/account'
import { createDatabaseBackup, getApiBase, setApiBase as saveApiBaseValue } from '@/utils/api'
import {
  disablePassword,
  exportBackup,
  getAllDiaries,
  importBackup,
  isPasswordEnabled,
  mergeServerDiaries,
  pullServerDiaries,
  pushServerDiaries,
  setPassword,
  verifyPassword
} from '@/utils/storage'
import { markUnlocked, requireUnlock } from '@/utils/locker'

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
const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const currentApiBase = computed(() => getApiBase())

function refresh() {
  user.value = currentUser()
  passwordEnabled.value = isPasswordEnabled()
  apiBase.value = getApiBase()
  const diaries = getAllDiaries()
  total.value = diaries.length
  hiddenTotal.value = diaries.filter(item => item.hidden).length
}

function saveApiBase() {
  saveApiBaseValue(apiBase.value)
  refresh()
  uni.showToast({ title: '地址已保存', icon: 'success' })
}

function resetApiBase() {
  saveApiBaseValue('')
  refresh()
  uni.showToast({ title: '已恢复默认', icon: 'none' })
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
    await mergeServerDiaries(result.diaries || [])
    uni.showToast({ title: '已登录并同步', icon: 'success' })
    password.value = ''
    refresh()
  } catch (error) {
    uni.showToast({ title: error.message || '登录失败', icon: 'none' })
  }
}

async function handleRegister() {
  if (!validateAccount()) return
  try {
    await register(username.value, password.value)
    await pushServerDiaries()
    uni.showToast({ title: '注册成功', icon: 'success' })
    password.value = ''
    refresh()
  } catch (error) {
    uni.showToast({ title: error.message || '注册失败', icon: 'none' })
  }
}

async function handleLogout() {
  await logout()
  uni.showToast({ title: '已退出', icon: 'success' })
  refresh()
}

async function syncUpload() {
  try {
    const result = await pushServerDiaries()
    uni.showToast({ title: `已同步 ${result.count || total.value} 篇`, icon: 'none' })
  } catch (error) {
    uni.showToast({ title: error.message || '同步失败', icon: 'none' })
  }
}

async function syncDownload() {
  uni.showModal({
    title: '从数据库恢复？',
    content: '这会用 SQLite 保存的数据覆盖当前本地缓存。',
    confirmColor: '#6F95BF',
    success: async result => {
      if (!result.confirm) return
      try {
        const count = await pullServerDiaries()
        uni.showToast({ title: `已恢复 ${count} 篇`, icon: 'none' })
        refresh()
      } catch (error) {
        uni.showToast({ title: error.message || '恢复失败', icon: 'none' })
      }
    }
  })
}

async function backupDatabase() {
  try {
    const result = await createDatabaseBackup()
    uni.showModal({
      title: '备份完成',
      content: result.path,
      showCancel: false
    })
  } catch (error) {
    uni.showToast({ title: error.message || '备份失败', icon: 'none' })
  }
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
    uni.showToast({ title: '当前密码不正确', icon: 'none' })
    return
  }

  disablePassword()
  uni.showToast({ title: '已关闭', icon: 'success' })
  cancelPin()
}

function togglePassword(event) {
  openPinPanel(event.detail.value ? 'set' : 'disable')
}

function copyBackup() {
  uni.setClipboardData({
    data: exportBackup(),
    success() {
      uni.showToast({ title: '备份已复制', icon: 'success' })
    }
  })
}

function pasteBackup() {
  uni.getClipboardData({
    success(result) {
      uni.showModal({
        title: '导入备份？',
        content: '这会覆盖当前本地日记。',
        confirmColor: '#D45D66',
        success(confirm) {
          if (!confirm.confirm) return
          try {
            const count = importBackup(result.data)
            uni.showToast({ title: `已导入 ${count} 篇`, icon: 'none' })
            refresh()
          } catch (error) {
            uni.showToast({ title: error.message || '导入失败', icon: 'none' })
          }
        }
      })
    }
  })
}

onShow(async () => {
  const ok = await requireUnlock()
  if (!ok) return
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
</style>
