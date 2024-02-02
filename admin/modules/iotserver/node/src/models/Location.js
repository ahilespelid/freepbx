const Bcrypt = require('bcrypt');
const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const bookshelf = require('../lib/bookshelf');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const Location = BaseModel.extend({
    tableName: 'locations',
    idPrefix: 'iot-',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
	    id: Joi.number().integer(),
	    name: Joi.string().when('$creating',required),
        uuid: Joi.string().when('$creating',required),
        org_id: Joi.string().when('$creating',required),
	    actions: Joi.array().allow(null).items(Joi.string()),
	    details: Joi.string().allow(null),
        temperature: Joi.number().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
	},

    permissions() {
        return this.hasMany('location_permission', 'location_uuid', 'uuid');
    },

    zones() {
        return this.hasMany('zone', 'location_uuid', 'uuid');
    },

    gateways() {
        return this.hasMany('gateway', 'location_uuid', 'uuid');
    },

    initialize() {
        BaseModel.prototype.initialize.call(this);
    },
    
    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        // remove internal ids from object
        return res;
    },

    

}, {
    /* collection properties */
});
module.exports =  bookshelf.model('location', Location)
