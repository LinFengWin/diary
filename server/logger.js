const fs = require('fs')
const path = require('path')

const LOG_DIR = process.env.MOO_LOG_DIR || path.join(__dirname, 'data', 'logs')
const LOG_LEVEL = String(process.env.MOO_LOG_LEVEL || 'info').toLowerCase()
const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

function shouldLog(level) {
  return (LEVELS[level] || LEVELS.info) >= (LEVELS[LOG_LEVEL] || LEVELS.info)
}

function logFileName(date = new Date()) {
  return `app-${date.toISOString().slice(0, 10)}.log`
}

function safeFields(fields = {}) {
  const result = {}
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (/password|token|authorization/i.test(key)) return
    if (key.toLowerCase() === 'content') return
    result[key] = value
  })
  return result
}

function errorFields(error) {
  if (!error) return {}
  return {
    errorName: error.name,
    errorMessage: error.message,
    errorCode: error.code,
    stack: error.stack
  }
}

function write(level, event, fields = {}) {
  if (!shouldLog(level)) return

  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...safeFields(fields)
  }
  const line = `${JSON.stringify(entry)}\n`

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    fs.appendFileSync(path.join(LOG_DIR, logFileName()), line, 'utf8')
  } catch (error) {
    console.error(`log write failed: ${error.message}`)
  }

  const consoleLine = `[${entry.ts}] ${level.toUpperCase()} ${event}`
  if (level === 'error') console.error(consoleLine, fields.errorMessage || '')
  else if (level === 'warn') console.warn(consoleLine)
  else console.log(consoleLine)
}

function info(event, fields) {
  write('info', event, fields)
}

function warn(event, fields) {
  write('warn', event, fields)
}

function error(event, err, fields = {}) {
  write('error', event, {
    ...fields,
    ...errorFields(err)
  })
}

function requestLogger(req, res) {
  const startedAt = Date.now()
  const pathOnly = (() => {
    try {
      return new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname
    } catch (_) {
      return req.url
    }
  })()

  res.on('finish', () => {
    info('http_request', {
      method: req.method,
      path: pathOnly,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      contentLength: Number(req.headers['content-length'] || 0),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userId: req.userId
    })
  })
}

module.exports = {
  info,
  warn,
  error,
  requestLogger,
  LOG_DIR
}
