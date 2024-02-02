$(document).ready(function() {
	//used for ajax call to eliminate excessive input variables
	var modelKeyValidate = false;
	const limitMulticast = 10;
	const attributes = {
		oninput: 'createParkLotList($(this).val());',
		list: 'allparkLotExtList',
		autocomplete: 'off'
	};
	$( "#dialog-form" ).dialog({
		autoOpen: false,
		height: 300,
		width: 350,
		modal: true
	});
	$( "#duplicate" )
		.button()
		.click(function() {
			$( "#dialog-form" ).dialog( "open" );
	});

	if($('#use_native_apps-enable').is(':checked')) {
		$("#dpmaAppAlert").show();
		$("#dpmaAppRecordAppAlert").show();
	} else {
		$("#dpmaAppAlert").hide();
		$("#dpmaAppRecordAppAlert").hide();
	}

	if($('#phoneApps-https').is(':checked')) {
		$("#queueAppAlert").hide();
	} else {
		$("#queueAppAlert").show();
	}
	var allParkLotExt = getAllParkLotExt();
	var modelVal = $("input[name='model']").val();
	$("#dpmaAppNotification").hide();
	if (typeof modelVal !== 'undefined') {
		modelVal = modelVal.split("-")[0];
	}
	switch(modelVal) {
		case 'P310':
		case 'P315':
		case 'P320':
			$("#linekeysnotes").text(_('Note: Every line(mapped extension) on a ' + modelVal + ' will override any key settings specified here.  This means that key 1 should not be set.  Adding a second line will also override whatever is set for key 2.'));
			modelKeyValidate = true;
			dpmaAppsSupportNotification(modelVal);
			break;
		case 'D65':
			$("#linekeysnotes").text(_('Note: Every line(mapped extension) on a ' + modelVal + ' will override any keys specified here for every page.  This means that keys 1,7,13,etc should not be used.  Adding a second line will increase the list to 2,8,14,etc.'));
			break;
		case 'P325':
			$("#linekeysnotes").text(_('Note: Every line(mapped extension) on a ' + modelVal + ' will override any keys specified here for every page.  This means that keys 1,7,13,etc should not be used.  Adding a second line will increase the list to 2,8,14,etc.'));
			modelKeyValidate = true;
			dpmaAppsSupportNotification(modelVal);
			break;
		case 'P330':
			$("#linekeysnotes").text(_('Note: Every line(mapped extension) on a ' + modelVal + ' will override any keys specified here for every page.  This means that keys 1,13,25,etc should not be used.  Adding a second line will increase the list to 2,14,26,etc.'));
			modelKeyValidate = true;
			dpmaAppsSupportNotification(modelVal);
			break;
		case 'P370':
		case 'PM200':
			modelKeyValidate = true;
			dpmaAppsSupportNotification(modelVal);
			break;
		default:
			break;
	}

	if (modelKeyValidate) {
		$(document).on('change', 'input', function() {
			let keyValue = null;
			var nameField = $(this).prop('name');
			var length = nameField.length;
			nameField = nameField.substr(0, length - 5);
			if (document.getElementById(nameField + 'value') !== null) {
				keyValue = document.getElementById(nameField + 'value').value;
			}
			if (keyValue !== null) {
				document.getElementById(nameField + 'value').style.border="";
			}
		});
	}

	$(document).on('change', '.type', function() {
		var name = $(this).prop('name');
		var length = name.length;
		name = name.substr(0, length - 4);
		
		if($("#" + name + 'acct').val() == ''){
			$("#" + name + 'acct').val('account1')
		} else {
			if($(this).find("option:selected").text() == 'Blank'){
				$("#" + name + 'acct').val('');
				$("#" + name + 'label').val('');
				$("#" + name + 'value').val('');
			}
		}

		switch($(this).find("option:selected").text()){
			//line keys first
			case 'Line':
				$("." + name + 'value').hide();
				$("." + name + 'valueFill').show();
				$("." + name + 'label').hide();
				$("." + name + 'labelFill').show();
				$("#" + name + 'xml').hide();
				$("#" + name + 'acct').attr('disabled', false);
				$('#allparkLotExtList').empty();
				removeAttribute(name + 'value', attributes);
				break;
			
			//now xml-api
			case 'XML-API':
				$("#" + name + 'xml').show();
				$("." + name + 'value').show();
				$("#" + name + 'value').hide();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'acct').attr('disabled', false);
				$('#allparkLotExtList').empty();
				removeAttribute(name + 'value', attributes);
				break;
			case 'Parking Status':
				$("#" + name + 'xml').hide();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'acct').attr('disabled', true);
				$("#" + name + 'value').show();
				$("#" + name + 'label').val($(this).find("option:selected").text());
				addAttribute(name + 'value', attributes, allParkLotExt);
				break;
			case 'APP-Status':
			case 'APP-Contacts':
			case 'APP-Parking':
			case 'APP-Hotdesking':
			case 'APP-Voicemail':
			case 'APP-Follow Me':
			case 'APP-Queues':
				let defaultlabel;
				$("#" + name + 'xml').hide();
				$("." + name + 'value').hide();
				$("#" + name + 'value').hide();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'acct').attr('disabled', true);
				if ($(this).find("option:selected").text() === 'APP-Hotdesking') {
					defaultlabel = 'Logout';
				} else {
					defaultlabel = $(this).find("option:selected").text().substr(4);
				}
				$("#" + name + 'label').val(defaultlabel);
				$('#allparkLotExtList').empty();
				removeAttribute(name + 'value', attributes);
			break;
			case 'Multicast Page':
				$("#" + name + 'xml').hide();
				$("." + name + 'value').hide();
				$("#" + name + 'value').hide();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'acct').attr('disabled', true);
				$("#" + name + 'label').val($(this).find("option:selected").text());
				$('#allparkLotExtList').empty();
				removeAttribute(name + 'value', attributes);
			break;
			default:
				$("#" + name + 'xml').hide();
				$("#" + name + 'value').show();
				$("." + name + 'value').show();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'park').hide();
				if (modelKeyValidate) {
					document.getElementById(name + 'value').style.border="";
				}
				$("#" + name + 'acct').attr('disabled', false);
				$("#" + name + 'label').val($(this).find("option:selected").text());
				$('#allparkLotExtList').empty();
				removeAttribute(name + 'value', attributes);
				break;			
		}
	});
	
	$(document).on('change', '.xmlDropDown', function() {
		var name = $(this).prop('name');
		var length = name.length;
		name = name.substr(0, length - 3);
		var txt = $(this).find("option:selected").text();
		var lTxt = txt.length;
		txt = txt.substr(5, lTxt);
		switch($(this).find("option:selected").text()){
			case 'REST-Apps':
			case 'REST-Call Flow':
			case 'REST-Call Forward':
			case 'REST-Conference':
			case 'REST-Contacts':
			case 'REST-DND':
			case 'REST-Follow Me':
			case 'REST-Login':
			case 'REST-Parking':
			case 'REST-Presence':
			case 'REST-Queues':
			case 'REST-Queue Agent':
			case 'REST-Time Conditions':
			case 'REST-Transfer VM':
			case 'REST-SPM':
			case 'REST-Voicemail':
				$("#" + name + 'label').val(txt);
				break;
			
			default:
				break;			
		}
	});
	$(document).on('change', '.digiumhorDropDown', function() {
		var name = $(this).prop('name');
		var length = name.length;
		name = name.substr(0, length - 5);
		var txt = $(this).find("option:selected").text();
		var lTxt = txt.length;
		switch($(this).find("option:selected").text()){
			case 'REST-Apps':
			case 'REST-Call Flow':
			case 'REST-Call Forward':
			case 'REST-Conference':
			case 'REST-Contacts':
			case 'REST-DND':
			case 'REST-Follow Me':
			case 'REST-Login':
			case 'REST-Parking':
			case 'REST-Presence':
			case 'REST-Queues':
			case 'REST-Queue Agent':
			case 'REST-Time Conditions':
			case 'REST-Transfer VM':
			case 'REST-SPM':
			case 'REST-Voicemail':
				txt = txt.substr(5, lTxt);
				$("#" + name + 'label').val(txt);
				document.getElementById(name + 'label').readOnly = false;
				break;
			case 'APP-Contacts':
			case 'APP-Parking':
			case 'APP-Status':
			case 'APP-Queues':
			case 'APP-Follow Me':
				txt = txt.substr(4, lTxt);
				$("#" + name + 'label').val(txt);
				document.getElementById(name + 'label').readOnly = false;
				break;
			case 'APP-Hotdesking':
				$("#" + name + 'label').val('Logout');
				document.getElementById(name + 'label').readOnly = true;
				break;
			case 'APP-Record':
				$("#" + name + 'label').val('Record');
				document.getElementById(name + 'label').readOnly = true;
				break;
			case 'Accept Call':
				$("#" + name + 'label').val('Answer');
				document.getElementById(name + 'label').readOnly = true;
				break;
			case 'Cancel Call':
				$("#" + name + 'label').val('Cancel');
				document.getElementById(name + 'label').readOnly = true;
				break;
			case 'Forward Calls':
				$("#" + name + 'label').val('Forward');
				document.getElementById(name + 'label').readOnly = true;
				break;
			case 'Missed Calls':
				$("#" + name + 'label').val('Call Log');
				document.getElementById(name + 'label').readOnly = true;
				break;
			case 'Reject Call':
				$("#" + name + 'label').val('Ignore');
				document.getElementById(name + 'label').readOnly = true;
				break;
			case 'Send to Vmail':
				$("#" + name + 'label').val('Send VM');
				document.getElementById(name + 'label').readOnly = true;
				break;
			case 'Transfer Call':
				$("#" + name + 'label').val('Transfer');
				document.getElementById(name + 'label').readOnly = true;
				break;
			default:
				$("#" + name + 'label').val(txt);
				document.getElementById(name + 'label').readOnly = true;
				break;
		}
	});
	sipkeepalivesetting();
	$("[name='sipkeepaliveEnable']").change(function(){
		sipkeepalivesetting();
	});

	multicastSettings();
	$("[name='multicastEnable']").change(function(){
		multicastSettings();
	});

	VLANSettings();
	$("[name='vlanMode']").change(function(){
		VLANSettings();
	});

	quickBLFTransferSettings();
	$("[name='quickBLFTransfer']").change(function(){
		quickBLFTransferSettings();
	});

	quickBLFVMTransferSettings();
	$("[name='quickBLFVMTransfer']").change(function(){
		quickBLFVMTransferSettings();
	});

	blfDirectedCallPickupSettings();
	$("[name='blfDirectedCallPickup']").change(function(){
		blfDirectedCallPickupSettings();
	});

	$('.saveModel-btn').click(function() {
		if (modelKeyValidate) {
			var form = $('form');
			var res = mtValidation(form);
			obj = JSON.parse(res.responseText);
			if (!obj.status) {
				alert(obj.message);
				obj.valueIDs.forEach(function(valueIDs) {
					document.getElementById(valueIDs).style.border="2px solid red";
				});
				return obj.status;
			}
		}
	});

	//Add Listener Row
	$(document).on('click',"a[id^='addlistenerrow']",function(e) {
		e.preventDefault();
		var curRow = $("tr[id^='mlrow']").last();
		var id = $("tr[id^='mlrow']").length++;
		if (id < limitMulticast) {
			var newhtml = '';
			newhtml +=	'<tr id="mlrow'+id+'">';
			newhtml +=		'<td class="mlname">';
			newhtml +=			'<div class="input-group">';
			newhtml += 				'<input type="hidden" id="listener_id_'+id+'" name="listener_id[]" class="form-control " value="" >';
			newhtml += 				'<input placeholder="Name" maxlength="20" type="text" id="listener_name_'+id+'" name="listener_name[]" class="form-control " value="" >';
			newhtml +=			'</div>';
			newhtml +=		'</td>';
			newhtml +=		'<td class="mlipaddress">';
			newhtml +=			'<div class="input-group">';
			newhtml +=  			'<input placeholder="IP-Address" type="text" id="listener_ipaddress_'+id+'" name="listener_ipaddress[]" class="form-control" value="" >';
			newhtml +=			'</div>';
			newhtml +=		'</td>';
			newhtml +=		'<td class="mlport">';
			newhtml +=			'<div class="input-group">';
			newhtml +=  			'<input placeholder="Port" type="text" id="listener_port_'+id+'" name="listener_port[]" class="form-control" value="" > ';
			newhtml +=			'</div>';
			newhtml +=		'</td>';
			newhtml +=		'<td class="mlpriority">';
			newhtml +=			'<div class="mlpriorityselect">';
			newhtml += 				'<select name="listener_priority[]" class="form-control" id="listener_priority_'+id+'">';
			newhtml +=					'<option value="1">1</option>';
			newhtml +=					'<option value="2">2</option>';
			newhtml +=					'<option value="3">3</option>';
			newhtml +=					'<option value="4">4</option>';
			newhtml +=					'<option value="5">5</option>';
			newhtml +=					'<option value="6">6</option>';
			newhtml +=					'<option value="7">7</option>';
			newhtml +=					'<option value="8">8</option>';
			newhtml +=					'<option value="9">9</option>';
			newhtml +=					'<option value="10">10</option>';
			newhtml +=				'</select>';
			newhtml +=			'</div>';
			newhtml +=		'</td>';
			newhtml +=		'<td class="mlinterruptcalls">';
			newhtml +=			'<div class="mlinterruptcallselect">';
			newhtml +=				'<select class="form-control" name="listener_interrupt_calls[]"  id="listener_interrupt_calls_'+id+'">';
			newhtml +=					'<option value="0">0</option>';
			newhtml +=					'<option value="1">1</option>';
			newhtml +=					'<option value="2">2</option>';
			newhtml +=				'</select>';
			newhtml +=			'</div>';
			newhtml +=		'</td>';
			newhtml +=		'<td>';
			newhtml += 		'<div class="actions">';
			newhtml +=			'<a href="#" id="addlistenerrow'+id+'"><i class="fa fa-plus" data-toggle="tooltip" title="Add new listener"></i></a>';
			newhtml +=			'<span style="font-weight:bold"> | </span>';
			newhtml +=			'<a href="#" id="dellistenerrow'+id+'"><i class="fa fa-trash" data-toggle="tooltip" title="Delete listener"></i></a>';
			newhtml +=		'</div>';
			newhtml +=		'<td class="mlext">';
			newhtml +=			'<div class="input-group">';
			newhtml +=  			'<input placeholder="Extension" type="hidden" id="listener_ext_'+id+'" name="listener_ext[]" class="form-control" value="" >';
			newhtml +=			'</div>';
			newhtml +=		'</td>';
			newhtml +=		'</td>';
			newhtml +=	'</tr>';
			curRow.parent().append(newhtml);
		} else {
			alert('A maximum of '+limitMulticast+' listeners can be added');
		}
	});
	//Del Listener Row
	$(document).on('click',"a[id^='dellistenerrow']",function(e) {
		e.preventDefault();
		var curRow = $(this).closest('tr');
		var listenerId = curRow.find("[name^='listener_id']").val();
		delMulticastType(listenerId);
		curRow.remove();
	});

	//Add Broadcast Row
	$(document).on('click',"a[id^='addbroadcastrow']",function(e) {
		e.preventDefault();
		var curRow = $("tr[id^='mbrow']").last();
		var id = $("tr[id^='mbrow']").length++;
		if (id < limitMulticast) {
			var newhtml = '';
			newhtml +=	'<tr id="mbrow'+id+'">';
			newhtml +=		'<td class="mbname">';
			newhtml +=			'<div class="input-group">';
			newhtml += 				'<input type="hidden" id="broadcast_id_'+id+'" name="broadcast_id[]" class="form-control " value="" >';
			newhtml += 				'<input placeholder="Name" maxlength="20" type="text" id="broadcast_name_'+id+'" name="broadcast_name[]" class="form-control " value="" >';
			newhtml +=			'</div>';
			newhtml +=		'</td>';
			newhtml +=		'<td class="mbipaddress">';
			newhtml +=			'<div class="input-group">';
			newhtml +=  			'<input placeholder="IP-Address" type="text" id="broadcast_ipaddress_'+id+'" name="broadcast_ipaddress[]" class="form-control" value="">';
			newhtml +=			'</div>';
			newhtml +=		'</td>';
			newhtml +=		'<td class="mbport">';
			newhtml +=			'<div class="input-group">';
			newhtml +=  			'<input placeholder="Port" type="text" id="broadcast_port_'+id+'" name="broadcast_port[]" class="form-control" value="" > ';
			newhtml +=			'</div>';
			newhtml +=		'</td>';
			newhtml +=		'<td class="mbcodec">';
			newhtml +=			'<div class="mbcodecselect">';
			newhtml +=				'<select class="form-control" name="broadcast_codec[]"  id="broadcast_codec_'+id+'">';
			newhtml +=					'<option value="PCMU">PCMU</option>';
			newhtml +=					'<option value="PCMA">PCMA</option>';
			newhtml +=					'<option value="G722">G722</option>';
			newhtml +=				'</select>';
			newhtml +=			'</div>';
			newhtml +=		'</td>';
			newhtml +=		'<td>';
			newhtml += 		'<div class="actions">';
			newhtml +=			'<a href="#" id="addbroadcastrow'+id+'"><i class="fa fa-plus" data-toggle="tooltip" title="Add new broadcast"></i></a>';
			newhtml +=			'<span style="font-weight:bold"> | </span>';
			newhtml +=			'<a href="#" id="delbroadcastrow'+id+'"><i class="fa fa-trash" data-toggle="tooltip" title="Delete broadcast"></i></a>';
			newhtml += 		'</div>';
			newhtml +=		'</td>';
			newhtml +=	'</tr>';
			curRow.parent().append(newhtml);
		} else {
			alert('A maximum of '+limitMulticast+' broadcasts can be added');
		}
	});

	//Del Broadcast Row
	$(document).on('click',"a[id^='delbroadcastrow']",function(e){
		e.preventDefault();
		var curRow = $(this).closest('tr');
		var broadcastId = curRow.find("[name^='broadcast_id']").val();
		delMulticastType(broadcastId);
		curRow.remove();
	});
});

