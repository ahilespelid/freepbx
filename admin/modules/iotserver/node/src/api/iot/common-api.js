const config = require('config');
const nodetime = require('time');
const log = require('../../lib/log');
const LOG_LEVELS = { 60: "FATAL", 50: "ERROR", 40: "WARN", 30: "INFO", 20: "DEBUG", 10: "TRACE" };
const GatewayApi = require('./gateway-api.js');
const dispatcher = require('../../lib/iot/event-dispatcher.js');

const LocationApi = require('../../api/iot/location-api.js');
const ZoneApi = require('../../api/iot/zone-api.js');
const SceneApi = require('../../api/iot/scene-api.js');
const GroupApi = require('../../api/iot/group-api.js');
const Apis = [LocationApi, ZoneApi, SceneApi, GroupApi];
const { weekDaysMap } = require('../../scheduler/build-schedule.js');


module.exports.checkGatewaysInInstallProcess = () => {
    return new Promise((resolve, reject) => {
        return GatewayApi.getAll().then(gateways => {
            let num_gws = 0;
            gateways.forEach(gateway => {
                let details = gateway.details;
                if (details.firmware && details.firmware.upgrade)
                    num_gws += ["downloading", "complete"].includes(details.firmware.upgrade.status) || gateway.state == "restarting" ? 1 : 0;
            });
            resolve(num_gws);
        });
    });
}

module.exports.checkFirmwareInstallationProcess = (gateway_uuid) => {
    return new Promise((resolve, reject) => {
        return GatewayApi.checkInstallationProcess(gateway_uuid).then((res) => {
            resolve(res);
        }).catch(reject);
    });
}

module.exports.installFirmwareGateway = (gateway_uuid) => {
    return new Promise((resolve, reject) => {
        const iotManager = dispatcher.getIoTManager();
        this.checkGatewaysInInstallProcess().then(n => {
            if (!n)
                GatewayApi.installFirmwareGateway(gateway_uuid, iotManager).then(resolve).catch((error) => {
                    log.error(error);
                    reject(error)
                });
            else {
                reject("No able to install a new firmware while there is a gateway already in the install process.");
            }
        });
    });
}

module.exports.setLoggingLevel = (level) => {
    return new Promise((resolve, reject) => {
        if (!Object.values(LOG_LEVELS).includes(level.toUpperCase())) {
            return reject("Unsuported log level " + level);
        }
        log.info("Setting log level to " + level);
        log.level(level)
        resolve(level);
    });
}

module.exports.getLoggingLevel = () => {
    return new Promise((resolve, reject) => {
        resolve(LOG_LEVELS[log.level()]);
    });
}

module.exports.setDeploymentDisplayName = (data) => {
    return new Promise((resolve, reject) => {
        dispatcher.getIoTBackendServer().deploymentSettings(data).then(response => {
            resolve();
        }).catch(err => {
            reject(err);
        })
    });
}

module.exports.setGatewayDebug = (gateway_uuid, mode) => {
    return new Promise((resolve, reject) => {
        const iotManager = dispatcher.getIoTManager();
        GatewayApi.setGatewayDebug(gateway_uuid, iotManager, { mode: mode }).then(() => {
            resolve(true);
        }).catch((error) => {
            log.error(error);
            resolve(false);
        });
    });
}

module.exports.getGatewayDebug = (gateway_uuid) => {
    return new Promise((resolve, reject) => {
        const iotManager = dispatcher.getIoTManager();
        GatewayApi.getGatewayDebug(gateway_uuid, iotManager).then((resp) => {
            if (resp && resp.enableApiLog) {
                resolve(true);
            } else {
                resolve(false);
            }
        }).catch((error) => {
            log.error(error);
            resolve(false);
        });
    });
}

module.exports.getGatewayLogs = (gateway_uuid) => {
    return new Promise((resolve, reject) => {
        const iotManager = dispatcher.getIoTManager();
        GatewayApi.getGatewayLogs(gateway_uuid, iotManager).then((data) => {
            resolve(data);
        }).catch((error) => {
            log.error(error);
            resolve(null);
        });
    });
}

