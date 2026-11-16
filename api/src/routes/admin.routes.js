import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { resetClientPassword } from '../services/authService.js'
import { resetPasswordSchema, formatZodError } from '../validators/authSchemas.js'
import db from '../db/knex.js'

const router = Router()

router.use(authenticate, requireAdmin)

router.get('/users', async (req, res, next) => {
  try {
    const users = await db('users').select('id', 'name', 'phone', 'role', 'created_at').orderBy('id', 'desc').limit(100)
    res.json({ users })
  } catch (e) { next(e) }
})

router.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'ID inválido' })
    const parsed = resetPasswordSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(formatZodError(parsed.error))
    const user = await resetClientPassword(id, parsed.data.newPassword)
    res.json({ message: 'Palavra-passe redefinida com sucesso', user })
  } catch (e) { next(e) }
})

export default router
