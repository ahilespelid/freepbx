const Location = require('./controllers/location-controller.js');
const Zone = require('./controllers/zone-controller.js');
const Scene = require('./controllers/scene-controller.js');
const Group = require('./controllers/group-controller.js');
const Device = require('./controllers/device-controller.js');
const Gateway = require('./controllers/gateway-controller.js');
const Event = require('./controllers/event-controller.js');
const Zulu = require('./controllers/zulu-controller.js');
const Favorite = require('./controllers/favorite-controller.js');
const Permission = require('./controllers/permission-controller.js');
const Notification = require('./controllers/notification-controller.js');
const Common = require('./controllers/common-controller.js');


const path = require('path');
const config = require('config');
const fs = require('fs');
const log = require('../log');


module.exports.initMiddleware = async (app, appRoot,express) =>{
    log.info('iotserver - initMiddleware');
    var router = express.Router();
	myParser = require("body-parser");

    const iotManager = app.get('iot_manager');

    
    app.use(myParser.urlencoded({extended : true}));
    app.use(myParser.json());
   /* app.use(express.static(path.join(appRoot,'../client/dist/client')));
    if (config.client.index) {
        router.get('/registration',(req,res)=>{
           res.sendFile(path.join(appRoot,'../client/dist/client/index.html'));
       });
    }*/

    // init events endpoint
    Event.init(app, router, iotManager);

    // init location endpoints
    Location.init(app, router, iotManager);

    // init zone endpoints
    Zone.init(app, router, iotManager);

    // init scene endpoints
    Scene.init(app, router, iotManager);

    // init groups endpoints
    Group.init(app, router, iotManager);
    
    // init devices endpoints
    Device.init(app, router, iotManager);

    // init gateways endpoints
    Gateway.init(app, router, iotManager);

    // initialize permissions endpoints
    Permission.init(app, router);

    // initialize zulu proxy router. 
    Zulu.init(app, router);

    // initialize favorite endpoints
    Favorite.init(app, router);

    // initialize the notification endpoints
    Notification.init(app, router);

    // initialize the common endpoints
    Common.init(app, router);
    
    if (config.client.uuid) {
        app.use('/'+config.client.uuid,router);
    } else {
        app.use('/',router);
    }
    
}
