const { NotFoundError } = require('./errors');

/**
 * Middleware to add to the end of the middleware chain. When
 * combined with the `errorHandler` middleware, this will cause
 * a missing route to respond with a 404 status code and an error
 * JSON body.
 */
function notFound() {
    return function notFoundMiddleware(req, res, next) {
        next(new NotFoundError('Route not matched'));
    };
}

module.exports = notFound;
