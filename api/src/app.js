import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'node:path'
import { env } from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import adminRoutes from './routes/admin.routes.js'
import appointmentRoutes from './routes/appointment.routes.js'
import serviceRoutes from './routes/service.routes.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(helmet())
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    return cb(null, ['http://10.155.31.110:3000', 'http://10.0.2.2:3000', 'http://10.0.2.2:3001', 'http://localhost:3000', 'http://127.0.0.1:3000'].includes(origin))
  },
}))
app.use(express.json())
if (env.NODE_ENV !== 'production') app.use(morgan('dev'))

app.get('/api/health', (req, res) => res.json({ ok: true, tz: env.SALON_TZ }))
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  fallthrough: false,
  immutable: true,
  maxAge: '1y',
  index: false,
}))

app.use('/api/auth', authRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/admin', adminRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
