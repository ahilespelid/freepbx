const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const UserPropertyValue = BaseModel.extend({
    tableName: 'user_property_values',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
        property_field_id: Joi.number().integer().when('$creating',required),
        org_id: Joi.string().when('$creating',required),
        user_id: Joi.number().integer().when('$creating',required),
        object_uuid: Joi.string().when('$creating',required),
        object_type: Joi.string().valid('location', 'zone', 'scene', 'group', 'door-lock', 'common','automated-action').when('$creating',required),
        value: Joi.string().when('$creating',required),
        details: Joi.string().allow(null),
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

}, {
    /* collection properties */
});

module.exports = UserPropertyValue