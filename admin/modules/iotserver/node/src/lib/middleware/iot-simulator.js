const Scenario = require('../iot/simulator/simulation-scenario.js').SimulationScenario
const Device = require('../iot/simulator/simulation-device.js').SimulationDevice
module.exports.initMiddleware = async (app, appRoot,express, simulation) =>{
    console.log('initMiddleware');
    var router = express.Router();
	bodyParser = require("body-parser");
    
    app.use(bodyParser.urlencoded({extended : true}));
    app.use(bodyParser.json());

    router.post('/oauth/accesstoken',(req,res)=>{
        var resp = {"access_token": "m7hsNoHhO9GIvDtXMJ8dY9Qb57Gw", "expires_in": "359900"};
        res.send(resp);
    });

    router.post('/servers/:serverId/devices/:deviceId',(req,res)=>{
        var serverId = req.params.serverId;
        var device = simulation.devices.find(x => x.id === req.params.deviceId);
        //var deviceId = req.params.deviceId;
        var action = req.body.action;

        var server = app.get("simulation-server");

        if (!server) {
            res.status(500).end();

        } else {
            if (simulation.gateway !== serverId || !device) {
                res.status(404).end();
            } else if (req.body.action === 'PermitJoining') {
                /*simulation.devices.push(new Device(device.type, device.name, device.state, device.status, this.gateway, device.actions, device.events, group.id));
                var events = [{"type": "state", "device": device.name, "data": "ready"}];
                var scenario = new Scenario("device" + device.name + "_action_request", events, simulation.devices)
                scenario.init(server.getConnections()).then((runner)=>{
                    scenario.run(runner);
                });
                res.send({}); */
            } else if (!device.actions.includes(req.body.action)) {
                res.status(403).end();
            } else if (req.body.action == "Lock" || req.body.action == "Unlock") {
                var events = [{"type": "status", "device": device.name, "data": req.body.action + "ed"}];
                var scenario = new Scenario("device" + device.name + "_action_request", events, simulation.devices)
                scenario.init(server.getConnections()).then((runner)=>{
                    scenario.run(runner);
                });
                res.send({}); 
            } else if (req.body.action == "On" || req.body.action == "Off") {
                var events = [{"type": "onOff", "device": device.name, "data": req.body.action}];
                var scenario = new Scenario("device" + device.name + "_action_request", events, simulation.devices)
                scenario.init(server.getConnections()).then((runner)=>{
                    scenario.run(runner);
                });
                res.send({}); 
            } else {
                res.status(403).end();
            }
        }

        

     });
    app.use('/v1',router);
}