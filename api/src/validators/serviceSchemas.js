import { z } from 'zod'

const serviceFields = {
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres').max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  price: z.coerce.number().finite().positive().max(99999999.99).multipleOf(0.01),
  durationMinutes: z.coerce.number().int().min(5).max(720),
  imagePath: z.union([z.string().trim().url().max(500), z.literal(''), z.null()]).optional(),
  active: z.boolean().optional(),
}

export const createServiceSchema = z.object(serviceFields)

export const updateServiceSchema = z.object(serviceFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Indique pelo menos um campo para atualizar')

export function formatServiceValidationError(error) {
  const fieldErrors = {}
  for (const issue of error.issues ?? []) {
    const field = issue.path[0] ?? 'form'
    if (!fieldErrors[field]) fieldErrors[field] = issue.message
  }
  return { message: 'Verifique os dados do serviço', fieldErrors }
}