//save selected tab
$(function() {
	$('a[data-toggle="tab"]').on('click', function (e) {
		localStorage.setItem('lastTab', $(e.target).attr('href'));
	});

	var lastTab = localStorage.getItem('lastTab');

	if (lastTab) {
		$('a[href="'+lastTab+'"]').click();
	}
});

function sipkeepalivesetting() {
	if($('#sipkeepalive-enable').is(':checked')) {
		$("#sipkeepaliveinterval").attr('disabled', false);
	}else{
		$("#sipkeepaliveinterval").attr('disabled', true);
	}
}

function VLANSettings() {
	var VLANMode = document.getElementById("vlanMode").value;
	if(VLANMode == '2') {
		$("#vlanIdentity").attr('disabled', false);
	}else{
		$("#vlanIdentity").attr('disabled', true);
	}
}

function quickBLFTransferSettings() {
	if($('#quickBLFTransfer-enable').is(':checked')) {
		document.getElementById("blfDirectedCallPickup-disable").checked = true;
	}
}

function quickBLFVMTransferSettings() {
	if($('#quickBLFVMTransfer-enable').is(':checked')) {
		document.getElementById("blfDirectedCallPickup-disable").checked = true;
	}
}

function blfDirectedCallPickupSettings(){
	if($('#blfDirectedCallPickup-enable').is(':checked')) {
		document.getElementById("quickBLFTransfer-disable").checked = true;
		document.getElementById("quickBLFVMTransfer-disable").checked = true;
	}
}

