var ipvalidatedone=true;
var sshvalidatedone=true;
function validateLanIpNeeded() {
	return ipvalidatedone;
}
function validateSshPortNeeded() {
	return sshvalidatedone;
}
function validateLanIp(previousip) {
	var currentip = $("#staticip").val();
	if(currentip != previousip) {
		var message = _("Vega GW will reboot automatically if there is change in static ip");
		message += "\r\n\r\n";
		message += _(" Are you sure to change Vega gateway ip and reboot immediately(on submit) ?");
		ret = confirm(message);
		if (!ret) {
			$("#staticip").val(previousip);
			return false;
		} else {
			previousip = currentip;
			ipvalidatedone=true;
			return true;
		}
	}
}

function validateSshport(previousssh) {
	var val = $("#sshport").val();
	if(val != previousssh) {
		var message = _("Due to changing SSH port, Vega GW will reboot automatically ");
		message += "\r\n\r\n";
		message += _(" Are you sure to change Vega gateway SSH port and reboot immediately(on submit) ?");
		ret = confirm(message);
		if (!ret) {
			$("#sshport").val(previousssh);
			return false;
		} else {
			previousssh = val;
			sshvalidatedone=true;
			return true;
		}
	}
}

