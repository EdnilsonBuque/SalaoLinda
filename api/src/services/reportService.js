import db from '../db/knex.js'
import {
  getSalonDate,
  getWeekDateRange,
  isValidSalonDate,
  salonDateTimeToString,
} from './appointmentPolicy.js'
import { httpError } from '../utils/httpError.js'

function nextDate(date) {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + 1)
  return result.toISOString().slice(0, 10)
}

export async function getAdminDashboard(date = getSalonDate()) {
  if (!isValidSalonDate(date)) throw httpError(400, 'Data inválida')
  const week = getWeekDateRange(date)
  const tomorrow = nextDate(date)

  const [todayRevenue, weekRevenue, todayCounts, popularServices] = await Promise.all([
    db('appointments')
      .where({ status: 'concluida' })
      .andWhere('starts_at', '>=', `${date} 00:00:00`)
      .andWhere('starts_at', '<', `${tomorrow} 00:00:00`)
      .sum({ total: 'price_at_booking' })
      .first(),
    db('appointments')
      .where({ status: 'concluida' })
      .andWhere('starts_at', '>=', `${week.start} 00:00:00`)
      .andWhere('starts_at', '<', `${week.end} 00:00:00`)
      .sum({ total: 'price_at_booking' })
      .first(),
    db('appointments')
      .where('starts_at', '>=', `${date} 00:00:00`)
      .andWhere('starts_at', '<', `${tomorrow} 00:00:00`)
      .select(
        db.raw('COUNT(*) AS total'),
        db.raw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS pending', ['pendente']),
      )
      .first(),
    db('services as s')
      .leftJoin('appointments as a', 'a.service_id', 's.id')
      .select('s.id', 's.name')
      .count({ bookingCount: 'a.id' })
      .count({ completedCount: db.raw('CASE WHEN ?? = ? THEN 1 END', ['a.status', 'concluida']) })
      .groupBy('s.id', 's.name')
      .orderBy('bookingCount', 'desc')
      .orderBy('s.name')
      .limit(5),
  ])

  return {
    date,
    weekStartsAt: week.start,
    weekEndsAt: week.end,
    todayRevenue: Number(todayRevenue?.total ?? 0),
    weekRevenue: Number(weekRevenue?.total ?? 0),
    todayAppointments: Number(todayCounts?.total ?? 0),
    pendingAppointments: Number(todayCounts?.pending ?? 0),
    popularServices: popularServices.map((service) => ({
      id: service.id,
      name: service.name,
      bookingCount: Number(service.bookingCount),
      completedCount: Number(service.completedCount),
    })),
  }
}

export async function listAdminClients() {
  const rows = await db('users as u')
    .leftJoin('appointments as a', 'a.user_id', 'u.id')
    .where('u.role', 'client')
    .groupBy('u.id', 'u.name', 'u.phone', 'u.created_at')
    .select(
      'u.id',
      'u.name',
      'u.phone',
      'u.created_at',
      db.raw('COUNT(a.id) AS appointment_count'),
      db.raw('MAX(a.starts_at) AS last_appointment_at'),
    )
    .orderBy('u.created_at', 'desc')
    .limit(200)
  return rows.map((client) => ({
    id: client.id,
    name: client.name,
    phone: client.phone,
    createdAt: client.created_at,
    appointmentCount: Number(client.appointment_count),
    lastAppointmentAt: client.last_appointment_at == null
      ? null
      : salonDateTimeToString(client.last_appointment_at),
  }))
}
