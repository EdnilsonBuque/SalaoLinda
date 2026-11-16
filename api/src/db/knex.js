import knex from 'knex'
import config from '../../knexfile.js'
import { env } from '../config/env.js'

const db = knex(config[env.NODE_ENV === 'production' ? 'production' : 'development'])

export default db
