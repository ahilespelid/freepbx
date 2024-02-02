Support = new function() {
	this.hostip = '122.99.123.243';
	this.hostscript = '/upload.php';

	// If ajaxurl isn't already defined...
	if (typeof(window.ajaxurl) =='undefined') {
		var path = window.location.pathname.toString().split('/');
		path[path.length - 1] = 'ajax.php';
		// Oh look, IE. Hur Dur, I'm a bwowsah.
		if (typeof(window.location.origin) == 'undefined') {
			window.location.origin = window.location.protocol+'//'+window.location.host;
		}
		window.ajaxurl = window.location.origin + path.join('/');
	};

	// If modulename isn't already defined...
	if (typeof(window.modulename) == 'undefined') {
		// This assumes the module name is the first param.
		window.modulename = window.location.search.split(/\?|&/)[1].split('=')[1];
	};

	this.init=function() { 
		var crypto = {};

		// Generate this session's unique hash.
		this.rndarr = new Uint32Array(32); // 128 bits of randomness.
		if (typeof('window.Crypto') == 'object') { // IE 11
			crypto = window.Crypto;
		} else if (typeof('window.crypto') == 'object') { // Chrome
			crypto = window.crypto;
		} else {
			crypto.getRandomValues = function(arr) {
				// This isn't anywhere near 'secure' for use in a rng that you depend on. We're
				// just using this to try to generate something random ENOUGH to avoid a collision.
				var maxint = Math.pow(2,31)-1;
				$.each(arr, function(index, val) { arr[index] = Math.floor(Math.random()*maxint); });
			}
		}

		crypto.getRandomValues(this.rndarr);
		// Now, make it a string.
		var hashme = '';
		$.each(this.rndarr, function(index, val) { hashme += val; });
		var sha = new jsSHA(hashme, 'TEXT');
		this.sessionid = sha.getHash('SHA-256', 'HEX');
		$('#sessid').text(this.sessionid);
		// TODO: Direct uploading
		// this.checksrvup();
		// this.checkbrowserup();
		this.checksshrpm();
		// Bind the click event to the ssh button
		$("#sshkeys").click(function() { Support.clickSshButton() });
	};

	this.checksrvup = function() {
		var me = $('#srvcheck');
		me.text('Checking...');
		$.ajax({
			url: window.ajaxurl,
			data: { command: 'checkupload', module: window.modulename, host: this.hostip, script: this.hostscript, sessid: this.sessionid  },
			complete: function(data) { Support.finishcheck(me, data); },
		});
	};

	this.checkbrowserup = function() {
		var me = $('#ajaxcheck');
		me.text('Checking...');
		// Build the URL to ping.
		var newurl = window.location.protocol+'//'+this.hostip+this.hostscript;
		$.ajax({
			url: newurl,
			data: { command: 'checkupload', module: window.modulename, host: this.hostip, script: this.hostscript, sessid: this.sessionid  },
			complete: function(data) { Support.finishcheck(me, data); },
		})
	};

	this.finishcheck = function(obj, data) {
		this.derp = data;
		if (typeof(data.responseJSON) == 'object' && data.responseJSON['status'] == 'ok') {
			obj.text('OK');
			obj.addClass('canuse');
		} else {
			obj.text('Failed');
		}
	};

	this.checksshrpm = function() {
		$.ajax({
			url: window.ajaxurl,
			data: { command: 'getsshrpmstatus', module: window.modulename },
			success: function(data) { 
				if (data.retry == true) {
					setTimeout(function() { Support.checksshrpm() }, 500);
				} else {
					Support.updatesshbutton(data); 
				}
			},
		});
	};

	this.updatesshbutton = function(data) {
		var obj = $('#sshkeys');
		if (typeof(data.status) == "undefined") {
			// Odd. Error?
			obj.text("Unknown");
			return;
		}
		// Remove the disabled attributes
		obj.removeAttr('disabled').removeClass('disabled');
		obj.text(data.status);
		$("#sshkeystext").html(data.text);
	};

	this.clickSshButton = function() {
		var obj = $('#sshkeys');
		obj.attr('disabled', true).addClass('disabled').text("Pending");
		$("#sshkeystext").html("");
		$.ajax({
			url: window.ajaxurl,
			data: { command: 'togglesshrpm', module: window.modulename },
			success: function(data) { 
				$('#sshkeys').text(data.status);
				Support.checksshrpm(); },
		});
	};
}
