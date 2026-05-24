import { STORAGE_KEYS } from './constants'

export function getApiBase() {
  const saved = uni.getStorageSync(STORAGE_KEYS.API_BASE)
  if (saved) return saved
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:8787`
  }
  return 'http://192.168.1.104:8787'
}

export function setApiBase(value) {
  const normalized = String(value || '').trim().replace(/\/$/, '')
  if (!normalized) {
    uni.removeStorageSync(STORAGE_KEYS.API_BASE)
    return getApiBase()
  }
  uni.setStorageSync(STORAGE_KEYS.API_BASE, normalized)
  return normalized
}

export function getAuthToken() {
  return uni.getStorageSync(STORAGE_KEYS.AUTH_TOKEN) || ''
}

export function setAuth(token, user) {
  uni.setStorageSync(STORAGE_KEYS.AUTH_TOKEN, token)
  uni.setStorageSync(STORAGE_KEYS.AUTH_USER, user)
}

export function clearAuth() {
  uni.removeStorageSync(STORAGE_KEYS.AUTH_TOKEN)
  uni.removeStorageSync(STORAGE_KEYS.AUTH_USER)
  uni.removeStorageSync(STORAGE_KEYS.UNLOCKED_AT)
  uni.removeStorageSync(STORAGE_KEYS.LAST_AUTO_SYNC)
}

export function getAuthUser() {
  return uni.getStorageSync(STORAGE_KEYS.AUTH_USER) || null
}

export function request(path, options = {}) {
  const token = getAuthToken()
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${getApiBase()}${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {})
      },
      success(result) {
        const data = result.data || {}
        if (result.statusCode >= 200 && result.statusCode < 300) {
          resolve(data)
          return
        }
        reject(new Error(data.message || `请求失败：${result.statusCode}`))
      },
      fail(error) {
        reject(new Error(error.errMsg || '无法连接本机存储服务'))
      }
    })
  })
}

export function uploadImage(filePath) {
  const token = getAuthToken()
  if (!token) {
    return Promise.reject(new Error('请先登录账号再上传图片'))
  }

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${getApiBase()}/api/upload`,
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${token}`
      },
      success(result) {
        let data = result.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch (error) {
            reject(new Error('上传返回格式不正确'))
            return
          }
        }
        if (result.statusCode >= 200 && result.statusCode < 300 && data.url) {
          resolve(data.url)
          return
        }
        reject(new Error(data.message || `上传失败：${result.statusCode}`))
      },
      fail(error) {
        reject(new Error(error.errMsg || '无法上传图片'))
      }
    })
  })
}

export function createDatabaseBackup() {
  return request('/api/backup', { method: 'POST' })
}
