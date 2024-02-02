const SocketIOHandler = require('./src/lib/iot/socket-io-handler.js').SocketIOHandler;
const io = require('socket.io');

module.exports.IoTServerWSProxy = (function(global){
  var IoTServerWSProxy=( server, dispatcher )=>{
    var cache = {};
    io(server).on('connection',(socket)=>{
      var handler = new SocketIOHandler(socket, cache, null);
      handler.init(dispatcher);
    });    
  };
  return IoTServerWSProxy;
})(typeof global === 'undefined' ? this : global);
  


