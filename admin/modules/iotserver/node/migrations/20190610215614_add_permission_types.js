exports.up = knex => knex('permission_types').insert([{type: 'view_limited', description: 'View/read any "common/non privacy" sensor, lock  in a Location/Zone/Scene', createdAt: knex.fn.now(), updatedAt: knex.fn.now()},
	{type: 'view', description: 'View/read any all sensor, lock in a Location/Zone/Scene',createdAt: knex.fn.now(), updatedAt: knex.fn.now()},
	{type: 'control', description: 'Able to view/read or control of any sensor, lock in a Location/Zone/Scene. Able to set state: like Arm/Disarm if in Zone', createdAt: knex.fn.now(), updatedAt: knex.fn.now()},
	{type: 'monitor', description: 'Receive notifications on alerts in a Location/Zone/Scene', createdAt: knex.fn.now(), updatedAt: knex.fn.now()}]);

exports.down = knex => knex('permission_types').whereIn('type', ['view', 'view_limited', 'control', 'monitor']).del();