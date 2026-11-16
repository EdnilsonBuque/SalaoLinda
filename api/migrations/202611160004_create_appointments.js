/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('appointments', (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT')
    table.bigInteger('service_id').unsigned().notNullable().references('id').inTable('services').onDelete('RESTRICT')
    table.dateTime('starts_at').notNullable()
    table.dateTime('ends_at').notNullable()
    table.enu('status', ['pendente', 'confirmada', 'rejeitada', 'cancelada', 'concluida'], {
      useNative: true,
      enumName: 'appointments_status',
    }).notNullable().defaultTo('pendente')
    table.decimal('price_at_booking', 10, 2).notNullable()
    table.integer('duration_at_booking').unsigned().notNullable()
    table.string('rejection_reason', 255).nullable()
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now())
    table.index(['status', 'starts_at'])
    table.index(['user_id', 'starts_at'])
    table.index(['starts_at', 'ends_at'])
  })
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('appointments')
}
