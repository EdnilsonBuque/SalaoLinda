import http from 'http'
import https from 'https'
import fs from 'node:fs'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'node:path'
import { env } from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import adminRoutes from './routes/admin.routes.js'
import adminServiceRoutes from './routes/adminService.routes.js'
import adminAppointmentRoutes from './routes/adminAppointment.routes.js'
import adminReviewRoutes from './routes/adminReview.routes.js'
import appointmentRoutes from './routes/appointment.routes.js'
import serviceRoutes from './routes/service.routes.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(helmet())
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    return cb(null, env.CORS_ORIGINS.includes(origin))
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
app.use('/api/admin/services', adminServiceRoutes)
app.use('/api/admin/appointments', adminAppointmentRoutes)
app.use('/api/admin/reviews', adminReviewRoutes)

app.use(notFound)
app.use(errorHandler)

const PORT = env.PORT
let server

if (env.NODE_ENV === 'production') {
  // Em produção: HTTPS obrigatório
  const sslOptions = {
    key: fs.readFileSync('/tmp/key.pem'),
    cert: fs.readFileSync('/tmp/cert.pem')
  }
  server = https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`API segura (HTTPS) a correr em https://localhost:${PORT} (TZ salão: ${env.SALON_TZ})`)
  })
} else {
  // Em dev: HTTP para compatibilidade com o Vite dev server
  server = http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`API (HTTP) a correr em http://0.0.0.0:${PORT} (TZ salão: ${env.SALON_TZ})`)
  })
}

export default server
