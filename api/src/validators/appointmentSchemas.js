import { z } from 'zod'

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
})

export const createAppointmentSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida'),
})

export const adminAppointmentStatusSchema = z.object({
  status: z.enum(['confirmada', 'rejeitada', 'concluida']),
  rejectionReason: z.string().trim().max(255).optional(),
})
