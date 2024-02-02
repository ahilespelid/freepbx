const fs = require("fs");
const https = require("https");
const http = require("http");

const request = require("request");
const freepbx = require("freepbx");

var f = undefined;
var _astman = undefined;

const serverToken = process.env.SERVER_TOKEN;

function usereventfn (evt) {
    return new Promise((resolve, reject) => {
        switch (evt.userevent) {
            case "sms-outbound":
            case "sms-inbound":
                console.log(`New ${evt.userevent} SMS from ${evt.from} to ${evt.to}`);
                console.debug(evt);
                // notify cloud for the new incoming sms
                var headers = [];
                headers["X-SERVER-TOKEN"] = serverToken;
                request(
                    {
                        url: API_AJAX_URL + "/sms/cloud/notify",
                        json: {
                            to: evt.to,
                            from: evt.from,
                            direction: evt.userevent == "sms-inbound" ? "in" : "out",
                            verb: "NotifyTextMessage",
                            Badge: 1,
                            UserName: evt.from,
                            UserDisplayName: evt.cnam ? evt.cnam : evt.from,
                            Id: evt.id,
                            ThreadId: evt.threadid,
                        },
                        strictSSL: false,
                        rejectUnauthorized: false,
                        method: "POST",
                        headers: headers,
                    },
                    (err, response, body) => {
                        if (err || response.statusCode !== 200) {
                            console.log(
                                "Error in API request (/sms/incoming/notify)",
                                err,
                                "Error code" + response.statusCode,
                                JSON.stringify(body),
                            );
                        }
                        resolve();
                    },
                    err => {
                        if (err) {
                            console.error(`ERROR in ${evt.userevent} sms handler: ${err}`);
                        }
                        resolve();
                    },
                );
                break;
            default:
                resolve();
                break;
        }
    });
}

async function _loadPBX () {
    try {
        console.log("### Connecting to PBX");
        f = await freepbx.connect();
        _astman = f.astman;
        console.log("### Connected to PBX");

        console.log(`Adding Asterisk Manager listener for sms userevent`);
        _astman.on("userevent", usereventfn);
    } catch (err) {
        console.error(err);
        throw err;
    }
}

_loadPBX();

console.log("### SangomaConnect Daemon running on port", process.env.NODE_PORT);

const privateKey = process.env.KEYFILE ? fs.readFileSync(process.env.KEYFILE, "utf8") : undefined;
const certificate = process.env.CERTFILE
    ? fs.readFileSync(process.env.CERTFILE, "utf8")
    : undefined;

const port = process.env.NODE_PORT || 8443;

const credentials = privateKey && certificate ? { key: privateKey, cert: certificate } : undefined;
const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var httpsServer = credentials ? https.createServer(credentials, app) : http.createServer(app);

httpsServer.listen(port, "127.0.0.1");

const path = require("path");

const API_CONFIG = JSON.parse(process.env.PORTS);

const api_protocol = API_CONFIG.api.ssl ? "https" : "http";
const api_port = API_CONFIG.api.port || "80";
const API_AJAX_URL =
    api_protocol +
    "://127.0.0.1:" +
    api_port +
    "/admin/ajax.php?module=sangomaconnect&command=api&query=";

