
exports.up = function(knex, Promise) {
	return knex.schema.raw('ALTER TABLE locations MODIFY `temperature` FLOAT(5,1)')
	.raw('ALTER TABLE zones MODIFY `temperature` FLOAT(5,1)')
	.raw('ALTER TABLE scenes MODIFY `temperature` FLOAT(5,1)')
};

exports.down = function(knex, Promise) {
	return Promise;
};