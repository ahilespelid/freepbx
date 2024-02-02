$(document).ready(function() { 
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

	window.modulename = "sysadmin";
	sysadmin_getHostname();

	$("#savehost").click(function(e) { sysadmin_updateHostname(); });
	$("#newhost").keypress(function(e) { if (e.which == 13) { $("#savehost").click(); } });
});

function sysadmin_getHostname() {
	var b = $("#savehost");
	b.removeAttr("disabled").removeClass("disabled").text(b.data("i18-ready"));
	$("#current").attr("placeholder", "Loading...").val("");
	$("#hostmessage").html("");
	$.ajax({
		url: window.ajaxurl,
		data: { command: 'gethostname', module: window.modulename },
		success: function(data) { $("#current").val(data.hostname); $("#newhost").focus(); },
	});
}


function sysadmin_updateHostname() {
	var newhostname = $("#newhost").val();
	$("#hostmessage").html("");
	if (newhostname.length < 4) {
		$("#hostmessage").html("<strong>Error:</strong>  Hostname too short");
	} else {
		$("#current").val("");
		var b = $("#savehost");
		b.attr("disabled", true).addClass("disabled").text(b.data("i18-pending"));
		$.ajax({
			url: window.ajaxurl,
			data: { command: 'sethostname', module: window.modulename, hn: newhostname },
			success: function(data) { sysadmin_getHostname() },
		});
	}
}
