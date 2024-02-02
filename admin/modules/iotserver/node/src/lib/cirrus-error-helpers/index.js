const errorMiddleware = require('./lib/errorMiddleware');
const errors = require('./lib/errors');
const notFoundMiddleware = require('./lib/notFoundMiddleware');

module.exports = {
    errors,
    errorMiddleware,
    notFoundMiddleware,
};
