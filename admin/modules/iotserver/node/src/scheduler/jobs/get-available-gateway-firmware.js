const BaseJob = require('./base-job.js');
const util = require('util');
const dispatcher = require('../../lib/iot/event-dispatcher');
const CommonApi = require("../../api/iot/common-api.js");


function GetAvailableGatewayFirmwareJob() {
    BaseJob.call(this, 'GetAvailableGatewayFirmwareJob', '0 0 * * *');
}

// Inherits the prototype methods from the base model.
util.inherits(GetAvailableGatewayFirmwareJob, BaseJob);

GetAvailableGatewayFirmwareJob.prototype.run = function () {
    return new Promise((resolve, reject) => {
        var self = this;
        if (self._logEmitter) {
            self._logEmitter.emit('log', { level: 'debug', text: '[GetAvailableGatewayFirmwareJob]: Running job to get the available firmware for gateways' });
        }

        dispatcher
            .getIoTBackendServer()
            .getProviderAvailableFwInfo("develco")
            .then(fwInfos => {
                CommonApi.refreshGWFwInfo("IoT Gateway", fwInfos);
                resolve();
            })
            .catch(err => {
                if (self._logEmitter)
                    self._logEmitter.emit("log", { level: "error", text: '[GetAvailableGatewayFirmwareJob]: Error getting the Available Firmware information from cloud.' });
                resolve();
            });
    });
}

module.exports = GetAvailableGatewayFirmwareJob
