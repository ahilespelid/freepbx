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
const Gateway = BaseModel.extend({
    tableName: 'gateways',
    idPrefix: 'iot-',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
        id: Joi.number().integer(),
        name: Joi.string().when('$creating', required),
        state: Joi.string().valid('adding', 'discovering', 'ready', 'unreachable', 'fail', 'unknown', 'restarting'),
        uuid: Joi.string().when('$creating', required),
        org_id: Joi.string().when('$creating', required),
        actions: Joi.array().allow(null).items(Joi.string()),
        details: Joi.string().allow(null),
        provider: Joi.string(),
        location_uuid: Joi.string().allow(null),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
    },

    initialize() {
        this.on('saving', BaseModel.prototype.validate);
        //BaseModel.prototype.initialize.call(this);
    },

    devices() {
        return this.hasMany('device', 'gateway_uuid', 'uuid');
    },

    location() {
        return this.belongsTo('location', 'location_uuid', 'uuid');
    },

    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        // remove internal ids from object
        return res;
    },
}, {
    /* collection properties */
});

module.exports = bookshelf.model('gateway', Gateway)
