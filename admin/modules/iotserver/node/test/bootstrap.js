const _ = require('lodash');
const assert = require('assert');
const http = require('http');
const knexFactory = require('knex');
const tk = require('timekeeper');

const bootstrap = require('../src/bootstrap');
const knexConfig = require('../knexfile');

// Our servers run on UTC, so tests should, too
process.env.TZ = 'UTC';

function assertDatabase() {
    const config = _.cloneDeep(knexConfig.test);
    const databaseName = config.connection.database;
    delete config.connection.database;
    const knex = knexFactory(config);

    return knex.raw(`DROP DATABASE IF EXISTS ${databaseName}`)
        .then(() => knex.raw(`CREATE DATABASE ${databaseName}`));
}

function migrateDatabase() {
    const config = knexConfig.test;
    const knex = knexFactory(config);

    return knex.migrate.latest();
}

function startServer() {
    return assertDatabase()
        .then(migrateDatabase)
        .then(() => bootstrap.boot())
        .then(app => new Promise((resolve) => {
            const server = http.createServer(app);
            server.listen(0, () => resolve(server));
        }));
}

// this has to be named and not an arrow function
// because it relies on the `this` set by mocha
before(function migrate() {
    // doing migrations and starting server can take some time.
    // increasing timeout helps it not choke randomly on slower systems.
    this.timeout(60000);

    return startServer().then((server) => {
        global.server = server;
    });
});

afterEach(() => {
    assert(!tk.isKeepingTime(), 'Someone forgot to reset timekeeper');
});
