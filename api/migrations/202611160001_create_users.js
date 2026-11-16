/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').primary()
    table.string('name', 120).notNullable()
    table.string('phone', 30).notNullable().unique()
    table.string('email', 190).nullable()
    table.string('password_hash', 255).notNullable()
    table.enu('role', ['client', 'admin'], { useNative: true, enumName: 'users_role' }).notNullable().defaultTo('client')
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now())
  })
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('users')
}
