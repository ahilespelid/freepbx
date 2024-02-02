var deleteExts = [];
$("#table-all").on("page-change.bs.table", function () {
	$("#remove-all").prop("disabled", true);
	deleteExts = [];
});
$("#table-all").on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table', function () {
	var toolbar = $(this).data("toolbar"), button = $("#remove-all"), id = $(this).prop("id");
	button.prop('disabled', !$("#"+id).bootstrapTable('getSelections').length);
	deleteExts = $.map($("#"+id).bootstrapTable('getSelections'), function (row) {
		return row.id;
	});
});
$("#table-mobileTokens-all").on("post-body.bs.table", function () {
	$(".sendTestNotification").click(function() {
		var id = $(this).data("user-id");
		fpbxToast("Sending Notification Please wait...");
		setTimeout(function() {
			$.post( "ajax.php", {command: "testnotification", module: "zulu", uid: id}, function(data) {
				if(data.status) {
					fpbxToast("Notification sent successfully!!","Success","success")
				} else {
					fpbxToast(data.message,"Error","error");
				}
			})
		},500)
	});
  $(".sendInvitePush").click(function() {
		var id = $(this).data("user-id");
		fpbxToast("Sending Notification Please wait...");
		setTimeout(function() {
			$.post( "ajax.php", {command: "sendInvitePush", module: "zulu", uid: id}, function(data) {
				if(data.status) {
					fpbxToast("Echo test call sent successfully!!","Success","success")
				} else {
					fpbxToast(data.message,"Error","error");
				}
			})
		},500)
	});
	$(".deleteMobileTokens").click(function() {
		if(confirm(_("Are you sure you wish to delete the user's mobile tokens?"))) {
			var id = $(this).data("user-id");
			$.post("ajax.php", { command: "deleteMobileTokens", module: "zulu", uid: id }, function (data) {
				if (data.status) {
					fpbxToast(_("Mobile token deleted!!", "Success", "success"))
					$("#table-mobileTokens-all").bootstrapTable('refresh')
				} else {
					fpbxToast(data.message, "Error", "error")
				}
			})
		}
  })
	$(".getLogs").click(function() {
		var id = $(this).data("user-id");
		var name = $(this).data("user-name");
		fpbxToast("Getting logs please wait...");
		setTimeout(function() {
			$.post( "ajax.php", {command: "getlogs", module: "zulu", uid: id}, function(data) {
				$('#viewLogs').empty();
				if(data.status) {
					let display = false;
					$.each(data.body, function(index, value) {
						if(Object.keys(value.data).length !== 0){
							display = true;
							let device = Object.keys(value.data)[0];
							let token = Object.keys(value.data[device])[0];
							$('#viewLogs').append('<h2>Device: '+device+'</h2>');
							let table = '<table class="table table-striped ext-list">' +
								'<thead>' +
									'<tr>' +
										'<th><div class="th-inner sortable both">Date Time</div><div class="fht-cell"></div></th>' +
										'<th><div class="th-inner sortable both">Title</div><div class="fht-cell"></div></th>' +
										'<th><div class="th-inner sortable both">Action</div><div class="fht-cell"></div></th>' +
										'<th><div class="th-inner sortable both">Status</div><div class="fht-cell"></div></th>' +
										'<th><div class="th-inner sortable both">Reason</div><div class="fht-cell"></div></th>' +
									'</tr>' +
								'</thead>' +
								'<tbody>';
							$.each(value.data[device][token], function(key, logs) {
								table += '<tr>' +
									'<td>' + logs.datetime + '</td>' +
									'<td>' + logs.data.title + '</td>' +
									'<td>' + logs.data.action + '</td>' +
									'<td>' + logs.data.status + '</td>' +
									'<td>' + logs.data.reason + '</td>' +
									'</tr>';
							});
							table += '</tbody></table>';
							$('#viewLogs').append(table);
						}
					});
					if(display) {
						$('#viewLogs').css('display','');
						$('#viewLogs').dialog({
							autoOpen: true,
							title: name,
							show: "blind",
							hide: "explode",
							modal: true,
							width: 1000,
							height: 500
						});
					} else {
						fpbxToast("There is no log data for those mobile tokens","Success","success")
					}
				} else {
					fpbxToast(data.error,"Error","error");
				}
			})
		},500)
	});
});

