const assert = require('power-assert');
const Chance = require('chance');

const { testModelProperties } = require('bookshelf-model-tester');

const db = require('../../src/db');

const chance = new Chance();

describe('AppCredentials model', () => {
    const AppCredentials = db.model('AppCredentials');

    after(() => AppCredentials.destroyAll());

    testModelProperties({
        model: AppCredentials,
        generator: {
            appname: () => chance.word(),
            password: () => chance.word(),
        },
        requiredFields: ['appname', 'password'],
        writeOnly: ['password'],
        uniqueConstraints: ['appname'],
    });

    describe('when an application exists', () => {
        let app;

        beforeEach(() => AppCredentials.forge({
            appname: 'some-app',
            password: 'some-password',
        })
            .save()
            .then((created) => {
                app = created;
            }));

        afterEach(() => app.destroy());

        it('should validate the password', () => app.comparePassword('some-password')
            .then(passwordMatched => assert(passwordMatched)));

        it('should reject invalid passwords', () => app.comparePassword('not-a-password')
            .then(passwordMatched => assert(!passwordMatched)));

        describe('when updating the appname', () => {
            it('should not rehash the password', () => {
                const originalPassword = app.get('password');
                return app.save({ appname: 'some-other-app' })
                    .then((updated) => {
                        assert.strictEqual(updated.get('password'), originalPassword);
                    });
            });
        });

        describe('when updating the password', () => {
            it('should hash the password', () => app.save({ password: 'some-other-password' })
                .then(updated => updated.comparePassword('some-other-password'))
                .then(passwordMatched => assert(passwordMatched)));
        });
    });
});
