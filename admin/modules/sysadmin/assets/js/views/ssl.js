Sysadmin_SSL = new function() {
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

	this.refreshSettings = function() {
		$.ajax({
			url: window.ajaxurl,
			data: { command: 'getsslsettings', module: window.modulename, },
			success: function(data) { Sysadmin_SSL.updateSettings(data); },
		});
	};

	this.updateSettings = function (d) {
		$("#apachestatus").html(d.apache.status);
		if($("[id=apachestatus]:contains('Warning')").length == 1){
			$("#certstatus").css("background-color", "#E50303");
		}
		if (typeof(d.apache.cert) == "undefined") {
			$(".apachedetails,#sslintegration").hide();
		} else {
			$(".apachedetails,#sslintegration").show();
			$("#apachecn").html(d.apache.cert.subject.CN);
			$("#apacheissuer").html(d.apache.cert.issuer.CN);
			if (typeof(d.sslintegrated) == "undefined") {
				$("#dointegratessl").show();
				$("#removeintegratessl").hide();
			} else {
				$("#dointegratessl").hide();
				$("#removeintegratessl").show();
			}
		}
		$("#caninstallcert").text(_("Install"));
		$("#caninstallcert").prop("disabled",false);
	};

	this.installPendingCerts = function() {
		window.suppresserrors = true;
		$("#caninstallcert").text(_("Installing..."));
		$("#apachestatus").html("");
		$("#caninstallcert").prop("disabled",true);
		$(".apachedetails").hide();
		$(".certdetails").hide();
		$.ajax({
			url: window.ajaxurl,
			data: { command: 'installpendingcerts', module: window.modulename, cid: $("#certid").val() },
			// This means something broke.
			success: function(data) { Sysadmin_SSL.updateSettings(data); },
			// Normally, it'll crash as apache restarts
			error: function(data) { data.suppresserrors = true;Sysadmin_SSL.waitForRestart(data); },
		});
	};

	this.importCert = function() {
		$("#importcert").text(_("Importing..."));
		$("#importcert").prop("disabled",true);
		$.ajax({
			url: window.ajaxurl,
			data: { command: 'importcert', module: window.modulename },
			// This means something broke.
			success: function(data) { $("#importmsg").text(_("Now go to Certificate Manager and click 'Import Locally'"));  },
			// Normally, it'll crash as apache restarts
			error: function(data) {data.suppresserrors = true;},
		});
	};

	this.waitForRestart = function(d) {
		console.log(d);
		if (d.status == 0) {
			// Well, apache is down. Let's have a snooze for a bit and then try again.
			window.setTimeout(function() {
				$.ajax({
					url: window.ajaxurl,
					data: { command: 'getsslsettings', module: window.modulename, },
					success: function(data) { Sysadmin_SSL.updateSettings(data); },
					error: function(data) { data.suppresserrors = true; Sysadmin_SSL.waitForRestart(data); },
				});
			}, 1000);
		}
	};

	this.getCertDetails = function(id) {
		if(id === "") {
			$("#caninstallcert").prop("disabled",true);
			$("#certcn").text("");
			$("#certissuer").text("");
			return;
		}
		$(this).prop("disabled",true);
		$("#caninstallcert").prop("disabled",true);
		$("#certcn").text(_("Loading..."));
		$("#certissuer").text(_("Loading..."));
		$.post( "ajax.php", {command: 'certdetails', module: window.modulename, cid: id}, function(data) {
			if(data.status) {
				$("#certcn").text(data.details.certname);
				$("#certissuer").text(data.details.certissuer);
				$("#caninstallcert").prop("disabled",false);
			} else {
				$("#certcn").text(_("Error"));
				$("#certissuer").text(_("Error"));
			}
		})
		.fail(function() {
			$("#certcn").text(_("Error"));
			$("#certissuer").text(_("Error"));
		})
		.always(function() {
			$(this).prop("disabled",false);
		});
	};

	this.removeIntegrateSSL = function() {
		$("#removeintegratessl").prop("disabled", true);
		$.ajax({
			url: window.ajaxurl,
			data: { command: 'removeintegratessl', module: window.modulename, },
			complete: function(data) {
				$("#removeintegratessl").prop("disabled", false).hide();
			       	Sysadmin_SSL.refreshSettings();
			},
		});
	};
}
