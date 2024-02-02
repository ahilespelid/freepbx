

//put all document ready stuff here... One listener to rule them all
$(document).ready(function () {
	var skip = false;
$(function() {
	$("#previousBtn").click(function() {
		$("#syncwizard").smartWizard('goBackward');
	});
	$("#nextBtn").click(function() {
		$("#syncwizard").smartWizard('goForward');
	});
	
	$('#syncwizard').smartWizard({
		includeFinishButton: false,
		onLeaveStep: function(obj, context) {
			switch(context.fromStep) {
				case 1:
					if($("#primaryip").val() == '' && $("#primaryip").val().trim() === "") {
						$("#primaryip").focus();
						alert("Please provide a Primary Server IP");
						return false;
					} else if (!confirm('Please confirm the primary server IP :'+$("#primaryip").val())) {
						return false;
					}
				break;
				case 2:
					$("#runModal .modal-body .body").html("Submitting data to servers...");
				return true;
			}
			return true;
		},
		onShowStep: function(obj, context) {
			$("#syncwizard .actionBar").addClass("hidden");
			$("#switchBtn").addClass("hidden");
			$("#skipsync").addClass("hidden");
			$("#Sync").addClass("hidden");
			$("#previousBtn").addClass("hidden");
			switch(context.fromStep) {
				case 1:
					if($("#primaryip").val() !=''){
						$("#previousBtn").addClass("hidden");
						$("#nextBtn").addClass("hidden");
						$("#switchBtn").addClass("hidden");
					}
				break;
			case 2: 
					$("#previousBtn").removeClass("hidden");
					$("#nextBtn").removeClass("hidden");
					$("#skipsync").removeClass("hidden");
					$("#switchBtn").addClass("hidden");					
			break;
			case 3: 
					$("#previousBtn").addClass("hidden");
					$("#skipsync").addClass("hidden");
					$("#nextBtn").addClass("hidden");
				break;

			}
			if(context.toStep == 1) {
				$("#previousBtn").addClass("hidden");
				$("#nextBtn").removeClass("hidden");
				$("#skipsync").addClass("hidden");
				$("#Sync").addClass("hidden");
			} else if(context.toStep == 2) {
				$("#previousBtn").removeClass("hidden");
				$("#skipsync").removeClass("hidden");
				$("#Sync").removeClass("hidden");
			}else if(context.toStep == 3) {
				$("#switchBtn").removeClass("hidden");
				$("#previousBtn").prop("disabled", true);
				$("#nextBtn").addClass("hidden");
				$("#skipsync").addClass("hidden");
			} else {
				$("#previousBtn").prop("disabled", false);
			}
		},
		onFinish: function(obj) {
			return false;
		}
	});
	$("#skipsync").click(function() {
		if (confirm('Are you sure to Switch over with Out syncing the Data ?')) {
			$("#syncwizard").smartWizard('goForward');
			if($("#primaryip").val() !=''){
				$("#previousBtn").addClass("hidden");
				$("#nextBtn").addClass("hidden");
				$("#switchBtn").addClass("hidden");
				$("#syncwizard").smartWizard('goForward');
				$.post( "ajax.php?module=adv_recovery&command=nosyncback",{primaryip: $("#primaryip").val()}, function( data ) {
				if(data.continue) {
					$("#close-button").addClass("hidden");
					$("#syncwizard .actionBar").addClass("hidden");
					$("#syncwizard .buttonPrevious").addClass("buttonDisabled hidden");
					$("#syncwizard .buttonNext").addClass("buttonDisabled hidden");
				}
			}).fail(function() {
				$("#runModal .modal-body .body").html("ERRORS");
			});
		}else {
			alert("Primary Server Ip not provided");
		}
	}
	});
	$("#Sync").click(function() {
		if($("#primaryip").val() !=''){
			$("#previousBtn").addClass("hidden");
			$("#nextBtn").addClass("hidden");
			$("#switchBtn").addClass("hidden");
			$('#Sync').prop('disabled', true);
			$('#skipsync').prop('disabled', true);
			$("#runModal .modal-body .body").html("Submitting data to servers...");
			$.post( "ajax.php?module=adv_recovery&command=syncback",{primaryip: $("#primaryip").val()}, function( data ) {
					if(data.continue) {
						$("#runModal .modal-body .body").html(html + "Done</br>");
						$("#close-button").addClass("hidden");
						$("#syncwizard .actionBar").addClass("hidden");
						$("#syncwizard .buttonPrevious").addClass("buttonDisabled hidden");
						$("#syncwizard .buttonNext").addClass("buttonDisabled hidden");
						getsysncbackStatus('syncbackstatus', data.transaction, data.pid);;
					} else {
						$("#runModal .modal-body .body").html("Status:" + data.message);
						getsysncbackStatus( 'syncbackstatus',data.transaction, data.pid);
					}
				}).fail(function() {
					$("#runModal .modal-body .body").html("ERRORS");
				});
		}else {
			alert("Primary Server Ip not provided");
		}
	});

	$("#switchBtn").click(function() {
		if (confirm('Are you sure to switch back the services to Primary?')) {
			$('#switchBtn').prop('disabled', true);
			$("#switchservice").text(_("Please wait while we switch back the services."));
			$.post("ajax.php?module=adv_recovery", { command: 'switchover'}, function(data){
				console.log(data);
				if (data.status) {
					alert(data.message);
					$("#switchmsg").addClass("hidden");
					$("#switchBtn").addClass("hidden");
					$('#switchBtn').prop('disabled', false);
					$('#switchservice').prop('disabled', true);
					$("#runModal .modal-body .body").html(data.message);
					$("#switchservice").html(_("Services switched back to Primary Server.<br>Please reconfigure your Primary Server's Adv_recovery module.<br>'fwconsole restart' command has run on the Primary Server. So services may not be ready yet."));
					$("#refreshBtn").removeClass("hidden");
				}else {			
					alert(data.message);
				}
			});
		}
	});
	
	$("#refreshBtn").click(function() {
		$(this).text("Refreshing....");
		$(this).prop("disabled", true);
		window.location = 'config.php?display=adv_recovery';
	});

	setTimeout(function () {
		$('#sync_items').val(JSON.stringify(processItems(undefined, {})));
		$('#sync_modules').text(_("Modules (" + $('#syncmodules').bootstrapTable('getSelections').length + ')'));
	}, 1000);

});

	$('#switchservice').click(function() {
		if (confirm('Are you sure to Switch back the Service to Primary? Please ensure that the Primary Server is up and running and all the necessary requirements are met. Switching back to an un healthy server will result in service failure!')) {
			$('#switchservice').prop('disabled', true);
			$.post("ajax.php?module=adv_recovery", { command: 'switchover'}, function(data){
				console.log(data);
				if (data.status) {
					alert(data.message);
					$('#switchservice').prop('disabled', true);
					window.location.href = window.location.href;
				}else {			
					alert(data.message);
				}
			});
		}
	});
	$("#frefreshBtn").click(function() {
		$(this).text("Refreshing....");
		$(this).prop("disabled", true);
		window.location = 'config.php?display=adv_recovery';
	});
	// any checks to add on ready state
	$('#syncnow').click(function() {
		if (confirm('Are you sure to initiate the configuration sync now ?')) {
			$("#runlogModel .modal-body .body").html("Data Sync is Running now...");
			$.post("ajax.php?module=adv_recovery", { command: 'sync'}, function(data){
				if(data.status==false){
					alert(data.message);
					return;
				}
				if(data.continue) {
					$('#runlogModel').modal('show');
					$("#runlogModel .modal-body .body").html(html + "Done</br>");
					$("#close-button").addClass("hidden");
					getsysncnowStatus('syncnowstatus', data.transaction, data.pid);;
				} else {
					$('#runlogModel').modal('show');
					$("#runlogModel .modal-body .body").html("Status:" + data.message);
					getsysncnowStatus('syncnowstatus', data.transaction, data.pid);						
				}
			}).fail(function() {
				$("#runlogModel .modal-body .body").html("ERRORS");		
			});
		}
	});
	//call notification related JS
	handle_callnotif();
	$("#step-2").hide();
	$("#step-3").hide();
	$("#filestorediv").hide();
	$("#connectingsecondary").hide();
	$( "#primaryserver" ).change(function() {
		var ip = $( "#primaryserver" ).val();
		var url = window.location.href;
		var arr = url.split("/");
		var protocol = arr[0];
		var port = location.port;
			if(port == ''){
				var tokenurl = protocol+"//"+ip+"/admin/api/api/token";
				var gqlurl = protocol+"//"+ip+"/admin/api/api/gql";
			} else {
				var tokenurl = protocol+"//"+ip+":"+port+"/admin/api/api/token";
				var gqlurl = protocol+"//"+ip+":"+port+"/admin/api/api/gql";
			}
			$("#primary_remoteapi_gql").val(gqlurl);
			$("#primary_remoteapi_accesstokenurl").val(tokenurl);
	});
	$( "#secondaryserverip" ).change(function() {
		var ip = $( "#secondaryserverip" ).val();
		var url = window.location.href;
		var arr = url.split("/");
		var protocol = arr[0];
		var port = location.port;
			if(port == ''){
				var tokenurl = protocol+"//"+ip+"/admin/api/api/token";
				var gqlurl = protocol+"//"+ip+"/admin/api/api/gql";
			} else {
				var tokenurl = protocol+"//"+ip+":"+port+"/admin/api/api/token";
				var gqlurl = protocol+"//"+ip+":"+port+"/admin/api/api/gql";
			}
			$("#warmspare_remoteapi_gql").val(gqlurl);
			$("#warmspare_remoteapi_accesstokenurl").val(tokenurl);
	});
	$('#wizard').smartWizard({
		keyNavigation: false,
		onLeaveStep: function(obj, context) {
			switch(context.toStep) {
				case 1:
					$(".server-div").show();
					$("#Settings").hide();
					$("#syncdiv").hide();
					$("#Notification").hide();
					break;
				case 2:
					if ($("#secondaryserverip").val().trim() == "" && context.fromStep == '1') {
						warnInvalid($("#secondaryserverip"),_("Please select the Secondary Server OR enter the IP address!")); 
						return false;
					}
					$(".server-div").hide();
					$("#Settings").hide();
					$("#syncdiv").show();
					$("#Notification").hide();
					break;
				case 3:
					$(".server-div").hide();
					$("#Settings").show();
					$("#syncdiv").hide();
					$("#Notification").hide();
					break;
				case 4:
					$(".server-div").hide();
					$("#Settings").hide();
					$("#syncdiv").hide();
					$("#Notification").show();
					break;
				default:
				break;
			}
			switch (context.fromStep) {
			case 1: //select server step
			{
				 $("#connectingsecondary").show();
				 $("#Settings").hide();
				 $("#syncdiv").hide();
				 $('#quickadd .buttonFinish').addClass("buttonDisabled");
				 $.post("ajax.php?module=adv_recovery", { command: 'genapiandfilestore', serverip: $("#secondaryserverip").val(), warmspare_remoteapi_gql: $("#warmspare_remoteapi_gql").val(), warmspare_remoteapi_accesstokenurl: $("#warmspare_remoteapi_accesstokenurl").val() }, function(data){
						console.log(data);
						if (data.status) {
							$('#warmspare_remoteapi_filestoreid').append(`<option value="${data.filestoreid}">Adv_recovery_Secondary_server</option>`); 
							$("#warmspare_remoteapi_filestoreid").val(data.filestoreid);
							//alert(data.msg);
							$("#connectingsecondary").hide();
							$("#Settings").hide();
							$("#syncdiv").show();
							$('#wizard').smartWizard('goToStep', 2);
							$('#step-2').attr('class', "selected");
							$("#step-2").show();
							//add API to form
							if(data.warmspare_remoteapi_accesstoken ==""){
								warnInvalid($("#warmspare_remoteapi_filestoreid"),_("There is some API connectivity issue !")); return false;
							};
							var client_id = "<input type=\"hidden\" name=\"warmspare_remoteapi_clientid\" value="+data.client_id+" >";
							var client_secret = "<input type=\"hidden\" name=\"warmspare_remoteapi_secret\" value="+data.client_secret+" >";
							var accesstoken = "<input type=\"hidden\" name=\"warmspare_remoteapi_accesstoken\" value="+data.warmspare_remoteapi_accesstoken+" >";
							$('#quickadd form').append(accesstoken);
							$('#quickadd form').append(client_id);
							$('#quickadd form').append(client_secret);
							$("#step-1").hide();
							$("#step-2").show();
						} else {
							$("#connectingsecondary").hide();
							alert(data.msg);
							$("#quickadd form")[0].reset();
							$('#wizard').smartWizard('goToStep', 1);
							$("#step-1").show();
							$('#step-1').attr('class', "selected");
							$("#step-2").hide();
							$("#step-3").hide();
							$("#step-4").hide();
							warnInvalid($("#warmspare_remoteapi_filestoreid"),_(data.msg)); return false;
					}
				});
			}
			break;
			case 2: 
			{
				if($("#backup_schedule").val().trim() == "") {warnInvalid($("#backup_schedule"),_("Please select the Sync Time!")); return false;};
				$('#step-3').attr('class', "selected");
				$("#step-1").hide();
				$("#step-2").hide();
				$("#step-3").show();
				$("#step-4").hide();
			}
			case 3: 
			{
				//$('#wizard').smartWizard('goToStep', 2);
				//if($("#crontime").val().trim() == "") {warnInvalid($("#crontime"),_("Please select the Sync Time!")); return false;};
				$('#step-3').attr('class', "selected");
				$("#step-1").hide();
				$("#step-2").hide();
				$("#step-3").show();
				$("#step-4").hide();
			}
			break;
			case 4:
			{	$('#step-4').attr('class', "selected");
				$("#step-1").hide();
				$("#step-2").hide();
				$("#step-3").hide();
				$("#step-4").show();
			}
			default:
			break;
			}
			return true;
		},
		onFinish: function(obj, context) {
			let backup_email = $("#backup_email").val().trim();
			if(!getValidateEmail(backup_email, 'onFinish')){ return false; }
			if( $("input[name='callnotification']:checked").val() == 'yes') {
						if($("#admin_extension").val().trim() == "") {warnInvalid($("#admin_extension"),_("Please Enter the Notification Extension")); return false;};
						if($("#admin_extension_voicefile").val().trim() == "") {warnInvalid($("#admin_extension_voicefile"),_("Please Select the Notification When Primary Fails")); return false;};
						if($("#admin_extension_voicefile_secondary_fails").val().trim() == "") {warnInvalid($("#admin_extension_voicefile_secondary_fails"),_("Please Select the Notification When Secondary Fails")); return false;};
				}
			$('#wizard').smartWizard('goToStep', 1);
			$('#quickadd form').submit();
			$("#quickadd").trigger("reset");
			$('#quickadd').modal('hide');
		},
		labelNext: 'Next',
		labelFinish: 'Configure',
	});

	// EPM config Popup
	$('#epm_popup').smartWizard({
		keyNavigation: false,
		hideButtonsOnDisabled: true,
		onFinish: function(obj, context) {
			if($("#brand").val().trim() == "") {warnInvalid($("#brand"),_("Please select the phone brand!")); return false;};
			if($("#template").val() === null) {warnInvalid($("#template"),_("Template can not be blank!")); return false;};
			if($("#spare_server_ip").val().trim() == "") {warnInvalid($("#spare_server_ip"),_("Spare Server IP can not be blank!")); return false;};
			$("#overlay").fadeIn(500);
			$.post("ajax.php?module=adv_recovery&command=regenepmconfig", { command: 'regenepmconfig', module: "adv_recovery", brand: $("#brand").val(), template: $("#template").val(), spare_server_ip: $("#spare_server_ip").val(), update_phone: $("input[name='update_phone']:checked").val() }, function(data){
				if(data) {
					//$('#epmconfig').modal('hide');
					setTimeout(function(){
						$("#overlay").fadeOut(300);
					},500);
					fpbxToast('Template Configured Sucessfully');
				} else {
					$('#epm_popup').smartWizard('showMessage',data.message);
					$('#epmconfig .buttonFinish').removeClass("buttonDisabled");
				}
			});
		},
		labelFinish: 'Regenerate',
	});
	
	
	toggle_trunkconfig();

	$('[name="auto_switch_service"]').change(function () {
		toggle_trunkconfig();
	});
});

