export const STORAGE_KEYS = {
  DIARIES: 'moo_vibe_diaries_v1',
  PASSWORD: 'moo_vibe_password_v1',
  PASSWORD_ENABLED: 'moo_vibe_password_enabled_v1',
  SETTINGS: 'moo_vibe_settings_v1',
  UNLOCKED_AT: 'moo_vibe_unlocked_at_v1',
  AUTH_TOKEN: 'moo_vibe_auth_token_v1',
  AUTH_USER: 'moo_vibe_auth_user_v1',
  API_BASE: 'moo_vibe_api_base_v1',
  LAST_AUTO_SYNC: 'moo_vibe_last_auto_sync_v1',
  DRAFT_PREFIX: 'moo_vibe_draft_'
}

export const MOODS = [
  { id: 'happy', label: '开心', emoji: '😊', score: 5, color: '#F7EDC8' },
  { id: 'calm', label: '平静', emoji: '😌', score: 4, color: '#DDE8F2' },
  { id: 'sad', label: '难过', emoji: '😢', score: 2, color: '#DCEFE6' },
  { id: 'tired', label: '疲惫', emoji: '😪', score: 3, color: '#E9E4F4' },
  { id: 'angry', label: '生气', emoji: '😠', score: 1, color: '#F7DCE3' }
]

export const WEATHERS = [
  { id: 'sunny', label: '晴', icon: '☀️' },
  { id: 'cloudy', label: '阴', icon: '☁️' },
  { id: 'rainy', label: '雨', icon: '🌧️' },
  { id: 'snowy', label: '雪', icon: '❄️' },
  { id: 'foggy', label: '雾', icon: '🌫️' }
]

export const FIXED_TAGS = [
  '聊天',
  '工作',
  '学习',
  '睡眠',
  '运动',
  '饮食',
  '家人',
  '朋友',
  '旅行',
  '复盘'
]

export function getMood(id) {
  return MOODS.find(item => item.id === id) || MOODS[1]
}

export function getWeather(id) {
  return WEATHERS.find(item => item.id === id) || null
}
