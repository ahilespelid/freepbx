const  StateMachine = require('javascript-state-machine');

function SimulationEvent(type, device, data) {
	this.type = type;
	this.device = device;
	this.data = data;
}

function SimulationScenario(name, events, devices) {
	this.name = name;
	this.events = [];
	this.devices = [];
	//console.log("Devices: " + JSON.stringify(devices));
	events.forEach((event)=>{
		var device = devices.find(x => x.name === event.device);
		//console.log("Registering event " + JSON.stringify(event));
		if (device && device.events.includes(event.data)) {
			this.events.push(new SimulationEvent(event.type, device, event.data));
			this.devices.push(device);
		} else if (event.type === 'wait') {
			this.events.push(new SimulationEvent(event.type, null, event.data));
		}
	});

	
}

function ScenarioRunner(events, connections) {

	function sendEvent(event, connections) {
		var topic = event.device.gateway + "/" + event.device.type + "/" + event.device.id + "/" + event.type;
		var evt = {"type": "event", "topic": topic, "timestamp": Date.now(), "data": event.data};
		evt = JSON.stringify(evt);
		connections.forEach((connection)=>{
			console.log('Event: ' + JSON.stringify(evt)+ ' to: ' + connection.remoteAddress);
			connection.send(evt);
		});
		
	}
	
	this.events = events;
	this.fsm = new StateMachine({
		init: 'Idle',
		transitions: [
		{ name: 'motion',    from: 'Idle' ,   to: 'SimMotion' },
		{ name: 'occupancy', from: 'Idle',   to: 'SimOccupancy'  },
		{ name: 'status',    from: 'Idle',   to: 'SimStatus' },
		{ name: 'onOff',     from: 'Idle',   to: 'SimOnOff' },
		{ name: 'reset',     from: ['Idle', 'SimOccupancy', 'SimMotion', 'Waiting', 'SimStatus', 'SimOnOff'],   to: 'Idle' },
		{ name: 'wait',      from: 'Idle',   to: 'Waiting' },
		],
		methods: {
			onMotion:     function(lifecycle, event) { 
				return new Promise((resolve, reject)=>{ 
					sendEvent(event, connections);
					resolve();
				});	
			},
			onOccupancy:   function(lifecycle, event) { 
				return new Promise((resolve, reject)=>{
					sendEvent(event, connections);
					resolve();
				});
			},
			onStatus: function(lifecycle, event) { 
				return new Promise((resolve, reject)=>{
					sendEvent(event, connections);
					resolve();
				});
			},
			onOnOff: function(lifecycle, event) { 
				return new Promise((resolve, reject)=>{
					sendEvent(event, connections);
					resolve();
				});
			},
			onWait: function(lifecycle, event) {
				return new Promise((resolve, reject)=>{
					console.log('Wait Event');
					setTimeout(()=>{
						resolve();
					}, event.data);
				});
			},
			onReset: function() { 
				return new Promise((resolve, reject)=>{
					console.log('Reset Event');
					resolve();
				});
			}
		}
	});

}

ScenarioRunner.prototype = {

	run: function() {
		return new Promise((resolve, reject)=>{
			var q = require('q');
			var chain = q.when();
			//console.log("Running scenario " + chain);
			this.events.forEach((event)=>{
				//console.log("Processing event: " + JSON.stringify(event));
				chain = chain.then(()=>{
					return this.fsm[event.type](event);
				}).then(()=>{
					//console.log("Processing event: " + JSON.stringify(ev));
					return this.fsm.reset();
				});
			});
			resolve();
		});
	}
};

SimulationScenario.prototype = {

	init: function(connections) {
		return new Promise((resolve,reject)=>{
			resolve(new ScenarioRunner(this.events, connections));
		});
	},

	_getNextEvent: function() {
		return this.events.shift();
	},

	run: function(runner) {
		return runner.run();
	}
};

exports.SimulationScenario = SimulationScenario
