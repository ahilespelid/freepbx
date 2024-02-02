$(document).ready(function() {

	// Update address bar when someone changes tabs
	$("a[data-toggle='tab']").on('shown.bs.tab', function(e) { 
		var newuri = updateQuery("tab", e.target.getAttribute('aria-controls'));
		window.history.replaceState(null, document.title, newuri);
	});

	// Bind any select boxes so they're the same value for the same network
	$(".netsel").on("change", function(e) {
		// Now change anything that MATCHES this network to be the same value.
		var netname = $(e.target).attr('network');
		$(".netsel[network='"+netname+"']").val($(e.target).val());
	});

	// When a 'manage' button is clicked, propogate the modal
	$(".managebutton").on("click", manage_button_clicked);

	// When they've finished messing around, save it.
	$("#savenetconf").on("click", save_net_button_clicked);

	// Reservation: Validate MAC and IP on 'create'
	$("button[name='update']").on("click", validate_reservation_update);

});


function manage_button_clicked(e) {
	$("#managemodal").modal();
	var network = $(e.target).data('network');
	$(".dhcpsetting").val(_("Loading...")).attr("disabled", true);
	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: { module:'sysadmin', command:'getdhcpnetconf', network: network },
		success: function(data) { 
			// If this network is disabled, don't let them do anything.
			if (data.dhcpstatus === "disabled") {
				$("#savenetconf").hide();
				$(".dhcpsetting").val(_("Network disabled"));
				return;
			}
			// Now set our modal values.
			Object.keys(data).forEach(function(k) {
				var r = data[k];
				if (typeof r == "object") {
					$("#"+k).val(r.join(", "));
				} else {
					$("#"+k).val(r);
				}
			});

			// Update our start and end address manually
			$("#iprangestart").val(data.netprefix+data.rangestart);
			$("#iprangeend").val(data.netprefix+data.rangeend);
			$("#savenetconf").text(_("Save")).attr("disabled", false).show().data("network", network);
			$(".dhcpsetting").attr("disabled", false);

			console.log("Complete!", e); 
		},
	});
}

function save_net_button_clicked() {
	// Get our settings
	var ajaxdata = {
		module: "sysadmin",
		command: "setdhcpnetconf",
		network: $("#savenetconf").data("network"),
		dnsservers: $("#dnsservers").val(),
		option66: $("#option66").val(),
		option150: $("#option150").val()
	};
	var startarr = $("#iprangestart").val().split(".");
	var endarr = $("#iprangeend").val().split(".");
	if (typeof startarr[3] == "string") {
		ajaxdata['rangestart'] = startarr[3];
	} else {
		ajaxdata['rangestart'] = 10;
	}
	if (typeof endarr[3] == "string") {
		ajaxdata['rangeend'] = endarr[3];
	} else {
		ajaxdata['rangeend'] = 200;
	}

	$("#savenetconf").text(_("Saving...")).attr("disabled", true);
	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: ajaxdata,
		complete: function() { $("#managemodal").modal('hide'); }
	});
}

function validate_reservation_update(e) {
	var row = $(e.target).attr('value');
	var canproceed = true;

	// Make sure this is a MAC address. We do the same thing as the PHP code,
	// rip out anything that's not hex, and make sure it's 12 chars long.
	var checkmac = $("input[name="+row+"-mac]").val().toLowerCase().replace(/[^a-f0-9]/g, '');
	if (checkmac.length !== 12) {
		e.preventDefault();
		$("input[name="+row+"-mac]").addClass('pulsebg');
		setTimeout(function() { $("input[name="+row+"-mac]").removeClass('pulsebg') }, 2100);
		canproceed = false;
	}
	/* 
	var checkip = $("input[name="+row+"-ip]").val();
	if (!validate_ip(checkip)) {
		e.preventDefault();
		$("input[name="+row+"-ip]").addClass('pulsebg');
		setTimeout(function() { $("input[name="+row+"-ip]").removeClass('pulsebg') }, 2100);
		canproceed = false;
	}
	*/
	if (!canproceed) {
		e.preventDefault();
	}
}


// Updates the URL with a hash.
function updateQuery(key, value) {
	var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi"), hash;
	var url = window.location.href;

	if (re.test(url)) {
		if (typeof value !== 'undefined' && value !== null) {
			return url.replace(re, '$1' + key + "=" + value + '$2$3');
		} else {
			hash = url.split('#');
			url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
			if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
				url += '#' + hash[1];
			}
			return url;
		}
	} else {
		if (typeof value !== 'undefined' && value !== null) {
			var separator = url.indexOf('?') !== -1 ? '&' : '?';
			hash = url.split('#');
			url = hash[0] + separator + key + '=' + value;
			if (typeof hash[1] !== 'undefined' && hash[1] !== null) 
				url += '#' + hash[1];
			return url;
		} else {
			return url;
		}
	}
}

function validate_ip(ip) {
	// Only does ipv4.
	return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
}

