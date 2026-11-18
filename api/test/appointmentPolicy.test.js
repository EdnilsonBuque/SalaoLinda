import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canCancelAppointment,
  createWallClock,
  generateAvailableSlots,
  getDateTimeError,
  getOpeningWindow,
  getWeekDateRange,
  isValidSalonDate,
} from '../src/services/appointmentPolicy.js'

const now = new Date('2026-11-16T06:00:00.000Z')

test('validates real calendar dates and salon opening days', () => {
  assert.equal(isValidSalonDate('2026-11-16'), true)
  assert.equal(isValidSalonDate('2026-02-30'), false)
  assert.deepEqual(getOpeningWindow('2026-11-16'), { open: '09:00', close: '18:00' })
  assert.equal(getOpeningWindow('2026-11-15'), null)
  assert.equal(createWallClock('2026-11-16', '09:30'), '2026-11-16 09:30:00')
})

test('generates only future half-hour starts that fit and do not overlap', () => {
  const slots = generateAvailableSlots({
    date: '2026-11-16',
    durationMinutes: 60,
    appointments: [{ starts_at: '2026-11-16 10:00:00', ends_at: '2026-11-16 11:00:00' }],
    now,
  })

  assert.deepEqual(slots.slice(0, 3), [
    { start: '09:00', end: '10:00' },
    { start: '11:00', end: '12:00' },
    { start: '11:30', end: '12:30' },
  ])
  assert.equal(slots.some((slot) => slot.end > '18:00'), false)
})

test('rejects past dates and applies cancellation deadlines in Maputo time', () => {
  assert.equal(getDateTimeError('2026-11-15', '09:00', now), 'A data escolhida já passou')
  assert.equal(
    canCancelAppointment(
      { status: 'confirmada', starts_at: '2026-11-16 10:30:00' },
      now,
    ),
    true,
  )
  assert.equal(
    canCancelAppointment(
      { status: 'confirmada', starts_at: '2026-11-16 09:30:00' },
      now,
    ),
    false,
  )
})

test('calculates a Monday-inclusive week range', () => {
  assert.deepEqual(getWeekDateRange('2026-11-18'), {
    start: '2026-11-16',
    end: '2026-11-23',
  })
})
