import { STORAGE_KEYS } from './constants'
import { decrypt, encrypt, hashText } from './crypto'
import { toDateKey } from './date'
import { getAuthToken, getAuthUser, normalizeAssetUrl, request, toStoredImageUrl } from './api'

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

function normalizeDiaryForStorage(item = {}) {
  return {
    ...item,
    images: Array.isArray(item.images) ? item.images.map(toStoredImageUrl).filter(Boolean) : [],
    tags: Array.isArray(item.tags) ? item.tags : []
  }
}

function normalizeDiaryForDisplay(item = {}) {
  return {
    ...item,
    images: Array.isArray(item.images) ? item.images.map(normalizeAssetUrl).filter(Boolean) : [],
    tags: Array.isArray(item.tags) ? item.tags : []
  }
}

function readDiaries() {
  const key = diaryStorageKey()
  const diaries = readEncrypted(key, null)
  if (Array.isArray(diaries)) return diaries.map(normalizeDiaryForStorage)

  const user = getAuthUser()
  const legacy = readEncrypted(STORAGE_KEYS.DIARIES, null)
  if (user && Array.isArray(legacy)) {
    const normalized = legacy.map(normalizeDiaryForStorage)
    writeEncrypted(key, normalized)
    uni.removeStorageSync(STORAGE_KEYS.DIARIES)
    return normalized
  }

  return []
}

function writeDiaries(diaries) {
  writeEncrypted(diaryStorageKey(), diaries.map(normalizeDiaryForStorage))
}

function sortedDiaries(diaries) {
  return diaries.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function requireDatabaseLogin() {
  if (!getAuthToken()) {
    throw new Error('请先登录账号，日记会直接保存到数据库')
  }
}

async function readServerDiaries() {
  requireDatabaseLogin()
  const result = await request('/api/diaries')
  return Array.isArray(result.diaries) ? result.diaries.map(normalizeDiaryForStorage) : []
}

export function getDiaries(options = {}) {
  const diaries = sortedDiaries(readDiaries()).map(normalizeDiaryForDisplay)
  return options.includeHidden ? diaries : diaries.filter(item => !item.hidden)
}

export function getAllDiaries() {
  return getDiaries({ includeHidden: true })
}

export function getDiary(id) {
  return getAllDiaries().find(item => item.id === id) || null
}

export async function saveDiary(input) {
  requireDatabaseLogin()

  const now = new Date().toISOString()
  const diaries = await readServerDiaries()
  const payload = normalizeDiaryForStorage({
    moodId: 'calm',
    weatherId: 'sunny',
    content: '',
    images: [],
    tags: [],
    hidden: false,
    date: toDateKey(),
    ...input
  })

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
  await pushServerDiaries()
  return normalizeDiaryForDisplay(saved)
}

export async function deleteDiary(id) {
  requireDatabaseLogin()
  const result = await request(`/api/diaries/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  if (Array.isArray(result.diaries)) {
    replaceDiaries(result.diaries)
  } else {
    writeDiaries(readDiaries().filter(item => item.id !== id))
  }
}

export function getDiariesByDate(date, options = {}) {
  return getDiaries(options).filter(item => item.date === date)
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

const PENDING_SYNC_KEY = 'moo_vibe_pending_sync_v1'

export function hasPendingSync() {
  return uni.getStorageSync(PENDING_SYNC_KEY) === '1'
}

export function markPendingSync() {
  uni.setStorageSync(PENDING_SYNC_KEY, '1')
}

export function clearPendingSync() {
  uni.removeStorageSync(PENDING_SYNC_KEY)
}

export async function flushPendingSync() {
  if (!hasPendingSync()) return 0
  if (!getAuthToken()) return 0
  try {
    const result = await pushServerDiaries()
    return result?.count || 0
  } catch {
    return 0
  }
}

export function pushServerDiaries() {
  requireDatabaseLogin()
  return request('/api/diaries', {
    method: 'PUT',
    data: {
      diaries: sortedDiaries(readDiaries())
    }
  }).then(result => {
    if (Array.isArray(result.diaries)) {
      replaceDiaries(result.diaries)
    }
    clearPendingSync()
    return result
  }).catch(error => {
    markPendingSync()
    throw error
  })
}

export async function mergeLatestFromServer(options = {}) {
  if (!getAuthToken()) return 0
  const now = Date.now()
  const last = Number(uni.getStorageSync(STORAGE_KEYS.LAST_AUTO_SYNC) || 0)
  if (!options.force && now - last < 10 * 1000) {
    return getAllDiaries().length
  }
  const result = await request('/api/diaries')
  const serverDiaries = Array.isArray(result.diaries) ? result.diaries : []
  const merged = mergeDiaryLists(readDiaries(), serverDiaries)
  replaceDiaries(merged)
  uni.setStorageSync(STORAGE_KEYS.LAST_AUTO_SYNC, now)
  return merged.length
}

// Merge two diary lists: for each id, keep the version with newer updatedAt.
// Entries present in only one list are included as-is.
function mergeDiaryLists(local, server) {
  const merged = new Map(local.map(d => [d.id, d]))
  for (const item of server) {
    const existing = merged.get(item.id)
    if (!existing || (item.updatedAt || '') >= (existing.updatedAt || '')) {
      merged.set(item.id, item)
    }
  }
  return Array.from(merged.values())
}