function toggle_trunkconfig() {
	if($('#auto_switch_service_yes').is(':checked')) {
		$(".trunkconfig").slideDown();
	} else {
		$(".trunkconfig").slideUp();
	}
}

function handle_callnotif() {
	if ($("input[name='callnotification']:checked").val() == 'no') {
		$("#adminextdiv").hide()	
		$("#adminextpridiv").hide()	
		$("#adminextsecdiv").hide()	
	}

	$("input[name=callnotification]").change(function() {
		if ($("input[name='callnotification']:checked").val() == 'no') {
			$("#adminextdiv").hide()	
			$("#adminextpridiv").hide()	
			$("#adminextsecdiv").hide()	
		} else {
			$("#adminextdiv").show()	
			$("#adminextpridiv").show()	
			$("#adminextsecdiv").show()	
		}
	});
}

//end ready
var moduledisplaysetting = {};
$("#oauthbutton").click(function() {
	event.preventDefault();
	$.post(
		FreePBX.ajaxurl,
		{
			module: "adv_recovery",
			command: "accesstoken",
			warmspare_remoteapi_secret: $("#warmspare_remoteapi_secret").val(),
			warmspare_remoteapi_clientid: $("#warmspare_remoteapi_clientid").val(),
			warmspare_remoteapi_accesstokenurl: $("#warmspare_remoteapi_accesstokenurl").val()
		}
	).done(function(data) {
		if(data.status) {var msgjson  = JSON.stringify(data.message);
			var msgjsondec  = JSON.parse(data.message);
			fpbxToast('Access Token Received ');
			$('#warmspare_remoteapi_accesstoken').val(msgjsondec.access_token);
			$('#warmspare_remoteapi_accesstoken_expire').val(msgjsondec.expires_in);
		} else {
			if(data.msg) {
				fpbxToast(data.msg, _('Error'),'error');
			} else {
				fpbxToast('There was an error in Access token generation ','','error');
			}
		}
	});
})

