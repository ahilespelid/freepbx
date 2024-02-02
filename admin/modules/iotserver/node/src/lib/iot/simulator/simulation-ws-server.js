const WebSocketServer = require('websocket').server;
var http = require('http');
function SimWSServer(url, logger = null){
    this.url = url;
    this.logger = logger;
    this.ws_server = undefined;
    this.connections = []; 
}

SimWSServer.prototype = {

	log: function(msg) {
		if(this.logger) {
			this.logger.error(msg);
		} else {
			console.log(msg);
		}
	},

	getConnections: function(){
		return this.connections;
	},

	init: function(instance, parser, scenarios, server) {
		return new Promise((resolve,reject)=>{
			/*
			var server = http.createServer(function(request, response) {
				instance.log((new Date()) + ' Received request for ' + request.url);
				response.writeHead(404);
				response.end();
			});

			server.listen(8090, function() {
				instance.log((new Date()) + ' Server is listening on port 8090');
			});*/


			this.ws_server = new WebSocketServer({
				httpServer: server,
				// You should not use autoAcceptConnections for production
				// applications, as it defeats all standard cross-origin protection
				// facilities built into the protocol and the browser.  You should
				// *always* verify the connection's origin and decide whether or not
				// to accept it.
				autoAcceptConnections: false
			});

			function originIsAllowed(origin) {
				// put logic here to detect whether the specified origin is allowed.
				return true;
			}

			function playScenarios(scenarios, connections) {
				var q = require('q');
				var chain = q.when();
				scenarios.forEach((scenario)=>{
					scenario.init(connections).then((runner)=>{
						chain = chain.then(()=>{
							return scenario.run(runner);
						});
					});
				});
			}

			this.ws_server.on('request', function(request) {
				if (!originIsAllowed(request.origin)) {
					// Make sure we only accept requests from an allowed origin
					request.reject();
					instance.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
					return;
				}

				var connection = request.accept('echo-protocol', request.origin);
				instance.log((new Date()) + ' Connection accepted.');
				// send the device list to the peer
				registerDevices = {"type": "device-registration", "gateway": parser.gateway, "locations": [], "zones": [], "scenes": [], "groups": [], "devices": []};
				parser.locations.forEach((location)=>{
					registerDevices.locations.push(location.toJson());
				});
				parser.zones.forEach((zone)=>{
					registerDevices.zones.push(zone.toJson());
				});
				parser.scenes.forEach((scene)=>{
					registerDevices.scenes.push(scene.toJson());
				});
				parser.groups.forEach((group)=>{
					registerDevices.groups.push(group.toJson());
				});
				parser.devices.forEach((device)=>{
					registerDevices.devices.push(device.toJson());
				});
				connection.send(JSON.stringify(registerDevices));

				playScenarios(scenarios, [connection]);

				connection.on('message', function(message) {
					if (message.type === 'utf8') {
						instance.log('Received Message: ' + message.utf8Data);
						//connection.sendUTF(message.utf8Data);
					}
					else if (message.type === 'binary') {
						instanse.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
						//connection.sendBytes(message.binaryData);
					}
				});
				connection.on('close', function(reasonCode, description) {
					instance.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
					var index = instance.connections.findIndex(x => x !== undefined && x.remoteAddress === connection.remoteAddress);
					if (index) {
						delete instance.connections[index];
					}
				});

				// remember the connection to allow sending events to it.
				instance.connections.push(connection);
				resolve(instance.ws_server);
			});
		});
	}
};

exports.SimWSServer = SimWSServer
