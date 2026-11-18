import db from '../db/knex.js'
import { httpError } from '../utils/httpError.js'

export async function createClientReview(userId, appointmentId, { rating, comment }) {
  const now = new Date()
  const [reviewId] = await db.transaction(async (trx) => {
    const appointment = await trx('appointments')
      .where({ id: appointmentId, user_id: userId })
      .forUpdate()
      .first()
    if (!appointment) throw httpError(404, 'Marcação não encontrada')
    if (appointment.status !== 'concluida') {
      throw httpError(400, 'Só podes avaliar um atendimento concluído')
    }

    const existing = await trx('reviews').where({ appointment_id: appointmentId }).first()
    if (existing) throw httpError(409, 'Esta marcação já foi avaliada')

    return trx('reviews').insert({
      appointment_id: appointmentId,
      user_id: userId,
      rating,
      comment: comment || null,
      created_at: now,
      updated_at: now,
    })
  })

  const review = await db('reviews').where({ id: reviewId }).first()
  return { id: review.id, rating: review.rating, comment: review.comment }
}

export async function listAdminReviews() {
  const [reviews, services] = await Promise.all([
    db('reviews as r')
      .join('appointments as a', 'a.id', 'r.appointment_id')
      .join('users as u', 'u.id', 'r.user_id')
      .join('services as s', 's.id', 'a.service_id')
      .select('r.id', 'r.appointment_id', 'r.rating', 'r.comment', 'r.created_at', 'u.name as client_name', 's.id as service_id', 's.name as service_name')
      .orderBy('r.created_at', 'desc')
      .limit(200),
    db('reviews as r')
      .join('appointments as a', 'a.id', 'r.appointment_id')
      .join('services as s', 's.id', 'a.service_id')
      .select('s.id as service_id', 's.name as service_name')
      .avg({ averageRating: 'r.rating' })
      .count({ reviewCount: 'r.id' })
      .groupBy('s.id', 's.name')
      .orderBy('s.name'),
  ])

  return {
    reviews: reviews.map((review) => ({
      id: review.id,
      appointmentId: review.appointment_id,
      rating: Number(review.rating),
      comment: review.comment,
      createdAt: review.created_at,
      clientName: review.client_name,
      serviceId: review.service_id,
      serviceName: review.service_name,
    })),
    services: services.map((service) => ({
      id: service.service_id,
      name: service.service_name,
      averageRating: Number(Number(service.averageRating).toFixed(1)),
      reviewCount: Number(service.reviewCount),
    })),
  }
}