module.exports.getFirmwareVersions = (provider) => {
    return new Promise((resolve, reject) => {
        GatewayApi.getAll().then(async (gateways) => {
            var q = require('q');
            var promises = [];
            for (let i = 0, length = gateways.length; i < length; i++) {
                let gateway = gateways[i];
                if (gateway.provider == GatewayApi.getProviderByType(provider)) {
                    let { firmware: { version } } = gateway.details && gateway.details.firmware ? gateway.details : { firmware: {} };
                    const iotManager = dispatcher.getIoTManager(),
                        oProvider = iotManager.getProvider(provider);
                    // Always synchronize with the gateways
                    if (provider) {
                        let details = await oProvider.api.updateFirmwareInfo(gateway.uuid);
                        version = details && details.firmware ? details.firmware.version : undefined;
                        if (version) {
                            promises.push(this.getVersionDetails(version));
                        }
                    }
                }
            }
            return q.all(promises);
        }).then((version_details) => {
            resolve(version_details);
        }).catch(err => {
            log.error(err);
            resolve([]);
        });
    });
}

module.exports.getDownwardCompatibleFunction = (current_gw_version, endpoint) => {
    return new Promise((resolve, reject) => {
        var func;
        if (!endpoint) resolve({ func: null, current_version: current_gw_version });
        if ((((config.iot.cloud || {}).fw_download || {}).fw_updates_support_for_old_builds || {})[current_gw_version.develco_version]) {
            if (config.iot.cloud.fw_download.fw_updates_support_for_old_builds[current_gw_version.develco_version].supported_max_build_number >= current_gw_version.build_number) {
                func = config.iot.cloud.fw_download.fw_updates_support_for_old_builds[current_gw_version.develco_version][endpoint];
                resolve({ func: func, current_version: current_gw_version });
            }
        }
        resolve({ func: null, current_version: current_gw_version });
    })
}

module.exports.getVersionDetails = (version) => {
    return new Promise((resolve, reject) => {
        if (version.length !== 0) {
            var version_array = version.split("-");
            var version_details = { "major_version": version_array[0].split(".")[0], "develco_version": version_array[0] };
            var environment;
            if (["staging"].includes(version_array[1])) {
                environment = "staging";
                version_details.build_number = version_array[2];
                version_details.commit_id = version_array[3];
            } else {
                environment = "production";
                version_details.build_number = version_array[1];
                version_details.commit_id = version_array[2];
            }
            version_details.environment = environment;
            resolve(version_details);
        } else {
            reject();
        }
    });
}
function getGatewayDebug(gw, iotManager) {
    return new Promise((resolve, reject) => {
        var info = {
            id: gw.id,
            serial: gw.details.phyId,
            uuid: gw.uuid,
            name: gw.name,
            type: gw.provider,
            state: (gw.state != 'unreachable' && gw.state != "restarting") ? 'online (' + gw.details.remote_ip + ')' : 'offline (' + gw.details.remote_ip + ')',
            debug: 'off',
            previous_version: gw.details.firmware && gw.details.firmware.previous_version != gw.details.firmware.version ? gw.details.firmware.previous_version : '-',
            version: gw.details.firmware ? gw.details.firmware.version : '-',
            available: gw.details.firmware && gw.details.firmware.upgrade ? gw.details.firmware.upgrade.version : '-',
            fwstatus: "-"
        };
        let upgrade = gw.details.firmware ? gw.details.firmware.upgrade : undefined,
            current_version = gw.details.firmware ? gw.details.firmware.version : undefined;

        if (upgrade && upgrade.version == current_version)
            info.fwstatus = "The gateway is up to date";
        else if (upgrade && upgrade.version)
            info.fwstatus = "New firmware version available";
        else
            info.fwstatus = "Refresh the table";

        if (upgrade && !["complete", null].includes(upgrade.status))
            info.fwstatus = upgrade.status;
        else if (upgrade && upgrade.action_flag != null)
            info.fwstatus = "installing";
        GatewayApi.getGatewayDebug(gw.uuid, iotManager).then((resp) => {
            if (resp && resp.enableApiLog) {
                info.debug = 'on';
            }
            resolve(info);
        }).catch((error) => {
            log.error(error);
            resolve(info);
        });
    })
}

