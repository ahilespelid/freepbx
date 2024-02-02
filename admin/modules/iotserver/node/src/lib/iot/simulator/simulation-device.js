const uuidv4 = require('uuid/v4');

function stringifyArray(arrayObj){
	var result = "[";
	arrayObj.forEach((obj)=>{
		result = result + "\"" + obj + "\",";
	});
	if (result != "[") {
		result = result.substring(0, result.length-1);
	}
	result = result + "]";
	return result;
}

function SimulationLocation(name) {
	this.name = name;
	this.id = uuidv4();
	//this.gateway = gateway;
}

SimulationLocation.prototype = {
	toJson: function() {
		return {"uuid": this.id, "name": this.name};
	}
};

function SimulationZone(name, locationId, state, status, actions, temperature) {
	this.name = name;
	this.id = uuidv4();
	this.location_id = locationId;
	this.state = state;
	this.status = status;
	this.actions = actions;
	this.temparature = temperature;
}

SimulationZone.prototype = {
	toJson: function() {
		return {"uuid": this.id, "name": this.name, "location_uuid": this.location_id, "state": this.state, "status": this.status, "actions": stringifyArray(this.actions), "temperature": this.temperature};
	}
};


function SimulationScene(name, zone, actions, temperature) {
	this.name = name;
	this.id = uuidv4();
	this.zone = zone;
	this.actions = actions;
	this.temparature = temperature;
}

SimulationScene.prototype = {
	toJson: function() {
		return {"uuid": this.id, "name": this.name, "zone_uuid": this.zone, "actions": stringifyArray(this.actions), "temperature": this.temperature};
	}
};


function SimulationGroup(type, name, scene, status, actions) {
	this.type = type,
	this.name = name;
	this.id = uuidv4();
	this.scene = scene;
	this.actions = actions;
	this.status = status;
}

SimulationGroup.prototype = {
	toJson: function() {
		return {"uuid": this.id, "type": this.type, "name": this.name, "scene_uuid": this.scene, "actions": stringifyArray(this.actions), "status": this.status};
	}
};

function SimulationDevice(type, name, state, status, gateway, actions, events, group) {
	this.type = type;
	this.name = name;
	this.state = state;
	this.status = status;
	this.id = uuidv4();
	this.gateway = gateway;
	this.actions = actions;
	this.events = events;
	this.group = group;
}

SimulationDevice.prototype = {
	toJson: function() {
		return {"type": this.type, "uuid": this.id, "name": this.name, "gateway_uuid": this.gateway, "group_uuid": this.group, "state": this.state, "status": this.status, "actions": stringifyArray(this.actions)};
	}
};
exports.SimulationLocation = SimulationLocation
exports.SimulationZone = SimulationZone
exports.SimulationScene = SimulationScene
exports.SimulationGroup = SimulationGroup
exports.SimulationDevice = SimulationDevice
