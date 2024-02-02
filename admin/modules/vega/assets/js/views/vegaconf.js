$(document).ready(function() {

if ($("input[name='sipdriver']:checked").val() == 'pjsip') {
	removeTrunkExtn('sip');
}
if ($("input[name='sipdriver']:checked").val() == 'chansip') {
	removeTrunkExtn('pjsip');
}

if($('#id').val() == "") { 
	//FXS - when a new one is created
	$("#enableall").prop('checked', true);
	for(i = 1; i < parseInt($("#validate_no_fxscheck_value").val())+1; i++) {
		$("#_"+i+"_enable").prop('checked', true);
		$("#_"+i+"_enable").val(1);
        }

	$("#enableallcid").prop('checked', true);
	for(i = 1; i < parseInt($("#validate_no_fxscheck_value").val())+1; i++) {
		$("#_"+i+"_callerid_gen").prop('checked', true);
		$("#_"+i+"_callerid_gen").val(1);
	}
	//FXO when a new one is created 
	$("#fxo_enableall").prop('checked', true);
	for(i = 1; i < parseInt($("#validate_no_fxocheck_value").val())+1; i++) {
		$("#_"+i+"_fxo_emergency_call").prop('checked', true);
		$("#_"+i+"_fxo_emergency_call").val(1);
        }

	$("#fxo_ports_enableall").prop('checked', true);
	for(i = 1; i < parseInt($("#validate_no_fxocheck_value").val())+1; i++) {
                 $("#p"+i).prop('checked', true);
                 $("#p"+i).val(1);
         }

	$("#fxo_enableallcid").prop('checked', true);
	for(i = 1; i < parseInt($("#validate_no_fxocheck_value").val())+1; i++) {
		$("#_"+i+"_fxo_callerid_det").prop('checked', true);
		$("#_"+i+"_fxo_callerid_det").val(1);
	}

	$("#e1t1_enableall").prop('checked', true);
	for(i = 1; i < parseInt($("#validate_no_e1t1check_value").val())+1; i++) {
		$("#_"+i+"_e1t1_enabled").prop('checked', true);
		$("#_"+i+"_e1t1_enabled").val(1);
	}

	for(i = 1; i < parseInt($("#validate_no_e1t1check_value").val())+1; i++) {
		if($("#_"+i+"_e1t1_is_nt").prop("checked") == true) {
			$('#_'+i+'_e1t1_emergency_call').prop('checked', false);
			$('#_'+i+'_e1t1_emergency_call').prop('disabled', true);
			$('#_'+i+'_e1t1_clockmaster').prop('checked', true);
		}
	}

}
	var radioValue = $("input[name='fxoconfig']:checked").val();
	if(radioValue == 0){
		changefxo(true);
	} else {
		changefxo(false);
	}
	$("input[name=fxoconfig]").change(function() {
			if ($(this).attr('id') == "fxoconfig-no") {
				changefxo(true);
			} else {
				changefxo(false);
			}
		});

	$("input[name=fxsconfig]").change(function() {
			if ($(this).attr('id') == "fxsconfig-no") {
				changefxs(true);
			} else {
				changefxs(false);
			}
		});



	 $("#cfgfile").change(function() {
		var input  = document.getElementById('cfgfile');
		var file   = input.files[0];
		var reader = new FileReader();
		reader.onload = function(e) {
			var text = reader.result;
	 		var firstLine = text.split('\n').shift();
		$("#firstlinecheckcfgfile").val(firstLine);
		}
		reader.readAsText(file, 'UTF-8');
	 });

	$("#e1t1topology").change(function() {
			var value=$('#e1t1topology option:selected').val();

			if (value == "e1") {
				var framing = e1framingproto_types;
				var lc = e1lineencoding_types;
				var nw = e1nwproto_types;
			} else {
				var framing = t1framingproto_types;
				var lc = t1lineencoding_types;
				var nw = t1nwproto_types;
			}

			for(i = 1; i < parseInt($("#validate_no_e1t1check_value").val())+1; i++) {
				var framelist=$("#_"+i+"_e1t1framing");
				replacelist(framelist, framing);
				var protolist=$("#_"+i+"_e1t1protocol");
				replacelist(protolist, nw);
				var lclist=$("#_"+i+"_e1t1lineenc");
				replacelist(lclist, lc); 
			}
	});
	$("input[name=forcecfg]").change(function() {
			if ($(this).attr('id') == "forcecfg-yes") {
				var message =  _(" Are you sure to reset vega gateway configuration and push pbx vega module generated configuration to Vega gateway ?");
				message += "\r\n\r\n";
				ret = confirm(message);
				if (ret) {
				 	$('#forcecfg-yes').prop('checked', true);
				} else {
				 	$('#forcecfg-no').prop('checked', true);
				}
			}
	});


	pwdchange=0;
	var previouspwd = $("#vegapwd").val();
	$("#vegapwd").keyup(function(e) {
		var currentpwd = $(this).val();
		if(currentpwd != previouspwd) {
			previouspwd = currentpwd;
			pwdchange=1;
		}
	});

	$("#pwdchangesubmit").click(function(e) {
			e.preventDefault();

			if (!pwdchange) {
				alert(_("Please enter new password before submitting update password"));
			} else {
			$.post("ajax.php?module=vega&command=vegapwdchange", { command: 'vegapwdchange', module: "vega", vegaid: $('#id').val(), newpwd: $('#vegapwd').val() }, function(data) {
				console.log(data);
				if (data.status) {
					alert(data.message);
				} else {
					alert(data.message);
				}
			});
		   }
		});
});

