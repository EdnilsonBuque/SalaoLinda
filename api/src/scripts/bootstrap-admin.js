import db from '../db/knex.js'
import { hashPassword } from '../utils/password.js'

async function main() {
  const name = process.env.ADMIN_NAME || 'Admin'
  const phone = process.env.ADMIN_PHONE
  const password = process.env.ADMIN_PASSWORD
  if (!phone || !password) {
    throw new Error('ADMIN_PHONE e ADMIN_PASSWORD são obrigatórios (defina no api/.env)')
  }
  const existing = await db('users').where({ phone }).first()
  const password_hash = await hashPassword(password)
  if (existing) {
    await db('users').where({ id: existing.id }).update({ name, password_hash, role: 'admin', updated_at: new Date() })
    console.log(`Admin atualizado: id=${existing.id} phone=${phone}`)
  } else {
    const [id] = await db('users').insert({ name, phone, password_hash, role: 'admin', created_at: new Date(), updated_at: new Date() })
    console.log(`Admin criado: id=${id} phone=${phone}`)
  }
  await db.destroy()
}

main().catch(async (err) => {
  console.error('Erro no bootstrap admin:', err.message)
  try { await db.destroy() } catch {}
  process.exit(1)
})
