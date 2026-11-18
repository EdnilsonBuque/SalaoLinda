/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('appointments', (table) => {
    table.bigInteger('specialist_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
    table.dateTime('deposit_deadline').nullable()
    table.index(['specialist_id', 'starts_at'])
  })

  // Use raw DDL for native MySQL ENUMs; Knex's alter generation can omit enum values.
  await knex.raw("ALTER TABLE appointments MODIFY status ENUM('pendente','confirmada','rejeitada','cancelada','concluida','aguarda_deposito','expirada') NOT NULL DEFAULT 'pendente'")
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex('appointments').whereIn('status', ['aguarda_deposito', 'expirada']).update({ status: 'pendente' })
  await knex.raw("ALTER TABLE appointments MODIFY status ENUM('pendente','confirmada','rejeitada','cancelada','concluida') NOT NULL DEFAULT 'pendente'")
  await knex.schema.alterTable('appointments', (table) => {
    table.dropForeign(['specialist_id'])
    table.dropIndex(['specialist_id', 'starts_at'])
    table.dropColumn('specialist_id')
    table.dropColumn('deposit_deadline')
  })
}
