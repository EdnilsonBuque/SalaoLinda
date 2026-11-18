/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // MySQL ENUM alteration is kept explicit to avoid Knex silently omitting new values.
  await knex.raw("ALTER TABLE users MODIFY role ENUM('client','admin','especialista') NOT NULL DEFAULT 'client'")
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex('users').where({ role: 'especialista' }).update({ role: 'client' })
  await knex.raw("ALTER TABLE users MODIFY role ENUM('client','admin') NOT NULL DEFAULT 'client'")
}
