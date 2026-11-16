import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { register, login, refresh, logout, me } from '../services/authService.js'
import { authenticate } from '../middleware/authenticate.js'
import { registerSchema, loginSchema, refreshSchema, formatZodError } from '../validators/authSchemas.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas tentativas. Tente novamente mais tarde.' },
})

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(formatZodError(parsed.error))
    const result = await register(parsed.data)
    res.status(201).json(result)
  } catch (e) { next(e) }
})

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(formatZodError(parsed.error))
    const result = await login(parsed.data)
    res.json(result)
  } catch (e) { next(e) }
})

router.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(formatZodError(parsed.error))
    const result = await refresh(parsed.data.refreshToken)
    res.json(result)
  } catch (e) { next(e) }
})

router.post('/logout', async (req, res, next) => {
  try {
    await logout(req.body?.refreshToken)
    res.status(204).send()
  } catch (e) { next(e) }
})

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await me(req.user.id)
    res.json({ user })
  } catch (e) { next(e) }
})

export default router
