import { env } from './src/config/env.js'

const config = {
  client: 'mysql2',
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD || undefined,
    database: env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
  },
  pool: { min: 0, max: 10 },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
}

export default {
  development: config,
  production: config,
}
