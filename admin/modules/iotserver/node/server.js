process.title = 'iot-server-app';

const _ = require('lodash');
const client = require('prom-client');
const config = require('config');
const http = require('http');
const https = require('https');
const httpShutdown = require('http-shutdown');
const bootstrap = require('./src/bootstrap');
const log = require('./src/lib/log');
const IoTServerWSProxy = require('./iotws-server').IoTServerWSProxy;
const AccessProfileManager = require('./src/lib/iot/access-profile-manager.js');
const AutomatedActionManager = require('./src/lib/iot/automated-action-manager.js');
const GetAvailableGatewayFirmwareJob = require('./src/scheduler/jobs/get-available-gateway-firmware.js');
const JobScheduler = require("./src/scheduler/scheduler");

function startWebsocketServer(server, app, zulu, backend) {
    return new Promise((resolve, reject) => {
        if (!zulu) {
            return resolve();
        }
        zulu.startListeners(server, app).then(() => {
            backend.register(zulu.host + ":" + ((zulu.port) ? zulu.port : config.zulu.port), zulu.displayName).then(() => {
                resolve();
            }).catch((error) => {
                log.warn('Failed to register to cloud. Error: ' + error);
                resolve();
            })
        }).catch((error) => {
            log.fatal('Failed to start server listeners. Error: ' + error);
            reject(error);
        })
    })
}

function stopApp(server, localServer, zulu, backend, manager, watchdog, defaultMetricsInterval) {
    return new Promise((resolve, reject) => {
        if (!zulu) {
            return resolve();
        }
        backend.stop(zulu.host).then(() => {

            zulu.stopListeners();
            manager.close();
            watchdog.disconnect();

            if (localServer) {
                localServer.shutdown();
            }

            // stop metrics collection
            clearInterval(defaultMetricsInterval);

            // cleanly shutdown existing connections
            server.shutdown(() => {
                resolve();
            });
        }, () => {
            zulu.stopListeners();
            manager.close();
            watchdog.disconnect();

            if (localServer) {
                localServer.shutdown();
            }

            // stop metrics collection
            clearInterval(defaultMetricsInterval);

            // cleanly shutdown existing connections
            server.shutdown(() => {
                resolve();
            });
        })
    })
}


