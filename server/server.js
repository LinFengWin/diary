const crypto = require('crypto')
const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { DatabaseSync } = require('node:sqlite')

const PORT = Number(process.env.MOO_API_PORT || 8787)
const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'moo-diary.sqlite')
const LEGACY_JSON_FILE = path.join(DATA_DIR, 'db.json')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const UPLOAD_TRASH_DIR = path.join(DATA_DIR, 'upload-trash')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')
const BUILD_DIR = path.resolve(__dirname, '..', 'dist', 'build', 'h5')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  if (!fs.existsSync(UPLOAD_TRASH_DIR)) fs.mkdirSync(UPLOAD_TRASH_DIR, { recursive: true })
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

function openDatabase() {
  ensureDataDir()
  const db = new DatabaseSync(DB_FILE)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diaries (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      date TEXT NOT NULL,
      mood_id TEXT NOT NULL,
      weather_id TEXT NOT NULL,
      content TEXT NOT NULL,
      images_json TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_diaries_user_date ON diaries(user_id, date);

    CREATE TABLE IF NOT EXISTS weather_cache (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      weather_id TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)
  migrateLegacyJson(db)
  return db
}

function migrateLegacyJson(db) {
  if (!fs.existsSync(LEGACY_JSON_FILE)) return
  const count = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
  if (count > 0) return

  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON_FILE, 'utf8'))
    const users = Array.isArray(legacy.users) ? legacy.users : []
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, salt, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    const insertDiary = db.prepare(`
      INSERT OR REPLACE INTO diaries (
        user_id, id, date, mood_id, weather_id, content,
        images_json, tags_json, hidden, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    db.exec('BEGIN')
    users.forEach(user => {
      insertUser.run(user.id, user.username, user.salt, user.passwordHash, user.createdAt)
      const diaries = legacy.diaries && Array.isArray(legacy.diaries[user.id]) ? legacy.diaries[user.id] : []
      diaries.forEach(item => insertDiary.run(
        user.id,
        item.id,
        item.date || '',
        item.moodId || 'calm',
        item.weatherId || 'sunny',
        item.content || '',
        JSON.stringify(item.images || []),
        JSON.stringify(item.tags || []),
        item.hidden ? 1 : 0,
        item.createdAt || new Date().toISOString(),
        item.updatedAt || item.createdAt || new Date().toISOString()
      ))
    })
    db.exec('COMMIT')
    fs.renameSync(LEGACY_JSON_FILE, `${LEGACY_JSON_FILE}.migrated`)
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch (_) {
      // Ignore rollback failures during best-effort migration.
    }
    console.warn(`Legacy JSON migration skipped: ${error.message}`)
  }
}

const db = openDatabase()

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex')
  return { salt, hash }
}

function verifyPassword(password, user) {
  const next = hashPassword(password, user.salt)
  return crypto.timingSafeEqual(Buffer.from(next.hash), Buffer.from(user.password_hash))
}

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  })
  res.end(JSON.stringify(payload))
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const typeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  }
  res.writeHead(200, {
    'Content-Type': typeMap[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    'Access-Control-Allow-Origin': '*'
  })
  fs.createReadStream(filePath).pipe(res)
}

function sendStatic(res, urlPath) {
  let filePath = path.join(BUILD_DIR, urlPath === '/' ? 'index.html' : urlPath)
  if (!fs.existsSync(filePath)) {
    // SPA fallback: serve index.html for client-side routes
    filePath = path.join(BUILD_DIR, 'index.html')
  }
  if (!filePath.startsWith(path.resolve(BUILD_DIR)) || !fs.existsSync(filePath)) {
    return false
  }
  sendFile(res, filePath)
  return true
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > 20 * 1024 * 1024) {
        req.destroy()
        reject(new Error('请求内容太大'))
      }
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(new Error('JSON 格式不正确'))
      }
    })
    req.on('error', reject)
  })
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      chunks.push(chunk)
      size += chunk.length
      if (size > 50 * 1024 * 1024) {
        req.destroy()
        reject(new Error('上传文件太大'))
      }
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType || '')
  if (!boundaryMatch) throw new Error('缺少上传边界')

  const boundary = Buffer.from(`--${boundaryMatch[1]}`)
  const parts = []
  let start = buffer.indexOf(boundary)
  while (start !== -1) {
    start += boundary.length
    if (buffer[start] === 45 && buffer[start + 1] === 45) break
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2

    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), start)
    if (headerEnd === -1) break
    const header = buffer.slice(start, headerEnd).toString('utf8')
    const nextBoundary = buffer.indexOf(boundary, headerEnd + 4)
    if (nextBoundary === -1) break

    const contentEnd = nextBoundary - 2
    const content = buffer.slice(headerEnd + 4, contentEnd)
    const nameMatch = /name="([^"]+)"/i.exec(header)
    const fileNameMatch = /filename="([^"]*)"/i.exec(header)
    const contentTypeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(header)
    parts.push({
      name: nameMatch ? nameMatch[1] : '',
      filename: fileNameMatch ? path.basename(fileNameMatch[1]) : '',
      contentType: contentTypeMatch ? contentTypeMatch[1].trim() : '',
      content
    })
    start = nextBoundary
  }
  return parts
}

function imageExt(part) {
  const fromName = path.extname(part.filename || '').toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fromName)) return fromName
  if (part.contentType === 'image/png') return '.png'
  if (part.contentType === 'image/gif') return '.gif'
  if (part.contentType === 'image/webp') return '.webp'
  return '.jpg'
}

function uploadRelativeFromUrl(url, userId) {
  try {
    const parsed = new URL(url)
    const marker = `/uploads/${userId}/`
    if (!parsed.pathname.startsWith(marker)) return ''
    return decodeURIComponent(parsed.pathname.slice('/uploads/'.length))
  } catch (error) {
    const marker = `/uploads/${userId}/`
    const index = String(url || '').indexOf(marker)
    if (index === -1) return ''
    return String(url).slice(index + '/uploads/'.length)
  }
}

function referencedUploadFiles(userId, diaries) {
  const files = new Set()
  diaries.forEach(item => {
    ;(item.images || []).forEach(url => {
      const relative = uploadRelativeFromUrl(url, userId)
      if (relative) files.add(relative.replace(/\\/g, '/'))
    })
  })
  return files
}

function cleanupUnusedUploads(userId, referencedFiles) {
  const userDir = path.join(UPLOAD_DIR, userId)
  if (!fs.existsSync(userDir)) return
  fs.readdirSync(userDir).forEach(name => {
    const relative = `${userId}/${name}`.replace(/\\/g, '/')
    if (!referencedFiles.has(relative)) {
      quarantineUpload(userId, name)
    }
  })
}

function quarantineUpload(userId, name) {
  const source = path.join(UPLOAD_DIR, userId, name)
  if (!fs.existsSync(source)) return

  const targetDir = path.join(UPLOAD_TRASH_DIR, userId)
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const target = path.join(targetDir, `${stamp}-${name}`)
  try {
    fs.renameSync(source, target)
  } catch (error) {
    fs.copyFileSync(source, target)
    fs.rmSync(source, { force: true })
  }
}

function getLanUrls(req) {
  const urls = new Set([`http://localhost:${PORT}`])
  const host = String(req.headers.host || '').split(':')[0]
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    urls.add(`http://${host}:${PORT}`)
  }

  Object.values(os.networkInterfaces()).flat().forEach(item => {
    if (!item || item.family !== 'IPv4' || item.internal) return
    urls.add(`http://${item.address}:${PORT}`)
  })

  return Array.from(urls)
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase()
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.created_at
  }
}

