var EndpointC = UCPMC.extend({
	init: function() {

	},
	poll: function(data) {

	},
	displayWidgetSettings: function(widget_id, dashboard_id) {
		//Below is to handle sortable on our ajax calls.
		var modelKeyValidate, allParkLotExt = false;
		const attributes = {
			oninput: 'ucpCreateParkLotList($(this).val());',
			list: 'allparkLotExtList',
			autocomplete: 'off'
		};
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
		var EndpointSortable = function() {
		var hidden, result, brand_name;
		  hidden = void 0;
		  result = void 0;
		  brand_name = void 0;
		  if ($("#widget_settings .modal-body ul.sortable").length <= 0) {
		    return true;
		  }
		  $("#widget_settings .modal-body ul.sortable").sortable({
		    change: function () {
			let staticList = $('.static', this).detach();
				    if ($('#sortable .row:first').length) {
					    staticList.insertBefore('#sortable > .row:first');
				    } else {
					    $('#sortable').append(staticList);
				    }
		    },
		    update: function(event, ui) {
		      var test;
		      test = void 0;
		      var result = [];

		      //Can't use sortable('toArray') here
		      $(this).find('li').each(function(i, el){
		          result.push($(el).attr('id'));
		      });

		      test = result[0].split("_"[0]);
		      brand_name = $("input[name='brand_name']").val();
		      if (brand_name !== 'undefined' && test[1] === 'horsoftkeys' && brand_name === 'digium') {
			hidden = test[0] + "_" + test[1] + "_" + test[2].substr(0, 2) + "order";
		      } else {
			//model_keytype_order
			hidden = test[0] + "_" + test[1] + "_order";
		      }

		      $("input[name=" + hidden + "]").val(result);

		    }
		  });
		};

		EndpointSortable();

		$("#widget_settings .modal-body a.info").each(function() {
			$(this).after("<span class=\"help\"><i class=\"fa fa-question-circle\" data-placement=\"bottom\"  data-toggle=\"tooltip\" title=\""+$(this).find("span").html()+"\"></i></span>");
			$(this).find("span").remove();
			$(this).replaceWith($(this).html());
		});

		$('#widget_settings .modal-body [data-toggle="tooltip"]').tooltip()

		$("#widget_settings .modal-body .horDropDown").change(function() {
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
				case 'REST-Voicemail':
					txt = txt.substr(5, lTxt);
					$("#" + name + 'label').val(txt);
					break;

				default:
					$("#" + name + 'label').val(txt);
					break;
			}
		});
		$("#widget_settings .modal-body .digiumhorDropDown").change(function() {
			var name = $(this).prop('name');
			var length = name.length;
			name = name.substr(0, length - 5);
			var txt = $(this).find("option:selected").text();
			var lTxt = txt.length;
			switch($(this).find("option:selected").text()) {
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
				case 'REST-Voicemail':
					txt = txt.substr(5, lTxt);
					$("#" + name + 'label').val(txt);
					document.getElementById(name + 'label').readOnly = false;
					break;
				case 'APP-Contacts':
				case 'APP-Parking':
				case 'APP-Status':
				case 'APP-Queues':
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
		$("#widget_settings .modal-body .xmlDropDown").change(function() {
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
				case 'REST-Voicemail':
					$("#" + name + 'label').val(txt);
					break;

				default:
					break;
			}
		});

		if (modelKeyValidate) {
			$("#widget_settings .modal-body input").change(function() {
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

		$("#widget_settings .modal-body .saveTemplate").click(function(event) {
			event.preventDefault();
			event.stopPropagation();

			var e = document.getElementById("task");
			var task = e.options[e.selectedIndex].value;

			var data = $("#widget_settings .modal-body form");

			var formData = {};
			data.serializeArray().forEach(function(x) { 
				//For blf keys, the ucp gui is saving the state key name with [] at the end.  
				//This ends up causing problems, and will be stripped:
				//ex. S700_linekeys_2_state[] = 'Audio '
				//Also, the state value comes in as a string, but is expected to be an array 
				//in the POST, which can have up to 2 items, ex. ['Audio ', 'Visual ']  
				if ((x.name.match(/_linekeys_/) || x.name.match(/_softkeys_/)) && x.name.match(/_state\[\]$/)) { 
					x.name = x.name.replace(/\[\]$/, '');
					if (formData[x.name]) { 
						formData[x.name].push(x.value);
					} else {
						formData[x.name] = new Array(x.value);
					}
				} else {
					formData[x.name] = x.value; 
				}
			});

			//save not needed, because we always save, option is just for looks
			if (task == 'rebuild') {
			        formData['rebuild'] = "1";
			}
			if (task == 'restart') {
				formData['rebuild'] = "1";
				formData['restart'] = "1";
			}
			if (task == 'reset') {
				formData['reset'] = "1";
			}
			$.post( UCP.ajaxUrl+"?module=endpoint&command=savesettings", { data : JSON.stringify(formData) } , function( data ) {
				if (!data.status && data.message !== null && data.valueIDs !== null) {
					alert(data.message);
					data.valueIDs.forEach(function(valueIDs) {
						document.getElementById(valueIDs).style.border="2px solid red";
					});
					return data.status;
				}
				if (data.status) {
					$("#widget_settings").modal('toggle');
					return true;
				} else {
					return false;
				}
			});
		});

		$("#widget_settings .modal-body .keyType").change(function() {
			var name = $(this).prop('name'),
					length = name.length,
					secname = name.substr(8, length);
			if($(this).is(":checked")) {
				$(".hideKeys").hide();
				$("#" + secname).show();
			}
			//someone should have just used a radio instead of a checkbox
			$("#widget_settings .modal-body .keyType").each(function() {
				if($(this).prop('name') !== name) {
					$(this).prop("checked",false);
				}
			});
		});

		$("#widget_settings .modal-body .hkeyType").change(function() {
			var name = $(this).prop('name');
			$(".hideHorSoftKeys").hide();
			if($(this).is(":checked")) {
				$("." + name).show();
			}
			//someone should have just used a radio instead of a checkbox
			$("#widget_settings .modal-body .hkeyType").each(function() {
				if($(this).prop('name') !== name) {
					$(this).prop("checked",false);
				}
			});
		});

		$("#widget_settings .modal-body .type").change(function() {
			var name = $(this).prop('name');
			var length = name.length;
			name = name.substr(0, length - 4);

			if($("#" + name + 'acct').val() === ''){
				$("#" + name + 'acct').val('account1');
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
					$("." + name + 'state').hide();
					$('#allparkLotExtList').empty();
					$("#" + name + 'acct').attr('disabled', false);
					ucpRemoveAttribute(name + 'value', attributes);
					break;

				//now xml-api
				case 'XML-API':
					$("#" + name + 'xml').show();
					$("." + name + 'value').show();
					$("#" + name + 'value').hide();
					$("." + name + 'valueFill').hide();
					$("." + name + 'label').show();
					$("." + name + 'labelFill').hide();
					$("." + name + 'state').hide();
					$('#allparkLotExtList').empty();
					$("#" + name + 'acct').attr('disabled', false);
					ucpRemoveAttribute(name + 'value', attributes);
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
					$("." + name + 'state').hide();
					break;

				case 'Voicemail':
				case 'Intercom':
				case 'DND':
				case 'Record':
				case 'LDAP':
					$("#" + name + 'park').hide();
					$("#" + name + 'xml').hide();
					$("." + name + 'value').hide();
					$("#" + name + 'value').hide();
					$("." + name + 'valueFill').show();
					$("#" + name + 'label').val($(this).find("option:selected").text());
					$("." + name + 'labelFill').hide();
					$("." + name + 'state').hide();
					break;

				case 'BLF':
					$("." + name + 'state').show();
					$("." + name + 'value').show();
					$("." + name + 'valueFill').hide();
					$("." + name + 'label').show();
					$("." + name + 'labelFill').hide();
					$('#allparkLotExtList').empty();
					if (modelKeyValidate) {
						document.getElementById(name + 'value').style.border="";
					}
					$("#" + name + 'acct').attr('disabled', false);
					ucpRemoveAttribute(name + 'value', attributes);
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
						allParkLotExt = ucpGetAllParkLotExt();
					}
					ucpAddAttribute(name + 'value', attributes, allParkLotExt);
				break;
				case 'APP-Status':
				case 'APP-Contacts':
				case 'APP-Parking':
				case 'APP-Hotdesking':
				case 'APP-Voicemail':
					let defaultlabel;
					$("#" + name + 'xml').hide();
					$("." + name + 'value').hide();
					$("#" + name + 'value').hide();
					$("." + name + 'valueFill').hide();
					$("." + name + 'label').show();
					$("." + name + 'labelFill').hide();
					$('#allparkLotExtList').empty();
					$("#" + name + 'acct').attr('disabled', true);
					if ($(this).find("option:selected").text() === 'APP-Hotdesking') {
						defaultlabel = 'Logout';
					} else {
						defaultlabel = $(this).find("option:selected").text().substr(4);
					}
					$("#" + name + 'label').val(defaultlabel);
					ucpRemoveAttribute(name + 'value', attributes);
				break;
				default:
					$("#" + name + 'xml').hide();
					$("#" + name + 'value').show();
					$("." + name + 'value').show();
					$("." + name + 'valueFill').hide();
					$("." + name + 'label').show();
					$("." + name + 'labelFill').hide();
					$("#" + name + 'park').hide();
					$("." + name + 'state').hide();
					if (modelKeyValidate) {
						document.getElementById(name + 'value').style.border="";
					}
					$("#" + name + 'acct').attr('disabled', false);
					$('#allparkLotExtList').empty();
					$("#" + name + 'label').val($(this).find("option:selected").text());
					ucpRemoveAttribute(name + 'value', attributes);
					break;
			}
		});
	},
	validatePass: function(passInfo){
		if (passInfo.field.val() === undefined) {
			return;
		}
		if (passInfo) {
			//it's NOT valid
			if (passInfo.field.val().length > 0) {
				if(passInfo.field.val().length <6){
					passInfo.field.addClass("globalError");
					passInfo.error.text(passInfo.name + " Password MUST be at least 6 characters");
					passInfo.error.addClass("globalError");
					return false;
				} else { //it's valid
					passInfo.field.removeClass("globalError");
					passInfo.error.text(" ");
					passInfo.error.removeClass("globalError");
					return true;
				}
			}
		}
	}
});

function ucpGetAllParkLotExt() {
	var result = $.ajax({
		url: UCP.ajaxUrl+"?module=endpoint&command=getAllParkLotExt",
		type: 'POST',
		async: false
	});
	result = JSON.parse(result.responseText);
	return result;
}

function ucpAddAttribute(textBoxID, attributes, allParkLotExt=null) {
	var addAttribute = document.getElementById(textBoxID);
	Object.keys(attributes).forEach(attr => {
		if (attr === 'oninput') {
			attributes[attr] = "ucpCreateParkLotList($(this).val(),'" + textBoxID + "', ["+ allParkLotExt +"]);";
		}
		addAttribute.setAttribute(attr, attributes[attr]);
	});
}

function ucpRemoveAttribute(textBoxID, attributes) {
	var delAttribute = document.getElementById(textBoxID);
	Object.keys(attributes).forEach(attr => {
		delAttribute.removeAttribute(attr, attributes[attr]);
	});
}

function ucpCreateParkLotList(extVal, inputElement, allParkLotExt) {
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
	let dpmaApps = ["App-Contacts", "App-Parking", "App-Status"];
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
				dpmaApps = dpmaApps.concat(["App-Hotdesking (Use Line Keys & Horizontal Soft Keys to configure)", "App-Queues", "App-Record"]);
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