import db from '../db/knex.js'
import { hashPassword } from '../utils/password.js'

const SPECIALISTS = [
  {
    name: process.env.SPECIALIST_NAME_1 || 'Cabeleireiro',
    phone: process.env.ESPECIALIST_PHONE_1 || '840000001',
    password: process.env.ESPECIALIST_PASSWORD_1 || 'Especialista1!',
  },
  {
    name: process.env.SPECIALIST_NAME_2 || 'Manicurista/Pedicurista',
    phone: process.env.ESPECIALIST_PHONE_2 || '840000002',
    password: process.env.ESPECIALIST_PASSWORD_2 || 'Especialista1!',
  },
]

async function main() {
  for (const specialist of SPECIALISTS) {
    const existing = await db('users').where({ phone: specialist.phone }).first()
    const password_hash = await hashPassword(specialist.password)
    if (existing) {
      await db('users').where({ id: existing.id }).update({
        name: specialist.name,
        password_hash,
        role: 'especialista',
        updated_at: new Date(),
      })
      console.log(`Especialista atualizado: id=${existing.id} phone=${specialist.phone}`)
    } else {
      const [id] = await db('users').insert({
        name: specialist.name,
        phone: specialist.phone,
        password_hash,
        role: 'especialista',
        created_at: new Date(),
        updated_at: new Date(),
      })
      console.log(`Especialista criado: id=${id} phone=${specialist.phone}`)
    }
  }
  await db.destroy()
}

main().catch(async (err) => {
  console.error('Erro no bootstrap de especialistas:', err.message)
  try { await db.destroy() } catch {}
  process.exit(1)
})
