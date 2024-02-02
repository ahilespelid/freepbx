VegaC = Class.extend({
	init: function(){
		var self = this;

		// Set the 'IP' box to enabled when it's Static
		$("input[name=lanproto]").change(function() {
			if ($(this).attr('id') == "lanproto-static") {
				changelan(false);
			} else {
				var message = _("Please note that if Vega GW ip is changing due to DHCP response then PBX Vega module will not be able to contact to Vega GW");
				message += "\r\n\r\n";
				message += _(" Are you sure to change Vega gateway ip assignment method ?"); 
				ret = confirm(message);
				if (!ret) {
				 	$('#lanproto-static').prop('checked', true);
				} else {
					changelan(true);
				}
			}
		});

		$("input[name=nattype]").change(function() {
			if ($(this).attr('id') == "nattype-ext") {
				var message = _("Please ensure that Vega ssh port (22) is exposed and accessible to pbx");
				message += "\r\n\r\n";
				message += _(" Are you sure to change Vega gateway ip type method to External/NAT ?");
				ret = confirm(message);
				if (!ret) {
				 	$('#nattype-lan').prop('checked', true);
				} else {
				 	$('#nattype-ext').prop('checked', true);
				}
			}
		});



		// Gateway mode off/on fields 
		$("input[name=regmode]").change(function() {
			if ($(this).attr('id') == "regmode-on") {
				$('#isgateway').show();
			} else {
				$('#isgateway').hide();
			}
		});

		$("input[name=regmode]").change(function () {
		$val=$("input[name=regmode]:checked").val();
		var $table = $('#table-fxs');
	 	if ($val == "fxsport") {
			$('#isgateway').hide();
			$table.bootstrapTable('showColumn', 'extensions');
		} else if ($val == "gateway") {
			$('#isgateway').show();
			$table.bootstrapTable('hideColumn', 'extensions');
		} else {
			$('#isgateway').hide();
			$table.bootstrapTable('hideColumn', 'extensions');
		}
	   });
	}
});

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