function rowToDiary(row) {
  return {
    id: row.id,
    date: row.date,
    moodId: row.mood_id,
    weatherId: row.weather_id,
    content: row.content,
    images: JSON.parse(row.images_json || '[]'),
    tags: JSON.parse(row.tags_json || '[]'),
    hidden: !!row.hidden,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function getDiaries(userId) {
  return db.prepare(`
    SELECT * FROM diaries
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC
  `).all(userId).map(rowToDiary)
}

function normalizeDateKey(value) {
  const key = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : ''
}

function isValidWeatherId(value) {
  return ['sunny', 'cloudy', 'rainy', 'snowy', 'foggy'].includes(String(value || ''))
}

function getAccountWeather(userId, date) {
  const row = db.prepare(`
    SELECT date, weather_id, updated_at
    FROM weather_cache
    WHERE user_id = ? AND date = ?
  `).get(userId, date)
  if (!row) return null
  return {
    date: row.date,
    weatherId: row.weather_id,
    updatedAt: row.updated_at
  }
}

function saveAccountWeather(userId, date, weatherId) {
  const updatedAt = new Date().toISOString()
  db.prepare(`
    INSERT OR REPLACE INTO weather_cache (user_id, date, weather_id, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, date, weatherId, updatedAt)
  return { date, weatherId, updatedAt }
}

function replaceDiaries(userId, diaries) {
  const existing = getDiaries(userId)
  const merged = new Map(existing.map(d => [d.id, d]))

  for (const item of diaries) {
    const existing = merged.get(item.id)
    if (!existing || (item.updatedAt || '') >= (existing.updatedAt || '')) {
      merged.set(item.id, item)
    }
  }

  const finalList = Array.from(merged.values())
  const insert = db.prepare(`
    INSERT OR REPLACE INTO diaries (
      user_id, id, date, mood_id, weather_id, content,
      images_json, tags_json, hidden, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM diaries WHERE user_id = ?').run(userId)
    finalList.forEach(item => {
      const now = new Date().toISOString()
      insert.run(
        userId,
        item.id,
        item.date || '',
        item.moodId || 'calm',
        item.weatherId || 'sunny',
        item.content || '',
        JSON.stringify(Array.isArray(item.images) ? item.images : []),
        JSON.stringify(Array.isArray(item.tags) ? item.tags : []),
        item.hidden ? 1 : 0,
        item.createdAt || now,
        item.updatedAt || item.createdAt || now
      )
    })
    db.exec('COMMIT')
    cleanupUnusedUploads(userId, referencedUploadFiles(userId, finalList))
    return finalList
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function deleteDiary(userId, diaryId) {
  const result = db.prepare('DELETE FROM diaries WHERE user_id = ? AND id = ?').run(userId, diaryId)
  cleanupUnusedUploads(userId, referencedUploadFiles(userId, getDiaries(userId)))
  return result.changes || 0
}

function createSqliteBackup() {
  db.exec('PRAGMA wal_checkpoint(FULL)')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `moo-diary-${stamp}.sqlite`
  const target = path.join(BACKUP_DIR, fileName)
  fs.copyFileSync(DB_FILE, target)
  return {
    fileName,
    path: target
  }
}

function getAuthedUser(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null

  return db.prepare(`
    SELECT users.*
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
  `).get(token) || null
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    send(res, 204, {})
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  try {
    if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      const relative = decodeURIComponent(url.pathname.replace(/^\/uploads\//, ''))
      const filePath = path.resolve(UPLOAD_DIR, relative)
      if (!filePath.startsWith(path.resolve(UPLOAD_DIR)) || !fs.existsSync(filePath)) {
        send(res, 404, { message: '图片不存在' })
        return
      }
      sendFile(res, filePath)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
      send(res, 200, {
        ok: true,
        database: 'sqlite',
        dataFile: DB_FILE,
        uploadDir: UPLOAD_DIR,
        uploadTrashDir: UPLOAD_TRASH_DIR,
        backupDir: BACKUP_DIR,
        lanUrls: getLanUrls(req)
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/register') {
      const body = await readBody(req)
      const username = normalizeUsername(body.username)
      const password = String(body.password || '')
      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        send(res, 400, { message: '账号需为 3-24 位字母、数字或下划线' })
        return
      }
      if (password.length < 4) {
        send(res, 400, { message: '密码至少 4 位' })
        return
      }
      const existed = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
      if (existed) {
        send(res, 409, { message: '账号已存在' })
        return
      }

      const passwordInfo = hashPassword(password)
      const user = {
        id: crypto.randomUUID(),
        username,
        salt: passwordInfo.salt,
        password_hash: passwordInfo.hash,
        created_at: new Date().toISOString()
      }
      const token = crypto.randomBytes(32).toString('hex')
      db.prepare(`
        INSERT INTO users (id, username, salt, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(user.id, user.username, user.salt, user.password_hash, user.created_at)
      db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
        token,
        user.id,
        new Date().toISOString()
      )
      send(res, 200, { token, user: publicUser(user), diaries: [] })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = await readBody(req)
      const username = normalizeUsername(body.username)
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
      if (!user || !verifyPassword(body.password || '', user)) {
        send(res, 401, { message: '账号或密码不正确' })
        return
      }
      const token = crypto.randomBytes(32).toString('hex')
      db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
        token,
        user.id,
        new Date().toISOString()
      )
      send(res, 200, { token, user: publicUser(user), diaries: getDiaries(user.id) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/verify-password') {
      const authed = getAuthedUser(req)
      if (!authed) {
        send(res, 401, { message: '请先登录' })
        return
      }
      const body = await readBody(req)
      if (!verifyPassword(body.password || '', authed)) {
        send(res, 401, { message: '密码不正确' })
        return
      }
      send(res, 200, { ok: true })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
      const auth = req.headers.authorization || ''
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
      send(res, 200, { ok: true })
      return
    }

    // Serve the H5 app before API authentication. Only /api routes below require login.
    if (!url.pathname.startsWith('/api/')) {
      if (sendStatic(res, url.pathname)) return
    }

    const user = getAuthedUser(req)
    if (!user) {
      send(res, 401, { message: '请先登录' })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/me') {
      send(res, 200, { user: publicUser(user), diaries: getDiaries(user.id) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/diaries') {
      send(res, 200, { diaries: getDiaries(user.id) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/weather') {
      const date = normalizeDateKey(url.searchParams.get('date'))
      if (!date) {
        send(res, 400, { message: 'date 必须是 YYYY-MM-DD' })
        return
      }
      send(res, 200, { weather: getAccountWeather(user.id, date) })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/weather') {
      const body = await readBody(req)
      const date = normalizeDateKey(body.date)
      const weatherId = String(body.weatherId || '')
      if (!date) {
        send(res, 400, { message: 'date 必须是 YYYY-MM-DD' })
        return
      }
      if (!isValidWeatherId(weatherId)) {
        send(res, 400, { message: 'weatherId 不正确' })
        return
      }
      send(res, 200, { weather: saveAccountWeather(user.id, date, weatherId) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/backup') {
      const backup = createSqliteBackup()
      send(res, 200, { ok: true, ...backup })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/upload') {
      const raw = await readRawBody(req)
      const parts = parseMultipart(raw, req.headers['content-type'])
      const filePart = parts.find(part => part.filename && part.content.length)
      if (!filePart) {
        send(res, 400, { message: '没有收到图片文件' })
        return
      }
      if (!filePart.contentType.startsWith('image/')) {
        send(res, 400, { message: '只能上传图片' })
        return
      }

      const userDir = path.join(UPLOAD_DIR, user.id)
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true })
      const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${imageExt(filePart)}`
      const filePath = path.join(userDir, fileName)
      fs.writeFileSync(filePath, filePart.content)

      send(res, 200, {
        url: `/uploads/${user.id}/${fileName}`
      })
      return
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/diaries/')) {
      const diaryId = decodeURIComponent(url.pathname.replace(/^\/api\/diaries\//, '')).trim()
      if (!diaryId) {
        send(res, 400, { message: '日记 id 不能为空' })
        return
      }
      const deleted = deleteDiary(user.id, diaryId)
      send(res, 200, { ok: true, deleted, diaries: getDiaries(user.id) })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/diaries') {
      const body = await readBody(req)
      if (!Array.isArray(body.diaries)) {
        send(res, 400, { message: 'diaries 必须是数组' })
        return
      }
      replaceDiaries(user.id, body.diaries)
      send(res, 200, { ok: true, count: body.diaries.length, diaries: getDiaries(user.id) })
      return
    }

    send(res, 404, { message: '接口不存在' })
  } catch (error) {
    send(res, 500, { message: error.message || '服务器错误' })
  }
}

const server = http.createServer(handle)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LinFeng diary API running at http://localhost:${PORT}`)
  console.log(`SQLite database: ${DB_FILE}`)
})
