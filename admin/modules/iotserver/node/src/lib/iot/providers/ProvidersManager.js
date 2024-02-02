const log = require('../../log');
const UdpPortHunter = require('./UdpPortHunter.js')

function ProvidersManager(config, host, backend_server) {
	// providers config
	this._config  = config.providers;
	this._host = host;

	this._sessions = new Map();

	this._port_hunter = new UdpPortHunter(config.udp_port_range);

	this._backend_server = backend_server;
}

ProvidersManager.prototype = {

	initialize: function(isSimulation) {

		return new Promise((resolve,reject)=> {
			var self = this;
			this._port_hunter.initialize().then((port_hunter)=>{
				var promises = [];
				var q = require('q');
				this._config.forEach((provider)=>{
					var name = provider.name;
					provider.host = self._host;
					if ((name !== 'simulator' && isSimulation === false) || (name === 'simulator' && isSimulation === true)) {
						log.info('Initializing provider ' + name);
						var Prov = require('./' + name + '/IoTSession.js');
						var iotsession = new Prov(provider);
						promises.push(iotsession.initialize(port_hunter, self._backend_server));
					} else {
						log.warn('Skipping provider ' + name);
					}
				});

				if (promises.length === 0) {
					reject('No providers configured, please check your configuration');
				} else {
					q.all(promises).then((sessions)=>{
						sessions.forEach((session)=>{
							this._sessions.set(session.name, session);
						});
						log.info('Initialized providers');
						resolve();
					}).catch((err)=>{
						eject(err);
						log.error(err);
					});
				}

			}).catch((err)=>{
				reject(err);
				log.error(err);
			})
			
		});
	},

	getProvider: function(provider_name) {
		return this._sessions.get(provider_name);
	},

	registerEventsListener: function(listener) {
		for(var [name, session] of this._sessions) {
			session.on("iot::" + name + "::event", listener);
		}
	},

	close: function() {
		for(var [name, session] of this._sessions) {
			session.close();
		}
	},

	handleCloudReg: function() {
		return new Promise((resolve,reject)=> {
			var promises = [];
			var q = require('q');
			for(var [name, session] of this._sessions) {
				 promises.push(session.handleCloudReg())
			}
			q.all(promises).then(()=>{
				log.info('Notified providers of cloud registration');
			}).catch((err)=>{
				log.error(err);
			})
			resolve();
		})
	}
};

module.exports = ProvidersManager