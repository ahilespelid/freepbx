module.exports = {
    environment: process.env.NODE_ENV || 'simulation',
    // keep alive set to 1 minute on incoming requests
    keepAliveInterval: 60000,
    knex: {
        debug: false,
        client: 'mysql',
        connection: {
            host: process.env.MYSQL_HOST || '127.0.0.1',
            user: process.env.MYSQL_USER || 'sangoma',
            password: process.env.MYSQL_PASSWORD || 'sangomaftw!',
            database: process.env.MYSQL_DATABASE || 'iot_test',
            charset: 'utf8mb4',
        },
        pool: { min: 1, max: 10 },
    },
    log: {
        level: 'debug',
        logUncaughtException: true,
        pretty: true,
    },
    client:{
	uuid:'iZh8grpZbjQZ2JIFyViUfOoVLcOT7XYqZdu1u34frvfNQrL8ifJAHgpgV'
    },
    port: 3000,
    // name of this service to use when the source of an error is not an upstream service
    sourceService: 'iot-server-simulation',
};