app.get("/mobile/sip/credentials", function (req, res) {
    console.debug("params /mobile/sip/credentials", req.params);
    console.debug("query /mobile/sip/credentials", req.query);
    var headers = [];
    headers["X-SERVER-TOKEN"] = serverToken;
    request(
        {
            url: API_AJAX_URL + "/user/credentials",
            json: {
                email: req.query.cloud_username,
                password: req.query.cloud_password,
            },
            strictSSL: false,
            rejectUnauthorized: false,
            method: "POST",
            headers: headers,
        },
        (err, response, body) => {
            if (err || response.statusCode !== 200) {
                console.error(
                    "Error in API request to (/user/credentials)",
                    JSON.stringify(body),
                    err,
                );
                res.status(response.statusCode).send("Failed to get user credentials");
                return;
            }
            if(!("username" in body)){
                res.status(400).send("Your account has expired. Please contact your system administrator");
                return;
            }
            res.setHeader("Content-Type", "application/xml");

            let smsXml = "";
            let networkXML = "";
            let secureCallsXML = "";
            if (body.sms_send_url && body.sms_fetch_url) {
                fetchPostData = {
                    cloud_username: "%account[cloud_username]%",
                    cloud_password: "%account[cloud_password]%",
                    last_id: "%last_known_sms_id%",
                    last_sent_id: "%last_known_sent_sms_id%",
                    device: "%installid%",
                };

                sendPostData = {
                    cloud_username: "%account[cloud_username]%",
                    cloud_password: "%account[cloud_password]%",
                    sms_to: "%sms_to%",
                    sms_body: "%sms_body%",
                };

                smsXml =
                    "\t<genericSmsSendUrl>" +
                    body.sms_send_url +
                    "</genericSmsSendUrl>\n" +
                    "\t<genericSmsSendPostData>" +
                    JSON.stringify(sendPostData) +
                    "</genericSmsSendPostData>\n" +
                    "\t<genericSmsPostData>" +
                    JSON.stringify(sendPostData) +
                    "</genericSmsPostData>\n" +
                    "\t<genericSmsContentType>application/json</genericSmsContentType>\n" +
                    "\t<genericSmsFetchUrl>" +
                    body.sms_fetch_url +
                    "</genericSmsFetchUrl>\n" +
                    "\t<genericSmsFetchPostData>" +
                    JSON.stringify(fetchPostData) +
                    "</genericSmsFetchPostData>\n" +
                    "\t<genericSmsFetchContentType>application/json</genericSmsFetchContentType>\n";
            }

            if (body.stunServer) {
                networkXML += "\t<STUN>" + body.stunServer + "</STUN>\n";
            }

            if (body.stunServer && body.stunUsername) {
                networkXML += "\t<STUNUsername>" + body.stunUsername + "</STUNUsername>\n";
            }

            if (body.stunServer && body.stunPassword) {
                networkXML += "\t<STUNPassword>" + body.stunPassword + "</STUNPassword>\n";
            }

            if (body.contactIP) {
                networkXML += "\t<contactIP>" + body.contactIP + "</contactIP>\n";
            }

            if (body.natTraversal) {
                networkXML += "\t<natTraversal>" + body.natTraversal + "</natTraversal>\n";
            }

            if (body.ignoreSymmetricNat) {
                networkXML +=
                    "\t<ignoreSymmetricNat>" + body.ignoreSymmetricNat + "</ignoreSymmetricNat>\n";
            }

            if (body.forcedContact) {
                networkXML += "\t<forcedContact>" + body.forcedContact + "</forcedContact>\n";
            }
            if (body.secureCallType !== "no" && body.transport === 'tls') {
                // possibles values of secureCallType are: no, sdes, dtls
                // possibles values of secureCallIncomingOption are "", "required", "enabled"
                // possibles values of secureCallOutgoingOption are "", "required", "enabled"
                secureCallsXML +=
                    "\t<" +
                    body.secureCallType +
                    "Incoming>"+ body.secureCallIncomingOption +"</" +
                    body.secureCallType +
                    "Incoming>\n\t<" +
                    body.secureCallType +
                    "Outgoing>"+ body.secureCallOutgoingOption +"</" +
                    body.secureCallType +
                    "Outgoing>\n";
            }

            let endcalltone = "periodic(sine(250ms,2000,480Hz,620Hz),silence(250ms))";
            if (body.endCallTone) {
                endcalltone = body.endCallTone;
            }

            let xml =
                "<account>\n\t<title>Initializing</title>\n\t<username>" +
                body.username +
                "</username>\n" +
                "\t<password>" +
                body.password +
                "</password>\n" +
                "\t<host>" +
                body.host +
                "</host>\n" +
                "\t<extProvUrl>" +
                body.extProvUrl +
                "</extProvUrl>\n" +
                "\t<transport>" +
                body.transport +
                "</transport>\n" +
                "\t<expires>60</expires>\n" +
                "\t<subscribeForVoicemail>1</subscribeForVoicemail>\n" +
                "\t<voiceMailNumber>" +
                body.voiceMailNumber +
                "</voiceMailNumber>\n" +
                "\t<busyTone>periodic(sine(500ms,2000,480Hz,620Hz),silence(500ms))</busyTone>\n" +
                "\t<endCallTone>" + endcalltone  + "</endCallTone>\n" +
                "\t<callWaitingTone>periodic(sine(300ms,2000,440Hz),silence(10000ms))</callWaitingTone>\n" +
                "\t<ringingTone>periodic(sine(2000ms,2000,440Hz,480Hz),silence(4000ms))</ringingTone>\n" +
                "\t<extProvInterval>60</extProvInterval>\n" +
                smsXml +
                secureCallsXML +
                networkXML +
                "\t<X-install-id>FPBX</X-install-id>\n" +
                "</account>\n";
            res.send(xml);
        },
        err => {
            if (err) {
                console.error("ERROR in /mobile/sip/credentials endpoint", err);
            }
        },
    );
});

