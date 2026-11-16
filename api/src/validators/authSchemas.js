import { z } from 'zod'

const phoneSchema = z.string().trim().min(5, 'Contacto inválido').max(30, 'Contacto inválido')
const passwordSchema = z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres').max(100)

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório').max(120),
  phone: phoneSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Palavra-passe obrigatória'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Token inválido'),
})

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
})

export function formatZodError(err) {
  const fieldErrors = {}
  for (const issue of err.issues || []) {
    const key = issue.path?.[0] || 'form'
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return { message: 'Dados inválidos', fieldErrors }
}