//primary server submit button

$("#submit" ).click(function() {
	var admin_extension = $("#admin_extension").val().trim();
	if(admin_extension === "" && $("input[name='callnotification']:checked").val() == 'yes') {
		$("#admin_extension").focus();
		return warnInvalid($("#admin_extension"),_("Please select the admin Notification extension"));
	}
	var admin_extension_voicefile = $("#admin_extension_voicefile").val().trim();
	if(admin_extension_voicefile === "" && $("input[name='callnotification']:checked").val() == 'yes') {
		$("#admin_extension_voicefile").focus();
		return warnInvalid($("#admin_extension_voicefile"),_("Please select the admin Notification Recording When primary server fails"));
	}
	var admin_extension_voicefile_secondary_fails = $("#admin_extension_voicefile_secondary_fails").val().trim();
	if(admin_extension_voicefile_secondary_fails === "" && $("input[name='callnotification']:checked").val() == 'yes') {
		$("#admin_extension_voicefile_secondary_fails").focus();
		return warnInvalid($("#admin_extension_voicefile_secondary_fails"),_("Please select the admin Notification Recording When Spare server fails"));
	}
	var backup_email = $("#backup_email").val().trim();
	if(!getValidateEmail(backup_email)){ return false; }
	if($("#crontime").val() ==""){
		return warnInvalid($('input[name=crontime]'), _("Please Enter the Backup Sync Time"));
	}	
	var server_name = $("#warmspare_remoteapi_filestoreid").val().trim();
		if(server_name === "") {
			$("#warmspare_remoteapi_filestoreid").focus();
			return warnInvalid($("#warmspare_remoteapi_filestoreid"),_("You must select a valid  Spare Server"));
		}
		var server_accesstoken = $("#warmspare_remoteapi_accesstokenurl").val().trim();
		if(server_accesstoken === "") {
			$("#warmspare_remoteapi_accesstokenurl").focus();
			return warnInvalid($("#warmspare_remoteapi_accesstokenurl"),_("You must enter a valid  Spare Access Token URL"));
		}
		var server_clinetid = $("#warmspare_remoteapi_clientid").val().trim();
		if(server_clinetid === "") {
			$("#warmspare_remoteapi_clientid").focus();
			return warnInvalid($("#warmspare_remoteapi_clientid"),_("You must enter a valid  Spare Server API Client ID"));
		}
		var server_clinetserect = $("#warmspare_remoteapi_secret").val().trim();
		if(server_clinetserect === "") {
			$("#warmspare_remoteapi_secret").focus();
			return warnInvalid($("#warmspare_remoteapi_secret"),_("You must enter a valid  Spare Server API Client Secret"));
		}
		var server_graphql = $("#warmspare_remoteapi_gql").val().trim();
		if(server_graphql === "") {
			$("#warmspare_remoteapi_gql").focus();
			return warnInvalid($("#warmspare_remoteapi_gql"),_("You must enter a valid  Spare Server API GraphQL URL"));
		}
	if (!$('#syncmodules').bootstrapTable('getSelections').length) {
		alert(_("No module has selected for this sync. Please ensure you are selecting atleast Custom files"));
		return false;
	}

		fpbxToast('Validating the API credentials');
		$.post(
			FreePBX.ajaxurl,{
				module: "adv_recovery",
				command: "accesstoken",
				warmspare_remoteapi_secret: $("#warmspare_remoteapi_secret").val(),
				warmspare_remoteapi_clientid: $("#warmspare_remoteapi_clientid").val(),
				warmspare_remoteapi_accesstokenurl: $("#warmspare_remoteapi_accesstokenurl").val()
			}
			).done(function(data) {
				if(data.status) {
					var msgjson  = JSON.stringify(data.message);
					var msgjsondec  = JSON.parse(data.message);
					$('#warmspare_remoteapi_accesstoken').val(msgjsondec.access_token);
					$('#warmspare_remoteapi_accesstoken_expire').val(msgjsondec.expires_in);
					$("#updateprimary").submit();
				} else {
					fpbxToast('There was an error in Access token generation. Please check the API  credential','','error');
					return warnInvalid($("#warmspare_remoteapi_accesstoken_expire"),_("There was an error in Access token generation. Please check the API  credential"));
				}
			}).fail(function(){
				fpbxToast('Please check the API  credential','','error');
				$("#jscheckvalid").val("0");
				//TODO need handle this properly. by staying in the same page 
				return warnInvalid($("#warmspare_remoteapi_accesstoken"),_("Data Not SAVED"));
			});
			
		return false;
});

	
$( "#updateprspare" ).submit(function( event ) {
	
	var primary_remoteapi_accesstokenurl = $("#primary_remoteapi_accesstokenurl").val().trim();
	if(primary_remoteapi_accesstokenurl === "") {
		$("#primary_remoteapi_accesstokenurl").focus();
		return warnInvalid($("#primary_remoteapi_accesstokenurl"),_("Please fill the primary server accesstokenurl"));
	}
	var primary_remoteapi_clientid = $("#primary_remoteapi_clientid").val().trim();
	if(primary_remoteapi_clientid === "") {
		$("#primary_remoteapi_clientid").focus();
		return warnInvalid($("#primary_remoteapi_clientid"),_("Please fill the primary server Clientid"));
	}
	var primary_remoteapi_secret = $("#primary_remoteapi_secret").val().trim();
	if(primary_remoteapi_secret === "") {
		$("#primary_remoteapi_secret").focus();
		return warnInvalid($("#primary_remoteapi_secret"),_("Please fill the primary server Secret"));
	}
	var primary_remoteapi_gql = $("#primary_remoteapi_gql").val().trim();
	if(primary_remoteapi_gql === "") {
		$("#primary_remoteapi_gql").focus();
		return warnInvalid($("#primary_remoteapi_gql"),_("Please fill the primary server GQL url"));
	}
return true;
});