var disconnectSessions = [];
$("#table-session-all").on("page-change.bs.table", function () {
	$("#remove-session-all").prop("disabled", true);
	disconnectSessions = [];
});
$("#table-session-all").on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table', function () {
	var toolbar = $(this).data("toolbar"), button = $("#remove-session-all"), id = $(this).prop("id");
	button.prop('disabled', !$("#"+id).bootstrapTable('getSelections').length);
	disconnectSessions = $.map($("#"+id).bootstrapTable('getSelections'), function (row) {
		return row.websocket_session;
	});
});
$("#resetZulu").click(function() {
	if(confirm(_("This will reset and disconnect all Zulu users. Are you sure?"))) {
		var oldText = $(this).text();
		$(this).text(_("Resetting..."));
		$(this).prop("disabled",true);
		$.post( "ajax.php", {command: "reset", module: "zulu"}, function(data) {
			$("#table-session-all").bootstrapTable('refresh');
			location.reload();
		})
		.always(function() {
			$(this).text(oldText);
			$(this).prop("disabled",false);
		});
	}
})

$("#remove-all").click(function() {
	var btn = $(this);
	if(confirm(_("Are you sure you wish to remove these users from Zulu?"))) {
		btn.find("span").text(_("Removing..."));
		btn.prop("disabled", true);
		$.post( "ajax.php", {command: "remove", module: "zulu", users: deleteExts}, function(data) {
			if(data.status) {
				btn.find("span").text(_("Delete"));
				$("#table-all").bootstrapTable('remove', {
					field: "id",
					values: deleteExts
				});
				deleteExts = [];
				toggle_reload_button("show");
				$("#header-message").html(data.header);
			} else {
				btn.find("span").text(_("Delete"));
				btn.prop("disabled", true);
				alert(data.message);
			}
		});
	}
});

$("#remove-session-all").click(function() {
	var btn = $(this);
	if(confirm(_("Are you sure you wish to disconnect this session from Zulu?"))) {
		btn.find("span").text(_("Disconnecting..."));
		btn.prop("disabled", true);
		$.post( "ajax.php", {command: "disconnect", module: "zulu", sessions: disconnectSessions}, function(data) {
			if(data.status) {
				btn.find("span").text(_("Disconnect"));
				$("#table-session-all").bootstrapTable('refresh');
				disconnectSessions = [];
				$("#header-message").html(data.header);
			} else {
				btn.find("span").text(_("Disconnect"));
				btn.prop("disabled", true);
				alert(data.message);
			}
		});
	}
});

var closeRooms = [];
$("#table-rooms-all").on("page-change.bs.table", function () {
	$("#close-rooms-all").prop("disabled", true);
	closeRooms = [];
});
$("#table-rooms-all").on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table', function () {
	var toolbar = $(this).data("toolbar"), button = $("#close-rooms-all"), id = $(this).prop("id");
	button.prop('disabled', !$("#"+id).bootstrapTable('getSelections').length);
	closeRooms = $.map($("#"+id).bootstrapTable('getSelections'), function (row) {
		return row.id;
	});
});
$("#close-rooms-all").click(function() {
	var btn = $(this);
	if(confirm(_("Are you sure you wish to close the selected rooms?"))) {
		btn.find("span").text(_("Closing..."));
		btn.prop("disabled", true);
		$.post( "ajax.php", {command: "closeRooms", module: "zulu", rooms: closeRooms}, function(data) {
			if(data.status) {
				btn.find("span").text(_("Close"));
				$("#table-rooms-all").bootstrapTable('refresh');
				closeRooms = [];
			} else {
				btn.find("span").text(_("Close"));
				btn.prop("disabled", true);
				alert(data.message);
			}
		});
	}
});


function userActions(table, row) {
	return '<a href="?display=userman&action=showuser&user='+row.id+'"><i class="fa fa-edit"></i></a>';
}

function tokenActions(table, row) {
	return '' +
		'<a class="clickable getLogs" data-user-id='+row.id+' data-user-name='+row.username+'><i class="fa fa-file" title="Logs"></i></a>' +
		'<a class="clickable sendTestNotification" data-user-id='+row.id+'><i class="fa fa-circle-thin" title="Test"></i></a>' +
		'<a class="clickable sendInvitePush" data-user-id='+row.id+'><i class="fa fa-phone" title="Call echo test"></i></a>' +
		'<a class="clickable deleteMobileTokens" data-user-id='+row.id+'><i class="fa fa-trash" title="Delete""></i></a>';
}