$(document).ready(function() {
	window.Vega = new VegaC();

	var previousip = $("#staticip").val();
	$("#staticip").focusout(function() {
		ipvalidatedone=false;
		validateLanIp(previousip);
	});
	var previousssh = $("#sshport").val();
	$("#sshport").focusout(function() {
		sshvalidatedone=false;
		validateSshport(previousssh);
	});

	$("#forcescanbtn").click(function() {
		$('#table-vega').bootstrapTable('destroy');
	});


	// refresh data table on every 5min
	setInterval( function () {
		$('#table-vega').bootstrapTable('refresh');
	}, 300000);


	// LAN DHCP/Static
	var radioValue = $("input[name='lanproto']:checked"). val();
	if(radioValue == 0){
		changelan(false);
	} else {
		changelan(true);
	}

	$("#connectingvega").hide();
	$('#quickVegaAdd .buttonFinish').addClass("buttonDisabled");

	$('#wizard').smartWizard({
		keyNavigation: false,
		onLeaveStep: function(obj, context) {
			switch (context.fromStep) {
			case 1: //quickVegaAdd step
			{
			if($("#addvegaip").val().trim() == "") {warnInvalid($("#addvegaip"),_("Vega IP can not be blank!")); return false;};
			if($("#addvegalogin").val().trim() == "") {warnInvalid($("#addvegalogin"),_("Vega login user can not be blank!")); return false;};
			if($("#addvegaloginpwd").val().trim() == "") {warnInvalid($("#addvegaloginpwd"),_("Vega login password can not be blank!")); return false;};
			$("#connectingvega").show();
			$("#quickCfg").hide();
			$('#quickVegaAdd .buttonFinish').addClass("buttonDisabled");
			var ip = $("#addvegaip").val();
			$.post("ajax.php?module=vega&command=addnewvega", { command: 'addnewvega', module: "vega", vegaip: $("#addvegaip").val(), nattype: $("input[name='nattype']:checked").val(), vegasshport: $("#vegasshport").val(),  login: $("#addvegalogin").val(), pwd: $("#addvegaloginpwd").val() }, function(data){
				console.log(data);
				if (data.status) {
				$("#connectingvega").hide();
				$("#quickCfg").show();
				$('#wizard').smartWizard('goToStep', 2);
				$('#step-2').attr('class', "selected");
				$("#step-2").show();
				var mac = "<input type=\"hidden\" name=\"togglemac\" value="+data.mac+" >";
				$('#quickVegaAdd form').append(mac);
				var vegagw = "<input type=\"hidden\" name=\"vegagw\" value="+data.vegagw+" >";
				$('#quickVegaAdd form').append(vegagw);
				var model = "<input type=\"hidden\" name=\"togglemodel\" value="+data.model+" >";
				$('#quickVegaAdd form').append(model);
				$("#step-1").hide();
				$("#togglemac").val(data.mac);
				$("#togglemac").text(data.mac);
				$("#addvegaip").text(ip);
				$("#togglemodel").val(data.model);
				$("#togglemodel").text(data.model);
				} else {
					$("#connectingvega").hide();
					alert(data.message);
					$("#quickVegaAdd form")[0].reset();
					$('#wizard').smartWizard('goToStep', 1);
					$("#step-1").show();
					$('#step-1').attr('class', "selected");
					$("#step-2").hide();
				}
				});
			}
			break;
			case 2: //quickVegaConfig step
			{
				//$('#wizard').smartWizard('goToStep', 1);
				$('#step-1').attr('class', "selected");
				$("#step-1").show();
				$("#step-2").hide();
			}
			break;
			default:
			break;
			}
			return true;
		},
		onFinish: function(obj, context) {
			if($("#togglemac").val().trim() == "") {warnInvalid($("#togglemac"),_("Failed to fetch MAC information from Vega!")); return false;};
			if($("#togglemodel").val().trim() == "") {warnInvalid($("#togglemac"),_("Failed to fetch Model information from Vega!")); return false;};
			$('#wizard').smartWizard('goToStep', 1);
			$('#quickVegaAdd form').submit();
			$("#quickVegaAdd form")[0].reset();
			$('#quickVegaAdd').modal('hide');
		},
		labelNext: 'Add',
		labelNext: 'Discover',
		labelFinish: 'Configure',
	});

// open popover with custom url (chan_sip tech)
$('select').on('change', function() {
	if($(this).val() == 'popover'){ 
		var selid = $(this).attr('id'); 
		if(selid =='Trunksfxotrunk'){
			if ($("input[name='sipdriver']:checked").val() == 'pjsip') {
                     $("#popover-frame").attr('src','config.php?fw_popover=1&display=trunks&tech=PJSIP');
			} else {
					 $("#popover-frame").attr('src','config.php?fw_popover=1&display=trunks&tech=SIP');
			}
                }
		if(selid.match(/^Extensions.*$/)) {//Extensions1
			if ($("input[name='sipdriver']:checked").val() == 'pjsip') {
				$("#popover-frame").attr('src','config.php?display=extensions&tech_hardware=pjsip_generic&fw_popover=1');
			} else {
				$("#popover-frame").attr('src','config.php?display=extensions&tech_hardware=sip_generic&fw_popover=1');
			}
        }
	 }
});

$('input:radio[name=sipdriver]').change(function (event) {
	var message = _("Please note: Changing SIP driver will reset all extensions and trucks already selected");
	message += "\r\n\r\n";
	message += _(" Are you sure to change Gateway SIP DRIVER ?");
	ret = confirm(message);
	if (!ret) {
		if ($(this).attr('id') == "sipdriver-pjsip") {//select chansip
			$('#sipdriver-chansip').prop('checked', true);
		} else {
			$('#sipdriver-pjsip').prop('checked', true);
		}
	} else {
		if ($("input[name='sipdriver']:checked").val() == 'pjsip') {
			/* sip driver is pjsip..remove all chan_sip extn and trunks*/
			removeTrunkExtn('sip');
		}
		if ($("input[name='sipdriver']:checked").val() == 'chansip') {
			removeTrunkExtn('pjsip');
			/* sip driver is chansip..remove all pjsip extn and trunks*/
		}
	}
});

// let try to add "add new " when ever popover is submited
$("select[id^='Extensions']").on('click',function(){
	var ID = $(this).attr("id");
	var pop = 0;
	$('select#'+ID).find('option').each(function() {
		if($(this).val()=='popover'){
			pop = 1;
		}
	})
	if(pop == 0){
		$('#'+ID).append('<option value="popover">Add New Extension ..</option>');
	}
});


});

