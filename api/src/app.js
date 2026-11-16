import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import adminRoutes from './routes/admin.routes.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(helmet())
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    if (env.CORS_ORIGINS.length === 0 || env.CORS_ORIGINS.includes(origin)) return cb(null, true)
    return cb(new Error('Origem não permitida pelo CORS'))
  },
  credentials: true,
}))
app.use(express.json())
if (env.NODE_ENV !== 'production') app.use(morgan('dev'))

app.get('/api/health', (req, res) => res.json({ ok: true, tz: env.SALON_TZ }))

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
