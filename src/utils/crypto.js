const KEY_STORAGE = 'moo_vibe_encryption_key'
const LEGACY_APP_KEY = 'moo-vibe-diary-local-key'
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='

function utf8ToBinary(text) {
  return unescape(encodeURIComponent(text))
}

function binaryToUtf8(binary) {
  return decodeURIComponent(escape(binary))
}

function toBase64(binary) {
  let output = ''
  let i = 0
  while (i < binary.length) {
    const chr1 = binary.charCodeAt(i++)
    const chr2 = binary.charCodeAt(i++)
    const chr3 = binary.charCodeAt(i++)
    const enc1 = chr1 >> 2
    const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4)
    let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6)
    let enc4 = chr3 & 63
    if (Number.isNaN(chr2)) {
      enc3 = 64
      enc4 = 64
    } else if (Number.isNaN(chr3)) {
      enc4 = 64
    }
    output += B64.charAt(enc1) + B64.charAt(enc2) + B64.charAt(enc3) + B64.charAt(enc4)
  }
  return output
}

function fromBase64(input) {
  let output = ''
  let i = 0
  const clean = String(input).replace(/[^A-Za-z0-9+/=]/g, '')
  while (i < clean.length) {
    const enc1 = B64.indexOf(clean.charAt(i++))
    const enc2 = B64.indexOf(clean.charAt(i++))
    const enc3 = B64.indexOf(clean.charAt(i++))
    const enc4 = B64.indexOf(clean.charAt(i++))
    const chr1 = (enc1 << 2) | (enc2 >> 4)
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
    const chr3 = ((enc3 & 3) << 6) | enc4
    output += String.fromCharCode(chr1)
    if (enc3 !== 64) output += String.fromCharCode(chr2)
    if (enc4 !== 64) output += String.fromCharCode(chr3)
  }
  return output
}

function xor(binary, key) {
  let output = ''
  for (let i = 0; i < binary.length; i += 1) {
    output += String.fromCharCode(binary.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return output
}

function getOrCreateDeviceKey() {
  let key = uni.getStorageSync(KEY_STORAGE)
  if (key && key.length >= 32) return key
  // Generate a random 64-character device-specific key
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
  key = ''
  for (let i = 0; i < 64; i += 1) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  uni.setStorageSync(KEY_STORAGE, key)
  return key
}

export function hashText(text) {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  const input = utf8ToBinary(String(text))
  for (let i = 0; i < input.length; i += 1) {
    h1 ^= input.charCodeAt(i)
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= input.charCodeAt(i) + i
    h2 = Math.imul(h2, 0x85ebca6b)
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`
}

// Format: "v2:<hmac>:<base64-encoded-xor-payload>"
const V2_PREFIX = 'v2:'

export function encrypt(value) {
  const json = JSON.stringify(value)
  const key = getOrCreateDeviceKey()
  const payload = toBase64(xor(utf8ToBinary(json), key))
  const hmac = hashText(`${key}:${payload}`)
  return `${V2_PREFIX}${hmac}:${payload}`
}

export function decrypt(payload, fallback = null) {
  if (!payload) return fallback

  // Try v2 format first
  if (typeof payload === 'string' && payload.startsWith(V2_PREFIX)) {
    try {
      const rest = payload.slice(V2_PREFIX.length)
      const colonIndex = rest.indexOf(':')
      if (colonIndex === -1) return fallback
      const hmac = rest.slice(0, colonIndex)
      const data = rest.slice(colonIndex + 1)
      const key = getOrCreateDeviceKey()
      if (hashText(`${key}:${data}`) !== hmac) return fallback
      const binary = xor(fromBase64(data), key)
      return JSON.parse(binaryToUtf8(binary))
    } catch {
      return fallback
    }
  }

  // Fall back to legacy fixed-key format
  try {
    return JSON.parse(binaryToUtf8(xor(fromBase64(payload), LEGACY_APP_KEY)))
  } catch {
    return fallback
  }
}