app.get("/mobile/sip/provision", function (req, res) {
    console.debug("GET /mobile/sip/provision query", req.query);
    console.debug("GET /mobile/sip/provision params", req.params);
    var headers = [];
    headers["X-SERVER-TOKEN"] = serverToken;
    request(
        {
            url: API_AJAX_URL + "/user/provision",
            json: {
                email: req.query.cloud_username,
                password: req.query.cloud_password,
                build: req.query.build,
                platform: req.query.platform,
                platformversion: req.query.platformversion,
                version: req.query.version,
                locale: req.query.locale,
                cpu: req.query.cpu,
                device: req.query.device,
            },
            strictSSL: false,
            rejectUnauthorized: false,
            method: "POST",
            headers: headers,
        },
        (err, response, body) => {
            if (err || response.statusCode !== 200) {
                console.log(
                    "Error in API request (/mobile/sip/provision)",
                    err,
                    "Error code" + response.statusCode,
                    JSON.stringify(body),
                );
                let xml =
                    "<account>\n\t<title>Logged out.</title>\n\t<username>invalid-user</username>\n\t<password>invalid-pass</password>\n\t<host>invalid-pbx.sangoma.com:9999</host>\n</account>";
                res.send(xml);
                return;
            }
            res.setHeader("Content-Type", "application/xml");
            let endcalltone = "periodic(sine(250ms,2000,480Hz,620Hz),silence(250ms))";
            if (body.endCallTone) {
                endcalltone = body.endCallTone;
            }
            let tonesXml =
                "\t<busyTone>periodic(sine(500ms,2000,480Hz,620Hz),silence(500ms))</busyTone>\n" +
                "\t<endCallTone>" + endcalltone + "</endCallTone>\n" +
                "\t<callWaitingTone>periodic(sine(300ms,2000,440Hz),silence(10000ms))</callWaitingTone>\n" +
                "\t<ringingTone>periodic(sine(2000ms,2000,440Hz,480Hz),silence(4000ms))</ringingTone>\n";
            let smsXml = "";
            let networkXML = "";
            let rewritingXML = "";
            let credentialsXML = "";
            if (body.sms_send_url && body.sms_fetch_url) {
                fetchPostData = {
                    cloud_username: "%account[cloud_username]%",
                    cloud_password: "%account[cloud_password]%",
                    last_id: "%last_known_sms_id%",
                    last_sent_id: "%last_known_sent_sms_id%",
                    device: "%installid%",
                };

                sendPostData = {
                    cloud_username: "%account[cloud_username]%",
                    cloud_password: "%account[cloud_password]%",
                    sms_to: "%sms_to%",
                    sms_body: "%sms_body%",
                };

                smsXml =
                    "\t<genericSmsSendUrl>" +
                    body.sms_send_url +
                    "</genericSmsSendUrl>\n" +
                    "\t<genericSmsSendPostData>" +
                    JSON.stringify(sendPostData) +
                    "</genericSmsSendPostData>\n" +
                    "\t<genericSmsPostData>" +
                    JSON.stringify(sendPostData) +
                    "</genericSmsPostData>\n" +
                    "\t<genericSmsContentType>application/json</genericSmsContentType>\n" +
                    "\t<genericSmsFetchUrl>" +
                    body.sms_fetch_url +
                    "</genericSmsFetchUrl>\n" +
                    "\t<genericSmsFetchPostData>" +
                    JSON.stringify(fetchPostData) +
                    "</genericSmsFetchPostData>\n" +
                    "\t<genericSmsFetchContentType>application/json</genericSmsFetchContentType>\n";
            }
            if (body.stunServer) {
                networkXML += "\t<STUN>" + body.stunServer + "</STUN>\n";
            }

            if (body.stunServer && body.stunUsername) {
                networkXML += "\t<STUNUsername>" + body.stunUsername + "</STUNUsername>\n";
            }

            if (body.stunServer && body.stunPassword) {
                networkXML += "\t<STUNPassword>" + body.stunPassword + "</STUNPassword>\n";
            }

            if (body.contactIP) {
                networkXML += "\t<contactIP>" + body.contactIP + "</contactIP>\n";
            }

            if (body.natTraversal) {
                networkXML += "\t<natTraversal>" + body.natTraversal + "</natTraversal>\n";
            }

            if (body.ignoreSymmetricNat) {
                networkXML +=
                    "\t<ignoreSymmetricNat>" + body.ignoreSymmetricNat + "</ignoreSymmetricNat>\n";
            }

            if (body.forcedContact) {
                networkXML += "\t<forcedContact>" + body.forcedContact + "</forcedContact>\n";
            }

            let title = body.ext;
            if(!("ext" in body)){ 
                credentialsXML = "<host>127.0.0.1</host><username>expired-license</username><password>expired-license</password>";
                title = 'expired-license';
            }else if(body.username){   
                credentialsXML =  "<host>" + body.host + "</host><username>" + body.username+ "</username><password>" + body.password+"</password>";
            }
            
            if (body.emgNumbers) {
                let conditions = "";
                let callRoute = "'" + body.ecallRoute + "'";
                body.emgNumbers.forEach(element => {
                        let con_str =  "'" + element + "'";
                        conditions +=
                                "\t<rule>\n" +
                                "\t<conditions>\n" +
                                "\t<condition type='equals' param=" + con_str + "/>\n" +
                                "\t</conditions>\n" +
                                "\t<actions>\n" +
                                "\t<action type='overrideDialAction' param=" + callRoute + "/>\n" +
                                "\t</actions>\n" +
                                "\t</rule>\n" ;
                });
              rewritingXML =
                        "\t<rewriting>\n" +
                        conditions +
                        "\t</rewriting>\n";
            } else {
               rewritingXML =
                        "\t<rewriting>\n" +
                        "\t</rewriting>\n";
            }

            let voicemailXML =
                "\t<subscribeForVoicemail>1</subscribeForVoicemail>\n" +
                "\t<voiceMailNumber>" + body.voiceMailNumber + "</voiceMailNumber>\n";
            let xml =
                "<account>\n\t<title>" +
                title +
                "</title>\n" +
                tonesXml +
                smsXml +
                networkXML +
                voicemailXML +
                rewritingXML +
                credentialsXML +
                "</account>";
            res.send(xml);
        },
        err => {
            if (err) {
                console.error("ERROR in /mobile/sip/provision endpoint", err);
            }
        },
    );
});

