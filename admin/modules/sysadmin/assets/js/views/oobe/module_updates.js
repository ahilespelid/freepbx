var sysadmin_request_module_updates = {};

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

	check_for_updates();
});

function show_checking_for_updates_page() {
	$("#checking_for_updates").removeClass('hidden');
	$("#show_updates").addClass('hidden');
}

function show_updates_page() {
	$("#checking_for_updates").addClass('hidden');
	$("#show_updates").removeClass('hidden');
}

function check_for_updates() {
	show_checking_for_updates_page();
	$.get('ajax.php?module=sysadmin&command=getavailableupdates').then(function (updates) {
		var number_of_updates = Object.keys(updates).length;

		// If 0 updates available, let's go ahead and skip the updates
		if (number_of_updates === 0) {
			$("form").first().submit();
			return;
		}

		$("#number_of_updates").text('There are ' + number_of_updates + ' updates available!');

		var moduleList = $('#module_list');
		moduleList.html('');
		$.each(updates, function() {
			var liText = this.descr_name + ' from ' + this.local_version
				+ ' to ' + this.online_version;
			var li = $('<li/>')
				.html( liText )
				.appendTo(moduleList);

			sysadmin_request_module_updates[this.name] = {
				action: "upgrade",
				track: this.track,
				version: this.online_version,
			}
		});

		show_updates_page();
	});

	$('#updatebutton').click(function () {
		$("#updatedialog").modal("hide");
		process_module_actions(sysadmin_request_module_updates);
	});
}

function close_module_actions() {
	check_for_updates();
	$('#moduledialogwrapper').dialog('close');
	$("#updatedialog").modal("show");
}

function process_module_actions(modules) {
	var urlStr = '';
	if(!jQuery.isEmptyObject(modules)) {
		urlStr = "config.php?display=modules&action=process&quietmode=1&online=1";
		content_data = $.param( {"modules":modules} )
	}
	$('#moduledialogwrapper').dialog({
		title: 'Status',
		resizable: false,
		modal: true,
		width: 410,
		height: 325,
		keyboard: false,
		open: function (e) {
			$('#moduledialogwrapper').html(_('Loading..' ) + '<i class="fa fa-spinner fa-spin fa-2x">');
			var xhr = new XMLHttpRequest(),
				timer = null;
			xhr.open('POST', urlStr, true);
			xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			xhr.send(content_data);
			timer = window.setInterval(function() {
				if (xhr.readyState == XMLHttpRequest.DONE) {
					window.clearTimeout(timer);
				}
				if (xhr.responseText.length > 0) {
					if ($('#moduledialogwrapper').html().trim() != xhr.responseText.trim()) {
						$('#moduledialogwrapper').html(xhr.responseText);
						$('#moduleprogress').scrollTop(1E10);
					}
				}
				if (xhr.readyState == XMLHttpRequest.DONE) {
					$('#moduleprogress').css("overflow", "auto");
					$('#moduleprogress').scrollTop(1E10);
					$('#moduleBoxContents a').focus();
				}
			}, 500);
		},
		close: function(e) {
			close_module_actions(true);
		}
	});
}