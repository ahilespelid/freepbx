var deleteClients = [];
$(".btn-remove").click(function() {
	var type = $(this).data("type"), btn = $(this), section = $(this).data("section");
	var chosen = $("#table-"+section).bootstrapTable("getSelections");
	$(chosen).each(function(){
		deleteClients.push(this['id']);
	});
	if(confirm(sprintf(_("Are you sure you wish to delete these %s?"),type))) {
		btn.find("span").text(_("Deleting..."));
		btn.prop("disabled", true);
		$.post( "ajax.php", {command: "deletevpnclients", module: "sysadmin", clients: deleteClients, type: type}, function(data) {
			if(data.status) {
				btn.find("span").text(_("Delete"));
				$("#table-"+section).bootstrapTable('remove', {
					field: "id",
					values: deleteClients
				});
			} else {
				btn.find("span").text(_("Delete"));
				btn.prop("disabled", true);
				alert(data.message);
			}
		});
	}
});

//Trashcan Action
$(document).on("click", 'a[id^="del"]',function(){
	var cmessage = _("Are you sure you want to delete this client?");
	if(!confirm(cmessage)){
		return false;
	}
	var uid = $(this).data('uid');
	var row = $('#row'+uid);
	$.ajax({
		url: "/admin/ajax.php",
		data: {
			module:'sysadmin',
			command:'deletevpnclient',
			id:uid
		},
		type: "GET",
		dataType: "json",
		success: function(data){
			if(data.status === true){
				row.fadeOut(2000,function(){
					$(this).remove();
				});
			}else{
				warnInvalid(row,data.message);
			}
		},
		error: function(xhr, status, e){
			console.dir(xhr);
			console.log(status);
			console.log(e);
		}
	});
});

$("table").on("page-change.bs.table", function () {
	$(".btn-remove").prop("disabled", true);
	deleteClients = [];
});

$("table").on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table', function () {
	var toolbar = $(this).data("toolbar"), button = $(toolbar).find(".btn-remove"), id = $(this).prop("id");
	button.prop('disabled', !$("#"+id).bootstrapTable('getSelections').length);
	deleteClients = $.map($("#"+id).bootstrapTable('getSelections'), function (row) {
		return row.extension;
  });
});

function rebuildCert(){
	$.ajax({
		url: window.ajaxurl,
		async: false,
		data: { command: 'rebuildCert', module: window.modulename, },
		success: function(data) {
			return true;
		},
	});
}

$(document).ready(function() {
	var hash = (window.location.hash != "") ? window.location.hash : "clients";
	if(hash == '#settings'){
		$('input[name="submit"]').removeClass('hidden');
	} else {
		$('input[name="submit"]').addClass('hidden');
	}

	$(".nav-tabs a[href="+hash+"]").tab('show');

	checkeasyrsarpm();

	// Save interface pops up the warning.
	$("#submit").click(function(e) {
		e.preventDefault();
		hasMatch = false;
		matchkey ='';
		var vpnport = $("#port").val();
		$.each(allusedports, function(key, value){
			if(key == vpnport){
				hasMatch = true;
				matchkey = value;
			}
		});
		if (hasMatch) {
			return warnInvalid(sysadminVPNserver.port, _("Port is  used for :"+matchkey));
		}
		else {
			$("#savechangesmodal").modal();
			return false;
		}
		return false;
	});

	$("#saveapply").click(function() {
		$("#savestatus").html(_("Processing. Please wait... ")+"<i class='fa fa-spinner fa-spin fa-2x'></i>");
		$('form').submit();
	});
});

$(document).on('show.bs.tab', 'a[data-toggle="tab"]', function (e) {
	var clicked = $(this).attr('href');
	switch(clicked){
		case '#settings':
			$('input[name="submit"]').removeClass('hidden');
		break;
		default:
			$('input[name="submit"]').addClass('hidden');
		break;
	}
});

function checkeasyrsarpm() {
	// If modulename isn't already defined...
	if (typeof(window.modulename) == 'undefined') {
		// This assumes the module name is the first param.
		window.modulename = window.location.search.split(/\?|&/)[1].split('=')[1];
	};

	$.ajax({
		url: window.ajaxurl,
		data: { command: 'geteasyrsarpmstatus', module: window.modulename, },
		success: function(data) {
			if (data.retry == true) {
				setTimeout(function() { checkeasyrsarpm() }, 500);
			}
			$("#errorstatus").html(data.message);
		},
	});
}