module.exports.getGateways = () => {
    return new Promise((resolve, reject) => {
        var gws = [];
        var q = require('q');
        var promises = [];
        const iotManager = dispatcher.getIoTManager();
        GatewayApi.getAll(true).then((gateways) => {
            gateways.gateways.forEach((gw) => {
                promises.push(getGatewayDebug(gw, iotManager));
            })
            return q.all(promises)
        }).then((results) => {
            gws = results;
            resolve(gws);
        }).catch((error) => {
            log.error(error);
            resolve(gws);
        });
    })
}

module.exports.updateGWDetails = (uuid, data) => {
    let iotManager = dispatcher.getIoTManager();
    return GatewayApi.updateGateway(uuid, iotManager, data);
}

module.exports.refreshGWFwInfo = (gwType, fwInfos) => {
    return new Promise((resolve, reject) => {
        if (!fwInfos) {
            return resolve();
        }
        let oFwInfos = {};
        fwInfos.forEach((fwInfo) => {
            if (fwInfo.version)
                oFwInfos[fwInfo.version.split(".")[0] + ".x"] = fwInfo;
        });
        GatewayApi.getAllByType(gwType).then((gateways) => {
            gateways.forEach((gw) => {
                let details = JSON.parse(gw.details);
                if (details && details.firmware && details.firmware.version) {
                    let fwInfo = oFwInfos[details.firmware.version.split(".")[0] + ".x"];
                    if (fwInfo) {
                        let evt = {
                            type: "event", data: {
                                firmware: {
                                    upgrade: {
                                        ...fwInfo
                                    }
                                }
                            }
                            , gateway: { id: gw.uuid, stream: 'details' }
                        };
                        dispatcher.dispatch(evt);
                    }
                }
            });
            resolve();
        }).catch((error) => {
            log.error(error);
            resolve();
        });
    })
}

module.exports.getAll = (add_relations = true, columns_filter = null) => {
    return new Promise((resolve, reject) => {
        var q = require('q');
        var promises = [];
        var response = { locations: [], zones: [], scenes: [], groups: [] };
        Apis.forEach((api) => {
            promises.push(api.getAll(null, null, true, add_relations, columns_filter))
        })
        q.all(promises).then((results) => {
            results.forEach((result) => {
                Object.keys(result).forEach((key) => {
                    response[key] = result[key];
                })
            })
            resolve(response)
        }).catch((error) => {
            resolve(response)
            log.warn(error);
        });
    })
}


module.exports.uninstall = () => {
    return new Promise((resolve, reject) => {
        const iotManager = dispatcher.getIoTManager();
        GatewayApi.removeAllGateways(iotManager).then(() => {
            resolve();
        }).catch((error) => {
            resolve()
            log.warn(error);
        });
    })
}

