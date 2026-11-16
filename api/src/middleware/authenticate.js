import db from '../db/knex.js'
import { verifyAccessToken } from '../utils/jwt.js'

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const [type, token] = header.split(' ')
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Não autenticado' })
  }
  try {
    const payload = verifyAccessToken(token)
    if (payload.type !== 'access') {
      return res.status(401).json({ message: 'Token inválido' })
    }
    const user = await db('users').select('id', 'name', 'phone', 'role').where({ id: Number(payload.sub) }).first()
    if (!user) return res.status(401).json({ message: 'Utilizador não encontrado' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ message: 'Sessão inválida ou expirada' })
  }
}