function mtValidation(form) {
	var result = $.ajax({
		url: "ajax.php?module=endpoint&command=mtValidation",
		type: 'POST',
		async: false,
		data: form.serialize(),
	});
	return result;
}

function getAllParkLotExt() {
	var result = $.ajax({
		url: "ajax.php?module=endpoint&command=getAllParkLotExt",
		type: 'POST',
		async: false
	});
	result = JSON.parse(result.responseText);
	return result;
}

function addAttribute(textBoxID, attributes, allParkLotExt=null) {
	var addAttribute = document.getElementById(textBoxID);
	Object.keys(attributes).forEach(attr => {
		if (attr === 'oninput') {
			attributes[attr] = "createParkLotList($(this).val(),'" + textBoxID + "', ["+ allParkLotExt +"]);";
		}
		addAttribute.setAttribute(attr, attributes[attr]);
	});
}

function removeAttribute(textBoxID, attributes) {
	var delAttribute = document.getElementById(textBoxID);
	Object.keys(attributes).forEach(attr => {
		delAttribute.removeAttribute(attr, attributes[attr]);
	});
}

function createParkLotList(extVal, inputElement, allParkLotExt) {
	var option ='';
	var inputField = document.getElementById(inputElement);
	const dataList = document.createElement('datalist');
	dataList.id = 'allparkLotExtList';
	inputField.parentNode.insertBefore(dataList, inputField.nextSibling);
	for (let i = 0; i < allParkLotExt.length; i++) {
		option += '<option value="'+allParkLotExt[i]+'">Parking Lot</option>';
		dataList.innerHTML = option;
	}
}

