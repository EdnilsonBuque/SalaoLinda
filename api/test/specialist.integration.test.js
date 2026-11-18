import test from 'node:test'
import assert from 'node:assert/strict'
import db from '../src/db/knex.js'
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

test('specialists only see their own appointments and service routing is enforced over HTTP', {
  skip: process.env.RUN_DB_INTEGRATION_TESTS !== '1'
    || !process.env.ADMIN_PHONE
    || !process.env.ADMIN_PASSWORD,
}, async () => {
  let clientId
  let serviceAId
  let serviceBId
  let unassignedServiceId
  let appointmentId

  try {
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone: process.env.ADMIN_PHONE, password: process.env.ADMIN_PASSWORD }),
    })
    assert.equal(adminLogin.response.status, 200)
    const adminToken = adminLogin.data.accessToken

    const loginSpecialist = (phone, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    })
    const specialistALogin = await loginSpecialist(
      process.env.ESPECIALIST_PHONE_1 || '840000001',
      process.env.ESPECIALIST_PASSWORD_1 || 'Especialista1!',
    )
    const specialistBLogin = await loginSpecialist(
      process.env.ESPECIALIST_PHONE_2 || '840000002',
      process.env.ESPECIALIST_PASSWORD_2 || 'Especialista1!',
    )
    assert.equal(specialistALogin.response.status, 200)
    assert.equal(specialistBLogin.response.status, 200)

    const phone = `98${Date.now()}`
    const registration = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Cliente especialista teste', phone, password: 'Teste-123456' }),
    })
    assert.equal(registration.response.status, 201)
    clientId = registration.data.user.id

    const createService = (suffix, specialistId) => request('/admin/services', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        name: `Serviço especialista ${suffix} ${phone}`,
        description: 'Registo criado para teste de integração.',
        price: 200,
        durationMinutes: 30,
        specialistId,
      }),
    })
    const serviceA = await createService('A', specialistALogin.data.user.id)
    const serviceB = await createService('B', specialistBLogin.data.user.id)
    assert.equal(serviceA.response.status, 201, JSON.stringify(serviceA.data))
    assert.equal(serviceB.response.status, 201, JSON.stringify(serviceB.data))
    serviceAId = serviceA.data.service.id
    serviceBId = serviceB.data.service.id
    assert.equal(serviceA.data.service.specialistName, specialistALogin.data.user.name)
    assert.equal(serviceB.data.service.specialistName, specialistBLogin.data.user.name)

    const missingSpecialist = await request('/admin/services', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        name: `Serviço sem especialista ${phone}`,
        description: 'Deve ser rejeitado pela validação.',
        price: 200,
        durationMinutes: 30,
      }),
    })
    assert.equal(missingSpecialist.response.status, 400)
    assert.ok(missingSpecialist.data.fieldErrors.specialistId)

    const date = nextFutureMonday()
    assert.ok(getOpeningWindow(date))
    const unassignedService = await db('services').insert({
      name: `Serviço legado sem especialista ${phone}`,
      description: 'Registo legado criado para testar a proteção de marcações.',
      price: '150.00',
      duration_minutes: 30,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    unassignedServiceId = unassignedService[0]
    const availability = await request(`/services/${serviceAId}/availability?date=${date}`)
    assert.equal(availability.response.status, 200, JSON.stringify(availability.data))
    const slot = availability.data.slots[0]
    assert.ok(slot)

    const rejectedBooking = await request('/appointments', {
      method: 'POST',
      token: registration.data.accessToken,
      body: JSON.stringify({ serviceId: unassignedServiceId, date, startTime: slot.start }),
    })
    assert.equal(rejectedBooking.response.status, 400)
    assert.equal(rejectedBooking.data.message, 'Este serviço ainda não tem especialista configurado')

    const booking = await request('/appointments', {
      method: 'POST',
      token: registration.data.accessToken,
      body: JSON.stringify({ serviceId: serviceAId, date, startTime: slot.start }),
    })
    assert.equal(booking.response.status, 201, JSON.stringify(booking.data))
    appointmentId = booking.data.appointment.id
    assert.equal(Number(booking.data.appointment.specialistId), Number(specialistALogin.data.user.id))

    const ownAppointments = await request(`/specialist/appointments?date=${date}`, {
      token: specialistALogin.data.accessToken,
    })
    const otherAppointments = await request(`/specialist/appointments?date=${date}`, {
      token: specialistBLogin.data.accessToken,
    })
    assert.equal(ownAppointments.response.status, 200)
    assert.equal(otherAppointments.response.status, 200)
    assert.ok(ownAppointments.data.appointments.some((appointment) => appointment.id === appointmentId))
    assert.ok(!otherAppointments.data.appointments.some((appointment) => appointment.id === appointmentId))

    const clientRequest = await request(`/specialist/appointments?date=${date}`, {
      token: registration.data.accessToken,
    })
    const adminRequest = await request(`/specialist/appointments?date=${date}`, { token: adminToken })
    const anonymousRequest = await request(`/specialist/appointments?date=${date}`)
    assert.equal(clientRequest.response.status, 403)
    assert.equal(adminRequest.response.status, 403)
    assert.equal(anonymousRequest.response.status, 401)
    const adminRouteForClient = await request('/admin/reviews', { token: registration.data.accessToken })
    assert.equal(adminRouteForClient.response.status, 403)
  } finally {
    if (appointmentId) await db('appointments').where({ id: appointmentId }).delete()
    if (serviceAId || serviceBId || unassignedServiceId) {
      await db('services').whereIn('id', [serviceAId, serviceBId, unassignedServiceId].filter(Boolean)).delete()
    }
    if (clientId) await db('users').where({ id: clientId }).delete()
    await db.destroy()
  }
})