$( "#brand" ).change(function() {
	var brand = $( "#brand option:selected" ).val();
	if (brand !== '' ) {
		$("#overlay").fadeIn(500);
		$.post("ajax.php?module=adv_recovery", { command: 'getmodtemplate', brand: $("#brand").val() }, function(data){
			if (data) {
				var options = '';
				$.each(data, function(key, value) {
					options += '<option value="' + value + '">' + value + '</option>';
				});
				$("#template").html(options);
				setTimeout(function(){
					$("#overlay").fadeOut(300);
				},500);
				return true;
			}else {
				warnInvalid($("#brand"),_(data.message));
				event.preventDefault();
				return false;
			}
		});
        return false;
	}
});
var reconnects = 0;
var maxReconnects = 10;
function getValidateEmail(emails, type){
	if(emails === "") {
		$("#backup_email").focus();
		let msg = type ? "Please Enter the Notification Email" : "Please select the admin Email for Notification"
		return warnInvalid($("#backup_email"),_(msg));
	}
	emails = emails.split(",");
	var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	for (var i = 0; i < emails.length; i++) {
		// Trim whitespaces from email address
		emails[i] = emails[i].trim();
		if(emails[i].includes(';')){
			return ($("#backup_email"),_("Please check whether emails are separated by comma or not"));
		}
		if( emails[i] == "" || ! regex.test(emails[i])){
			return warnInvalid($("#backup_email"),_("Please check whether its a valid email or not"));
		}
	}
	return true;
}
function getsysncnowStatus(type,transaction, pid) {
	reconnects = 0;
	getsyncnowStatus(type, transaction, pid)
}
function getsysncbackStatus(type,transaction, pid) {
	reconnects = 0;
	getStatus(type, transaction, pid)
}
function getsyncnowStatus(type, transaction, pid) {
	var evtSource = new EventSource(FreePBX.ajaxurl+"?module=adv_recovery&command="+type+"&transaction="+transaction+"&pid="+pid);
	body = $("#runlogModel .modal-body .body");
	evtSource.onerror = function(e) {
		console.warn(e);
		body.html(body.html() + "NETWORK ERROR (see console log for more details): " + "\n");
		evtSource.close();
		if(reconnects > maxReconnects) {
			body.scrollTop(1E10);
			$("#runlogModel .close").prop("disabled",false);
			$("#runlogModel .btn-close").prop("disabled",false);
		} else {
			reconnects++;
			body.html( "\nAttempting reconnection...");
			getsyncnowStatus(type, transaction, pid);
		}
		
		$("#closeBtn").removeClass("hidden");
	};
	
	body = $("#runlogModel .modal-body .body");

	//begin
	evtSource.addEventListener("new-msgs", function(event){
		var data = JSON.parse(event.data);
		console.log(data);
		switch(data.status) {
			case 'stopped':
				body.html( data.log + "\n");
				body.scrollTop(1E10);
				evtSource.close();
				progressBar = $("#total .progress-bar");
				progressBar.css("width", 100 + "%");
				progressBar.removeClass("active");
				$("#frefreshBtn").removeClass("hidden");
				$("#fcloseBtn").removeClass("hidden");
				$("#syncprocessingmodulename").text("syncing successfully finished");
				fpbxToast(_('Your Sync process has finished'));
			break;
			case 'errored':
				fpbxToast(sprintf(_('There was an error during %s'),type),_('Error'),'error');
			break;
			case 'running':
				$('.body').text(data.log);
				if(data.log.length) {
					body.html(data.log + "\n");
					body.scrollTop(1E10);
				}
				progressBar = $("#total .progress-bar");
				progressBar.css("width", data.total + "%");
				if(data.total == "100") {
					progressBar.removeClass("active");
				}
				$("#syncprocessingmodulename").text(data.curmod);
				$("#fcloseBtn").removeClass("hidden");
			break;
			default:
			break;
		}
	});
}

