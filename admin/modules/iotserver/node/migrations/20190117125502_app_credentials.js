exports.up = knex => knex.schema.createTable('appcredentials', (table) => {
    table.string('id', 191).primary();
    table.string('appname', 191).notNullable().unique();
    table.string('password', 191).notNullable();
    table.specificType('createdAt', 'DATETIME(6)').notNullable();
    table.specificType('updatedAt', 'DATETIME(6)').notNullable();
});

exports.down = knex => knex.schema.dropTable('appcredentials');
