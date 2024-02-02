const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const UserPropertyValue = require('./UserPropertyValue');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const UserPropertyField = BaseModel.extend({
    tableName: 'user_property_fields',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
	    name: Joi.string().when('$creating',required),
	    description: Joi.string().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
	},

    initialize() {
       this.on('saving', BaseModel.prototype.validate);
    },
    
    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        // remove internal ids from object
        return res;
    },

    values() {
        return this.hasMany(UserPropertyValue, 'property_field_id', 'id');
    },


}, {
    /* collection properties */
});

module.exports = UserPropertyField
