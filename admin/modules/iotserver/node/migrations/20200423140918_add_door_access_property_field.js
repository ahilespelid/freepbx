
exports.up = knex => knex('user_property_fields').insert([{name: 'door-access', description: 'user door-lock access information', createdAt: knex.fn.now(), updatedAt: knex.fn.now()}]);

exports.down = knex => knex('user_property_fields').whereIn('name', ['door-access']).del();