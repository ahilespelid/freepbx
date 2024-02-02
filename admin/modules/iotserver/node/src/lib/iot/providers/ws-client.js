const WSClient = require('websocket').client;
const WebSocketConnection = require('websocket').connection;
function IotWSClient(serverUrl, autoReconnect = true){
    this.server_url = serverUrl;
    this._connection = undefined;
    this._interval = undefined;
    this.client = undefined;
    this._reconnectTimer = undefined;
    this._reconnect = autoReconnect;
    this._pingTimeout = undefined;
}

function sendKeepAlive(self, connection, interval) {
    if (connection.connected) {
        connection.ping(); 
    }

    if (!self._pingTimeout) {
        // Use `WebSocketConnection#drop()`, which immediately destroys the connection,
        // instead of `WebSocketConnection#close()`, which waits for the close timer.
        // Delay should be equal to the keepalive interval plus a conservative 
        // assumption of the latency.
        self._pingTimeout = setTimeout((_self, _connection) => {
            _connection.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR, 'Heartbeat Timeout');
        }, interval + 1000, self, connection);
    }
}

function heartbeat(self) {

    if (self._pingTimeout) {
        clearTimeout(self._pingTimeout);
        self._pingTimeout = null;
    }
}

IotWSClient.prototype = {

    _handleConnect: function(connection) {
        this._connection = connection;
        if (this._reconnectTimer) {
            clearInterval(this._reconnectTimer);
            this._reconnectTimer = undefined;
        }
    },

    connected: function() {
        return this._connection && this._connection.connected;
    },

    disconnectImpl: function() {
        if (this._connection) {
            this._connection.close();
        } else {
            this.client.abort();
        }

        if (this._interval) {
            clearInterval(this._interval);
        }

        if (this._pingTimeout) {
            clearTimeout(this._pingTimeout);
        }

        this._pingTimeout = undefined;
        this._connection = undefined;
        this._interval = undefined;
        this.client = undefined;
    },

    disconnect: function() {

        this.disconnectImpl();

        if (this._reconnectTimer) {
            clearInterval(this._reconnectTimer);
            this._reconnectTimer = null;
        }

        this._reconnect = false;
    },

    sendMsg: function(data) {
        if (this._connection) {
            this._connection.sendUTF(JSON.stringify(data));
        }
    },

    connectImpl: function(protocol, path, keepAliveInterval = null, connectMessage = null, 
        messageCallback = null, errorCallback = null, connectCallback = null, callBackData = null) {
        return new Promise((resolve,reject)=>{
            var self = this;
            if (this.client) {
                this.disconnectImpl();
                this.client = null;
            }
            this.client = new WSClient();

            

            this.client.on('connectFailed', function(error) {
                var err = 'Connect Error: ' + error.toString();
                if (errorCallback) {
                    errorCallback(err,callBackData);
                }

                if (self._pingTimeout) {
                    clearTimeout(self._pingTimeout);
                    self._pingTimeout = null;
                }

                if (self._interval) {
                    clearInterval(self._interval);
                }

                if (self._reconnectTimer === undefined && self._reconnect) {
                    // schedule a timer to automatically reconnect on faillure
                    self._reconnectTimer = setInterval(self.connectImpl.bind(self), 30000, 
                        protocol, path, keepAliveInterval, connectMessage, messageCallback, 
                        errorCallback, connectCallback, callBackData);
                }
            });

            this.client.on('close', function(error) {
                var err = protocol + ' websocket Closed';
                if (errorCallback) {
                    errorCallback(err, callBackData);
                }
                
            });

            this.client.on('connect', function(connection) {

                if (connection.connected) {
                    self._handleConnect(connection);
                }

                if (connectCallback) {
                    connectCallback(connection);
                }

                connection.on('error', function(error) {
                    var err = 'Connection Error: ' + error.toString();

                    if (errorCallback) {
                        errorCallback(err, callBackData);
                    }

                    if (self._reconnectTimer === undefined && self._reconnect) {
                        // schedule a timer to automatically reconnect on faillure
                        self._reconnectTimer = setInterval(self.connectImpl.bind(self), 30000, 
                            protocol, path, keepAliveInterval, connectMessage, messageCallback, 
                            errorCallback, connectCallback, callBackData);
                    }

                    if (self._pingTimeout) {
                        clearTimeout(self._pingTimeout);
                        self._pingTimeout = null; 
                    }

                    if (self._interval) {
                        clearInterval(self._interval);
                    }
                });

                connection.on('ping', function(cancel, data) {
                    heartbeat(self)
                });

                connection.on('pong', function(data) { 
                    heartbeat(self)
                });

                connection.on('close', function(reasonCode, description) {
                    var err = protocol + ' Connection Closed: ' + description;
                    if (errorCallback) {
                        errorCallback(err, callBackData);
                    }

                    if (self._pingTimeout) {
                        clearTimeout(self._pingTimeout);
                        self._pingTimeout = null;
                    }

                    if (self._interval) {
                        clearInterval(self._interval);
                    }

                    if (description === 'Heartbeat Timeout' && self._reconnect && self._reconnectTimer === undefined) {
                        // we need to reconnect here.

                        if (self._reconnectTimer) {
                            clearInterval(self._reconnectTimer);
                        }

                        // schedule a timer to automatically reconnect on faillure
                        self._reconnectTimer = setInterval(self.connectImpl.bind(self), 30000, 
                            protocol, path, keepAliveInterval, connectMessage, messageCallback, 
                            errorCallback, connectCallback, callBackData);
                    }
                });


                connection.on('message', function(message) {
                    if (messageCallback) {
                        messageCallback(connection, JSON.parse(message.utf8Data));
                    }
                });

                if (connectMessage) {
                    connection.send(connectMessage);
                }

                if (keepAliveInterval) {
                    self._interval = setInterval(sendKeepAlive, keepAliveInterval, self, connection, keepAliveInterval);
                }
            });

            var url = this.server_url;
            url = url + path;
            if (protocol) {
                this.client.connect(url, protocol);
            } else {
                this.client.connect(url);
            }
            resolve();
        });
    },

    connect: async function(protocol, path, keepAliveInterval = null, connectMessage = null, messageCallback = null, errorCallback = null, connectCallback = null, callBackData = null) {
        var self = this;

        // try to connect now
        self.connectImpl(protocol, path, keepAliveInterval, connectMessage, 
            messageCallback, errorCallback, connectCallback, callBackData);

        if (this._reconnect) {
            // schedule a timer to automatically reconnect on faillure
            self._reconnectTimer = setInterval(self.connectImpl.bind(self), 30000, 
                protocol, path, keepAliveInterval, connectMessage, messageCallback, 
                errorCallback, connectCallback, callBackData);
        } else {
            self._reconnectTimer = null;
        }
    }
};

module.exports = IotWSClient
