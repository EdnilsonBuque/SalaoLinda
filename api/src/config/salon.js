export const salonPolicy = Object.freeze({
  timeZone: process.env.SALON_TZ || 'Africa/Maputo',
  slotStepMinutes: 30,
  cancellationCutoffHours: 2,
  openingHours: Object.freeze({
    0: null,
    1: Object.freeze({ open: '09:00', close: '18:00' }),
    2: Object.freeze({ open: '09:00', close: '18:00' }),
    3: Object.freeze({ open: '09:00', close: '18:00' }),
    4: Object.freeze({ open: '09:00', close: '18:00' }),
    5: Object.freeze({ open: '09:00', close: '18:00' }),
    6: Object.freeze({ open: '09:00', close: '18:00' }),
  }),
})
