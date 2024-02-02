const Bcrypt = require('bcrypt');
const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');

const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const User = BaseModel.extend({
    tableName: 'users',
    idPrefix: 'iot-',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
        id: Joi.string().when('$creating', required),
        /**
         * @type {string}
         */
        href: Joi.string().when('$creating', required),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
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

module.exports = User;
