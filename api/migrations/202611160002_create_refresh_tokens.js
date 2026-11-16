/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.string('token_hash', 64).notNullable().unique()
    table.string('jti', 64).notNullable().unique()
    table.dateTime('expires_at').notNullable()
    table.dateTime('revoked_at').nullable()
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
    table.index(['user_id'])
    table.index(['expires_at'])
  })
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('refresh_tokens')
}
