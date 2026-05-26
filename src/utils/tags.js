import { FIXED_TAGS, STORAGE_KEYS } from './constants'

function normalizeTag(tag) {
  return String(tag || '').trim().replace(/^#/, '')
}

function uniqueTags(tags) {
  const seen = new Set()
  return tags
    .map(normalizeTag)
    .filter(Boolean)
    .filter(tag => {
      if (seen.has(tag)) return false
      seen.add(tag)
      return true
    })
}

export function getCustomTags() {
  const saved = uni.getStorageSync(STORAGE_KEYS.CUSTOM_TAGS)
  return Array.isArray(saved) ? uniqueTags(saved) : []
}

export function saveCustomTags(tags) {
  const normalized = uniqueTags(tags).filter(tag => !FIXED_TAGS.includes(tag))
  uni.setStorageSync(STORAGE_KEYS.CUSTOM_TAGS, normalized)
  return normalized
}

export function getManagedTags(diaries = []) {
  const used = []
  diaries.forEach(item => {
    if (Array.isArray(item.tags)) used.push(...item.tags)
  })
  return uniqueTags([...FIXED_TAGS, ...getCustomTags(), ...used])
}

export function addCustomTag(tag) {
  const next = saveCustomTags([...getCustomTags(), tag])
  return next
}

export function removeCustomTag(tag) {
  const normalized = normalizeTag(tag)
  const next = getCustomTags().filter(item => item !== normalized)
  return saveCustomTags(next)
}
