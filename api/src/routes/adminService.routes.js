import { Router } from 'express'
import {
  createService,
  deactivateService,
  listAdminServices,
  updateService,
} from '../services/serviceService.js'
import {
  createServiceSchema,
  formatServiceValidationError,
  updateServiceSchema,
} from '../validators/serviceSchemas.js'
import { uploadServicePhoto } from '../middleware/servicePhotoUpload.js'
import db from '../db/knex.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { uploadDirectory } from '../middleware/servicePhotoUpload.js'

const router = Router()

router.get('/', async (req, res) => {
  res.json({ services: await listAdminServices() })
})

router.post('/', async (req, res) => {
  const parsed = createServiceSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(formatServiceValidationError(parsed.error))
  res.status(201).json({ service: await createService(parsed.data) })
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Serviço inválido' })
  const parsed = updateServiceSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(formatServiceValidationError(parsed.error))
  res.json({ service: await updateService(id, parsed.data) })
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Serviço inválido' })
  res.json({ service: await deactivateService(id) })
})

router.post('/:id/image', uploadServicePhoto, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    await fs.unlink(req.file.path)
    return res.status(400).json({ message: 'Serviço inválido' })
  }

  const service = await db('services').where({ id }).first()
  if (!service) {
    await fs.unlink(req.file.path)
    return res.status(404).json({ message: 'Serviço não encontrado' })
  }

  const imagePath = `/uploads/${path.basename(req.file.filename)}`
  const previousFile = service.image_path?.startsWith('/uploads/')
    ? path.join(uploadDirectory, path.basename(service.image_path))
    : null
  try {
    await db('services').where({ id }).update({ image_path: imagePath, updated_at: new Date() })
  } catch (error) {
    await fs.unlink(req.file.path).catch((cleanupError) => {
      console.error('Não foi possível remover uma fotografia sem serviço:', cleanupError)
    })
    throw error
  }
  if (previousFile) {
    await fs.unlink(previousFile).catch((error) => {
      if (error.code !== 'ENOENT') console.error('Não foi possível remover a fotografia anterior:', error)
    })
  }
  res.json({ imagePath })
})

export default router