function dpmaAppsSupportNotification (model) {
	let notificationText = '';
	let addextraText = '';
	let dpmaAppNotification = false;
	let dpmaApps = ["App-Contacts", "App-Parking", "App-Status", "APP-Follow Me"];
	if (typeof model !== 'undefined' && model) {
		switch (model) {
			case 'P310':
			case 'P315':
				dpmaApps = dpmaApps.concat(["App-Hotdesking"]);
				addextraText =  _('.  Use Line Keys & Horizontal Soft Keys to configure.');
				dpmaAppNotification = true;
				break;
			case 'P320':
			case 'P325':
			case 'P330':
				dpmaApps = dpmaApps.concat(["APP-Queues", "App-Hotdesking (Use Line Keys & Horizontal Soft Keys to configure)", "App-Record"]);
				addextraText =  _(' (Use Horizontal Soft Keys to configure).');
				dpmaAppNotification = true;
				break;
			case 'P370':
				addextraText =  _('.  By default, these DPMA Apps are set to P370.');
				dpmaAppNotification = true;
				break;
			default:
				break;
		}
		if (dpmaAppNotification === true) {
			dpmaApps.forEach(function (item, index) {
				if (index === dpmaApps.length - 1) {
					notificationText = notificationText.substring(0, notificationText.length - 2);
					notificationText += ' and ' + item;
				} else {
					notificationText += item + ', ';
				}
			});
			document.getElementById('dpmaAppNotification').innerHTML = model + _(' supports DPMA Apps like ') + notificationText + addextraText;
			$("#dpmaAppNotification").show();
		}
		return dpmaAppNotification;
	} else {
		$("#dpmaAppNotification").hide();
		return false;
	}
}

function delMulticastType(id) {
	var result = $.ajax({
		url: "ajax.php?module=endpoint&command=dMulticastType&id="+id,
		type: 'POST',
		async: false
	});
	return result;
}

function multicastSettings() {
	if($('#multicast-enable').is(':checked')) {
		$('.section[data-id=listener]').show("slow");
		document.getElementById("showListener").style.display = "";
		$('.section[data-id=broadcast]').show("slow");
		document.getElementById("showBroadcast").style.display = "";
	}else{
		$('.section[data-id=listener]').hide("slow");
		document.getElementById("showListener").style.display = "none";
		$('.section[data-id=broadcast]').hide("slow");
		document.getElementById("showBroadcast").style.display = "none";
	}
}