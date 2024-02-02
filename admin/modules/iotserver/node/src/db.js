/*
 * This is the main entry point for interacting with the db.
 *
 * This file loads all of the bookshelf models from './models'
 * into the bookshelf model registry, preparing them for use.
 */
const BaseModel = require('./models/helpers/base');
const models = require('./models');
const bookshelf = require('./lib/bookshelf');
const log = require('./lib/log');

Object.keys(models).forEach((key) => {
    const model = models[key];
    if (model.prototype instanceof BaseModel) {
        bookshelf.model(key, model);
    }
});

/**
 * @type {Bookshelf}
 */
module.exports = bookshelf;

/**
 * Run the database migrations
 *
 * Note that this will only execute something if the environment variable
 * KNEX_RUN_MIGRATIONS is defined and set to truthy.
 *
 * @returns Promise {object}
 */
module.exports.runMigrations = () => {
    if (process.env.KNEX_RUN_MIGRATIONS) {
        log.info('Running migrations...');
        return bookshelf.knex.migrate.latest('../migrations')
            .then(() => {
                log.info('Migrations complete');
            });
    }

    return Promise.resolve();
};

/**
 * Wait for a database connection
 *
 * @param intervalMs {integer} How long to wait between attempts in ms. Default is 5000ms
 * @param maxRetries {integer} How many attempts to make. Default is 10.
 *
 * @returns Promise {object}
 */
module.exports.waitForDatabase = (intervalMs = 5000, maxRetries = 10) => {
    let attempt = 0;

    return new Promise((resolve, reject) => {
        function attemptConnection() {
            bookshelf.knex.raw('SELECT 1')
                .then(() => {
                    log.info('Connected to database');
                    resolve();
                })
                .catch((err) => {
                    if (attempt >= maxRetries) {
                        reject(new Error(`Failed to connect to database after ${attempt} attempts`));
                        return;
                    }

                    attempt += 1;
                    log.warn({ err }, `Failed to connect to database (${attempt} of ${maxRetries})`);
                    setTimeout(attemptConnection, intervalMs);
                });
        }

        setTimeout(attemptConnection, 0);
    });
};

/**
 * Remove unexisting migration file entries from the knex_migrations database table.
 * This is used to resolve migration director corruption issue on downgrading smartoffice version.
 * 
 * @param filesNotFound {array} list of files which are not present in the migration directory and present in migration database 
 * 
 * @returns Promise {object}
 */
module.exports.removeUnexistMigrationFilesFromDB = (filesNotFound) => {
    return new Promise((resolve,reject) => {
        bookshelf.knex.raw("delete from knex_migrations where name IN ("+ "'" + filesNotFound.join("','") + "'"+ ")").then(()=>{
            log.info("removed following unexisting migration files details from the migration table :",filesNotFound.toString());
            resolve();
        }).catch((err)=>{
            log.error("Error on deleting unexisting migration files details from database:",err);
            reject();
        });
    });
};
