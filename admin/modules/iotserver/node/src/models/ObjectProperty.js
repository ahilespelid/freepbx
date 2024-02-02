const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const ObjectProperty = BaseModel.extend({
    tableName: 'object_properties',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
        property_name: Joi.string().when('$creating',required),
        property_id:Joi.number().integer(),
        property_type: Joi.string().valid('access-profile','automated-action').when('$creating',required),
        org_id: Joi.string().when('$creating',required),
        object_uuid: Joi.string().when('$creating',required),
        object_type: Joi.string().valid('location', 'zone', 'scene', 'group', 'device').when('$creating',required),
        property_value: Joi.string().when('$creating',required),
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

    accessProfile () {
        return this.belogsTo('access_profile', 'property_id', 'id');
    },
    automatedAction () {
        return this.belogsTo('automated_action', 'property_id', 'id');
    },

    objects() {
        return this.hasMany(this.attributes.object_type, 'object_uuid', 'uuid');
    },

}, {
    /* collection properties */
});

module.exports = ObjectProperty