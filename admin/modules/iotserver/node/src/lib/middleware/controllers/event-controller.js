const Device = require('../../../models/Device.js');
const log = require('../../log');
module.exports.init = async (app, router, iotManager) =>{

	const xmlParser = require('xml2js').parseString;
    const dispatcher = require('../../iot/event-dispatcher.js');

	router.post('/events',(req,res)=>{
		var event = null;
		var xml = "";
		for (var key in req.body) {
			xml = key;
			break;
		}
		var reqHost = req.headers['host'];
		log.debug("Receive event: " + JSON.stringify(req.body) + " from host " + reqHost)
		xml = xml.replace("\ufeff", "");
		xmlParser(xml, (err, result)=> {
			if (err) {
                event = req.body;
            } else if (result.cyberdata) {
                var provider = iotManager.getProvider('cyberdata');

                if (provider) {
                    provider._eventHandler(reqHost, result.cyberdata);
                }
                event = null;
            }
        });

		if (event) {
			switch(event.type) {
				case 'event':
				var arr_message = req.body.topic.split('/');
				event.server = arr_message[0];
				event.device = {
					type: arr_message[1],
					id: arr_message[2],
					stream:arr_message[3]
				};
				log.debug("dispatching event " + event);
				dispatcher.dispatch(event);
				break;
				case 'access':
				break;
			}
		}

		res.send({}); 
	});
}