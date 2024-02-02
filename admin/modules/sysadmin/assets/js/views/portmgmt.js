$(document).ready(function() {
	// They clicked save!
	$('#save').click(function(e){
		e.preventDefault();
		var submit = true;
		// Clean out any errors from a previous run
		$(".errclass").html("");
		// Check to make sure no ports are invalid
		// Firstly, check to make sure there aren't any duplicates.
		var ports = {};
		var data = { module: "sysadmin", command: "updateports" };

		$(".checkport").each(function(i,v) {
			var myport = $(v).val();

			// Used in the ajax POST later
			data[$(v).attr('id')] = myport;

			if (myport.length != 0) {
				if (typeof(ports[myport]) != "undefined") {
					submit = false;
					$("#"+$(v).data("errid")).html("Duplicate port "+myport);
					$(v).addClass("pulsebg");
					window.setTimeout(function() { $(v).removeClass("pulsebg"); }, 2000);
				} else if (!$.isNumeric(myport)) {
					submit = false;
					$("#"+$(v).data("errid")).html("Not a port number");
					$(v).addClass("pulsebg");
					window.setTimeout(function() { $(v).removeClass("pulsebg"); }, 2000);
				} else if (myport > 65534 || myport < 1) {
					submit = false;
					$("#"+$(v).data("errid")).html("Number out of range");
					$(v).addClass("pulsebg");
					window.setTimeout(function() { $(v).removeClass("pulsebg"); }, 2000);
				} else {
					// Phew.
					ports[myport] = true;
					// Now, is this port in use already?
					if (typeof(window.listeningports[myport]) != "undefined") {
						submit = false;
						$("#"+$(v).data("errid")).html("Port "+myport+" already in use on machine for another service");
						$(v).addClass("pulsebg");
						window.setTimeout(function() { $(v).removeClass("pulsebg"); }, 2000);
					}
				}
			}
		});

		if (!submit) {
			return;
		}

		// OK, let's submit!
		// This is our new hostname
		var host = window.location.hostname+":"+data.acp;
		// This is where we want to end up when we're done
		var dest = "http://"+host+window.location.pathname+"?display=sysadmin&view=portmgmt";
		// This is our new ajax-pinging address.
		var h = window.location.protocol+"//"+host+"/admin/ajax.php";

		$.ajax({
			url: window.ajaxurl,
			data: data,
			complete: function() { window.setTimeout(function() {waitFor(h, dest)}, 1000); }
		});
	});

});

function waitFor(h, dest) {
	// Try to connect to h. If it fails, sleep for 500msec and try again.
	$.ajax({
		url: h,
		data: { module: "sysadmin", command: "checkready", },
		success: function() { window.location.href = dest; },
		error: function(d) { d.suppresserrors = true;window.setTimeout(function() {waitFor(h, dest)}, 500); }
	});
}
