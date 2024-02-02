const bunyan = require('bunyan');
const format = require('bunyan-format');
const config = require('config');

const serializers = require('./serializers');
const { name } = require('../../package.json');

function createLogger() {
    //const { level, pretty, filePath: path } = config.log;
    const level = config.log.level;
    const pretty = config.log.pretty;
    const path = config.log.path;

    if (level === 'silent') {
        return bunyan.createLogger({ name, streams: [] });
    }

    if (path) {
        return bunyan.createLogger({
            name,
            streams: [{ level: level, path: path }],
            serializers,
        });
    }

    const stream = pretty ? format({ outputMode: 'short' }) : process.stdout;
    return bunyan.createLogger({
        name,
        streams: [{ level: level, stream: stream }],
        serializers,
    });
}

const log = createLogger();

if (config.log.logUncaughtException) {
    process.on('uncaughtException', (err) => {
        log.fatal({ err }, 'Uncaught exception');
        process.exit(1);
    });

    process.on('unhandledRejection', (err) => {
        log.error({ err }, 'Unhandled rejection');
    });

    process.on('rejectionHandled', (reason) => {
        log.error({ reason }, 'Nevermind; it was handled');
    });
}

module.exports = log;
