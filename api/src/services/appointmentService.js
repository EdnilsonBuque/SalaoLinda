import db from '../db/knex.js'
import { salonPolicy } from '../config/salon.js'
import {
  canCancelAppointment,
  createWallClock,
  generateAvailableSlots,
  getDateTimeError,
  getOpeningWindow,
  getSalonDate,
  getSalonDateTime,
  isValidSalonDate,
  salonDateTimeToString,
} from './appointmentPolicy.js'
import { httpError } from '../utils/httpError.js'

const ACTIVE_STATUSES = ['pendente', 'confirmada']

function toAppointment(row) {
  return {
    id: row.id,
    userId: row.user_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    serviceImage: row.service_image,
    startsAt: salonDateTimeToString(row.starts_at),
    endsAt: salonDateTimeToString(row.ends_at),
    status: row.status,
    price: Number(row.price_at_booking),
    durationMinutes: row.duration_at_booking,
    canCancel: canCancelAppointment(row),
    hasReview: Boolean(row.review_id),
    reviewRating: row.review_rating == null ? null : Number(row.review_rating),
    reviewComment: row.review_comment,
    rejectionReason: row.rejection_reason,
    clientName: row.client_name,
    clientPhone: row.client_phone,
  }
}

function appointmentQuery(query = db) {
  return query('appointments as a')
    .join('services as s', 's.id', 'a.service_id')
    .join('users as u', 'u.id', 'a.user_id')
    .select(
      'a.id',
      'a.user_id',
      'a.service_id',
      'a.starts_at',
      'a.ends_at',
      'a.status',
      'a.price_at_booking',
      'a.duration_at_booking',
      'a.rejection_reason',
      'r.id as review_id',
      'r.rating as review_rating',
      'r.comment as review_comment',
      's.name as service_name',
      's.image_path as service_image',
      'u.name as client_name',
      'u.phone as client_phone',
    )
    .leftJoin('reviews as r', 'r.appointment_id', 'a.id')
}

function mapAppointment(row) {
  if (!row) return null
  return toAppointment(row)
}

async function getActiveBookingsForDay(query, date) {
  const opening = getOpeningWindow(date)
  if (!opening) return []
  return query('appointments')
    .select('starts_at', 'ends_at')
    .whereIn('status', ACTIVE_STATUSES)
    .andWhere('starts_at', '<', createWallClock(date, opening.close))
    .andWhere('ends_at', '>', createWallClock(date, opening.open))
}

export async function getAvailability(serviceId, date, now = new Date()) {
  const dateError = getDateTimeError(date, '09:00', now)
  if (dateError) throw httpError(400, dateError)

  const service = await db('services').where({ id: serviceId, active: true }).first()
  if (!service) throw httpError(404, 'Serviço não encontrado')

  const appointments = await getActiveBookingsForDay(db, date)
  return generateAvailableSlots({
    date,
    durationMinutes: service.duration_minutes,
    appointments,
    now,
  })
}

export async function createAppointment({ userId, serviceId, date, startTime }, now = new Date()) {
  const dateError = getDateTimeError(date, startTime, now)
  if (dateError) throw httpError(400, dateError)

  const opening = getOpeningWindow(date)
  if (!opening) throw httpError(400, 'O salão está fechado nesta data')

  const startMinute = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5))
  const openingMinute = Number(opening.open.slice(0, 2)) * 60 + Number(opening.open.slice(3, 5))
  if (startMinute < openingMinute || (startMinute - openingMinute) % salonPolicy.slotStepMinutes !== 0) {
    throw httpError(400, 'Escolha um horário disponível')
  }

  const appointmentId = await db.transaction(async (trx) => {
    const lockedServices = await trx('services').select('id').orderBy('id').forUpdate()
    if (lockedServices.length === 0) throw httpError(409, 'Ainda não existem serviços disponíveis')

    const bookingNow = new Date()
    const service = await trx('services').where({ id: serviceId, active: true }).first()
    if (!service) throw httpError(404, 'Serviço não encontrado')

    const appointments = await getActiveBookingsForDay(trx, date)
    const slot = generateAvailableSlots({
      date,
      durationMinutes: service.duration_minutes,
      appointments,
      now: bookingNow,
    }).find((available) => available.start === startTime)
    if (!slot) throw httpError(409, 'Este horário já não está disponível. Atualize os horários.')

    const [id] = await trx('appointments').insert({
      user_id: userId,
      service_id: service.id,
      starts_at: createWallClock(date, slot.start),
      ends_at: createWallClock(date, slot.end),
      status: 'pendente',
      price_at_booking: service.price,
      duration_at_booking: service.duration_minutes,
      created_at: bookingNow,
      updated_at: bookingNow,
    })
    return id
  })

  return mapAppointment(await appointmentQuery().where('a.id', appointmentId).first())
}

