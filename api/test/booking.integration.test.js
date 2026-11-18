import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import db from '../src/db/knex.js'
import { uploadDirectory } from '../src/middleware/servicePhotoUpload.js'
import { getOpeningWindow, getWeekDateRange } from '../src/services/appointmentPolicy.js'

const apiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3001/api'

function nextFutureMonday() {
  const date = new Date(`${getWeekDateRange().end}T00:00:00Z`)
  date.setUTCFullYear(date.getUTCFullYear() + 10)
  while (date.getUTCDay() !== 1) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  return { response, data: response.status === 204 ? null : await response.json() }
}

test('booking, ownership, cancellation, and one-review rules work over HTTP', {
  skip: process.env.RUN_DB_INTEGRATION_TESTS !== '1'
    || !process.env.ADMIN_PHONE
    || !process.env.ADMIN_PASSWORD,
}, async () => {
  let userId
  let serviceId
  let appointmentIds = []
  let uploadedImage

  try {
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        phone: process.env.ADMIN_PHONE,
        password: process.env.ADMIN_PASSWORD,
      }),
    })
    assert.equal(adminLogin.response.status, 200)
    const adminToken = adminLogin.data.accessToken
    const specialist = await db('users').select('id').where({ role: 'especialista' }).first()
    assert.ok(specialist, 'O teste requer um especialista de bootstrap')

    const phone = `99${Date.now()}`
    const registration = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Cliente de teste', phone, password: 'Teste-123456' }),
    })
    assert.equal(registration.response.status, 201)
    userId = registration.data.user.id

    const serviceResponse = await request('/admin/services', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        name: `Serviço teste ${phone}`,
        description: 'Registo criado para teste de integração.',
        price: 250,
        durationMinutes: 30,
        specialistId: specialist.id,
      }),
    })
    assert.equal(serviceResponse.response.status, 201)
    serviceId = serviceResponse.data.service.id

    const imageForm = new FormData()
    imageForm.append('image', new Blob([
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l8sAAAAASUVORK5CYII=', 'base64'),
    ], { type: 'image/png' }), 'service.png')
    const imageResponse = await fetch(`${apiBaseUrl}/admin/services/${serviceId}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: imageForm,
    })
    assert.equal(imageResponse.status, 200)
    const imageResult = await imageResponse.json()
    uploadedImage = imageResult.imagePath
    const publicImage = await fetch(`${apiBaseUrl.replace(/\/api\/?$/, '')}${uploadedImage}`)
    assert.equal(publicImage.status, 200)
    assert.match(publicImage.headers.get('content-type'), /image\/png/)

    const servicesResult = await request('/services')
    assert.equal(servicesResult.response.status, 200)
    assert.ok(servicesResult.data.services.some((service) => Number(service.id) === Number(serviceId)))

    const date = nextFutureMonday()
    assert.ok(getOpeningWindow(date))
    const availability = await request(`/services/${serviceId}/availability?date=${date}`)
    assert.equal(availability.response.status, 200, JSON.stringify(availability.data))
    assert.ok(availability.data.slots.length > 0)
    const startTime = availability.data.slots[0].start

    const createBooking = () => request('/appointments', {
      method: 'POST',
      token: registration.data.accessToken,
      body: JSON.stringify({ serviceId, date, startTime }),
    })
    const concurrentBookings = await Promise.all([createBooking(), createBooking()])
    const successfulBookings = concurrentBookings.filter(({ response }) => response.status === 201)
    appointmentIds = successfulBookings.map(({ data }) => data.appointment.id)
    assert.deepEqual(
      concurrentBookings.map(({ response }) => response.status).sort(),
      [201, 409],
    )
    const createdBooking = successfulBookings[0]
    const appointmentId = createdBooking.data.appointment.id
    assert.equal(createdBooking.data.appointment.price, 250)
    assert.equal(createdBooking.data.appointment.status, 'pendente')

    await db('services').where({ id: serviceId }).update({ price: '999.00' })
    const ownAppointments = await request('/appointments', { token: registration.data.accessToken })
    assert.equal(ownAppointments.response.status, 200)
    const savedAppointment = ownAppointments.data.appointments.find((appointment) => appointment.id === appointmentId)
    assert.ok(savedAppointment)
    assert.equal(savedAppointment.price, 250)

    const forbiddenAdminRequest = await request('/admin/users', { token: registration.data.accessToken })
    assert.equal(forbiddenAdminRequest.response.status, 403)

    const pendingAppointments = await request(`/admin/appointments?date=${date}&status=pendente`, {
      token: adminToken,
    })
    assert.equal(pendingAppointments.response.status, 200)
    assert.ok(pendingAppointments.data.appointments.some((appointment) => appointment.id === appointmentId))

    const confirmed = await request(`/admin/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({ status: 'confirmada' }),
    })
    assert.equal(confirmed.response.status, 200)
    assert.equal(confirmed.data.appointment.status, 'confirmada')

    const invalidTransition = await request(`/admin/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({ status: 'rejeitada' }),
    })
    assert.equal(invalidTransition.response.status, 409)

    const updatedAvailability = await request(`/services/${serviceId}/availability?date=${date}`)
    const otherSlot = updatedAvailability.data.slots.find((slot) => slot.start !== startTime)
    assert.ok(otherSlot)
    const secondBooking = await request('/appointments', {
      method: 'POST',
      token: registration.data.accessToken,
      body: JSON.stringify({ serviceId, date, startTime: otherSlot.start }),
    })
    assert.equal(secondBooking.response.status, 201)
    const pendingAppointmentId = secondBooking.data.appointment.id
    appointmentIds.push(pendingAppointmentId)

    const clientHistory = await request(`/admin/users/${userId}/appointments`, { token: adminToken })
    assert.equal(clientHistory.response.status, 200)
    assert.ok(clientHistory.data.appointments.some((appointment) => appointment.id === appointmentId))

    const cancellation = await request(`/appointments/${pendingAppointmentId}/cancel`, {
      method: 'POST',
      token: registration.data.accessToken,
    })
    assert.equal(cancellation.response.status, 200)
    assert.equal(cancellation.data.appointment.status, 'cancelada')

    await db('appointments').where({ id: appointmentId }).update({
      starts_at: '2000-01-03 09:00:00',
      ends_at: '2000-01-03 09:30:00',
    })
    const completed = await request(`/admin/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({ status: 'concluida' }),
    })
    assert.equal(completed.response.status, 200)
    assert.equal(completed.data.appointment.status, 'concluida')

    const review = await request(`/appointments/${appointmentId}/review`, {
      method: 'POST',
      token: registration.data.accessToken,
      body: JSON.stringify({ rating: 5, comment: 'Teste de avaliação.' }),
    })
    assert.equal(review.response.status, 201)

    const duplicateReview = await request(`/appointments/${appointmentId}/review`, {
      method: 'POST',
      token: registration.data.accessToken,
      body: JSON.stringify({ rating: 4 }),
    })
    assert.equal(duplicateReview.response.status, 409)

    const adminReviews = await request('/admin/reviews', { token: adminToken })
    assert.equal(adminReviews.response.status, 200)
    assert.ok(adminReviews.data.reviews.some((entry) => entry.appointmentId === appointmentId))
    assert.ok(adminReviews.data.services.some((entry) => (
      Number(entry.id) === Number(serviceId) && entry.averageRating === 5 && entry.reviewCount === 1
    )))

    const dashboard = await request('/admin/dashboard', { token: adminToken })
    assert.equal(dashboard.response.status, 200)
    assert.ok(Array.isArray(dashboard.data.dashboard.popularServices))
    assert.ok(dashboard.data.dashboard.popularServices.some((entry) => (
      Number(entry.id) === Number(serviceId) && entry.bookingCount >= 2 && entry.completedCount >= 1
    )))
  } finally {
    if (appointmentIds.length) {
      await db('reviews').whereIn('appointment_id', appointmentIds).delete()
      await db('appointments').whereIn('id', appointmentIds).delete()
    }
    if (userId) await db('users').where({ id: userId }).delete()
    if (serviceId) await db('services').where({ id: serviceId }).delete()
    if (uploadedImage) await fs.unlink(`${uploadDirectory}/${uploadedImage.split('/').pop()}`)
    await db.destroy()
  }
})
