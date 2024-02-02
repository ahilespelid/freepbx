exports.up = knex => knex('user_property_fields').insert([{name: 'automation-pending-action', description: 'pending automated action information', createdAt: knex.fn.now(), updatedAt: knex.fn.now()}]);

exports.down = knex => knex('user_property_fields').whereIn('name', ['automation-pending-action']).del();