function replacelist(list, val) {
	list.empty();
	$.each(val, function(key,value) {
		list.append($("<option></option>")
		.attr("value", value).text(value));
	});
}


function changefxo(val){
	$('#fxotrunk :input').attr('disabled', val);
	$('#fxocalleriddiv :input').attr('disabled', val);
	$('#fxorxgaindiv :input').attr('disabled', val);
	$('#fxotxgaindiv :input').attr('disabled', val);
	$('#fxodiscdiv :input').attr('disabled', val);
	$('#fxoportsdiv :input').attr('disabled', val);
	$('#fxoportsdiv1 :input').attr('disabled', val);
}
function changefxs(val){
	$('#fxsmwidiv :input').attr('disabled', val);
	$('#fxscalleriddiv :input').attr('disabled', val);
	$('#fxsrxgaindiv :input').attr('disabled', val);
	$('#fxstxgaindiv :input').attr('disabled', val);
	$('#fxsportsdiv :input').attr('disabled', val);
	$('#fxsportsdiv1 :input').attr('disabled', val);
}

function checkfxoenable(type,id,name) {
	if($('#'+id).prop("checked")== true) {
		//get number of FXo posts
		for(i = 1; i < parseInt($("#"+type).val())+1; i++) {
			$("#"+name+i).prop('checked', true);
 		}
 	}

	if($('#'+id).prop("checked")== false) {
		//get number of fxs/fxo port disable
		for(i = 1; i < parseInt($("#"+type).val())+1; i++) {
			$("#"+name+i).prop('checked', false);
		}
	}


}

function checkallenables(type,id,boxname) {
	// this funtion used for enable/disbale for FXS and FXO 
	if($('#'+id).prop("checked")== true) {
		//get number of fxs/fxo port  enable 
		 for(i = 1; i < parseInt($("#"+type).val())+1; i++) {
	 	 $("#_"+i+boxname).prop('checked', true);
		 }
	}
	if($('#'+id).prop("checked")== false) {
               //get number of fxs/fxo port disable
               for(i = 1; i < parseInt($("#"+type).val())+1; i++) {
                      $("#_"+i+boxname).prop('checked', false);
                }
        }
}

function checkallntenable(id) {

	for (i = 1; i < parseInt($("#validate_no_e1t1check_value").val())+1; i++) {
		if ($('#'+id).prop("checked")== true) {
			$("#_"+i+'_e1t1_is_nt').prop('checked', true);
			$("#_"+i+'_e1t1_emergency_call').prop('checked', false);
			$('#_'+i+'_e1t1_emergency_call').prop('disabled', true);
		} else {
			$("#_"+i+'_e1t1_is_nt').prop('checked', false);
			$('#_'+i+'_e1t1_emergency_call').prop('disabled', false);
		}
	}
}

function checkallemergcalls(id) {
	if ($('#'+id).prop("checked") == true) {
		 for (i = 1; i < parseInt($("#validate_no_e1t1check_value").val())+1; i++) {
			 if($("#_"+i+"_e1t1_is_nt").prop("checked") == false) {
	 	 		$("#_"+i+'_e1t1_emergency_call').prop('checked', true);
			 }
		 }
	}
	if ($('#'+id).prop("checked") == false) {
		for(i = 1; i < parseInt($("#validate_no_e1t1check_value").val())+1; i++) {
			$("#_"+i+'_e1t1_emergency_call').prop('checked', false);
                }
        }
}



