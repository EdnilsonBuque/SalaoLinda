/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('reviews', (table) => {
    table.bigIncrements('id').primary()
    table.bigInteger('appointment_id').unsigned().notNullable().unique().references('id').inTable('appointments').onDelete('CASCADE')
    table.bigInteger('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.tinyint('rating').unsigned().notNullable()
    table.text('comment').nullable()
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now())
  })
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('reviews')
}
