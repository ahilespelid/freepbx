const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('config');
const sleep = require('sleep');
const util = require('util')



const { errorMiddleware, notFoundMiddleware } = require('./lib/cirrus-error-helpers');

const db = require('./db');
const log = require('./lib/log');
const swaggerMiddleware = require('./lib/middleware/swagger');
const iotServer = require('./lib/middleware/iotserver');
const dispatcher = require('./lib/iot/event-dispatcher.js');
const ProvidersManager = require('./lib/iot/providers/ProvidersManager.js');
const { fork } = require('child_process');
const BackendServer = require('./lib/iot/providers/BackendServer.js');

module.exports.boot = async () => {

    var isSimulation = false;
    if (global.process.env.NODE_ENV === "simulation") {
        log.info("Simulation mode detected");
        isSimulation = true;
    }

    await db.waitForDatabase();
    await db.runMigrations();
    try {
        await db.runMigrations();
    } catch (error) {
        var migrationDirecotryCurruptionErrText = "Error: The migration directory is corrupt, the following files are missing:";
        if(error.toString().includes(migrationDirecotryCurruptionErrText)){
            var filesNotFoundInDir = error.toString().replace(migrationDirecotryCurruptionErrText,"").split(",").map(i => i.trim());
            await db.removeUnexistMigrationFilesFromDB(filesNotFoundInDir);
        }
        await db.runMigrations();
    }
    var events = require('events');

    var watchdogEventEmitter = new events.EventEmitter();


    var envDup = {};
    for (const someVar in global.process.env) {
        envDup[someVar] = global.process.env[someVar];
    }

    global.process.on('unhandledRejection', (reason, promise) => {
        log.error("Unhandled rejection at " + util.inspect(promise, false, null, true) + "\n Reason: " + reason)
    })
    global.process.on('uncaughtException', (err, origin) => {
        log.error("Unhandled exception: " + err + "\n. Exception origin: " + origin)
    })

    envDup['NODE_CONFIG'] = JSON.stringify(config);
    log.info('NODE_CONFIG: ' + envDup['NODE_CONFIG']);

    // spawn the iotserver-watchdog service child process
    const iotserver_watchdog = fork(global.process.cwd() + '/src/services/iotserver-watchdog-service.js',
        [],
        { silent: true, cwd: global.process.cwd() + '/src/services/', env: envDup });

    iotserver_watchdog.on('close', (code) => {
        log.error(`watchdog process exited with code ${code}`);
    });

    iotserver_watchdog.on('error', (err) => {
        log.error(`watchdog process error ${err}`);
    });

    iotserver_watchdog.on('exit', (code, signal) => {
        log.error(`watchdog process exited on signal ${signal} with code ${code}`);
    });

    iotserver_watchdog.on('message', (message, sendHandle) => {
        if (message.type == "log") {
            log[message.data.level](`watchdog: ${message.data.text}`);
        } else if (message.type == "jilia_update") {
            watchdogEventEmitter.emit("watchod::event", message.data.object_type, message.data.object, message.data.event, true);
        } else if (message.type == "job_update") {
            watchdogEventEmitter.emit("watchod::job::update", message);
        } else if (message.type == "access-profile-command") {
            watchdogEventEmitter.emit("watchod::access-profile::command", message.data);
        } else if (message.type == "automated-action-command") {
            watchdogEventEmitter.emit("watchod::automated-action::command", message.data);
        }
    });

    // sleep a little bit to let watchdog initialize
    sleep.msleep(5000)

    var ClientServer = null;
    var IoTBackendServer = null;

    if (config.zulu) {
        const FreePBX = require('./lib/zulu/Platform/FreePBX');
        ClientServer = require('./lib/zulu/Servers/Client');
        const freepbx = new FreePBX()
        try {
            log.info("PORTS: " + global.process.env.PORTS);
            await freepbx.initialize()
            await ClientServer.initialize(config, freepbx)
            IoTBackendServer = new BackendServer(ClientServer);
            await IoTBackendServer.init(freepbx);
        } catch (error) {
            log.fatal(error);
            global.process.exitCode = 1;
            global.process.kill(global.process.pid, 'SIGTERM');
        }

    }

    var host = ClientServer ? ClientServer.host : config.host;

    const IoTManager = new ProvidersManager(config.iot, host, IoTBackendServer);

    try {
        await IoTManager.initialize(isSimulation);
        await dispatcher.init(IoTManager, IoTBackendServer, ClientServer, watchdogEventEmitter);
    } catch (error) {
        log.error(error);
    }


    IoTBackendServer.on('cloud::registration::confirmed', IoTManager.handleCloudReg.bind(IoTManager));

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        var valid = true;
        var thisRegex = new RegExp(/^\/(api|file|docs)([^?]*)(?:\?(.*))?/);
        var result = thisRegex.exec(req.originalUrl);
        var msg = '';
        var valid = true;
        var guestAccessRegex = new RegExp(/^\/groups\/guestaction\/(lock|unlock)\/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}\/iot-[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}(\?|)$/g);
        if (['/healthy', '/internal/reg'].includes(req.originalUrl)) {
            valid = true;
        } else if (guestAccessRegex.test(req.originalUrl)) {
            valid = true;
        } else if (result && (!['localhost', '127.0.0.1', ClientServer.host].includes(req.ip))) {
            if ((result[1] === 'api' && result[2] !== '-docs') || result[1] === 'file') {
                // somebody trying to access api from outside, not allowed. 
                valid = false;
            } else if (result[1] === 'docs' && ClientServer && ClientServer.port == req.socket.localPort) {
                // somebody trying to access swagger from outside, not allowed.
                valid = false;
            }

            if (!valid) {
                msg = "Access to " + req.originalUrl + " only allowed from internal";
            }
        } else if (config.zulu && !result) {
            valid = ClientServer.checkToken(req.query.sessionid, req.query.token);
            if (!valid) {
                msg = "invalid token " + req.query.token + " for session " + req.query.sessionid;
            }
        }

        if (valid) {
            res.set('x-powered-by', 'Sangoma');
            res.setHeader('Access-Control-Allow-Origin', '*');
            if (req.headers['access-control-request-method']) {
                res.setHeader('access-control-allow-methods', req.headers['access-control-request-method']);
            }
            if (req.headers['access-control-request-headers']) {
                res.setHeader('access-control-allow-headers', req.headers['access-control-request-headers']);
            }
            return next();
        }

        log.warn(msg);

        res.status(403).end(msg);
    });

    app.set('trust proxy', true);

    app.set('zulu', ClientServer);

    app.set('iot_manager', IoTManager);

    app.set('iotserver_watchdog', iotserver_watchdog);

    app.set('iot_backend_server', IoTBackendServer);

    if (config.iot.swagger && config.iot.swagger.enabled === true) {
        log.info(`Initializing swagger endpoint`);
        const swaggerFile = fs.readFileSync(path.join(__dirname, 'api/swagger/swagger.yaml'), 'utf8');
        await swaggerMiddleware.initMiddleware(app, __dirname, swaggerFile);
    }

    await iotServer.initMiddleware(app, __dirname, express);
    app.use(notFoundMiddleware());
    app.use(errorMiddleware(log, config.sourceService));

    // Place any additional Express middleware initializations here

    return app;
};
