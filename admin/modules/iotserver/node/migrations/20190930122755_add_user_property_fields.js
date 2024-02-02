
exports.up = knex => knex('user_property_fields').insert([{name: 'pincode', description: 'user object specific pincode', createdAt: knex.fn.now(), updatedAt: knex.fn.now()},
	{name: 'favorite', description: 'User favorite object',createdAt: knex.fn.now(), updatedAt: knex.fn.now()}]);

exports.down = knex => knex('user_property_fields').whereIn('name', ['pincode', 'favorite']).del();