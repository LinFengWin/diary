export function pad(value) {
  return String(value).padStart(2, '0')
}

export function toDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDate(key) {
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
