import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import {
  cancelClientAppointment,
  createAppointment,
  listClientAppointments,
} from '../services/appointmentService.js'
import { createClientReview } from '../services/reviewService.js'
import { createAppointmentSchema } from '../validators/appointmentSchemas.js'
import { createReviewSchema } from '../validators/reviewSchemas.js'

const router = Router()

router.use(authenticate)

router.get('/', async (req, res) => {
  res.json({ appointments: await listClientAppointments(req.user.id) })
})

router.post('/', async (req, res) => {
  const parsed = createAppointmentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Indique serviço, data e hora válidos' })
  }
  const appointment = await createAppointment({ ...parsed.data, userId: req.user.id })
  res.status(201).json({
    message: 'Pedido enviado — aguarda confirmação',
    appointment,
  })
})

router.post('/:id/cancel', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Marcação inválida' })
  res.json({ appointment: await cancelClientAppointment(req.user.id, id) })
})

router.post('/:id/review', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Marcação inválida' })
  const parsed = createReviewSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'A nota deve ser de 1 a 5 estrelas' })
  const review = await createClientReview(req.user.id, id, parsed.data)
  res.status(201).json({ review })
})

export default router
