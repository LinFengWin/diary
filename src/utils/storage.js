import { STORAGE_KEYS } from './constants'
import { decrypt, encrypt, hashText } from './crypto'
import { toDateKey } from './date'
import { getAuthToken, getAuthUser, request } from './api'

function readEncrypted(key, fallback) {
  const raw = uni.getStorageSync(key)
  if (!raw) return fallback
  return decrypt(raw, fallback)
}

function writeEncrypted(key, value) {
  uni.setStorageSync(key, encrypt(value))
}

function diaryStorageKey() {
  const user = getAuthUser()
  return user && user.id
    ? `${STORAGE_KEYS.DIARIES}_${user.id}`
    : `${STORAGE_KEYS.DIARIES}_guest`
}

function readDiaries() {
  const key = diaryStorageKey()
  const diaries = readEncrypted(key, null)
  if (Array.isArray(diaries)) return diaries

  const user = getAuthUser()
  const legacy = readEncrypted(STORAGE_KEYS.DIARIES, null)
  if (user && Array.isArray(legacy)) {
    writeEncrypted(key, legacy)
    uni.removeStorageSync(STORAGE_KEYS.DIARIES)
    return legacy
  }

  return []
}

function writeDiaries(diaries) {
  writeEncrypted(diaryStorageKey(), diaries)
}

function queueServerSync() {
  if (!getAuthToken()) return
  pushServerDiaries().catch(() => {
    uni.setStorageSync('moo_vibe_pending_sync_v1', '1')
  })
}

export function getDiaries(options = {}) {
  const diaries = readDiaries()
  const sorted = Array.isArray(diaries)
    ? diaries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : []
  return options.includeHidden ? sorted : sorted.filter(item => !item.hidden)
}

export function getAllDiaries() {
  return getDiaries({ includeHidden: true })
}

export function getDiary(id) {
  return getAllDiaries().find(item => item.id === id) || null
}

export function saveDiary(input) {
  const now = new Date().toISOString()
  const diaries = getAllDiaries()
  const payload = {
    moodId: 'calm',
    weatherId: 'sunny',
    content: '',
    images: [],
    tags: [],
    hidden: false,
    date: toDateKey(),
    ...input
  }

  let saved = null
  if (payload.id) {
    const index = diaries.findIndex(item => item.id === payload.id)
    if (index >= 0) {
      diaries[index] = {
        ...diaries[index],
        ...payload,
        updatedAt: now
      }
      saved = diaries[index]
    } else {
      saved = {
        ...payload,
        createdAt: now,
        updatedAt: now
      }
      diaries.unshift(saved)
    }
  } else {
    saved = {
      ...payload,
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now
    }
    diaries.unshift(saved)
  }

  writeDiaries(diaries)
  queueServerSync()
  return saved
}

export function deleteDiary(id) {
  const diaries = getAllDiaries()
  writeDiaries(diaries.filter(item => item.id !== id))
  queueServerSync()
}

export function getDiariesByDate(date, options = {}) {
  return getDiaries(options).filter(item => item.date === date)
}

export function getDiaryDates(year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return new Set(getDiaries().filter(item => item.date.startsWith(prefix)).map(item => item.date))
}

export function exportBackup() {
  return JSON.stringify({
    app: 'moo-vibe-diary',
    version: 1,
    exportedAt: new Date().toISOString(),
    diaries: getAllDiaries()
  }, null, 2)
}

export function importBackup(text) {
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed.diaries)) {
    throw new Error('备份内容不正确')
  }
  writeDiaries(parsed.diaries)
  queueServerSync()
  return parsed.diaries.length
}

export function replaceDiaries(diaries) {
  if (!Array.isArray(diaries)) return 0
  writeDiaries(diaries)
  return diaries.length
}

export function setPassword(password) {
  const salt = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  writeEncrypted(STORAGE_KEYS.PASSWORD, {
    version: 2,
    salt,
    hash: hashText(`${salt}:${password}`)
  })
  uni.setStorageSync(STORAGE_KEYS.PASSWORD_ENABLED, '1')
}

export function isPasswordEnabled() {
  return uni.getStorageSync(STORAGE_KEYS.PASSWORD_ENABLED) === '1'
}

export function verifyPassword(password) {
  const saved = readEncrypted(STORAGE_KEYS.PASSWORD, null)
  if (!saved) return true
  if (saved.version === 2) return saved.hash === hashText(`${saved.salt}:${password}`)
  return saved.password === password
}

export function disablePassword() {
  uni.removeStorageSync(STORAGE_KEYS.PASSWORD)
  uni.removeStorageSync(STORAGE_KEYS.PASSWORD_ENABLED)
  uni.removeStorageSync(STORAGE_KEYS.UNLOCKED_AT)
}

export async function syncToCloud() {
  return pushServerDiaries()
}

export async function pushServerDiaries() {
  if (!getAuthToken()) {
    throw new Error('请先登录账号')
  }
  const result = await request('/api/diaries', {
    method: 'PUT',
    data: {
      diaries: getAllDiaries()
    }
  })
  uni.removeStorageSync('moo_vibe_pending_sync_v1')
  return result
}

export async function pullServerDiaries() {
  if (!getAuthToken()) {
    throw new Error('请先登录账号')
  }
  const result = await request('/api/diaries')
  const count = replaceDiaries(result.diaries || [])
  uni.removeStorageSync('moo_vibe_pending_sync_v1')
  return count
}

export async function mergeServerDiaries(serverDiaries = []) {
  if (!Array.isArray(serverDiaries)) return getAllDiaries().length
  const map = new Map()
  getAllDiaries().concat(serverDiaries).forEach(item => {
    const existed = map.get(item.id)
    if (!existed || new Date(item.updatedAt || item.createdAt) > new Date(existed.updatedAt || existed.createdAt)) {
      map.set(item.id, item)
    }
  })
  const merged = Array.from(map.values())
  writeDiaries(merged)
  await pushServerDiaries()
  return merged.length
}

export async function mergeLatestFromServer(options = {}) {
  if (!getAuthToken()) return 0
  const now = Date.now()
  const last = Number(uni.getStorageSync(STORAGE_KEYS.LAST_AUTO_SYNC) || 0)
  if (!options.force && now - last < 60 * 1000) {
    return getAllDiaries().length
  }
  const result = await request('/api/diaries')
  const count = await mergeServerDiaries(result.diaries || [])
  uni.setStorageSync(STORAGE_KEYS.LAST_AUTO_SYNC, now)
  return count
}