app.get("/mobile/sip/contacts", function (req, res) {
    console.debug("GET /mobile/sip/contacts", req.query);
    console.debug("GET /mobile/sip/contacts", req.params);
    var headers = [];
    headers["X-SERVER-TOKEN"] = serverToken;
    request(
        {
            url: API_AJAX_URL + "/user/contacts",
            json: {
                email: req.query.cloud_username,
                password: req.query.cloud_password,
            },
            strictSSL: false,
            rejectUnauthorized: false,
            method: "POST",
            headers: headers,
        },
        (err, response, body) => {
            if (err || response.statusCode !== 200) {
                console.error(
                    "Error in API request (/mobile/sip/contacts)",
                    err,
                    "Error code" + response.statusCode,
                    JSON.stringify(body),
                );
                res.status(response.statusCode).send("Failed to get user contacts");
                return;
            }
            res.send(body);
        },
        err => {
            if (err) {
                console.error("ERROR in /mobile/sip/contacts endpoint", err);
            }
        },
    );
});

app.post("/mobile/sip/setup", function (req, res) {
    var headers = [];
    headers["X-SERVER-TOKEN"] = serverToken;
    request(
        {
            url: API_AJAX_URL + "/user/setup",
            json: {
                username: req.body.username,
                password: req.body.password,
                cloud_id: req.body.cloud_id,
                domain_access_token: req.body.auth_token,
            },
            strictSSL: false,
            rejectUnauthorized: false,
            method: "POST",
            headers: headers,
        },
        (err, response, body) => {
            if (err || response.statusCode !== 200) {
                console.error(
                    "Error in API request (/mobile/sip/setup)",
                    err,
                    "Error code" + response.statusCode,
                    JSON.stringify(body),
                );
            }
            // we have to always return ok
            res.send("ok");
        },
        err => {
            if (err) {
                console.error("ERROR in /mobile/sip/setup endpoint", err);
            }
        },
    );
});

