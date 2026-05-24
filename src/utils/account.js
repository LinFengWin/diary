import { clearAuth, getAuthUser, request, setAuth } from './api'

export function currentUser() {
  return getAuthUser()
}

export function isLoggedIn() {
  return !!currentUser()
}

export async function register(username, password) {
  const result = await request('/api/register', {
    method: 'POST',
    data: { username, password }
  })
  setAuth(result.token, result.user)
  return result
}

export async function login(username, password) {
  const result = await request('/api/login', {
    method: 'POST',
    data: { username, password }
  })
  setAuth(result.token, result.user)
  return result
}

export async function logout() {
  try {
    await request('/api/logout', { method: 'POST' })
  } catch (error) {
    // 本地退出优先，后端不可用时也允许退出。
  }
  clearAuth()
}
