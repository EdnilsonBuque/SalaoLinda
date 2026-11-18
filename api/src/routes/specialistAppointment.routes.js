import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { requireRole } from '../middleware/requireRole.js'
import { listSpecialistAppointments } from '../services/appointmentService.js'

const router = Router()

const specialistAppointmentQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum([
    'pendente',
    'confirmada',
    'rejeitada',
    'cancelada',
    'concluida',
    'aguarda_deposito',
    'expirada',
  ]).optional(),
})

router.use(authenticate, requireRole('especialista'))

router.get('/appointments', async (req, res) => {
  const parsed = specialistAppointmentQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ message: 'Filtros inválidos' })
  res.json({ appointments: await listSpecialistAppointments(req.user.id, parsed.data) })
})

export { router }
export default router
