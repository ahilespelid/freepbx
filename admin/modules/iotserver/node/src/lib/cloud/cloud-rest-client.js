const log = require('../log');
const config = require('config');


function callRestMethod(client, method, args) {

    return new Promise((resolve, reject) => {

        if (!client) {
            reject("Unconfigured rest endpoint settings");
            return;
        }
        var req = client.methods[method](args, function (data, response) {
            if (Buffer.isBuffer(data)) {
                var strData = data.toString();
                if (strData !== '') {
                    try {
                        data = JSON.parse(strData);
                    } catch (error) {
                        log.error("Failed parsing data: " + strData + ". Error: " + error);
                    }
                }
            }
            resolve(data);
        });

        req.on('requestTimeout', function (req) {
            err = method + ': Request timeout has expired, client timeout. Make sure server is listening.';
            reject(err);
            req.abort();
        });

        req.on('responseTimeout', function (res) {
            err = method + ': Response timeout has expired.';
            reject(err);
        });

        req.on('error', function (err) {
            reject(err);
        });
    });
}


function runMethod(client, method, credentials, params, path) {
    return new Promise((resolve, reject) => {
        var args = { headers: { "Accept": "application/json" }, path: path };
        if (params) {
            args.data = params;
            args.headers["Content-Type"] = "application/json";
        }

        if (credentials) {
            args.headers.Authorization = JSON.stringify(credentials);
        }
        callRestMethod(client, method, args).then((res) => {
            if (res.error) {
                reject(res.error);
            } else {
                resolve(res);
            }
        }).catch((err) => {
            reject(err);
        })
    })
}



const RestClient = require('node-rest-client').Client;
function CloudRestClient(credentials) {

    if (config.iot.cloud) {
        this.credentials = credentials;
        this.baseUrl = config.iot.cloud.connection.ssl ? "https://" : "http://";
        this.fwDownloadUrl = this.baseUrl + config.iot.cloud.fw_download.aws_gw_endpoint.host + ":" + config.iot.cloud.fw_download.aws_gw_endpoint.port ;
        this.baseUrl = this.baseUrl + config.iot.cloud.connection.host + ":" + config.iot.cloud.connection.port
        this.uri = this.baseUrl
        this.baseUrl = this.baseUrl + config.iot.cloud.base_path;
        var options = {
            // will replace content-types used to match responses in JSON and XML parsers
            mimetypes: {
                json: ["application/json", "application/json;charset=utf-8"],
                xml: ["application/xml", "application/xml;charset=utf-8"]
            },
            connection: {
                strictSSL: false,
                rejectUnauthorized: false,
            },
        };

        this.client = new RestClient(options);
        // register remote methods

        // Put and get keys
        this.client.registerMethod("registerUser", this.baseUrl + '/user/reg', "POST");

        this.client.registerMethod("unregisterUser", this.baseUrl + '/user/unreg', "POST");

        this.client.registerMethod("authenticateUser", this.baseUrl + '/user/mobile/auth', "POST");

        this.client.registerMethod("registerSrv", this.baseUrl + '/srv/reg', "POST");

        this.client.registerMethod("unregisterSrv", this.uri + '/api/v1/deployment/service/unregister', "POST");

        this.client.registerMethod("registerDeploymentSrv", this.uri + '/api/v1/deployment/settings', "POST");

        this.client.registerMethod("refreshLease", this.baseUrl + '/srv/lease/refresh', "POST");

        this.client.registerMethod("addGateway", this.baseUrl + '/srv/gw', "POST");

        this.client.registerMethod("removeGateway", this.baseUrl + '/srv/gw', "DELETE");

        this.client.registerMethod("getGatewayIP", this.baseUrl + '/srv/gw/address', "POST");

        this.client.registerMethod("getDevelcoLatestFWInfoFromFWDownloadServer", this.fwDownloadUrl + '/latest/${version}', "GET");

        this.client.registerMethod("updateGWCertificateFWDownloadServer", this.uri + '/api/v2/srv/gw/keystore', "PUT");

        this.client.registerMethod("updateGWCertificate", this.baseUrl + '/srv/gw/keystore', "PUT");

        this.client.registerMethod("getDevelcoLatestFWInfo", this.baseUrl + '/fw/develco/${version}/latest', "GET");

        this.client.registerMethod("downgradeGatewayVersion", this.baseUrl + '/srv/gw/switchbank', "PUT");

    } else {
        this.client = undefined;
    }

}

CloudRestClient.prototype = {



    registerUser: function (data) {
        return runMethod(this.client, 'registerUser', this.credentials, data);
    },

    unregisterUser: function (data) {
        return runMethod(this.client, 'unregisterUser', this.credentials, data);
    },

    registerSrv: function (data) {
        return runMethod(this.client, 'registerSrv', this.credentials, data);
    },

    unregisterSrv: function (data) {
        return runMethod(this.client, 'unregisterSrv', this.credentials, data);
    },

    registerDeploymentSrv: function (data) {
        return runMethod(this.client, 'registerDeploymentSrv', this.credentials, data);
    },

    refreshLease: function (data) {
        return runMethod(this.client, 'refreshLease', this.credentials, data);
    },

    authenticateUser: function (data) {
        return runMethod(this.client, 'authenticateUser', this.credentials, data);
    },

    addGateway: function (data) {
        return runMethod(this.client, 'addGateway', this.credentials, data);
    },

    removeGateway: function (data) {
        return runMethod(this.client, 'removeGateway', this.credentials, data);
    },

    getGatewayIP: function (data) {
        return runMethod(this.client, 'getGatewayIP', this.credentials, data);
    },

    getProviderLatestFirmwareInfo: function (providerName, major_version = "1") {
        if (providerName.toLowerCase() == 'develco') {
            return runMethod(this.client, 'getDevelcoLatestFWInfo', this.credentials, null, { version: major_version + ".x" });
        } else {
            return Promise.reject('Unsupported provider ' + providerName);
        }
    },
    getDevelcoLatestFWInfoFromFWDownloadServer: function (providerName, major_version = "1") {
        if (providerName.toLowerCase() == 'develco') {
            return runMethod(this.client, 'getDevelcoLatestFWInfoFromFWDownloadServer', this.credentials, null, { version: major_version + ".x" });
        } else {
            return Promise.reject('Unsupported provider ' + providerName);
        }
    },
    updateGWCertificate: function (data) {
        return runMethod(this.client, 'updateGWCertificate', this.credentials, data);
    },
    updateGWCertificateFWDownloadServer: function (data) {
        return runMethod(this.client, 'updateGWCertificateFWDownloadServer', this.credentials, data);
    },
    downgradeGatewayVersion: function (data) {
        return runMethod(this.client, 'downgradeGatewayVersion', this.credentials, data);
    }
};

module.exports = CloudRestClient