app.post("/mobile/checkCredentials", function (req, res) {
    console.debug("POST /mobile/checkCredentials query", req.query);
    console.debug("POST /mobile/checkCredentials params", req.params);
    console.debug("POST /mobile/checkCredentials body", req.body);
    var headers = [];
    headers["X-SERVER-TOKEN"] = serverToken;
    request(
        {
            url: API_AJAX_URL + "/user/checkCredentials",
            json: {
                email: req.body.email,
                password: req.body.password,
            },
            strictSSL: false,
            rejectUnauthorized: false,
            method: "POST",
            headers: headers,
        },
        (err, response, body) => {
            if (err || response.statusCode !== 200) {
                console.error(
                    "Error in API request (/mobile/checkCredentials)",
                    err,
                    "Error code" + response.statusCode,
                    JSON.stringify(body),
                );
                res.status(response.statusCode).send("Failed to validate user credentials");
                return;
            }
            res.status(response.statusCode).send({ status: body.status });
        },
    );
});

app.post("/api/v1/mobile/sms/fetch", function (req, res) {
    console.debug("POST /mobile/sms/fetch query", req.query);
    console.debug("POST /mobile/sms/fetch params", req.params);
    console.debug("POST /mobile/sms/fetch body", req.body);

    const emoji = require("emojione");
    var headers = [];
    headers["X-SERVER-TOKEN"] = serverToken;
    request(
        {
            url: API_AJAX_URL + "/sms/fetch",
            json: {
                email: req.body.email,
                password: req.body.password,
                last_id: req.body.last_id ? parseInt(req.body.last_id) : 0,
                last_sent_id: req.body.last_sent_id ? parseInt(req.body.last_sent_id) : 0,
            },
            strictSSL: false,
            rejectUnauthorized: false,
            method: "POST",
            headers: headers,
        },
        (err, response, body) => {
            if (err || response.statusCode !== 200) {
                console.error(
                    "Error in API request (/mobile/sms/fetch)",
                    err,
                    "Error code" + response.statusCode,
                    JSON.stringify(body),
                );
                res.status(response.statusCode).send(body);
                return;
            }
            if (!body.status) {
                res.status(response.statusCode).send(body);
            } else {
                var unread_smss = [];
                var sent_smss = [];
                var messages = [];

                if (!Array.isArray(body.message)) {
                    messages.push(body.message);
                } else {
                    messages = body.message;
                }

                var attachments = [];
                messages.forEach(msg => {
                    attachments = [];
                    var sDate = new Date(msg.tx_rx_datetime);

                    if (msg.contentLength) {
                        // MMS here => add attachment 
                        attachments.push({
                            'content-type': msg.contentType,
                            'content-url': msg.contentUrl,
                            'content-size': msg.contentLength,
                            'encryption-key' : msg.contentKey
                        });  
                    }
                    
                    if (msg.direction == "in") {
                        unread_smss.push({
                            sms_id: msg.id,
                            sending_date: sDate.toISOString(),
                            sender: msg.cnam ? msg.cnam : msg.from,
                            sms_text: msg.contentLength ? JSON.stringify({ attachments: attachments}) : emoji.shortnameToUnicode(msg.body),
                            content_type: msg.contentLength ? 'application/x-acro-filetransfer+json' : 'text/plain'
                        });
                    } else {
                        sent_smss.push({
                            sms_id: msg.id,
                            sending_date: sDate.toISOString(),
                            recipient: msg.cnam ? msg.cnam : msg.to,
                            sms_text: msg.contentLength ? JSON.stringify({ attachments: attachments}) : emoji.shortnameToUnicode(msg.body),
                            content_type: msg.contentLength ? 'application/x-acro-filetransfer+json' : 'text/plain'
                        });
                    }
                });
                const date = new Date();
                var respBody = { date: date.toISOString() };
                respBody.unread_smss = unread_smss;
                respBody.sent_smss = sent_smss;

                res.send(respBody);
            }
        },
    );
});

