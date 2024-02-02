const Bcrypt = require('bcrypt');
const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');

const required = { is: true, then: Joi.required() };

/**
 * An AppCredentials is really a machine user. The password is like their API key.
 * For example, clickvox (while a product) might have an AppCredentials account. And if
 * we build another app like Dumblevox on top of the Cirrus platform, Dumblevox
 * would have the same productId (clickvox) but a different AppCredentials user (I think).
 * @type AppCredentials
 */
const AppCredentials = BaseModel.extend({
    tableName: 'appcredentials',
    idPrefix: 'apcr-',
    hasTimestamps: ['createdAt', 'updatedAt'],
    schema: {
        id: Joi.string().when('$creating', required),
        /**
         * @type {string}
         */
        appname: Joi.string().when('$creating', required),
        /**
         * @type {string}
         */
        password: Joi.string().when('$creating', required),
        createdAt: Joi.date(),
        updatedAt: Joi.date(),
    },

    initialize() {
        BaseModel.prototype.initialize.call(this);
        this.on('creating', this.hashPassword.bind(this));
        this.on('saving', this.hashPassword.bind(this));
    },

    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        // remove internal ids from object
        return _.omit(res, ['password']);
    },

    /**
     * Hashes the current password and stores it in the model password property.
     *
     * @returns {Promise}
     */
    hashPassword() {
        const currentPassword = this.attributes.password;
        const previousPassword = this.previousAttributes().password;

        // do not hash if the password has not changed or if no password was provided
        if (!currentPassword || currentPassword === previousPassword) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const clear = this.get('password');
            Bcrypt.hash(clear, 10, (err, hash) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(hash);
            });
        }).then((hash) => {
            this.set('password', hash);
            return this;
        });
    },

    /**
     * Returns true if the given password matches the hashed password in the password property.
     *
     * @param password
     * @returns {Promise.<boolean>}
     */
    comparePassword(password) {
        return new Promise((resolve, reject) => {
            Bcrypt.compare(password, this.get('password'), (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (res) {
                    resolve(true);
                    return;
                }

                resolve(false);
            });
        });
    },
}, {
    /* collection properties */
});

module.exports = AppCredentials;