bootstrap.boot()
    .then(app => new Promise((resolve, reject) => {

        const zulu = app.get('zulu');

        const iot_manager = app.get('iot_manager');

        const iotserver_watchdog = app.get('iotserver_watchdog');

        const iot_backend_server = app.get('iot_backend_server');

        // If you need application specific metrics, instantiate it after the
        // defaults have been set up
        const defaultMetricsInterval = client.collectDefaultMetrics();


        // httpShutdown adds a clean .shutdown() method to the server
        const server = httpShutdown(http.createServer(app));

        var localServer = undefined;

        if (!['localhost', '127.0.0.1'].includes(config.host)) {
            localServer = httpShutdown(http.createServer(app));

            localServer.setTimeout(0);
            localServer.on('connection', socket => socket.setKeepAlive(true, config.keepAliveInterval));

            localServer.on('error', (error) => {
                log.fatal('Server Error: ' + error);

                stopApp(server, localServer, zulu, iot_backend_server, iot_manager, iotserver_watchdog, defaultMetricsInterval).then(() => {
                    resolve();
                    process.exitCode = 1;
                    process.kill(process.pid, 'SIGTERM');
                }, () => {
                    process.exitCode = 1;
                    process.kill(process.pid, 'SIGTERM');
                })
            });
        }

        // disable socket timeout and allow upstream services/DB to timeout
        server.setTimeout(0);
        server.on('connection', socket => socket.setKeepAlive(true, config.keepAliveInterval));

        server.on('error', (error) => {
            log.fatal('Server Error: ' + error);
            stopApp(server, localServer, zulu, iot_backend_server, iot_manager, iotserver_watchdog, defaultMetricsInterval).then(() => {
                resolve();
                process.exitCode = 1;
                process.kill(process.pid, 'SIGTERM');
            }, () => {
                process.exitCode = 1;
                process.kill(process.pid, 'SIGTERM');
            })
        });

        var eventDispatcher = require('./src/lib/iot/event-dispatcher.js');
        const profileManager = new AccessProfileManager();
        eventDispatcher.on('access-profile-command', profileManager.handleCommand.bind(profileManager));

        scheduler = new JobScheduler();
        scheduler.init([GetAvailableGatewayFirmwareJob]);
        scheduler.on('log', function (data) {
            log[data.level](`${data.text}`);
        });

        const automatedActionManager = new AutomatedActionManager();
        eventDispatcher.on('automated-action-command', automatedActionManager.handleCommand.bind(automatedActionManager));
        automated_action_scheduler = new JobScheduler();
        automated_action_scheduler.on('log', function (data) {
            log[data.level](`${data.text}`);
        });

        IoTServerWSProxy(server, eventDispatcher);

        if (localServer) {
            localServer.listen(config.port, '127.0.0.1', () => {
                server.listen(config.port, config.host, () => {
                    log.info({ address: server.address() }, `HTTP server listening on ${config.port} on localhost and ${config.host}`);
                    startWebsocketServer(localServer, app, zulu, iot_backend_server).then(() => {
                        log.info('app initialized');
                        return profileManager.init(scheduler);
                    }).then(() => {
                        return automatedActionManager.init(automated_action_scheduler);
                    }).then(() =>{
                        resolve();
                    }).catch((error) => {
                        log.error('app initialization faillure');
                        stopApp(server, localServer, zulu, iot_backend_server, iot_manager, iotserver_watchdog, defaultMetricsInterval).then(() => {
                            if (profileManager) {
                                profileManager.stop();
                            }
                            resolve();
                            process.exitCode = 1;
                            process.kill(process.pid, 'SIGTERM');
                        }, () => {
                            if (profileManager) {
                                profileManager.stop();
                            }
                            process.exitCode = 1;
                            process.kill(process.pid, 'SIGTERM');
                        })
                    })
                })
            })
        } else {
            server.listen(config.port, config.host, () => {
                log.info({ address: server.address() }, `HTTP server listening on ${config.port} on localhost`);
                startWebsocketServer(server, app, zulu, iot_backend_server).then(() => {
                    log.info('app initialized');
                    return profileManager.init(scheduler);
                }).then(() => {
                    return automatedActionManager.init(automated_action_scheduler);
                }).then(() => {
                    resolve();
                }).catch((error) => {
                    log.error('app initialization faillure');
                    stopApp(server, localServer, zulu, iot_backend_server, iot_manager, iotserver_watchdog, defaultMetricsInterval).then(() => {
                        if (profileManager) {
                            profileManager.stop();
                        }
                        if(automatedActionManager){
                            automatedActionManager.stop();
                        }
                        resolve();
                        process.exitCode = 1;
                        process.kill(process.pid, 'SIGTERM');
                    }, () => {
                        if (profileManager) {
                            profileManager.stop();
                        }
                        if(automatedActionManager){
                            automatedActionManager.stop();
                        }
                        process.exitCode = 1;
                        process.kill(process.pid, 'SIGTERM');
                    })
                })
            })
        }

        // termination signal handling
        _.forEach(['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'], signal => process.once(signal, () => {
            // using .once() and .kill() gives us the expected exit code
            // nodemon is a bit picky about that...
            log.info({ signal }, 'shutting down');
            stopApp(server, localServer, zulu, iot_backend_server, iot_manager, iotserver_watchdog, defaultMetricsInterval).then(()=>{
                log.info({ signal }, 'server stopped');
                //process.kill(process.pid, signal);
            }).catch((err)=>{
                log.warn(err);
                // cleanly shutdown existing connections
                server.shutdown(() => {
                    log.info({ signal }, 'shutdown');
                    process.kill(process.pid, signal);
                });
            })

            /*

             if (zulu) {

                if (iot_backend_server) {
                    iot_backend_server.stop(zulu.host).catch((err)=>{log.warn(err)})
                }

                zulu.stopListeners();
            }

            if (iot_manager) {
                iot_manager.close();
            }

            if (iotserver_watchdog) {
                iotserver_watchdog.disconnect();
            }

            if (localServer) {
                localServer.shutdown();
            }

            if (profileManager) {
                profileManager.stop();
            }

            // stop metrics collection
            clearInterval(defaultMetricsInterval);

            // cleanly shutdown existing connections
            server.shutdown(() => {
                log.info({ signal }, 'shutdown');
                process.kill(process.pid, signal);
            });*/
        }));
    }))