app.post("/api/v1/mobile/sms/send", function (req, res) {
    console.debug("POST /mobile/sms/send query", req.query);
    console.debug("POST /mobile/sms/send params", req.params);
    console.debug("POST /mobile/sms/send body", req.body);
    var headers = [];
    headers["X-SERVER-TOKEN"] = serverToken;
    request(
        {
            url: API_AJAX_URL + "/sms/send",
            json: {
                email: req.body.email,
                password: req.body.password,
                from: req.body.from,
                to: req.body.to,
                body: req.body.body,
            },
            strictSSL: false,
            rejectUnauthorized: false,
            method: "POST",
            headers: headers,
        },
        (err, response, body) => {
            if (err || response.statusCode !== 200) {
                console.error(
                    "Error in API request (/mobile/sms/send)",
                    err,
                    "Error code" + response.statusCode,
                    JSON.stringify(body),
                );
                res.status(response.statusCode).send(body);
                return;
            }
            if (!body.status) {
                res.status(response.statusCode).send(body);
            } else {
                var respBody = { sms_id: body.id };
                res.send(respBody);
            }
        },
    );
});

app.post("/api/v1/webview/proxy/request", function (req, res) {
    console.debug("POST /api/v1/webview/proxy/request", req.query);
    console.debug("POST /api/v1/webview/proxy/request", req.params);
    console.debug("POST /api/v1/webview/proxy/request", req.body);

    var headers = [];
    headers["X-SERVER-TOKEN"] = serverToken;
    request(
        {
            url: API_AJAX_URL + "/user/voicemail",
            json: {
		        email: req.body.email,
                password: req.body.password,
                method_name: req.body.method_name,
		        message_id: req.body.message_id,
                account_id: req.body.account_id,
                extension: req.body.extension,
                presence_option_id: req.body.presence_option_id,
                update_provision: req.body.update_provision,
                message_ids: req.body.message_ids,
                folder: req.body.folder,
                items_per_page: req.body.items_per_page
            },
            strictSSL: false,
            rejectUnauthorized: false,
            method: "GET",
            headers: headers,
        },
        (err, response, body) => {
            if (err || response.statusCode !== 200) {
                console.error(
                    "Error in API request (/user/voicemail)",
                    err,
                    "Error code" + response.statusCode,
                    JSON.stringify(body),
                );
                res.status(response.statusCode).send(body);
                return;
            }
            if (!body.status) {
                res.status(response.statusCode).send(body);
            } else {
                res.status(200);
                res.send(respBody);
            }
        },
    );
});
