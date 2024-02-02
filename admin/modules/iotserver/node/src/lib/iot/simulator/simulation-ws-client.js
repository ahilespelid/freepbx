const WSClient = require('websocket').client;
function SimWSClient(serverUrl, logger = null){
    this.server_url = serverUrl;
    this.logger = logger;
    this.client = new WSClient(); 
    this._connection = undefined;
}

function sendKeepAlive(connection) {
    if (connection.connected) {
        connection.ping();
    }
}

SimWSClient.prototype = {

  _handleConnect: function(connection) {
    this._connection = connection;
  },

  disconnect: function() {
    if (this._connection) {
        this._connection.close();
    } else {
        this.client.abort();
    }
  },

  connect: async function(server,logger = null, messageCallback,errorCallback) {
        var self =this;
        this.client.on('connectFailed', function(error) {
            var err = 'Connect Error: ' + error.toString();
            if (logger !== null) {
                logger.error(err);
            }
            if (errorCallback) {
                errorCallback(err);
            }
        });

        this.client.on('close', function(error) {
            var err = 'echo-protocol Connection Closed';
            if (logger !== null) {
                logger.error(err);
            } 
          if (errorCallback) {
                errorCallback(err);
            }
        });

        this.client.on('connect', function(connection) {
            if (logger !== null) {
                logger.error('WebSocket Client Connected');
            }
            connection.on('error', function(error) {
                var err = 'Connect Error: ' + error.toString();
                if (logger !== null) {
                    logger.error(err);
                } 
                if (errorCallback) {
                    errorCallback(err);
                }
            });
            connection.on('close', function(error) {
                var err = 'echo-protocol Connection Closed';
                if (logger !== null) {
                    logger.error(err);
                }
                if (errorCallback) {
                  errorCallback(err);
                }
            });
            connection.on('message', function(message) {
                var msg = "Received: '" + message.utf8Data + "'"
                if (logger !== null) {
                    logger.debug(msg);
                }

                if (messageCallback) {
                    messageCallback(JSON.parse(message.utf8Data));
                }
            });
            
            setInterval(sendKeepAlive, 20000, connection);

            if (connection.connected) {
                self._handleConnect(connection);
            }
        });
        this.client.connect(this.server_url, 'echo-protocol');
    }
};

exports.SimWSClient = SimWSClient
