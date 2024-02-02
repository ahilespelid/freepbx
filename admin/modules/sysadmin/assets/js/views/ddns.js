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

	// If modulename isn't already defined...
	if (typeof(window.modulename) == 'undefined') {
		// This assumes the module name is the first param.
		window.modulename = window.location.search.split(/\?|&/)[1].split('=')[1];
	};

	$.ajax({
		url: window.ajaxurl,
		data: { command: 'getip', module: window.modulename },
		success: function(data) {  $("#detip").html(data.message); }
	});
});
