
exports.up = knex => knex.schema.createTable('guests', (table) => {
	table.increments('id').primary().unsigned().notNullable();
    table.string('name', 64).notNullable().unique();
    table.string('email',64).notNullable().index()
	table.string('status', 24).notNullable()
	table.string('access_scope', 64).notNullable()
    table.string('org_id', 64).notNullable().index();
    table.string('invite_status', 24).notNullable();
    table.string('expiry', 24).notNullable();
    table.string('token', 36).notNullable();
	table.string('end_timestamp_utc','DATETIME(6)').nullable().default(null).index();
	table.string('createdAt','DATETIME(6)').notNullable();
    table.string('updatedAt', 'DATETIME(6)').notNullable();
    table.string('deletedAt', 'DATETIME(6)').notNullable();
});

exports.down = knex => knex.schema.dropTable('guests');
