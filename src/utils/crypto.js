const KEY = 'moo-vibe-diary-local-key'
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

function xor(binary) {
  let output = ''
  for (let i = 0; i < binary.length; i += 1) {
    output += String.fromCharCode(binary.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length))
  }
  return output
}

export function encrypt(value) {
  const json = JSON.stringify(value)
  return toBase64(xor(utf8ToBinary(json)))
}

export function decrypt(payload, fallback = null) {
  try {
    return JSON.parse(binaryToUtf8(xor(fromBase64(payload))))
  } catch (error) {
    return fallback
  }
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
