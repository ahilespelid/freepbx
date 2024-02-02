
function show_checking_for_updates_page() {
	$("#checking_for_updates").removeClass('hidden');
	$("#show_updates").addClass('hidden');
	$("#show_error").addClass('hidden');
}

function show_updates_page() {
	$("#checking_for_updates").addClass('hidden');
	$("#show_updates").removeClass('hidden');
	$("#show_error").addClass('hidden');
}

function show_error_page() {
	$("#checking_for_updates").addClass('hidden');
	$("#show_updates").addClass('hidden');
	$("#show_error").removeClass('hidden');
}

function install_branding() {
	show_checking_for_updates_page();

	// When we kill apache out from under a script that is expecting a response,
	// Chrome never tells the script that the connection has gone away. Basically,
	// we're now haivng to make a guess how long it's going to take FreePBX to
	// download and install the oembranding module. There are several factors
	// beyond our control here such as download speed, so we set a 75 second
	// timeout and hope for the best!
	$.ajax({
		url: 'ajax.php?module=sysadmin&command=installbranding',
		timeout: 75000,
	}).success(function () {
		submitForm();
	}).fail(function (d) {
		 // We're only expecting errors, so ignore all
		d.suppresserrors = true; // hopefully turns off toast messages
		console.error('ajax', d);

		if (d.responseJSON && d.responseJSON.error.message === 'Failed to restart apache.') {
			show_error_page();
		} else {
			submitForm();
		}
	});
}

function submitForm() {
	var updatedUrlPort = $("#updateUrlPort").val();
	if (updatedUrlPort) {
		var updatedActionUrl = new URI(window.location.href).search('').port(updatedUrlPort);
		$('form').attr('action', updatedActionUrl);
		show_updates_page();
		$("#updateForm").submit();
	} else {
		$("#updateForm").submit();
	}
}

$(document).ready(function () {
	var updated_dialog = $("#updatedialog");

	if(updated_dialog.length) {
		updated_dialog.modal({
			"keyboard": false,
			"resizable": false,
			"modal": true,
			"height": 325,
		});

		updated_dialog.modal("show");
	}

	install_branding();

	$("#retrybutton").click(function () {
		install_branding();
	});	
});
