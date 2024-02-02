//const xmlParser = require('fast-xml-parser');
const fs = require('fs');
const Device = require('./simulation-device.js').SimulationDevice
const Group = require('./simulation-device.js').SimulationGroup
const Location = require('./simulation-device.js').SimulationLocation
const Zone = require('./simulation-device.js').SimulationZone
const Scene = require('./simulation-device.js').SimulationScene
const Scenario = require('./simulation-scenario.js').SimulationScenario
const uuidv4 = require('uuid/v4');
//const WSServer = require('websocket').client;

function SimulatorParser(dataToParse,logger = null) {
	this.dataToParse = dataToParse;
	this.logger = logger;
	this.jsonData = undefined;
	this.ws_server_url = undefined;
	this.gateway = uuidv4();
	this.locations = undefined;
	this.zones = undefined;
	this.scenes = undefined;
	this.groups = undefined;
	this.devices = undefined;
	this.scenarios = undefined;
}

SimulatorParser.prototype = {
	log: function(msg) {
		if(this.logger) {
			this.logger.error(msg);
		} else {
			console.log(msg);
		}
	},
	init: function() {
		return new Promise((resolve,reject)=>{
			if (fs.existsSync(this.dataToParse)) {
				// migth be a file containing the xmlData, so try to open it
				fs.readFile(this.dataToParse, (err, data)=>{
					try{
						this.jsonData = JSON.parse(data);
						this._init();
						resolve(this);
					} catch (err) {
						reject(err);
					}

				});
			} else {
				this.jsonData = JSON.parse(this.dataToParse);
				this._init();
				resolve(this);
			}
		});
	},

	_init: function() {
		if (this.jsonData != undefined) {
			var listener = this.jsonData.simulator.listener;
			if (!listener) {
				this.log("No listener configuration found");
				return;
			}
			this.ws_server_url = this.jsonData.simulator.listener.ws_url;

			this.locations = [];
			this.jsonData.simulator.locations.forEach((location)=>{
				this.locations.push(new Location(location.name));
			});

			this.zones = [];
			this.jsonData.simulator.zones.forEach((zone)=>{
				var location = this.locations.find(x => x.name === zone.location);
				if (location) {
					this.zones.push(new Zone(zone.name, location.id, zone.state, zone.status, zone.actions, zone.temperature));
				} else {
					this.log("Unknown location " + zone.location + " for zone " + zone.name);
				}
			});

			this.scenes = [];
			this.jsonData.simulator.scenes.forEach((scene)=>{
				var zone = this.zones.find(x => x.name === scene.zone);
				if (zone) {
					this.scenes.push(new Scene(scene.name, zone.id, scene.actions, scene.temperature));
				} else {
					this.log("Unknown zone " + scene.zone + " for scene " + scene.name);
				}
			});

			this.groups = [];
			this.jsonData.simulator.groups.forEach((group)=>{
				var scene = this.scenes.find(x => x.name === group.scene);
				if (scene) {
					this.groups.push(new Group(group.type, group.name, scene.id, group.status, group.actions));
				} else {
					this.log("Unknown scene " + group.scene + " for group " + group.name);
				}
			});

			this.devices = [];
			this.jsonData.simulator.devices.forEach((device)=>{
				var group = this.groups.find(x => x.name === device.group);
				if (group) {
					this.devices.push(new Device(device.type, device.name, device.state, device.status, this.gateway, device.actions, device.events, group.id));
				} else {
					this.log("Unknown group " + device.group + " for device " + device.name);
				}
			});
			this._buildSimulation();
		}
	},

	_buildSimulation: function() {
		this.scenarios = [];
		if (!this.devices) {
			this.log("Cannot build scenario");
			return;
		}
		this.jsonData.simulator.scenarios.forEach((scenario)=>{
			var scene = new Scenario(scenario.name, scenario.events, this.devices);
			this.scenarios.push(scene);
		});
	},

	getScenarios: function() {
		return this.scenarios;
	}
};

exports.SimulatorParser = SimulatorParser
