exports.up = knex => knex.schema.table('event_history', (table) =>{
    table.string('user_type', 64).notNullable();
});

exports.down = knex => knex.schema.table('event_history', (table) =>{
    table.dropColumn('user_type');
});