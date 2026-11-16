import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { env } from '../config/env.js'

const ALG = 'HS256'

export function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { algorithm: ALG, expiresIn: env.JWT_ACCESS_EXPIRES },
  )
}

export function signRefreshToken(user) {
  const jti = crypto.randomUUID()
  const token = jwt.sign(
    { sub: String(user.id), role: user.role, type: 'refresh', jti },
    env.JWT_REFRESH_SECRET,
    { algorithm: ALG, expiresIn: env.JWT_REFRESH_EXPIRES },
  )
  return { token, jti }
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALG] })
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALG] })
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function decodeExpiry(token) {
  const decoded = jwt.decode(token)
  if (!decoded || !decoded.exp) return null
  return new Date(decoded.exp * 1000)
}
