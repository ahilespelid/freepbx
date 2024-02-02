var testdid = '';
var tested = false;
$("#regexp-test-btn").click(function() {
	var did = prompt(_("Please enter an inbound DID"), testdid);
	if (did !== null) {
		testdid = did;
		$("#regexp-test").removeClass("hidden");
		$("#regexp-test pre").html(_("Loading..."));
		$.post( "ajax.php", {module: "sangomacrm", command: "driver", subcommand: "testregexp", regexp: $("#regexp").val(), preregexp: $("#preregexp").val(), number: did}, function( data ) {
			if(data.status) {
				$("#regexp-test pre").html(data.data);
			} else {
				$("#regexp-test pre").html(data.message);
			}
		}).fail(function() {
			$("#regexp-test").addClass("hidden");
		});
	} else {
		$("#regexp-test").addClass("hidden");
	}
});
$("#genkey").click(function(e) {
	e.preventDefault();
	e.stopPropagation();
	var t = $(this).text();
	$(this).text(_("Generating..."));
	$(this).prop("disabled",true);
	$.post("ajax.php",{module: "sangomacrm", command: "driver", subcommand: "gensshkeys"}, function(data) {
		if(data.status) {
			$("#pkey").val(data.public);
		} else {
			alert(data.message);
		}
		$("#genkey").text(t);
		$("#genkey").prop("disabled",false);
	});
});

$("input[name=recording_storage]").click(function() {
	if($("input[name=recording_storage]:checked").val() == "crm") {
		$(".crm-storage").removeClass("hidden");
	} else {
		$(".crm-storage").addClass("hidden");
	}
});

$("input[name=clientidtype]").click(function() {
	if($("input[name=clientidtype]:checked").val() == "customer") {
		$("input[name=clientid]").prop("readonly", false);
	} else {
		$("input[name=clientid]").prop("readonly", true);
	}
});

$("#testsshkey").click(function(e) {
	e.preventDefault();
	e.stopPropagation();
	var t = $(this).text();
	$(this).text(_("Testing..."));
	$(this).prop("disabled",true);
	$.post("ajax.php",{module: "sangomacrm", command: "driver", subcommand: "testsshkeys", username: $("#sshusername").val(), storage: $("#sshstorage").val()}, function(data) {
		if(data.status) {
			alert("Success!");
			tested = true;
		} else {
			alert(data.message);
		}
		$("#testsshkey").text(t);
		$("#testsshkey").prop("disabled",false);
	});
});

$('#url').blur(function(){
	if($('#url').length){
		var deferred = $.ajax({
  				dataType: "json",
  				url: 'ajax.php?module=sangomacrm&command=checkurl',
  				data: {url:$('#url').val()},
			});
			deferred.done(function(data){
				if(data.length === 0){
					$('#submit').prop('disabled', false);
					return true;
				}else{
					$('#submit').prop('disabled', true);
					data.forEach(
						function(mess){
							fpbxToast(mess);
						}
					);
				}
			});
		};
});

$(".fpbx-submit").submit(function() {
	if($("input[name=recording_storage]:checked").val() == "crm" && !tested && $('#type').val() == "Suitecrm") {
		alert(_("Please test the SSH connection by hitting 'Test Connection' before submitting this page"));
		$("#testsshkey").focus();
		return false;
	}
	if($("#type").val() === "") {
		return warnInvalid($("#type"),_("Please select a valid CRM Type"));
	}
	if($('#type').val() == "Connectwise" && $("input[name=clientidtype]:checked").val() == "customer" && $('input[name=clientid]').val() == "") {
		return warnInvalid($("input[name=clientid]"),_("Please Insert Client Id"));
	}
});
$( document ).ready(function() {
	$("input[name=clientid]").prop("readonly", true);
	if($("input[name=clientidtype]:checked").val() == "customer") {
		$("input[name=clientid]").prop("readonly", false);
	}
	if($('#url').length){
		if($('#url').val().length === 0){
			$('#submit').prop('disabled', true);
		}
	}
	$(document).on('change','#type',function(){
		if($("#type").val() === "" || ($("#type").val() !== "" && confirm(_('Changing CRM type might reset all of your settings. Is that okay?')))) {
			$(".fpbx-submit :input").prop("disabled", true);
			$("#type").prop("disabled", false);
			$.post("ajax.php",{module: "sangomacrm", command: "resetsettings"}, function(data) {
				if(data.status) {
					$(".fpbx-submit").submit();
				} else {
					alert('Error!!');
				}
		       });

		} else {
			$("#type").val($("#type").data('driver'));
		}
		$('#submit').prop('disabled', ($("#type").val() === ""));
	});
	if($('#floating-nav-bar > button > i').length > 0){
		$('#floating-nav-bar > button > i').removeClass('fa-list');
		$('#floating-nav-bar > button > i').addClass('fa-info-circle');
	}
});

$("input[name=configured_crm]").change(function () {
	let crmZipName = 'suitecrm.zip';
	let driver = 'suitecrm';
	if ($("input[name=configured_crm]:checked").val() == "sugar") {
		$('#version_dropdown').show();
		driver = 'sugarcrm';
		$("label[for=download]").text(_("SugarCRM Module Download"));
		if (parseInt($('#crm_version').val()) >= 8) {
			crmZipName = 'sugarcrm_v8.zip';
		} else {
			crmZipName = 'sugarcrm.zip';
		}
	} else {
		$('#version_dropdown').hide();
		driver = 'suitecrm';
		$("label[for=download]").text(_("SuiteCRM Module Download"));
	}
	$('.download_link').attr('href', `ajax.php?module=sangomacrm&command=driver&subcommand=downloadcrmmod&package=${crmZipName}&driver=${driver}`)
});

$("#crm_version").change(function () {
	let crmZipName = 'suitecrm.zip';
	let driver = 'suitecrm';
	if ($("input[name=configured_crm]:checked").val() == "sugar") {
		driver = 'sugarcrm';
		if (parseInt($('#crm_version').val()) >= 8) {
			crmZipName = 'sugarcrm_v8.zip';
		} else {
			crmZipName = 'sugarcrm.zip';
		}
	} else {
		driver = 'suitecrm';
	}
	$('.download_link').attr('href', `ajax.php?module=sangomacrm&command=driver&subcommand=downloadcrmmod&package=${crmZipName}&driver=${driver}`)
});