function removeTrunkExtn(val) {
	$("#Trunksfxotrunk").find('option').each(function(){
		if($(this).text().includes("(dahdi)")) {
			$(this).remove();
		}else if($(this).text().includes("("+val+")")) {
			$(this).prop('disabled',true);
		} else {
			$(this).prop('disabled',false);
		}
	});

	$("#Trunkse1t1trunk").find('option').each(function(){
		if($(this).text().includes("("+val+")")){
			$(this).prop('disabled',true);
		}else {
				$(this).prop('disabled',false);
		}
	});
	//fxs extension tech switching
	if(val =='pjsip'){
		extension =  sipextension;
	} else {
		extension =  pjsipextension;
	}
	driverext = JSON.stringify(extension);
	for(i = 1; i < parseInt($("#validate_no_fxscheck_value").val())+1; i++) {
		$("#Extensions"+i).find('option').each(function(){
			var ext = $(this).val();
			extarray = ext.split(",");
			var dropdownextension = extarray[1];
			if (driverext.indexOf(dropdownextension) >= 0) {  // we want only these extensions to be selectable
					$(this).prop('disabled',false);
			} else {
				if (ext !="popover") {
					$(this).prop('disabled',true);
				}
			}
		});
	}
}


var deleteExts = [];
$("table").on("page-change.bs.table", function () {
        $(".btn-remove").prop("disabled", true);
        deleteExts = [];
});
$("table").on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table', function () {
        var toolbar = $(this).data("toolbar"), button = $(toolbar).find(".btn-remove"), id = $(this).prop("id");
        button.prop('disabled', !$("#"+id).bootstrapTable('getSelections').length);
        deleteExts = $.map($("#"+id).bootstrapTable('getSelections'), function (row) {
        return row.extension;
  });
});

function defaultCheck(val){
        return val;
}

function changelan(val){
	$('#staticip').attr('readonly', val);	
	$('#subnet').attr('readonly', val);	
	$('#gateway').attr('readonly', val);	
	$('#dns1').attr('readonly', val);	
	$('#dns2').attr('readonly', val);	
	$('#ntpserver').attr('readonly', val);	
}

function strstr(haystack, needle, before_needle) {
    if(haystack.indexOf(needle) >= 0) 
        return before_needle ? haystack.substr(0, haystack.indexOf(needle)) 
               : haystack.substr(haystack.indexOf(needle));
    return false;
}

function edit_config(val) {
	var newLine = "\r\n";
	var message =_("Are you sure you want to configure Vega by FreePBX ?");
	message += newLine;
	message += _("Existing configuration of Vega will be erased fully");
	message += newLine;
	ret = confirm(message);
	if (ret) {
		window.location="?display=vega&action=editvega&type=byid&id="+val+"";
	} else {
		return false;
	}
}

function vegaurl(value, row, index){
	html = '<a href="http://'+encodeURIComponent(row['vegaip'])+'" target="_blank"> '+encodeURIComponent(row['vegaip'])+' </a>';
        return html;
}

function linkFormatter(value, row, index){
	if (row['vegamanaged'] == '0') {
		html = '<a href="?display=vega&action=editvega&type=byid&id='+encodeURIComponent(row['vegaid'])+'" onclick="return edit_config('+encodeURIComponent(row['vegaid'])+');"><i class="fa fa-edit" title="Edit Config"></i></a>&nbsp;';
	} else {
		html = '<a href="?display=vega&action=editvega&type=byid&id='+encodeURIComponent(row['vegaid'])+'"><i class="fa fa-edit" title="Edit Config"></i></a>&nbsp;';
	}
	/* html = html + '<a href="?display=vega&action=viewvega&type=byid&id='+row['vegaid']+'"> <i class="fa fa-refresh" title="Sync Vega" ></i></a>&nbsp;&nbsp;'; */
	ret = strstr(row['status'],'Reboot required',false);
	if(ret != false) {
		html = html +'<a href="?display=vega&action=reboot&type=byid&vegaip='+row['vegaip']+'&id='+row['vegaid']+'" onclick="return confirm_reboot();"><i class="fa fa-circle-o-notch" style="color:red" title="Reboot Vega"></i></a>&nbsp;&nbsp;';
	} else {
		html = html +'<a href="?display=vega&action=reboot&type=byid&vegaip='+row['vegaip']+'&id='+row['vegaid']+'" onclick="return confirm_reboot();"><i class="fa fa-circle-o-notch" title="Reboot Vega"></i></a>&nbsp;&nbsp;';
	}
	html = html +' <a href="?display=vega&action=delete&type=byid&id='+row['vegaid']+'" class="delAction"> <i class="fa fa-trash-o" title="Delete"></i></a>&nbsp;&nbsp;';
        return html;
}

function confirm_reboot() {
	var newLine = "\r\n";
	var message = _("Are you sure to reboot Vega immediately ?");
	message += newLine;
	return confirm(message);
}
