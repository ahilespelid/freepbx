const proxy = require('http-proxy-middleware');
const config = require('config');
const log = require('../../log');

const PORTS = global.process.env.PORTS ? JSON.parse(global.process.env.PORTS) : { api: { port: 80, ssl: false }, asterisk: { port: 8089, ssl: true }, zulu: { port: config.zulu.port, bindAddress: config.host } }

module.exports.init = async (app, router) =>{

	const  zulu = app.get('zulu');
	var url = undefined;
	var localhost = '127.0.0.1';
	if (zulu) {
		url = PORTS.api.ssl ? 'https' : 'http';
		url = url + '://127.0.0.1:' + PORTS.api.port;
		localhost = config.host;
	} else {
		url = 'http://127.0.0.1:80';
	}
	log.info("SmartOffice proxy url: " + url);

	// proxy middleware options
	var options = {
		target: url, // target host
		localAddress: localhost,
		changeOrigin: true, // needed for virtual hosted sites
		secure: false,
		xfwd: true,
		filter: function(pathname, req) {
			return ((pathname.match('^/api') || pathname.match('^/file')) && (req.method === 'GET' || req.method === 'POST'));
		},
		pathRewrite: function (path, req) {
			var thisRegex = new RegExp(/^\/(api|file)([^?]*)(?:\?(.*))?/);
			var result = thisRegex.exec(req.originalUrl);
			var prefix = (result[1] !== 'api') ? '/' + result[1] : '';
			var updatedPath = '/admin/ajax.php?' + (result[3] ? result[3] : '') + '&module=iotserver&command=api&query=' + prefix + result[2];
			log.info("Proxy request path : " + updatedPath);
			return updatedPath 
		},
		onError: function(err, req, res) {
			log.error("zulu api proxy error: " + err)
			res.status(500).end(err);
		},
		onProxyReq: function(proxyReq, req, res) {
			log.debug("Executing proxy request method: " + proxyReq.method)
			if (req.body) {
				var bodyData = JSON.stringify(req.body);
				log.debug("Request raw body: " +bodyData)
				proxyReq.setHeader('Content-Type','application/json');
				proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
				proxyReq.write(bodyData);
			}
		},
		onProxyRes: function(proxyRes, req, res) {
			zulu._setCORS(req,proxyRes);
			log.info("Got Proxy response headers: " + proxyRes.headers);
		},
		onOpen: function(proxySocket) {
			 proxySocket.on('data', (data)=>{
			 	log.debug("smartoffice api proxy data: " + data)
			 });
		},
		onClose: function(res, socket, head) {
			log.info('Client disconnected');
		}
	};

	app.use(['/api', '/file'], proxy(options));

	router.options('/api*',(req,res)=>{
		zulu._setCORS(req,res);
		res.send({});
	});

	router.options('/file*',(req,res)=>{
		zulu._setCORS(req,res);
		res.send({});
	});

	router.post('/internal/reg',(req,res)=>{
		var data = req.body;
		var backend = app.get('iot_backend_server');
		if (!backend) {
			log.error('Backend not configured');
			res.send({status: false, message: 'Backend not configured'});
			return;
		}

		if (!data || !data.email) {
			log.error('Missing mandatory user info');
			res.send({status: false, message: 'Missing mandatory user info'});
			return;
		}

		backend.addUser(data).then((resp)=>{
			res.send(resp);
		}).catch((error)=>{
			log.error(error);
			res.send({status: false, message: '' + error});
		});

	})
}