Activation = new function() {
	// If ajaxurl isn't already defined...
	if (typeof(window.ajaxurl) =='undefined') {
		var path = window.location.pathname.toString().split('/');
		path[path.length - 1] = 'ajax.php';
		// Oh look, IE. Hur Dur, I'm a bwowsah.
		if (typeof(window.location.origin) == 'undefined') {
			window.location.origin = window.location.protocol+'//'+window.location.host;
		}
		//console.log("Set ajaxurl in Activation");
		window.ajaxurl = window.location.origin + path.join('/');
	};

	this.dest = "actstat";
	this.callback = false;

	this.preClick = function() {
		$(".beginrow").hide();
		$(".actrow").show();
		$("#username").focus();
	};

	this.checkAcct = function() {
		$("#acctcheck").html("Checking account, please wait...");
		$("#checkacct").addClass("disabled").attr("disabled", true);
		$.ajax({
			url: window.ajaxurl,
			data: { command: 'checkportal', module: "sysadmin", acct: $("#username").val() },
			success: function(data) {
				$("#checkacct").removeAttr('disabled').removeClass('disabled');
				if (typeof(data.message) != "undefined") {
					$("#acctcheck").html(data.message);
				} else {
					// Success!
					$("#acctcheck").html("");
					$(".actrow").hide();
					$(".assign").show();
					$("#fixeduser").html(data.username);
					$("#depname").focus();
				}
			},
		});
	};

	this.doAct = function(forcenew) {
		$(".help-block").slideUp();
		$(".dme").addClass("disabled").attr("disabled", true);
		$("."+this.dest).show()
		$("#"+this.dest).html("Attempting to activate, please wait...");
		var post = { command: 'doactivate', module: "sysadmin", acct: $("#username").val(), forcenew: false,
			depid: $("#depid").val(), depname: $("#depname").val(), acttype: window.acttype };
		if (typeof(forcenew) != "undefined") {
			post.forcenew = true;
		}
		console.log("BEGIN");
		$.ajax({
			url: window.ajaxurl,
			data: post,
			success: function(data) {
				console.log("SUCCESS");
				if (typeof(data.message) != "undefined") {
					$("#"+Activation.dest).html(data.message);
				}

				// Now. Did we get a deployment ID?
				if (typeof(data.deployment_name) != "undefined") {
					// We did!
					// Was it an already existing deployment?
					if (typeof(data.auto) != "undefined") {
						var c = confirm("This machine already has a deployment ID ("+data.deployment_name+"). Would you like to use that? Selecting Cancel will continue creating a new Deployment");
						if (!c) {
							// They REALLY REALLY want a new deployment.
							return Activation.doAct(true);
						}
					}
					// Now we can proceed..
					$("#"+Activation.dest).html("Activated with Deployment ID "+data.deployment_name+". Now installing...");
					window.newdepname = data.deployment_name;
					Activation.updateLic(data.deployment_name);
				} else {
					$(".dme").removeClass("disabled").removeAttr("disabled", true);
					$(".help-block").slideDown();
				}
		       	},
			error: function(d) {
				d.suppresserrors = true;
				console.log("ERROR");
				window.post = post;
				if (post.depid.length != 0) {
					window.newdepname = post.depid;
				}
				Activation.waitForRestart(d);
			},
		});
	};

	this.doActSilent = function(email, depid, failcallback) {
		$("."+this.dest).show()
		$("#"+this.dest).html("Attempting to activate, please wait...");
		$.ajax({
			url: window.ajaxurl,
			data: { command: 'doactivatesilent', module: "sysadmin", acct: email, depid: depid },
			success: function(data) {
				if (typeof(data.message) != "undefined") {
					$("#"+Activation.dest).html(data.message);
				}
				// Now. Did we get a deployment ID?
				if (typeof(data.deployment_name) != "undefined") {
					$("#"+Activation.dest).html("Activated with Deployment ID "+data.deployment_name+". Now installing...");
					Activation.updateLic(data.deployment_name);
				} else {
					// It errored for some reason, and the reason is in dest.
					if (typeof(failcallback) == "function") {
						failcallback(data);
					}
				}
			},
		});
	};

	this.updateLic = function(dep) {
		var post = { command: 'refreshlic', module: "sysadmin", depid: dep || '' };
		if (dep == "delete") {
			post.origid = fpbx.conf.modules.sysadmin.deployment_id;
		}
		$.ajax({
			url: window.ajaxurl,
			data: post,
			success: function(d) {
				// Well. That shouldn't have happened.
				$("#"+Activation.dest).html(d.message);
			},
			error: function(d) { d.suppresserrors = true;Activation.waitForRestart(d); },
		});
	};

	this.waitForRestart = function(d) {
		console.log(d);
		if (d.status === 0) {
			$("#"+Activation.dest).html("Waiting for Apache to restart...");
			// Well, apache is down. Let's have a snooze for a bit and then try again.
			window.setTimeout(function() {
				$.ajax({
					url: window.ajaxurl,
					data: { command: 'getlicence', module: "sysadmin", },
					success: function(data) { Activation.licenceLoaded(data); },
					error: function(data) { data.suppresserrors = true;Activation.waitForRestart(data); },
				});
			}, 1000);
		} else {
			this.licenceLoaded();
		}
	};

	this.licenceLoaded = function() {
		console.log("Loaded");
		if (typeof(Activation.callback) == "function") {
			Activation.callback();
		} else {
			$("#"+Activation.dest).html("Reloading...");
			window.location.href = window.location.href;
		}
	};
};