function getStatus(type, transaction, pid) {
	var evtSource = new EventSource(FreePBX.ajaxurl+"?module=adv_recovery&command="+type+"&transaction="+transaction+"&pid="+pid);
	body = $("#runModal .modal-body .body");
	evtSource.onerror = function(e) {
		console.warn(e);
		body.html(body.html() + "NETWORK ERROR (see console log for more details)" + "\n");
		evtSource.close();
		if(reconnects > maxReconnects) {
			body.scrollTop(1E10);
			$("#runModal .close").prop("disabled",false);
			$("#runModal .btn-close").prop("disabled",false);
		} else {
			reconnects++;
			body.html( "\nAttempting reconnection...");
			getStatus(type, transaction, pid);
		}
		
		$("#closeBtn").removeClass("hidden");
		$("#previousBtn").addClass("hidden");
	};
	
	
	//begin
	evtSource.addEventListener("new-msgs", function(event){
		var data = JSON.parse(event.data);
		console.log(data);
		switch(data.status) {
			case 'stopped':
				body.html( data.log + "\n");
				body.scrollTop(1E10);
				$("#closeBtn").removeClass("hidden");
				$("#nextBtn").removeClass("hidden");
				$("#switchs").addClass("hidden");
				$("#previousBtn").addClass("hidden");
				evtSource.close();
				progressBar = $("#total .progress-bar");
				progressBar.css("width", 100 + "%");
				progressBar.removeClass("active");
				$("#processingmodulename").text(_("Restore Done , Please move to next step to Do Switch Services"));
				fpbxToast(_('Your Sync Back to Primary has finished'));
			break;
			case 'errored':
				fpbxToast(sprintf(_('There was an error during %s'),type),_('Error'),'error');
			break;
			case 'running':
				if(data.log.length) {
					body.html(data.log + "\n");
					body.scrollTop(1E10);
				}
				progressBar = $("#total .progress-bar");
				progressBar.css("width", data.total + "%");
				if(data.total == "100") {
					progressBar.removeClass("active");
				}
				$("#processingmodulename").text(data.curmod);
			break;
			default:
			break;
		}
	});
}


