export function pad(value) {
  return String(value).padStart(2, '0')
}

export function toDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function compareDateKey(left, right) {
  return String(left || '').localeCompare(String(right || ''))
}

export function isFutureDate(key) {
  return compareDateKey(key, toDateKey()) > 0
}

export function formatDate(key) {
  if (!key) return '未选择日期'
  const date = new Date(`${key}T00:00:00`)
  const week = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
  return `${date.getMonth() + 1}月${date.getDate()}日 周${week}`
}

export function formatTime(iso) {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getMonthDays(year, month) {
  return new Date(year, month, 0).getDate()
}

export function getMonthGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const days = getMonthDays(year, month)
  const cells = []
  for (let i = 0; i < firstDay; i += 1) {
    cells.push(null)
  }
  for (let day = 1; day <= days; day += 1) {
    cells.push({
      day,
      key: `${year}-${pad(month)}-${pad(day)}`
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  return cells
}

const SOLAR_HOLIDAYS = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '04-05': '清明',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆',
  '12-24': '平安夜',
  '12-25': '圣诞'
}

const LUNAR_HOLIDAYS_BY_YEAR = {
  2026: {
    '02-17': '春节',
    '03-03': '元宵',
    '06-19': '端午',
    '09-25': '中秋'
  }
}

export function getHolidayLabel(key) {
  const year = Number(String(key).slice(0, 4))
  const monthDay = String(key).slice(5)
  return LUNAR_HOLIDAYS_BY_YEAR[year]?.[monthDay] || SOLAR_HOLIDAYS[monthDay] || ''
}
