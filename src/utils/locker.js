import { STORAGE_KEYS } from './constants'
import { isPasswordEnabled } from './storage'

const UNLOCK_TTL = 5 * 60 * 1000

export function isUnlocked() {
  const unlockedAt = Number(uni.getStorageSync(STORAGE_KEYS.UNLOCKED_AT) || 0)
  return Date.now() - unlockedAt < UNLOCK_TTL
}

export function markUnlocked() {
  uni.setStorageSync(STORAGE_KEYS.UNLOCKED_AT, Date.now())
}

function getCurrentRoute() {
  const pages = getCurrentPages()
  return pages[pages.length - 1]?.route || ''
}

export async function requireUnlock() {
  if (!isPasswordEnabled() || isUnlocked()) return true
  if (getCurrentRoute() === 'pages/lock/index') return false

  return new Promise(resolve => {
    uni.navigateTo({
      url: '/pages/lock/index',
      success: () => resolve(false),
      fail: () => resolve(false)
    })
  })
}
