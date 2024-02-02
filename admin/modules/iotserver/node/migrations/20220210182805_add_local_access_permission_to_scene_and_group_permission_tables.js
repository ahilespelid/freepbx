exports.up = knex => knex.schema.table('scene_permissions', (table) =>{
    table.integer('local_access', 10).unsigned().notNullable().default(1);
}).table('group_permissions', (table) =>{
    table.integer('local_access', 10).unsigned().notNullable().default(1);
});

exports.down = knex => knex.schema.table('scene_permissions', (table) =>{
    table.dropColumn('local_access');
}).table('group_permissions', (table) =>{
    table.dropColumn('local_access');
});
