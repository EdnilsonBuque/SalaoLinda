const required = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SALON_TZ',
]

function readEnv() {
  const env = { ...process.env }
  const missing = required.filter((k) => env[k] == null || env[k] === '')
  // DB_PASSWORD can be empty for local root/socket-like dev as per project constraints
  if (env.DB_PASSWORD == null) env.DB_PASSWORD = ''
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  env.PORT = Number(env.PORT)
  env.DB_PORT = Number(env.DB_PORT)
  env.JWT_ACCESS_EXPIRES = env.JWT_ACCESS_EXPIRES || '15m'
  env.JWT_REFRESH_EXPIRES = env.JWT_REFRESH_EXPIRES || '30d'
  env.CORS_ORIGINS = (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
  return env
}

export const env = readEnv()
