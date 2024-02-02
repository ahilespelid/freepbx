const firebase_admin = require('firebase-admin');
const request = require("request");
const log = require('../log');
const PropertyApi = require('../../api/iot/user-property-api.js');
function FbCloudMessaging(args) {
    const { remoteCredentials, firebaseDatabaseURL } = args;
    this.remoteCredentials = remoteCredentials;
    this.credentials = undefined;
    this.databaseURL = firebaseDatabaseURL;
}

FbCloudMessaging.prototype._init = function () {
    return new Promise((resolve, reject) => {
        const responseHandler = (error, response, respbody) => {
            if (error) {
                reject(new Error(error));
            }
            else if (response.statusCode === 500) {
                reject(new Error(response.statusMessage))
            }
            else if (respbody && respbody.status) {
                resolve(respbody.data);
            } else {
                return reject(new Error(respbody.message || "Server response error " + response.statusCode))
            }
        };
        if (typeof this.remoteCredentials == "string" && this.remoteCredentials.match(/^http/))
            request({
                baseUrl: this.remoteCredentials,
                json: true,
                strictSSL: false,
                timeout: 20000
            }, responseHandler);
        else if (typeof this.remoteCredentials == "object" && this.remoteCredentials.constructor.match(/function/i))
            this.remoteCredentials().then(credentials => {
                resolve(credentials);
            }).catch(err => {
                reject(err);
            });
        else if (typeof this.remoteCredentials == "object" && this.remoteCredentials.baseUrl != undefined) {
            request(this.remoteCredentials, responseHandler);
        }
    });
}

FbCloudMessaging.prototype.init = async function (_credentials) {
    if (!_credentials && !this.credentials)
    {
        this.credentials = _credentials;
        firebase_admin.initializeApp({
            credential: firebase_admin.credential.cert(_credentials)
        });
    }
    else if (_credentials !== undefined) {
        this.credentials = _credentials;
        firebase_admin.initializeApp({
            credential: firebase_admin.credential.cert(_credentials)
        });
    }
}

FbCloudMessaging.prototype.reset = function (_credentials) {
    if (_credentials == undefined || JSON.stringify(_credentials) !== JSON.stringify(this.credentials)) {
        this.credentials = undefined;
        return this.init(_credentials);
    }
    else return new Promise((resolve) => resolve());
}

FbCloudMessaging.prototype.hasCredentials = function () {
    return this.credentials != undefined;
}

FbCloudMessaging.prototype.sendToTokens = function (tokens, message) {
    if (this.hasCredentials()) {
        const _message = message.title ? {
            notification: {
                title: message.title,
                body: message.body
            }
        } : {
                data: { ...message }
            }
        return firebase_admin.messaging().sendMulticast({
            ..._message,
            tokens: tokens.length ? tokens : [tokens]
        })
    }
    return new Promise((resolve, reject) => reject(new Error("No credentials available")))
}

FbCloudMessaging.prototype.sendToTopic = function (topic, message) {
    if (this.hasCredentials()) {
        const _message = message.title ? {
            notification: {
                title: message.title,
                body: message.body
            }
        } : {
                data: { ...message }
            }
        return firebase_admin.messaging().send({
            ..._message,
            topic: topic
        })
    }
    return new Promise((resolve, reject) => reject(new Error("No credentials available")))
}

FbCloudMessaging.prototype.send = function (args) {
    const { type, to, message } = args;
    if (type == "topic") {
        return this.sendToTopic(to, message);
        
    } else if (type == "token") {
        return this.sendToTokens(to, message);
    } else
        return new Promise((resolve, reject) => reject(new Error("type must be either 'topic' or 'token'")))
}

module.exports = FbCloudMessaging;
