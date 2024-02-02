module.exports = {
    port: {
        __name: 'PORT',
        __format: 'yml',
    },
    environment: 'NODE_ENV',
    knex: {
        connection: {
            host: 'MYSQL_HOST',
            user: 'MYSQL_USER',
            password: 'MYSQL_PASSWORD',
            database: 'MYSQL_DATABASE',
        },
        debug: {
            __name: 'KNEX_DEBUG',
            __format: 'yml',
        },
    },
    log: {
        level: 'LOG_LEVEL',
        pretty: {
            __name: 'LOG_PRETTY',
            __format: 'yml',
        },
    },
};
