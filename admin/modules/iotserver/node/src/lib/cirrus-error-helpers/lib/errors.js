const util = require('util');

/**
 * Create a new Error instance with the status set to 400.
 *
 * @param {string} [message] An optional message. Defaults to 'Bad Request.'
 * @param {string} [sourceService] An optional attribute that determines which
 *                                 service originated the error.
 * @constructor
 */
function BadRequestError(message, sourceService) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.message = message || 'Bad Request.';
    this.statusCode = 400;
    this.status = this.statusCode;
    this.name = 'BadRequestError';
    this.sourceService = sourceService;
}

util.inherits(BadRequestError, Error);
exports.BadRequestError = BadRequestError;

/**
 * Create a new Error instance with the status set to 401.
 *
 * @param {string} [message] An optional message. Defaults to 'Unauthorized.'
 * @param {string} [sourceService] An optional attribute that determines which
 *                                 service originated the error.
 * @constructor
 */
function UnauthorizedError(message, sourceService) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.message = message || 'Unauthorized.';
    this.statusCode = 401;
    this.status = this.statusCode;
    this.name = 'UnauthorizedError';
    this.sourceService = sourceService;
}

util.inherits(UnauthorizedError, Error);
exports.UnauthorizedError = UnauthorizedError;

/**
 * Create a new Error instance with the status set to 403.
 *
 * @param {string} [message] An optional message. Defaults to 'Forbidden.'
 * @param {string} [sourceService] An optional attribute that determines which
 *                                 service originated the error.
 * @constructor
 */
function ForbiddenError(message, sourceService) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.message = message || 'Forbidden.';
    this.statusCode = 403;
    this.status = this.statusCode;
    this.name = 'ForbiddenError';
    this.sourceService = sourceService;
}

util.inherits(ForbiddenError, Error);
exports.ForbiddenError = ForbiddenError;

/**
 * Create a new Error instance with the status set to 404.
 *
 * @param {string} [message] An optional message. Defaults to 'Not Found.'
 * @param {string} [sourceService] An optional attribute that determines which
 *                                 service originated the error.
 * @constructor
 */
function NotFoundError(message, sourceService) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.message = message || 'Not Found.';
    this.statusCode = 404;
    this.status = this.statusCode;
    this.name = 'NotFoundError';
    this.sourceService = sourceService;
}

util.inherits(NotFoundError, Error);
exports.NotFoundError = NotFoundError;

/**
 * Create a new Error instance with the status set to 409.
 *
 * @param {string} [message] An optional message. Defaults to 'Conflict.'
 * @param {string} [sourceService] An optional attribute that determines which
 *                                 service originated the error.
 * @constructor
 */
function ConflictError(message, sourceService) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.message = message || 'Conflict.';
    this.statusCode = 409;
    this.status = this.statusCode;
    this.name = 'ConflictError';
    this.sourceService = sourceService;
}

util.inherits(ConflictError, Error);
exports.ConflictError = ConflictError;
