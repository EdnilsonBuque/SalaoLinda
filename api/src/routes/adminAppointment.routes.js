import { Router } from 'express'
import { z } from 'zod'
import {
  listAdminAppointments,
  updateAdminAppointment,
} from '../services/appointmentService.js'
import { adminAppointmentStatusSchema } from '../validators/appointmentSchemas.js'

const router = Router()

const adminAppointmentQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['pendente', 'confirmada', 'rejeitada', 'cancelada', 'concluida']).optional(),
})

router.get('/', async (req, res) => {
  const parsed = adminAppointmentQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ message: 'Filtros inválidos' })
  res.json({ appointments: await listAdminAppointments(parsed.data) })
})

router.patch('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Marcação inválida' })
  const parsed = adminAppointmentStatusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Estado inválido' })
  if (parsed.data.status === 'rejeitada' && parsed.data.rejectionReason?.length > 255) {
    return res.status(400).json({ message: 'O motivo não pode exceder 255 caracteres' })
  }
  res.json({ appointment: await updateAdminAppointment(id, parsed.data) })
})

export default router
