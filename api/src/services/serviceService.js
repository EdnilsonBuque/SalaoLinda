import db from '../db/knex.js'
import { httpError } from '../utils/httpError.js'

function toService(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    durationMinutes: row.duration_minutes,
    imagePath: row.image_path,
    active: Number(row.active) === 1,
  }
}

function toDatabaseFields(values) {
  const fields = {}
  if (Object.hasOwn(values, 'name')) fields.name = values.name
  if (Object.hasOwn(values, 'description')) fields.description = values.description || null
  if (Object.hasOwn(values, 'price')) fields.price = values.price.toFixed(2)
  if (Object.hasOwn(values, 'durationMinutes')) fields.duration_minutes = values.durationMinutes
  if (Object.hasOwn(values, 'imagePath')) fields.image_path = values.imagePath || null
  if (Object.hasOwn(values, 'active')) fields.active = values.active
  return fields
}

export async function listPublicServices() {
  const rows = await db('services').where({ active: true }).orderBy('name')
  return rows.map(toService)
}

export async function getPublicService(id) {
  const row = await db('services').where({ id, active: true }).first()
  if (!row) throw httpError(404, 'Serviço não encontrado')
  return toService(row)
}

export async function listAdminServices() {
  const rows = await db('services').orderBy('active', 'desc').orderBy('name')
  return rows.map(toService)
}

export async function createService(values) {
  const now = new Date()
  const [id] = await db('services').insert({
    ...toDatabaseFields(values),
    active: values.active ?? true,
    created_at: now,
    updated_at: now,
  })
  return toService(await db('services').where({ id }).first())
}

export async function updateService(id, values) {
  const updated = await db('services')
    .where({ id })
    .update({ ...toDatabaseFields(values), updated_at: new Date() })
  if (!updated) throw httpError(404, 'Serviço não encontrado')
  return toService(await db('services').where({ id }).first())
}

export async function deactivateService(id) {
  const updated = await db('services')
    .where({ id, active: true })
    .update({ active: false, updated_at: new Date() })
  if (!updated) throw httpError(404, 'Serviço não encontrado')
  return { id, active: false }
}
