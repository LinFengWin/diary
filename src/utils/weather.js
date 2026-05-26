// WMO weather code → our weatherId mapping
// https://open-meteo.com/en/docs#weathervariables
import { getAuthToken, request } from './api'

const WMO_MAP = {
  0: 'sunny',
  1: 'sunny',
  2: 'cloudy',
  3: 'cloudy',
  45: 'foggy',
  48: 'foggy',
  51: 'rainy',
  53: 'rainy',
  55: 'rainy',
  56: 'rainy',
  57: 'rainy',
  61: 'rainy',
  63: 'rainy',
  65: 'rainy',
  66: 'rainy',
  67: 'rainy',
  71: 'snowy',
  73: 'snowy',
  75: 'snowy',
  77: 'snowy',
  80: 'rainy',
  81: 'rainy',
  82: 'rainy',
  85: 'snowy',
  86: 'snowy',
  95: 'rainy',
  96: 'rainy',
  99: 'rainy'
}

const CACHE_KEY = 'moo_vibe_realtime_weather'
const LAST_SUCCESS_KEY = 'moo_vibe_last_success_weather'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCached() {
  try {
    const raw = uni.getStorageSync(CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.date === dateKey() && Date.now() - data.fetchedAt < CACHE_TTL) return data.weatherId
    return null
  } catch {
    return null
  }
}

function setCache(weatherId) {
  try {
    const payload = {
      weatherId,
      date: dateKey(),
      fetchedAt: Date.now()
    }
    uni.setStorageSync(CACHE_KEY, JSON.stringify(payload))
    uni.setStorageSync(LAST_SUCCESS_KEY, JSON.stringify(payload))
  } catch {
    // cache write failure is non-critical
  }
}

function getLastSuccessfulWeather() {
  try {
    const raw = uni.getStorageSync(LAST_SUCCESS_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return data.weatherId || null
  } catch {
    return null
  }
}

async function getAccountCachedWeather() {
  if (!getAuthToken()) return null
  try {
    const result = await request(`/api/weather?date=${dateKey()}`)
    return result?.weather?.weatherId || null
  } catch {
    return null
  }
}

function saveAccountCachedWeather(weatherId) {
  if (!getAuthToken()) return
  request('/api/weather', {
    method: 'PUT',
    data: {
      date: dateKey(),
      weatherId
    }
  }).catch(() => {})
}

export async function fetchRealtimeWeather() {
  // Check cache first
  const cached = getCached()
  if (cached) return cached

  const accountCached = await getAccountCachedWeather()
  if (accountCached) {
    setCache(accountCached)
    return accountCached
  }

  try {
    // Get location
    const location = await new Promise((resolve, reject) => {
      uni.getLocation({
        type: 'wgs84',
        isHighAccuracy: false,
        success: res => resolve({ lat: res.latitude, lng: res.longitude }),
        fail: () => reject(new Error('定位失败'))
      })
    })

    // Fetch weather from Open-Meteo (free, no API key required)
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current=weather_code&timezone=auto`,
        method: 'GET',
        success: result => resolve(result.data || {}),
        fail: () => reject(new Error('天气服务请求失败'))
      })
    })

    const code = res?.current?.weather_code
    if (code === undefined || code === null) throw new Error('未获取到天气数据')

    const weatherId = WMO_MAP[code] || 'cloudy'
    setCache(weatherId)
    saveAccountCachedWeather(weatherId)
    return weatherId
  } catch {
    return getCached() || getLastSuccessfulWeather()
  }
}
