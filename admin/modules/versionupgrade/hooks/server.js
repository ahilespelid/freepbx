var http = require('http');

server = http.createServer(function(req, res){  
   res.writeHead(200, {'Content-Type': 'text/html'}); 
   res.write('<div id="nodelogs" style="overflow-x: hidden;overflow-y: visible;height: 270px;"><h3>PHP Upgrade Process has started </h3>'); 

   var readline = require('readline');
   var cp = require('child_process');
   var tail = cp.spawn('tail', ['-fn 200', '/var/log/pbx/freepbx16-upgrade.log']);
   var lineReader = readline.createInterface(tail.stdout, tail.stdin);
   var port = null;
   if(req.url != '/'){
      port = req.url.substring(1);
   }
   res.write("<script> var string = document.getElementById('nodelogs'); if(string != null){ string.scrollTop = string.scrollHeight } </script>");

   lineReader.on('line', function(line) {
      res.write(line  + '<br/>');
      res.write("<script>  string.scrollTop = string.scrollHeight; </script>");
      if(line.match(/System upgrade completed successfully./g)) {
         res.write('</div>');
         res.write("<script> var port =''; function refresh(){ const url = new URL(window.location.href); if(" + port + "!= null) {port = ':' +" + port +"; } window.top.location = url.protocol +'//' + url.hostname + port + '/admin/config.php?display=modules'; };</script> ")
         res.write('<div><div style="font-weight: bold;font-size: 150%;text-align: center;">The upgrade process has finished. Click Refresh below to continue</div><button id="refreshBtn" type="button" class="btn btn-default" style="float: right; background: #d6e4dd;color: #0f5a59;cursor: pointer;font-size: 14px;padding: 5px 18px;font-weight: bold;border-radius: 4px;" onClick="refresh()">Refresh</button></div>');
         res.write('<script> document.getElementById("nodelogs").style.height ="215px"; document.getElementById("refreshBtn").addEventListener("mouseover", function() { document.getElementById("refreshBtn").style.backgroundColor = "#fff"; document.getElementById("refreshBtn").addEventListener("mouseout", function() {document.getElementById("refreshBtn").style.backgroundColor = "#d6e4dd";});});</script>');
         res.end();
      }
   });

});
server.listen(8090);
server.timeout = 10 * 10000;