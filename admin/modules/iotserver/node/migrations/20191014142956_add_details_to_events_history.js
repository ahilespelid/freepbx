const EventHistory = require('../src/models/EventHistory.js');

exports.up = knex => knex.schema.table('event_history', (table) =>{
		table.mediumText('details',128).nullable().default(null);
});

exports.down = knex => knex.schema.table('event_history', (table) =>{
	table.dropColumn('details');
});
