$(document).ready(function() {
	//for admin view on extension mapping
	var modelKeyValidate, allParkLotExt = false;
	const attributes = {
		oninput: 'createParkLotList($(this).val());',
		list: 'allparkLotExtList',
		autocomplete: 'off'
	};
	$(".saveAdmin").click(function(event) {
		event.preventDefault();
		//event.stopPropagation();
		event.stopImmediatePropagation();
		var e = document.getElementById("taskAdmin");
		var task = e.options[e.selectedIndex].value;
		var data = $('.saveAdminForm').serialize();

		//save not needed, because we always save, option is just for looks
		data = (task == "rebuild") ? data + "&rebuild=1":data;
		data = (task == "restart") ? data + "&rebuild=1&restart=1":data;
		data = (task == "reset") ? data + "&reset=1":data;

		$.post( endpointBaseAjaxUrl + "&quietmode=1&command=savesettings", data, function( data ) {
			if (!data.status && data.message !== null && data.valueIDs !== null) {
				alert(data.message);
				data.valueIDs.forEach(function(valueIDs) {
					document.getElementById(valueIDs).style.border="2px solid red";
				});
				return data.status;
			}
			if (data.status) {
				location.reload(true);
				return true;
			} else {
				location.reload(true);
				return false;
			}
		});
	});

	var modelVal = $("input[name='model']").val();
	var brandVal = $("input[name='brand']").val();
	$("#dpmaAppNotification").hide();
	if (typeof modelVal !== 'undefined' && typeof brandVal !== 'undefined') {
		if (brandVal.toLowerCase() == 'digium') {
			switch(modelVal) {
				case 'P310':
				case 'P315':
				case 'P320':
					$("#linekeysnotes").text(_('Note: Every line(mapped extension) on a ' + modelVal + ' will override any key settings specified here.  This means that key 1 should not be set.  Adding a second line will also override whatever is set for key 2.'));
					modelKeyValidate = true;
					dpmaAppsSupportNotification(modelVal);
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
					modelKeyValidate = true;
					dpmaAppsSupportNotification(modelVal);
					break;
				case 'D65':
					$("#linekeysnotes").text(_('Note: Every line(mapped extension) on a ' + modelVal + ' will override any keys specified here for every page.  This means that keys 1,7,13,etc should not be used.  Adding a second line will increase the list to 2,8,14,etc.'));
					break;
				default:
					break;
			}
		}
	}

	//uncheck all boxes for keytypes
	$(document).on('change', '.keyType', function() {
		var box = $(this).attr('name');
		$('.keyType').prop("checked", false);
		$('#' + box).prop("checked", true);
	});
	//uncheck all boxes for horizontal states
	$(document).on('change', '.hkeyType', function() {
		var box = $(this).attr('name');
		$('.hkeyType').prop("checked", false);
		$('#' + box).prop("checked", true);
	});

	//show/hide boxes for horizontal states
	$(document).on('change', '.hkeyType', function() {
		var box = $(this).attr('name');
		$('.hideHorSoftKeys').hide();
		$('.' + box).show();
	});

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

	//show/hide boxes for algo 8128 mode selection
	$(document).on('change', '.mode', function() {
		$('.modeNotify').hide();
		$('.modeMessage').hide();
		$('.modeRing').hide();
		var box = $(this).attr('id');
		$('.' + box).show();
		//console.log($(this).attr('id'));
	});

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
				$("."+name+'state').hide();
				$("#" + name + 'keyevent').hide();
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
				$("."+name+'state').hide();
				$("#" + name + 'acct').attr('disabled', false);
				$('#allparkLotExtList').empty();
				removeAttribute(name + 'value', attributes);
				break;
			//now park
			case 'Call Park':
				$("#" + name + 'park').show();
				$("#" + name + 'xml').hide();
				$("." + name + 'value').hide();
				$("#" + name + 'value').hide();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("."+name+'state').hide();
				break;
			case 'Voicemail':
			case 'Intercom':
			case 'DND':
			case 'Record':
				$("#" + name + 'park').hide();
				$("#" + name + 'xml').hide();
				$("." + name + 'value').hide();
				$("#" + name + 'value').hide();
				$("." + name + 'valueFill').show();
				$("#" + name + 'label').val($(this).find("option:selected").text());
				$("." + name + 'labelFill').hide();
				$("."+name+'state').hide();
				break;
			case 'BLF':
				$("."+name+'state').show();
				$("#" + name + 'xml').hide();
				$("#" + name + 'value').show();
				$("." + name + 'value').show();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'park').hide();
				$("#" + name + 'keyevent').hide();
				if (modelKeyValidate) {
					document.getElementById(name + 'value').style.border="";
				}
				$("#" + name + 'acct').attr('disabled', false);
				$("#" + name + 'label').val($(this).find("option:selected").text());
				$('#allparkLotExtList').empty();
				removeAttribute(name + 'value', attributes);

			break;
			case 'Key Event':
				var modelVal = $("input[name='model']").val();
				switch(modelVal) {
					case 'S-D713':
					case 'S-D335':
					case 'S-D385':
					case 'S-D862':
					case 'S-D865':
						$("#" + name + 'value').hide();
						$("." + name + 'valueFill').hide();
						$("." + name + 'label').show();
						$("." + name + 'labelFill').hide();
						$("#" + name + 'keyevent').show();
					break;
				}
				break;
			case 'Parking Status':
				$("#" + name + 'xml').hide();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'value').show();
				$("#" + name + 'acct').attr('disabled', true);
				$("#" + name + 'label').val($(this).find("option:selected").text());
				if (modelKeyValidate) {
					document.getElementById(name + 'value').style.border="";
				}
				if (allParkLotExt === false) {
					allParkLotExt = getAllParkLotExt();
				}
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
				$("."+name+'state').hide();
				$("#" + name + 'keyevent').hide();
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

	$(document).on('click', '.blfAlert, .none', function(e){
			var clickedInput = $(this);
			var parent = $(this).parent();
			if (clickedInput.hasClass('none')) {
			var allChildInputs = parent.children('input.blfAlert'); 
			} else {
			var allChildInputs = parent.children('input.none'); 
			}
			allChildInputs.each(function(k,v) {
				$(this).prop('checked', false);
		});
	});


	//for hor states
	$(document).on('change', '.horDropDown', function() {
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
				break;

			default:
				$("#" + name + 'label').val(txt);
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
	$(document).on('change', '.KeyEvent', function() {
		var name = $(this).prop('name');
		var length = name.length;
		name = name.substr(0, length - 8);
		var txt = $(this).find("option:selected").text();
		switch($(this).find("option:selected").text()){
			case 'None':
			case 'Accepted Calls':
			case 'Call Lists':
			case 'Clear Pickup Info':
			case 'Conference':
			case 'Contacts':
			case 'Directory':
			case 'Delete Message':
			case 'DND':
			case 'Favorites':
			case 'Headset':
			case 'Help':
			case 'Hold':
			case 'Instant Redial':
			case 'Menu':
			case 'Missed Calls':
			case 'Monitor Calls':
			case 'Multicast Zones':
			case 'Mute':
			case 'Next Outgoing ID':
			case 'Next Label Page':
			case 'OCIP':
			case 'Prev Outgoing ID':
			case 'Pool':
			case 'Presence State':
			case 'Previous Label Page':
			case 'Redial':
			case 'Reboot':
			case 'Ringer Silent':
			case 'Server Directory':
			case 'Voicemail':
			case 'Voicemail Info':
				$("#" + name + 'label').val(txt);
				break;
			default:
				break;
		}
	});

});

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
	let dpmaApps = ["App-Contacts", "App-Parking", "App-Status", "App-Follow Me"];
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