const Joi = require('joi');
const _ = require('lodash');
const BaseModel = require('./helpers/base');
const required = { is: true, then: Joi.required() };

/**
 * An Extension could be a real user or device.
 * @type Extension
 */
const PermissionModel = BaseModel.extend({

    hasTimestamps: ['createdAt', 'updatedAt'],
       
    initialize() {
       this.on('saving', this.validate);
    },
    
    serialize(...args) {
        const res = BaseModel.prototype.serialize.apply(this, args);
        // remove internal ids from object
        return res;
    },

     /**
     * Automatically validate the schema of the model on create/update.
     * The context passed to Joi.validate introduces '$creating' and
     * '$updating' variables that can be used to conditionally define schema
     * constraints for a database insert or update, respectively.
     */
    validate(model, attrs, options) {

        if (!this.get('user_id') && !this.get('user_group_id')) {
            // if user_id and user_group_id are both unset, throw an error
            throw new Error('user_id and user_group_id cannot be both null');
        }
        BaseModel.prototype.validate.call(this, model, attrs, options);
    },


}, {
    /* collection properties */
});

module.exports = PermissionModel