function showStatusModal(title) {
	//keep the modal on top. disable hiding when clicking the background or the ESC key
	$("#runModal").modal({
		backdrop: 'static',	
		keyboard: false	
	});

	$("#runModal .close").prop("disabled",true);
	$("#runModal .btn-close").prop("disabled",true);
	$("#runModal .modal-title").text(title);
	$("#runModal .modal-body").css("height",(window.innerHeight-200)+"px")
	$("#runModal .modal-body").css("overflow-y","hidden")
	$("#runModal .modal-body").html("<pre>"+_("Loading Please Wait")+"</pre>");
}

$('#itemsSave').on('click', function (e) {
	e.preventDefault();
	if (!$('#syncmodules').bootstrapTable('getSelections').length) {
		alert(_("No module has selected for this sync. Please ensure you are selecting atleast Custom files"));
	}
	$('#sync_items').val(JSON.stringify(processItems(undefined, {})));
	$('#syncmodules').bootstrapTable('resetSearch');
	$('#sync_modules').text(_("Modules (" + $('#syncmodules').bootstrapTable('getSelections').length + ')'))

	$("#itemsModal").modal('hide');
});
$('#itemsModal').on('show.bs.modal', function (e) {
	$("#itemsModal .modal-body").css("height", (window.innerHeight - 200) + "px")
	$("#itemsModal .modal-body").css("overflow-y", "auto")
});
$('#itemsReset').on('click', function (e) {
	e.preventDefault();
	$('#syncmodules').bootstrapTable('refresh', { silent: true });
	$('#sync_items').val(JSON.stringify(processItems('reset', {})));
});

let checkedModule = {}
function processItems(type, obj) {
	let items = $('#syncmodules').bootstrapTable('getSelections');
	checkedModule = {
		...checkedModule,
		...obj
	}
	$.each(items, function (i, v) {
		if (Object.keys(checkedModule).length === 0 || checkedModule[v.modulename] === undefined)
			v.settings = type ? [] : $("#modulesetting_" + v.modulename).serializeArray();
		else
			v.settings = type ? [] : checkedModule[v.modulename];
	});
	return items;
}