module.exports.formatErrors = (err, type, property_name) => {
    return new Promise((resolve, reject) => {
        if (err.code && type && property_name) {
            switch (err.code) {
                case "ER_DUP_ENTRY":
                    resolve("\n\n" + type + " with the name '" + property_name + "' already exists.");
                    break;
                default: resolve(err);
                    break;
            }
        }
        resolve(err);
    })
}
module.exports.subjectStatusCorrection = (subjects) => {
    return new Promise((resolve, reject) => {
        var q = require('q');
        var chain = q.when();
        subjects.forEach((subject) => {
            chain = chain.then(() => {
                return subjectStatusCorrection(subject);
            });
        })
        chain.then(() => {
            resolve();
        }).catch((err) => {
            log.warn(err);
            reject(err);
        });
    });
}
subjectStatusCorrection = (subject) => {
    return new Promise((resolve, reject) => {
        var now = new Date();
        var gmtDate = new Date(now.toGMTString());
        var curr_time = gmtDate.getTime();
        var start_time;
        var end_time;

        if (subject.get('start') && (subject.get('start').includes('Every') || subject.get('start').includes('['))) {
            var start_time = getTimeFromSubject(subject, 'start').then((time) => {
                start_time = time;
                return getTimeFromSubject(subject, 'end');
            }).then((time) => {
                end_time = time;
                if (subject.get('start').includes('[')) {
                    return this.checkCurrentDayInSubjectSchedule(subject)
                }
                else return true;
            }).then((res) => {
                if (res) {
                    if ((!(curr_time >= start_time && curr_time <= end_time)) && subject.get('status') == "running") {
                        log.info("updating status of " + subject.get('name') + " from 'running' to 'active' ");
                        subject.set('status', 'active');
                        resolve(subject.save());
                    } else {
                        resolve();
                    }
                } else { //current day is not specified in the list of selected days
                    if (subject.get('status') == "running") {
                        log.info("updating status of " + subject.get('name') + " from 'running' to 'active' ");
                        subject.set('status', 'active');
                        resolve(subject.save());
                    }
                    resolve();
                }
            }).catch((err) => {
                reject(err);
            });
        } else {
            start_time = subject.get('start_timestamp_utc');
            end_time = subject.get('end_timestamp_utc');
            curr_time = curr_time / 1000;
            if ((curr_time > end_time) && !(["expired"].includes(subject.get('status')))) {
                log.info("updating status of " + subject.get('name') + " from '" + subject.get('status') + "' to 'expired' ");
                subject.set('status', 'expired');
                resolve(subject.save());
            } else if ((!(curr_time >= start_time && curr_time <= end_time)) && subject.get('status') == "running") {
                log.info("updating status of " + subject.get('name') + " from 'running' to 'expired' ");
                subject.set('status', 'active');
                resolve(subject.save());
            } else {
                resolve();
            }
        }
    })
}
var getTimeFromSubject = (subject, type) => {
    return new Promise((resolve, reject) => {
        var details = subject.get('details') ? JSON.parse(subject.get('details')) : {};
        var timezone = details.timezone ? details.timezone : "UTC";
        var date = new nodetime.Date();
        date.setTimezone(timezone);
        getHourAndMinuteFromTime(subject.get(type).toLowerCase().split("|")["1"]).then((time) => {
            if (time) resolve(date.setHours(time.hr, time.min)); else reject();
        }).catch((err) => {
            reject(err);
        });
    })
}
var getHourAndMinuteFromTime = (time) => {
    return new Promise((resolve, reject) => {
        if (time) {
            var ampm = time.trim().split(" ");
            var hoursAndMinute = ampm["0"].split(":");
            var hours = parseInt(hoursAndMinute["0"]);
            var minute = parseInt(hoursAndMinute['1']);
            hours = (ampm['1'] == "pm") ? hours + 12 : ((hours == 12) ? 0 : hours);
            resolve({ hr: hours, min: minute });
        } else reject("time not provided");
    })
}
module.exports.checkCurrentDayInSubjectSchedule = (subject) => {
    return new Promise((resolve, reject) => {
        var now = new Date();
        var gmtDate = new Date(now.toGMTString());
        if (subject && subject.get('start').includes('[')) {
            var today_included = false;
            var details = subject.get('details') ? JSON.parse(subject.get('details')) : {};
            var timezone = details.timezone ? details.timezone : "UTC";
            let newDate = new Date(gmtDate.toLocaleString("en-US", { timeZone: timezone }))
            let thisDayDigit = newDate.getDay();
            thisDayDigit = (thisDayDigit == 0) ? 7 : thisDayDigit;
            let thisDay = Object.keys(weekDaysMap).find(key => weekDaysMap[key] == thisDayDigit);
            thisDay = thisDay.charAt(0).toUpperCase() + thisDay.slice(1);
            let selected_days = JSON.parse(subject.get('start').split('|')[0].trim());
            if (selected_days.includes(thisDay)) { // if the present day is included in the selected weekdays.
                today_included = true;
            }
            resolve(today_included);
        } else reject();
    })
}