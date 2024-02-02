/*
 * This file is responsible for bootstrapping bookshelf with its
 * connection details and initializing the registry plugin.
 *
 * If this code lived in db.js, a circular dependency between that
 * file and the base model require the code to be written in a way
 * that is difficult to understand. Splitting the bookshelf
 * initialization into its own file prevents this complexity.
 */
const config = require('config');
const knexFactory = require('knex');
const bookshelfFactory = require('bookshelf');
const knex = knexFactory(config.knex);
const bookshelf = bookshelfFactory(knex);

bookshelf.plugin('registry');
bookshelf.plugin('visibility');
bookshelf.plugin('pagination');

module.exports = bookshelf;
