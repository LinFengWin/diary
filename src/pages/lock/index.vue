<template>
  <view class="lock-page">
    <view class="lock-card">
      <view class="lock-icon">⌘</view>
      <text class="title">数字密码锁</text>
      <text class="subtitle">用数字键盘解锁你的日记</text>

      <view class="dots">
        <view
          v-for="index in 4"
          :key="index"
          class="dot"
          :class="{ active: pin.length >= index }"
        ></view>
      </view>

      <view class="keypad">
        <button
          v-for="number in numbers"
          :key="number"
          class="key"
          hover-class="key-hover"
          @click="appendPin(number)"
        >
          {{ number }}
        </button>
        <button class="key ghost" hover-class="key-hover" @click="goBack">退出</button>
        <button class="key" hover-class="key-hover" @click="appendPin('0')">0</button>
        <button class="key ghost" hover-class="key-hover" @click="deletePin">删除</button>
      </view>

      <button class="unlock" hover-class="unlock-hover" @click="unlock">解锁</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { markUnlocked } from '@/utils/locker'
import { verifyPassword } from '@/utils/storage'

const pin = ref('')
const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function appendPin(number) {
  if (pin.value.length >= 4) return
  pin.value += number
}

function deletePin() {
  pin.value = pin.value.slice(0, -1)
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/today/index' })
}

function unlock() {
  if (!/^\d{4}$/.test(pin.value)) {
    uni.showToast({ title: '请输入 4 位数字密码', icon: 'none' })
    return
  }
  if (!verifyPassword(pin.value)) {
    pin.value = ''
    uni.showToast({ title: '密码不正确', icon: 'none' })
    return
  }
  markUnlocked()
  uni.showToast({ title: '已解锁', icon: 'success' })
  setTimeout(() => goBack(), 220)
}
</script>

<style lang="scss" scoped>
.lock-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40rpx 34rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f6faf8 0%, #eef6f8 100%);
}

.lock-card {
  width: 100%;
  max-width: 680rpx;
  padding: 54rpx 34rpx 38rpx;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 18rpx 50rpx rgba(89, 112, 126, 0.14);
  box-sizing: border-box;
  text-align: center;
}

.lock-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 22rpx;
  border-radius: 50%;
  color: #6f95bf;
  background: #edf5ff;
  font-size: 44rpx;
  font-weight: 800;
}

.title,
.subtitle {
  display: block;
}

.title {
  color: #243038;
  font-size: 42rpx;
  font-weight: 900;
}

.subtitle {
  margin-top: 12rpx;
  color: #7f8b94;
  font-size: 25rpx;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 18rpx;
  margin: 46rpx 0 42rpx;
}

.dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #dce5ec;
}

.dot.active {
  background: #6f95bf;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18rpx;
}

.key {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  border-radius: 18px;
  color: #243038;
  background: #f4f7f8;
  font-size: 34rpx;
  font-weight: 800;
}

.key::after,
.unlock::after {
  border: 0;
}

.ghost {
  color: #77848d;
  font-size: 26rpx;
  font-weight: 700;
}

.key-hover {
  background: #e9f2fa;
}

.unlock {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  margin-top: 28rpx;
  border-radius: 999px;
  color: #ffffff;
  background: #6f95bf;
  font-size: 29rpx;
  font-weight: 800;
}

.unlock-hover {
  background: #5e83aa;
}
</style>