function e1t1_togglent(port, id) {
	if ($('#'+id).prop("checked") == true) {
		$('#_'+port+'_e1t1_emergency_call').prop('checked', false);
		$('#_'+port+'_e1t1_emergency_call').prop('disabled', true);
	}
	if ($('#'+id).prop("checked") == false) {
		$('#_'+port+'_e1t1_emergency_call').prop('disabled', false);
	}
};

var previousip = $("#staticip").val();
var previousssh = $("#sshport").val();
function validateConfig(theForm) {

	if (!validateLanIpNeeded() && validateLanIp(previousip) == false) {
		return false;
	}

	if (!validateSshPortNeeded() && validateSshport(previousssh) == false) {
		return false;
	}
	if (checkvalid() == false) {
		return false;
	}
	$("#cfgPopUp").modal("show");
	return true;
}
function checkvalid(){
	var theForm = "vega_cfg";
	var fxocheck = true; 
	var fxscheck = true; 
	// check first whter the user is try to upload the config file
	if($('#cfgfile').val() != undefined) {
		if($('#cfgfile').val().length > 1) {
			if(confirm(_("Are you sure to upload config file")) == false ) {
		} else {
			if($("#firstlinecheckcfgfile").val() == ';This Config file is generated by FreePBX DO NOT EDIT OR DELETE THIS LINE') {
				$('<input>').attr({type: 'hidden', name: 'process_config_file',id: 'process_config_file'}).val('1').appendTo('#vega_cfg');
				return true;
			}else{
				alert(_("File is NOT FreePBX generated one!!!. Please upload freePBX generated configuration file"));
				return false;
			}
		}
	}
	}

	if ($("#fxsconfig-yes").prop('checked') == false) {
		fxscheck=false;
	}
	if ($("#fxoconfig-yes").prop('checked') == false) {
		fxocheck=false;
	}

	if (!fxscheck  && !fxocheck) {
		alert("Configuration for FXS and FXO both ports are disabled. Please enable one to continue further");
		return false;
	}

	if ($('#validate_no_e1t1check').val() == 1) {
		if (!validateSingleDestinationvega(theForm, "e1t1trunk", true,_("Please Select a Trunk"))) {
			return false;
		}
	}

	//FXO checking
	if (fxocheck && ($('#validate_no_fxocheck').val() == 1)) {
		tab = "fxo";
		if (!validateSingleDestinationvega(theForm, "fxotrunk", true,_("Please Select a Trunk"))) {
			return false;
		}
		if($('#fxorxgain').val() == "") {
			return warnInvalidvega("fxorxgain",_("Digital Rx Gain is Empty"),tab);
		}
		if($('#fxotxgain').val() == "") {
			return warnInvalidvega("fxotxgain",_("Digital Tx Gain is Empty"),tab);
	 	}
	
		for(i = 1; i < parseInt($("#validate_no_fxocheck_value").val())+1; i++) { 
			if($("#_"+i+"_fxo_emergency_call").is(":checked")) {
				// change value on to 1 
				if($("#_"+i+"_fxo_emergency_call").is(":checked")) {
					$("#_"+i+"_fxo_emergency_call").val(1);
				} else {
					$("#_"+i+"_fxo_emergency_call").val(0);
				}
				if($("#_"+i+"_fxo_callerid_det").is(":checked")) {
				        $("#_"+i+"_fxo_callerid_det").val(1);
				} else {
				        $("#_"+i+"_fxo_callerid_det").val(0);
				}
				// fxo port enable
				if($("#p"+i).is(":checked")) {
					$("#p"+i).val(1);
				} else {
					$("#p"+i).val(0);
				}
				// checking Numeric Caller ID is not empty and is numeric
				var element = "_"+i+"_fxo_num_callerid";
				var num = document.getElementById("_"+i+"_fxo_num_callerid").value;
				if(num.length == 0) { //return true;
					return warnInvalidvega(element,_("Numeric Caller ID Can not be empty"),tab,"col-sm-2");
				} else { // check is integer
						if(!isInteger(num)) {
							return warnInvalidvega(element,_("Numeric Caller ID Should be Numeric"),tab,"col-sm-1");
						}
				}
				//txt_callerid-
				var element = "_"+i+"_fxo_txt_callerid";
				var num = document.getElementById("_"+i+"_fxo_txt_callerid").value;
				if(num.length == 0) { //return true;
					return warnInvalidvega(element,_("Caller ID Can not be empty"),tab,"col-sm-2");
				}
				//nums_to_route (number with coma separated)
				var element = "_"+i+"_fxo_nums_to_route";
				var num = document.getElementById("_"+i+"_fxo_nums_to_route").value;
				if(num.length == 0) { //return true;
					return warnInvalidvega(element,_("Route Numbers Can not be empty"),tab,"col-sm-3");
				}
				//DID to Forward to SIP
				// if enable then only we need to validate this check
				if($("#p"+i).is(":checked")) {
					if ($('#gotodid_'+i).val() != 'Inbound_Routes') {
						return warnInvalidvega('gotodid_'+i,_("Please select a DID to accept the calls from FXO port"),tab,"col-sm-2");
					}
				}
			}
		}
		
	}


       // doing for fxs port
	if(fxscheck && ($('#validate_no_fxscheck').val() == 1)) {
		tab = "fxs";
		if($('#fxsrxgain').val() == "") {
			return warnInvalidvega("fxsrxgain",_("Digital Rx Gain is Empty"),tab);
		}
		if($('#fxstxgain').val() == "") {
	        	return warnInvalidvega("fxstxgain",_("Digital Tx Gain is Empty"),tab);
	         }
	//	alert("found fxs port configration");
		var extensions = [];
		for(i = 1; i < parseInt($("#validate_no_fxscheck_value").val())+1; i++) { 
			if($("#_"+i+"_enable").is(":checked")) {
				// change value on to 1 
				if($("#_"+i+"_enable").is(":checked")) {
					$("#_"+i+"_enable").val(1);
				} else {
					$("#_"+i+"_enable").val(0);
				}
				if($("#_"+i+"_callerid_gen").is(":checked")) {
				        $("#_"+i+"_callerid_gen").val(1);
				} else {
				        $("#_"+i+"_callerid_gen").val(0);
				}

				// lets check for the destinations
				if (!validateSingleDestinationvega(theForm, i, true,_("Please Select a Extension"))) {
			                return false;
				}
				// check duplicate extensions used or not 
				if($("#goto"+i).val() !=null) {
					// check already assigned or not
					if(extensions.indexOf($("#Extensions"+i).val()) == '-1') {  
						extensions.push($("#Extensions"+i).val());
					} else {
						return  warnInvalid($("#goto" + i),_("Duplicate Extension Selected"));
					}
				}
			}
		}
		
	}

	if ($('#validate_no_e1t1check').val() == 1) {
		for(i = 1; i < parseInt($("#validate_no_e1t1check_value").val())+1; i++) {
			if ($("#_"+i+"_e1t1_crossover").is(":checked")) {
				$("#_"+i+"_e1t1_crossover").val(1);
			} else {
				$("#_"+i+"_e1t1_crossover").val(0);
			}
			if ($("#_"+i+"_e1t1_clockmaster").is(":checked")) {
				$("#_"+i+"_e1t1_clockmaster").val(1);
			} else {
				$("#_"+i+"_e1t1_clockmaster").val(0);
			}
			if ($("#_"+i+"_e1t1_emergency_call").is(":checked")) {
				$("#_"+i+"_e1t1_emergency_call").val(1);
			} else {
				$("#_"+i+"_e1t1_emergency_call").val(0);
			}
			if ($("#_"+i+"_e1t1_is_nt").is(":checked")) {
				$("#_"+i+"_e1t1_is_nt").val(1);
			} else {
				$("#_"+i+"_e1t1_is_nt").val(0);
			}
			if ($("#_"+i+"_e1t1_enabled").is(":checked")) {
				$("#_"+i+"_e1t1_enabled").val(1);
			} else {
				$("#_"+i+"_e1t1_enabled").val(0);
			}
		}
	}

	return true;
}
function validateSingleDestinationvega(theForm, formNum, bRequired,msg) {
	var gotoType = $("#goto"+formNum).val(), gotoFld, gotoVal;
        if (bRequired && gotoType === "") { 
                warnInvalid($("#goto" + formNum),msg);
                return false;
        } else {
                // check the 'custom' goto, if selected
                if (gotoType == "custom") {
                        gotoFld = theForm.elements[ "custom" + formNum ];
                        gotoVal = gotoFld.value;
                        if (gotoVal.indexOf("custom-") == -1) {
                                warnInvalid($("#goto" + formNum), fpbx.msg.framework.validateSingleDestination.error);
                                return false;
                        }
                }
        }
        return true;
}

function warnInvalidvega(element, s,tab,col) {
	$('li[role="presentation"] a[href="#' + tab + '"]').tab("show");
	$("#"+element).focus(); 
	$("#"+element).parents("."+col).addClass("has-error");
	if (typeof s !== "undefined" && s !== "") {
                alert(s);
        }
       	$("#"+element).one("propertychange change contextmenu keyup input paste", function() {
		$(this).parents("."+col).removeClass("has-error has-warning has-success");
        $(this).parents("."+col).find(".input-warn").remove();
        
	});
	return false;
}

