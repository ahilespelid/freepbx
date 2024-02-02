
NetworkC = Class.extend({
	init: function(){
		var self = this;

		this.i = false
		this.loadNetworkConfig();

		if (window.cloudpbx) {
			return;
		}

		// Set the 'IP' box to enabled when it's Static
		$("input[name=bootproto]").change(function() {
			if ($(this).attr('id') == "bootproto-static") {
				$(".staticdisabled").prop('disabled', false);
			} else {
				$(".staticdisabled").prop('disabled', true);
			}
		});

		// Same when creating interfaces
		$("input[name=newintbootproto]").change(function() {
			if ($(this).attr('id') == "nibp-static") {
				$(".nibpstaticdisabled").prop('disabled', false);
			} else {
				$(".nibpstaticdisabled").prop('disabled', true);
			}
		});

		// Bind the 'create interface' to open the modal
		$("#add_int").click(function() { $("#addintmodal").modal(); });

		// Save interface pops up the warning.
		$("#save_int").click(function() { $("#savechangesmodal").modal(); });

		// Someone's clicked on Save and Apply
		$("#saveapply").click(function() { self.saveInterface(); });

		// Show or hide vlan/label when adding an int
		$("input[name=inttype]").change(function() {
			if ($(this).attr('id') == "intsecondary") {
				$("#secondaryform").show();
				$("#vlanform").hide();
			} else {
				$("#secondaryform").hide();
				$("#vlanform").show();
			}
		});

		// Someone's clicked on Save and Apply when creating an int
		$("#docreateint").click(function(e) { e.preventDefault(); self.createInterface(); });

		// Woo, we can delete an interface!
		$("#delint").click(function() { 
			// Load the interface name into the modal first
			var intname = self.interfaces[$("#select_network_device").val()].DEVICE;
			$("#intdelname").text(intname);
			$("#delintmodal").modal();
		});
		$("#dodelint").click(function() { self.submitInterfaceDelete(); });

		// Wifi Additions
		// When the Wifi tab is shown, start an update of the available networks.
		// We skip if the wifi-status element doesn't exist, because that means
		// there's no wifi hardware.
		$("a[data-toggle='tab']").on('shown.bs.tab', function(e) { 
			if ($(e.target).attr('aria-controls') == "wireless") {
				if ($("#wifi-status").length !== 0) {
					window.Network.wifi.start_scan();
				}
				$("#action-bar").hide();
			} else {
				window.Network.wifi.stop_scan();
				$("#action-bar").show();
			}
		});

		// After the wifi modal has been shown, put focus in the password
		// window, and stop the scanning
		$("#wificonnectmodal").on('shown.bs.modal', function() {
			window.Network.wifi.stop_scan();
			$("#modalpass").focus();
			window.Network.wifi.start_wpalog();
		});

		// Start it when it's closed
		$("#wificonnectmodal").on('hidden.bs.modal', function() {
			window.Network.wifi.start_scan();
			window.Network.wifi.stop_wpalog();
		});

		// Clicked on a connect button?
		$("#scantable").on("click", ".connectbtn", connect_btn_clicked);

		$("#dowificonnect").on("click", join_btn_clicked);
	},

	loadNetworkConfig: function() {
		// For use in ajax
		var self = this;

		// Remove trigger from selects
		$("#select_network_device").off("change");
		$("#newintselect").off("change");

		// Ajax the network config
		var req = { module: 'sysadmin', command: 'getnetworkconfig' };
		$.ajax({
			url: window.ajaxurl,
			data: req,
			success: function(data) { 
				self.netconf = data;
				// Load the select
				self.updateNetworks();
				// Add trigger back to select
				$("#select_network_device").on("change", function() { self.showInterfaceId($(this).val()) });
				$("#newintselect").on("change", function() { self.changeAddInt($(this).val()) });

				// Is this the first time we're called?
				if (self.i === false) {
					self.showInterfaceId(0);
					self.i = true;
				}
			},

		});
	},

	updateNetworks: function() {
		var self = this;

		// Remove all entries from main and addnew select
		$("#select_network_device,#newintselect").find('option').remove();
		$("#select_network_device,#newintselect").attr('disabled', false);

		// Add the new ones 
		// We do HAVE a new one, right?
		if (Object.keys(this.netconf.interfaces).length == 0) {
			// Bad. 
			$("#select_network_device,#newintselect").append('<option>No Interfaces</option>');
			$("#select_network_device,#newintselect").attr('disabled', true);
			return;
		}

		// OK, cool
		this.interfaces = [];
		this.intindex = 0;

		$.each(this.netconf.interfaces, function(k, v) {
			console.log("Looking at interface "+k, v);
			var myindex = self.intindex++;
			if (v.addresses.length == 0) {
				// Nothing assigned to this interface
				var conf = { DEVICE: k, BOOTPROTO: 'unconf' }
				conf.PARENT = v.config.PARENT;
				self.interfaces[myindex] = conf;
				$("#select_network_device").append($('<option>', { value: myindex, text: k }));
			} else { 
				// Take the first IP address, ignore any others
				self.interfaces[myindex] = v.config;
				self.interfaces[myindex].ipaddr = v.addresses[0][0];
				self.interfaces[myindex].netmask = v.addresses[0][2];
				$("#select_network_device").append($('<option>', { value: myindex, text: k }));
			};
			// Only add to newintselect if it can be used as a parent
			if (v.config.PARENT) {
				$("#newintselect").append($('<option>', { value: myindex, text: k }));
			}
		});
	},

	showInterfaceId: function(id) {
		if (typeof(this.interfaces[id]) == "undefined") {
			console.log("Error. Tried to show non-existing int "+id);
			return;
		}

		var i = this.interfaces[id];

		// Is it static or DHCP?
		if (typeof(i.BOOTPROTO) == "undefined" || i.BOOTPROTO == "static") {
			// It's static.
			$("#bootproto-static").click();
		} else if (i.BOOTPROTO == "unconf" || i.BOOTPROTO == "") {
			$("#bootproto-none").click();
		} else { 
			$("#bootproto-dhcp").click();
		}

		// Load the fields
		if (typeof(i.ipaddr) != "undefined") {
			$("#staticip").val(i.ipaddr);
		} else {
			$("#staticip").val("");
		}

		if (typeof(i.netmask) != "undefined") {
			$("#netmask").val(i.netmask);
		} else {
			$("#netmask").val("");
		}

		if (typeof(i.GATEWAY) != "undefined") {
			$("#gateway").val(i.GATEWAY);
		} else {
			// Is this the interface with the default route?
			if (this.netconf.gateway.interface == i.DEVICE) {
				$("#gateway").val(this.netconf.gateway.router);
			} else {
				$("#gateway").val("");
			}
		}

		if (typeof(i.HWADDR) != "undefined") {
			$("#macaddr").val(i.HWADDR);
		} else {
			$("#macaddr").val("");
		}

		if (typeof(i.ONBOOT) != "undefined" && (i.ONBOOT == "yes" || i.ONBOOT == 1)) {
			$("#onboot-yes").click();
		} else {
			$("#onboot-no").click();
		}

		// Is it a VLAN interface?
		if (typeof(i.VLANID) != "undefined") {
			$("#vlanwarning>p").text("Warning: VLAN ID "+i.VLANID+"!");
			$("#vlanwarning").slideDown();
		} else {
			$("#vlanwarning>p").text("");
			$("#vlanwarning").slideUp();
		}

		// Can it be deleted?
		if (typeof(i.CANDELETE) != "undefined" && i.CANDELETE == true) {
			$("#delint").show();
		} else {
			$("#delint").hide();
		}

		// Does it have an override warning?
		if (typeof(i.OVERRIDE) != "undefined") {
			$("#vlanwarning>p").text(i.OVERRIDE);
			$("#vlanwarning").slideDown();
			$(".staticdisabled").prop('disabled', true);
			$("input[name=bootproto]").prop('disabled', true)
			$("input[name=onboot]").prop('disabled', true)
		} else {
			$("#vlanwarning>p").text("");
			$("#vlanwarning").slideUp();
			$("input[name=bootproto]").prop('disabled', false)
			$("input[name=onboot]").prop('disabled', false)
		}



	},

	changeAddInt: function(id) {
		if (typeof(this.interfaces[id]) == "undefined") {
			console.log("Error. Tried to show non-existing int "+id);
			return;
		}

		var i = this.interfaces[id];

		// If we're a VLAN, we can only add a secondary
		if (typeof(i.VLAN) != "undefined") {
			// Disable VLAN, select 'secondary'
			$("#intsecondary").click(); // Trigger the event by clicking on it.
			$("#intvlan").prop('disabled', true);
		} else {
			$("#intvlan").prop('disabled', false);
		}
	},

	saveInterface: function() {
		// They've pushed the save button in the modal.
		var self = this;

		// Interface name
		var intname = this.interfaces[$("#select_network_device").val()].DEVICE;

		// Build the details for ajax
		var req = {
			module: 'sysadmin',
			command: 'savenetwork',
			interface: intname,
			protocol: $("input[name=bootproto]:checked").attr('value'),
			ipaddr: $("#staticip").val(),
			netmask: $("#netmask").val(),
			gateway: $("#gateway").val(),
			onboot: $("input[name=onboot]:checked").attr('value'),
		};

		// Disable the buttons
		$(".btn", "#savechangesmodal").prop('disabled', true)
		$("#savestatus").text("Saving changes to "+intname+"...");

		$.ajax({
			url: window.ajaxurl,
			data: req,
			success: function(data) { 
				if (typeof(data.state) == "unset" || data.state != "success") {
					console.log("error", data);
					$(".btn", "#savechangesmodal").prop('disabled', false)
					$("#savestatus").text("Error: "+data.message);
					return;
				}
				setTimeout(function(){
					window.location.href = window.location.href;
				}, 4000);
			},
		});
	},

	createInterface: function() {
		// They've pushed the save button in the modal.
		var self = this;

		// Interface name
		var intname = this.interfaces[$("#newintselect").val()].DEVICE;

		// Build the details for ajax
		var req = {
			module: 'sysadmin',
			command: 'createnetwork',
			parent: intname,
			inttype: $("input[name=inttype]:checked").attr('value'),
			intlabel: $("#intlabel").val(),
			vlanid: $("#vlanvid").val(),
			protocol: $("input[name=newintbootproto]:checked").attr('value'),
			ipaddr: $("#newintipaddr").val(),
			netmask: $("#newintsubnet").val(),
		};

		// Disable the buttons
		$(".btn", "#addintmodal").prop('disabled', true)
		$("#addintstatus").text("Creating Interface...");

		$.ajax({
			url: window.ajaxurl,
			data: req,
			success: function(data) { 
				if (typeof(data.message) != "undefined") {
					$("#addintstatus").text(data.message);
				} else {
					$("#addintstatus").text("");
				}
				if (typeof(data.state) == "undefined") {
					console.log("error", data);
					$(".btn", "#addintmodal").prop('disabled', false)
					return;
				} else if (data.state == "failed") {
					$(".btn", "#addintmodal").prop('disabled', false)
					if (typeof(data.faileditems) != "undefined") {
						$.each(data.faileditems, function(i, v) {
							// Flash the fields that have errors.
							$("#"+v+":visible").addClass("pulsebg").focus();
							window.setTimeout(function() { $("#"+v+":visible").removeClass("pulsebg"); }, 2000);
						});
					}
					return;
				}
				// No errors. Reload
				window.location.href = window.location.href;
			},
		});
	},

	submitInterfaceDelete: function() {
		// They've pushed the save button in the modal.
		var intname = $("#intdelname").text();

		// Build the details for ajax
		var req = {
			module: 'sysadmin',
			command: 'deleteinterface',
			interface: intname,
		};

		$(".btn", "#delintmodal").prop('disabled', true);

		$.ajax({
			url: window.ajaxurl,
			data: req,
			success: function(data) { 
				window.location.href = window.location.href;
			},
		});
	},

	// Wifi stuff
	wifi: {
		scan_timeout: false,
		wpalog_timeout: false,
		update_netconf: true,
		waiting_for_conn: false,
		force_scan_refresh: false,
		stop_scan: function() {
			if (typeof window.Network.wifi.scan_timeout != "boolean") {
				clearTimeout(window.Network.wifi.scan_timeout);
			}
		},
		start_scan: function() {
			$.ajax({
				url: window.FreePBX.ajaxurl,
				data: { module: "sysadmin", command: "wifiscan", force: window.Network.wifi.force_scan_refresh },
				success: window.Network.wifi.render_scan,
				complete: function() {
					window.Network.wifi.force_scan_refresh = false;
					window.Network.wifi.scan_timeout = window.setTimeout(window.Network.wifi.start_scan, 5000);
				},
			})
		},
		render_scan: function(d) {
			// Do we have a message?
			if (typeof d.message != "undefined") {
				// we SHOULD still have our first row displayed.
				$("#loadingrow").text(d.message);
				return;
			}

			if (typeof d.scan.message != "undefined") {
				$("#wifi-status").text(d.scan.message);
			}
			$("#wifi-details").text(d.status.details);

			if (window.Network.wifi.update_netconf) {
				window.Network.wifi.update_netconf = false;
				render_wifi_netconf(d);
			}

			render_wifi_baseconf(d);

			// Status
			$("#wifi-status").text(d.status.output);

			if (typeof d.scan.discovered == "undefined") {
				return;
			}
			       
			if (d.scan.discovered.length == 0) {
				$("tbody", "#scantable").html("<tr><td id='loadingrow' colspan=4>No networks available</td></tr>");
				return;
			}

			var tablecontent = "";

			Object.keys(d.scan.discovered).forEach(function(k) {
				var me = d.scan.discovered[k];
				tablecontent += "<tr class='ssidrow' ssid='"+encodeURIComponent(k).replace(/'/g, "&apos;")+"'><td class='bssid'>"+k+"</td>";
				tablecontent += "<td class='auth'>"+me.authtype+"</td>";
				tablecontent += "<td class='siqquality'>"+me.sigquality+"</td>";
				tablecontent += "<td class='channel'>"+me.channel+"</td>";
				// If authtype is WEP, we can't reliably connect.
				if (me.authtype == "WEP") {
					tablecontent += "<td class='connect'></td>";
				} else {
					tablecontent += "<td class='connect'><button type='button' class='btn btn-default connectbtn pull-right' data-ssid='"+encodeURIComponent(k).replace(/'/g, "&apos;")+"'>Connect</button></td>";
				}
				tablecontent += "</tr>";
			});
			$("tbody", "#scantable").html(tablecontent);
		},
		stop_wpalog: function() {
			if (typeof window.Network.wifi.wpalog_timeout != "boolean") {
				clearTimeout(window.Network.wifi.wpalog_timeout);
			}
		},
		start_wpalog: function() {
			$.ajax({
				url: window.FreePBX.ajaxurl,
				data: { module: "sysadmin", command: "getwpainfo" },
				success: window.Network.wifi.render_wpalog,
				complete: function() {
					window.Network.wifi.wpalog_timeout = window.setTimeout(window.Network.wifi.start_wpalog, 500);
				},
			});
		},
		render_wpalog: function(d) {
			var t = "";
			var lines = d.wpalog.length;
			for (var i = 0; i < lines; i++) {
				t += d.wpalog[i]+"\n";
			}
			$("#wifistatus").html(t);
			$("#statustext").text(d.status.output);
			// If the last line has 'CTRL-EVENT-CONNECTED' in it, *and* the user has already
			// pushed the connect button, then we can close.
			console.log("Trying to match...", d.wpalog[lines-1]);
			if (d.wpalog[lines-1].match(/CTRL-EVENT-CONNECTED/)) {
				// Has user alread pushed connect?
				if (window.Network.wifi.waiting_for_conn) {
					window.Network.wifi.waiting_for_conn = false;
					window.Network.wifi.force_scan_refresh = true;
					$("#wificonnectmodal").modal('hide');
				}
			}
		},
	},
});


function connect_btn_clicked(e) {
	// I can't use an id, as jquery gets confused with uriencoded IDs,
	// so I'm using a CSS3 selector instead. Sorry IE9.
	var ssid=$(e.target).data('ssid');
	var tr = $('.ssidrow[ssid="'+ssid+'"]');
	var sec = tr.find('.auth').text();
	$("#modalssid").val(decodeURIComponent(ssid));
	$("#modalsecurity").val(sec);
	if (sec === "Open") {
		$("#modalpass").attr('disabled', true).val("").prop('placeholder', _("No Passphrase Required"));
	} else {
		$("#modalpass").attr('disabled', false).val("").prop('placeholder', _("Enter Network Passphrase"));
	}
	$("#wificonnectmodal").modal();
	window.Network.wifi.waiting_for_conn = true;
}

function join_btn_clicked() {
	var ssid = $("#modalssid").val();
	var sec = $("#modalsecurity").val();
	var pass = $("#modalpass").val();

	if (pass.length < 4 && sec != "Open") {
		// Invalid password
		$("#wifistatus").text(_("Passphrase too short"));
		$("#modalpass").addClass('pulsebg').focus();
		window.setTimeout(function() { $("#modalpass").removeClass("pulsebg"); }, 2000);
		return;
	}
	// Now we can try to connect
	console.log("Want to join ssid "+ssid+" which is "+sec+" with "+pass);
	var req = { module: 'sysadmin', command: 'joinwifinetwork', ssid: ssid, pass: pass };
	$.ajax({
		url: window.ajaxurl,
		data: req,
		success: function(data) { console.log(data); }
	});
}

function render_wifi_netconf(d) {
	var netconf = d.netconf;
	if (typeof netconf == "undefined") {
		netconf = {};
	}
	// If we don't have a BOOTPROTO, or, it's none...
	if (typeof netconf.BOOTPROTO == "undefined" || netconf.BOOTPROTO.toLowerCase() == "none") {
		$("#wifi-bootproto-none").attr('checked',true);
	} else if (netconf.BOOTPROTO.toLowerCase() == "static") {
		$("#wifi-bootproto-static").attr('checked',true);
	} else if (netconf.BOOTPROTO.toLowerCase() == "dhcp") {
		$("#wifi-bootproto-dhcp").attr('checked',true);
	} else {
		// Dunno what it is. It's unconfigured.
		$("#wifi-bootproto-none").attr('checked',true);
	}

	if (typeof netconf.IPADDR == "undefined" || netconf.IPADDR.length == 0) {
		$("#wifi-staticip").attr("disabled", false).val("");
	} else {
		$("#wifi-staticip").attr("disabled", false).val(netconf.IPADDR);
	}

	if (typeof netconf.NETMASK == "undefined" || netconf.NETMASK.length == 0) {
		$("#wifi-netmask").attr("disabled", false).val("");
	} else {
		$("#wifi-netmask").attr("disabled", false).val(netconf.NETMASK);
	}

	if (typeof netconf.GATEWAY == "undefined" || netconf.GATEWAY.length == 0) {
		$("#wifi-gateway").attr("disabled", false).val("");
	} else {
		$("#wifi-gateway").attr("disabled", false).val(netconf.GATEWAY);
	}



}

function render_wifi_baseconf(d) {
	var conf = { ssid: "", pass: ""};
	if (typeof d.scan.config.networks != "undefined" && typeof d.scan.config.networks[0] != "undefined") {
		conf = d.scan.config.networks[0];
	}
	var doupdate = false;
	// We only want to update:
	// 1. If we're disabled (Eg, page load)
	// or
	// 2. Our SSID is empty, and it shouldn't be.
	if ($("#ssid").attr('disabled')) {
		doupdate = true;
	} else if ($("#ssid").val().length == 0 && conf.ssid.length != 0) {
		doupdate = true;
	}

	if (doupdate) {
		$("#ssid").attr('disabled', false).val(conf.ssid);
		$("#wifipass").attr('disabled', false).val(conf.pass);
	}
}

$(document).ready(function() {
	window.Network = new NetworkC();
});
