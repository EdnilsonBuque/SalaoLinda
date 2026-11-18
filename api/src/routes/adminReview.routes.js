import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { listAdminReviews } from '../services/reviewService.js'

const router = Router()

router.use(authenticate, requireAdmin)

router.get('/', async (req, res, next) => {
  try {
    const result = await listAdminReviews()
    res.json(result)
  } catch (e) { next(e) }
})

export default router