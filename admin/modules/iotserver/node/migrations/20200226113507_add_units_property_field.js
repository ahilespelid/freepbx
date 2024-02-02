
exports.up = knex => knex('user_property_fields').insert([{name: 'units', description: 'user units (imperial or metric)', createdAt: knex.fn.now(), updatedAt: knex.fn.now()}]);

exports.down = knex => knex('user_property_fields').whereIn('name', ['units']).del();