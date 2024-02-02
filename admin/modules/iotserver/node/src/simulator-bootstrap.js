const express = require('express');
const log = require('./lib/log');
const config = require('config');

const { errorMiddleware, notFoundMiddleware } = require('cirrus-error-helpers');
const simServer = require('./lib/middleware/iot-simulator.js');

module.exports.boot = async (simulation) => {
    const app = express();
    app.use((req, res, next) => {
        res.set('x-powered-by', 'hope');
        next();
    });
    app.set('trust proxy', true);

    await simServer.initMiddleware(app,__dirname,express, simulation);
    app.use(notFoundMiddleware());
    app.use(errorMiddleware(log, 'iot-simulator'));
    // Place any additional Express middleware initializations here

    return app;
};
