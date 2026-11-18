import { salonPolicy } from '../config/salon.js'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function pad(value) {
  return String(value).padStart(2, '0')
}

export function getSalonDateTime(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: salonPolicy.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`
}

export function salonDateTimeToString(value) {
  if (value instanceof Date) {
    return [
      value.getUTCFullYear(),
      '-',
      pad(value.getUTCMonth() + 1),
      '-',
      pad(value.getUTCDate()),
      ' ',
      pad(value.getUTCHours()),
      ':',
      pad(value.getUTCMinutes()),
      ':',
      pad(value.getUTCSeconds()),
    ].join('')
  }
  return String(value).replace('T', ' ').slice(0, 19)
}

export function isValidSalonDate(date) {
  if (!DATE_PATTERN.test(date)) return false
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

export function getOpeningWindow(date) {
  if (!isValidSalonDate(date)) return null
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
  return salonPolicy.openingHours[weekday] ?? null
}

export function createWallClock(date, time) {
  if (!isValidSalonDate(date) || !TIME_PATTERN.test(time)) return null
  return `${date} ${time}:00`
}

function timeToMinutes(time) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function minutesToTime(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

export function generateAvailableSlots({ date, durationMinutes, appointments = [], now = new Date() }) {
  const hours = getOpeningWindow(date)
  if (!hours || !Number.isInteger(durationMinutes) || durationMinutes <= 0) return []

  const opening = timeToMinutes(hours.open)
  const closing = timeToMinutes(hours.close)
  const todayNow = getSalonDateTime(now)
  const slots = []

  for (let start = opening; start + durationMinutes <= closing; start += salonPolicy.slotStepMinutes) {
    const startTime = minutesToTime(start)
    const endTime = minutesToTime(start + durationMinutes)
    const startsAt = createWallClock(date, startTime)
    const endsAt = createWallClock(date, endTime)

    if (startsAt <= todayNow) continue

    const overlaps = appointments.some((appointment) => {
      const bookedStart = salonDateTimeToString(appointment.starts_at)
      const bookedEnd = salonDateTimeToString(appointment.ends_at)
      return bookedStart < endsAt && bookedEnd > startsAt
    })

    if (!overlaps) slots.push({ start: startTime, end: endTime })
  }

  return slots
}

export function canCancelAppointment(appointment, now = new Date()) {
  const startsAt = salonDateTimeToString(appointment.starts_at)
  const nowAtSalon = getSalonDateTime(now)
  if (appointment.status === 'pendente') return startsAt > nowAtSalon
  if (appointment.status !== 'confirmada') return false

  const cancellationDeadline = getSalonDateTime(
    new Date(now.getTime() + salonPolicy.cancellationCutoffHours * 60 * 60 * 1000),
  )
  return startsAt >= cancellationDeadline
}

export function getSalonDate(now = new Date()) {
  return getSalonDateTime(now).slice(0, 10)
}

export function getWeekDateRange(date = getSalonDate()) {
  if (!isValidSalonDate(date)) throw new Error('Data inválida')
  const start = new Date(`${date}T00:00:00Z`)
  const daysSinceMonday = (start.getUTCDay() + 6) % 7
  start.setUTCDate(start.getUTCDate() - daysSinceMonday)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function getDateTimeError(date, time, now = new Date()) {
  if (!isValidSalonDate(date)) return 'Data inválida'
  if (date < getSalonDate(now)) return 'A data escolhida já passou'
  if (!TIME_PATTERN.test(time)) return 'Hora inválida'
  return null
}
