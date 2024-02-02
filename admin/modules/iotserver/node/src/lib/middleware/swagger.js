const express = require('express');
const util = require('util');
const path = require('path');
const SwaggerExpress = require('swagger-express-mw');
const swaggerUiAssetPath = require('swagger-ui-dist').getAbsoluteFSPath();
//const tracingMiddleware = require('node-tracing-middleware');
const yaml = require('js-yaml');

const basicAuth = require('./basicAuth');
const log = require('../log');

module.exports.initMiddleware = async (app, appRoot, swaggerFile) => {
    const swaggerCreateAsync = util.promisify(SwaggerExpress.create);
    const swaggerExpress = await swaggerCreateAsync({
        appRoot,
        configDir: path.join(appRoot, 'config'),
        swaggerSecurityHandlers: {
            basicAuth,
        },
    });
    swaggerExpress.register(app);
    //tracingMiddleware.initMiddleware(app, log);

    const swaggerDefinition = yaml.safeLoad(swaggerFile);

    // Serve the Swagger documents and Swagger UI
    app.get('/docs', (req, res) => {
        // we require the trailing slash for resources to load correctly
        if (!req.url.endsWith('/')) {
            res.redirect(301, '/docs/');
            return;
        }
        // this is a custom version of the swagger-ui-dist index page that
        // loads our api-docs instead of their default petstore app
        res.sendFile(path.join(__dirname, 'swagger-index.html'));
    });
    app.use('/docs', express.static(swaggerUiAssetPath));
    app.get('/api-docs', (req, res) => {
        res.send(swaggerDefinition);
    });
};
