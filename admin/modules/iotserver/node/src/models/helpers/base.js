const Joi = require('joi');
const uuid = require('uuid');
const bookshelf = require('../../lib/bookshelf');

/**
 * A base model 'class' to abstract away some of the plumbing to make
 * working with Bookshelf more palatable.
 */
const BaseModel = bookshelf.Model.extend({
    // **** instance properties **** //

    /**
     * Wire up schema validation and id generation for the model
     */
    initialize() {
        this.on('creating', this.generateUUID);
        this.on('saving', this.validate);
    },

    /**
     * Generate an id automatically for the model
     */
    generateUUID() {
        if (!this.get('uuid')) {
            this.set('uuid', `${this.idPrefix || ''}${uuid.v4()}`);
        }
    },

    /**
     * Automatically validate the schema of the model on create/update.
     * The context passed to Joi.validate introduces '$creating' and
     * '$updating' variables that can be used to conditionally define schema
     * constraints for a database insert or update, respectively.
     */
    validate(model, attrs, options) {
        const { error } = Joi.validate(this.attributes, this.schema, {
            context: {
                creating: options.method === 'insert',
                updating: options.method === 'update',
            },
            abortEarly: false,
        });

        if (error) {
            throw error;
        }
    },

    /**
     * Sugar method to easily update a model's properties. Using this also
     * gives a clear stubbing point for testing, as opposed to trying to
     * stub save() which may be used multiple times in a single function.
     *
     * @param {object} props The values to pass to .set() prior to saving.
     * @param {object} [saveOptions] The options to pass to .save()
     * @returns {Promise} Resolves with the result of .save()
     */
    update(props, saveOptions) {
        return this.set(props).save(null, saveOptions);
    },
}, {
    // **** static properties **** //

    /**
     * Sugar method to easily destroy all instances of a given model.
     *
     * @returns {Promise} Resolves with the result of .destroy()
     */
    destroyAll() {
        return this.where('id', '!=', '0').destroy();
    },

    /**
     * Sugar method to easily create an instance of the model.
     *
     * @param {object} props The values to pass to .forge() prior to saving.
     * @param {object} [saveOptions] The options to pass to .save()
     * @returns {Promise} Resolves with the result of .save()
     */
    create(props, saveOptions) {
        return this.forge(props).save(null, saveOptions);
    },
});

module.exports = BaseModel;
