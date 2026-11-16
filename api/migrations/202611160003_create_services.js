/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('services', (table) => {
    table.bigIncrements('id').primary()
    table.string('name', 150).notNullable()
    table.text('description').nullable()
    table.decimal('price', 10, 2).notNullable()
    table.integer('duration_minutes').unsigned().notNullable()
    table.string('image_path', 255).nullable()
    table.boolean('active').notNullable().defaultTo(true)
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now())
  })
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('services')
}
