/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('services', (table) => {
    table.bigInteger('specialist_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
    table.index(['specialist_id'])
  })
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.alterTable('services', (table) => {
    table.dropForeign(['specialist_id'])
    table.dropIndex(['specialist_id'])
    table.dropColumn('specialist_id')
  })
}
