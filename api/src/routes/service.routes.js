import { Router } from 'express'
import { listPublicServices, getPublicService } from '../services/serviceService.js'
import { getAvailability } from '../services/appointmentService.js'
import { availabilityQuerySchema } from '../validators/appointmentSchemas.js'

const router = Router()

router.get('/', async (req, res) => {
  res.json({ services: await listPublicServices() })
})

router.get('/:id/availability', async (req, res) => {
  const serviceId = Number(req.params.id)
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return res.status(400).json({ message: 'Serviço inválido' })
  }
  const parsed = availabilityQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ message: 'Data inválida' })

  const slots = await getAvailability(serviceId, parsed.data.date)
  res.json({ date: parsed.data.date, slots })
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Serviço inválido' })
  res.json({ service: await getPublicService(id) })
})

export default router
