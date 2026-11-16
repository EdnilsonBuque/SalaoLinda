import db from '../db/knex.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, decodeExpiry } from '../utils/jwt.js'

function toSafeUser(user) {
  return { id: user.id, name: user.name, phone: user.phone, role: user.role }
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user)
  const { token: refreshToken, jti } = signRefreshToken(user)
  const token_hash = hashToken(refreshToken)
  const expires_at = decodeExpiry(refreshToken)
  await db('refresh_tokens').insert({
    user_id: user.id,
    token_hash,
    jti,
    expires_at,
    created_at: new Date(),
  })
  return { accessToken, refreshToken }
}

export async function register({ name, phone, password }) {
  const existing = await db('users').where({ phone }).first()
  if (existing) {
    const err = new Error('Este contacto já está registado')
    err.status = 409
    throw err
  }
  const password_hash = await hashPassword(password)
  const [id] = await db('users').insert({
    name,
    phone,
    password_hash,
    role: 'client',
    created_at: new Date(),
    updated_at: new Date(),
  })
  const user = await db('users').select('id', 'name', 'phone', 'role').where({ id }).first()
  const tokens = await issueTokens(user)
  return { user: toSafeUser(user), ...tokens }
}

export async function login({ phone, password }) {
  const user = await db('users').where({ phone }).first()
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    const err = new Error('Contacto ou palavra-passe inválidos')
    err.status = 401
    throw err
  }
  const safe = toSafeUser(user)
  const tokens = await issueTokens(safe)
  return { user: safe, ...tokens }
}

export async function refresh(refreshToken) {
  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    const err = new Error('Sessão inválida ou expirada')
    err.status = 401
    throw err
  }
  if (payload.type !== 'refresh' || !payload.jti) {
    const err = new Error('Token inválido')
    err.status = 401
    throw err
  }
  const token_hash = hashToken(refreshToken)
  const record = await db('refresh_tokens').where({ jti: payload.jti, token_hash }).first()
  if (!record || record.revoked_at || new Date(record.expires_at).getTime() <= Date.now()) {
    // possible reuse: revoke all for safety if record exists
    if (record) await db('refresh_tokens').where({ id: record.id }).update({ revoked_at: new Date() })
    const err = new Error('Sessão inválida ou expirada')
    err.status = 401
    throw err
  }
  await db('refresh_tokens').where({ id: record.id }).update({ revoked_at: new Date() })
  const user = await db('users').select('id', 'name', 'phone', 'role').where({ id: Number(payload.sub) }).first()
  if (!user) {
    const err = new Error('Utilizador não encontrado')
    err.status = 401
    throw err
  }
  const tokens = await issueTokens(user)
  return { user: toSafeUser(user), ...tokens }
}

export async function logout(refreshToken) {
  if (!refreshToken) return
  try {
    const payload = verifyRefreshToken(refreshToken)
    if (payload?.jti) {
      await db('refresh_tokens').where({ jti: payload.jti }).update({ revoked_at: new Date() })
    }
  } catch {
    // ignore invalid token on logout
  }
}

export async function me(userId) {
  const user = await db('users').select('id', 'name', 'phone', 'role').where({ id: userId }).first()
  if (!user) {
    const err = new Error('Utilizador não encontrado')
    err.status = 404
    throw err
  }
  return toSafeUser(user)
}

export async function resetClientPassword(targetUserId, newPassword) {
  const user = await db('users').where({ id: targetUserId }).first()
  if (!user) {
    const err = new Error('Utilizador não encontrado')
    err.status = 404
    throw err
  }
  const password_hash = await hashPassword(newPassword)
  await db('users').where({ id: targetUserId }).update({ password_hash, updated_at: new Date() })
  await db('refresh_tokens').where({ user_id: targetUserId, revoked_at: null }).update({ revoked_at: new Date() })
  return { id: user.id, name: user.name, phone: user.phone, role: user.role }
}
