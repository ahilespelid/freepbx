exports.up = knex => knex('user_property_fields').insert([{name: 'automated-action', description: 'automated action information', createdAt: knex.fn.now(), updatedAt: knex.fn.now()}]);

exports.down = knex => knex('user_property_fields').whereIn('name', ['automated-action']).del();