export async function listClientAppointments(userId) {
  const rows = await appointmentQuery()
    .where('a.user_id', userId)
    .orderBy('a.starts_at', 'desc')
  return rows.map(mapAppointment)
}

export async function getClientAppointmentHistory(userId) {
  const user = await db('users').select('id').where({ id: userId, role: 'client' }).first()
  if (!user) throw httpError(404, 'Cliente não encontrado')
  const rows = await appointmentQuery()
    .where('a.user_id', userId)
    .orderBy('a.starts_at', 'desc')
  return rows.map(mapAppointment)
}

export async function cancelClientAppointment(userId, appointmentId, now = new Date()) {
  await db.transaction(async (trx) => {
    const appointment = await trx('appointments')
      .where({ id: appointmentId, user_id: userId })
      .forUpdate()
      .first()
    if (!appointment) throw httpError(404, 'Marcação não encontrada')
    if (!canCancelAppointment(appointment, now)) {
      throw httpError(400, 'Esta marcação já não pode ser cancelada')
    }
    await trx('appointments')
      .where({ id: appointmentId, user_id: userId })
      .update({ status: 'cancelada', updated_at: now })
  })

  return mapAppointment(await appointmentQuery().where('a.id', appointmentId).first())
}

export async function listAdminAppointments({ date = getSalonDate(), status }) {
  if (!isValidSalonDate(date)) throw httpError(400, 'Data inválida')
  const dateObject = new Date(`${date}T00:00:00Z`)
  dateObject.setUTCDate(dateObject.getUTCDate() + 1)
  const nextDate = dateObject.toISOString().slice(0, 10)

  const query = appointmentQuery()
    .where('a.starts_at', '>=', `${date} 00:00:00`)
    .andWhere('a.starts_at', '<', `${nextDate} 00:00:00`)
    .orderBy('a.starts_at', 'asc')
  if (status) query.andWhere('a.status', status)
  return (await query).map(mapAppointment)
}

export async function updateAdminAppointment(appointmentId, { status, rejectionReason }, now = new Date()) {
  await db.transaction(async (trx) => {
    const appointment = await trx('appointments').where({ id: appointmentId }).forUpdate().first()
    if (!appointment) throw httpError(404, 'Marcação não encontrada')

    const allowed = appointment.status === 'pendente'
      ? ['confirmada', 'rejeitada']
      : appointment.status === 'confirmada'
        ? ['concluida']
        : []
    if (!allowed.includes(status)) throw httpError(409, 'A alteração de estado não é permitida')

    if (status === 'concluida' && salonDateTimeToString(appointment.ends_at) > getSalonDateTime(now)) {
      throw httpError(400, 'A marcação só pode ser concluída depois do horário do atendimento')
    }

    await trx('appointments').where({ id: appointmentId }).update({
      status,
      rejection_reason: status === 'rejeitada' ? (rejectionReason || null) : null,
      updated_at: now,
    })
  })

  return mapAppointment(await appointmentQuery().where('a.id', appointmentId).first())
}
