$(document).ready(function() {
	const basestationModels = ['DB20', 'M900', 'M400'];
	$('#dialog-form').hide();
	$(document).on('change', '.ext', function(){
		if($(this).val() == 'Custom'){
			$( "#dialog-form" ).dialog({
				autoOpen: false,
				height: 300,
				width: 350,
				modal: true
			});
			$( "#dialog-form" ).dialog( "open" );
			$('#record').html('<input type="hidden" size="20" name="cRecord" id="cRecord" value="' + $(this).attr('id') + '" />');
		}

		getVpnClients($(this).val());
	});
	$('#send-button').click(function(){
		// validate
		$('.error').hide();
		var cExt = $("input#cExt").val();
		if (cExt == ""){
			$("label#cExt_error").show();
			$("input#cExt").focus();
			return false;
		}
		var cSecret = $("input#cSecret").val();
		if (cSecret == ""){
			$("label#cSecret_error").show();
			$("input#cSecret").focus();
			return false;
		}
		var cLabel = $("input#cLabel").val();
		var record = $("input#cRecord").val();
		var cDestination = $("input#cDestination").val();
		var cSipPort = $("input#cSipPort").val();

		var dataString = 'display=endpoint&view=save_custom&cExt=' + cExt + '&cSecret=' + cSecret + '&cLabel=' + cLabel + '&cDestination=' + cDestination + '&cSipPort=' + cSipPort;
		$.ajax({
			type: "POST",
			url: "config.php",
			data: dataString,
			success: function(data) {
				$('#dialog-form').html("<div id='message'></div>");
				$('#message').html("<h2>Extension Added.</h2>")
				var select = document.getElementById(record);
				select.options[select.options.length] = new Option(cExt + '-' + cLabel, cExt + '-' + cLabel, '', '1');
				$('#dialog-form').dialog('close');
			}
		});
		return false;

	});

	$(document).on('change', 'select[name^="basestation["], select[name="basestation_exist"]', function() {
		var name = $(this).attr('name');
		changeBasestation(name.substring(11, name.length));
	});


	$(document).on('change', 'select[name^="brand_model["], select[name="brand_model_exist"]', function() {
		var name = $(this).attr('name');
		changeModel(name.substring(11, name.length), basestationModels);
	});

	function changeBasestation(ext) {
		var basestation = $('select[name="basestation' + ext + '"]').val();
		if (basestation !== '' && basestations[basestation]) {
			$('select[name="template' + ext + '"]').val(basestations[basestation]['template']);
		}
	}

	function changeModel(ext, basestationModels) {
		if (basestationModels.includes($('select[name="brand_model' + ext + '"]').val())) {
			$('label[for="mac' + ext + '"]').text(_("Basestation"));
			$('input[name="mac' + ext + '"]').hide();
			$('select[name="acct' + ext + '"]').hide();
			$('select[name="template' + ext + '"]').hide();
			var select = $('select[name="basestation' + ext + '"]');
			var oldval = select.val() ? select.val() : select.data('origvalue');
			select.empty();
			select.append('<option value="">Select Basestation</option>');
			$.each(basestations, function(id, basestation) {
				select.append('<option value="' + id + '"' + (oldval == id ? ' selected' : '') + '>' + basestation['name'] + ' (' + basestation['mac'] + ')</option>');
			});
			select.show();
			changeBasestation(ext);
		} else {
			if (!$('input[name="mac' + ext + '"]').is(":visible")) {
				$('label[for="mac' + ext + '"]').text(_("MAC Address"));
				$('input[name="mac' + ext + '"]').show();
				$('select[name="acct' + ext + '"]').show();
				$('select[name="template' + ext + '"]').show();

				$('select[name="basestation' + ext + '"]').hide().val('');
			}
		}
	}

	$(document).on('change', '.content select[name^="brand["], select[name="brand_exist"]', function() {
        var name = $(this).attr('name');
        if(name == 'brand_exist'){
            $("input[name='edit_exist']").attr('checked', true);
        }

        var ext_list = '';
        var mod_list = '';
        if($(this).val() == 'Aastra'){
            $.each(aastra, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(aastraModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Algo'){
            $.each(algo, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(algoModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'AND'){
            $.each(and, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(andModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'And'){
            $.each(and, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(andModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Audiocodes'){
            $.each(audiocodes, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(audiocodesModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Cisco'){
            $.each(cisco, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(ciscoModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Cortelco'){
            $.each(cortelco, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(cortelcoModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Cyberdata'){
            $.each(cyberdata, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(cyberdataModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Digium'){
            $.each(digium, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(digiumModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Grandstream'){
            $.each(grandstream, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(grandstreamModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Htek'){
            $.each(htek, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(htekModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Incom'){
            $.each(incom, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(incomModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Konftel'){
            $.each(konftel, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(konftelModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Mitel'){
            $.each(mitel, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(mitelModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Mocet'){
            $.each(mocet, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(mocetModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Obihai'){
            $.each(obihai, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(obihaiModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Panasonic'){
            $.each(panasonic, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(panasonicModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Phoenix'){
            $.each(phoenix, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(phoenixModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Polycom'){
            $.each(polycom, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(polycomModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Sangoma'){
            $.each(sangoma, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(sangomaModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Snom'){
            $.each(snom, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(snomModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Uniden'){
            $.each(uniden, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(unidenModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Vtech'){
            $.each(vtech, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(vtechModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Xorcom'){
            $.each(xorcom, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(xorcomModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        } else if($(this).val() == 'Yealink'){
            $.each(yealink, function(key, value){
                ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
            });
            $.each(yealinkModels, function(key, value){
                mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
            });
        }

        name = name.substring(5,name.length);
        $("[name='template" + name+"']").find('option')
                                        .remove()
                                        .end()
                                        .append(ext_list);
        $("[name='brand_model" + name+"']").find('option')
                                     .remove()
                                     .end()
                                     .append(mod_list);

	changeModel(name, basestationModels);
    });

	$(document).on('click', '.all', function(event) {
		if ($(event.target).is(":checkbox")) {
			return true;
		}
		var checkbox = $(this).find("input[type=checkbox]");
		checkbox.prop("checked", !checkbox[0].checked);
		return false;
	});


	$(document).on('click', '#use_selected', function(event) {
		var formId = $(this).data('form');
		var form = $('form');

		if (formId !== 'undefined') {
			form = $('form#'+formId);
		}
		if ($('select[name="task"]').val() == "delete") {
			extSubmit(form);
		} else  {
			validateAndSubmitExt(form, formId, basestationModels);
		}
		return false;
    	});

	$(document).on('click', '.editExt', function(e) {
		$.get(endpointBaseAjaxUrl + '&command=extEdit&vals=' + $(this).attr('data.vals'), function(data) {
			var page = data.message;

			$("#editExt").html("");
			$("#editExt").append(page);
			
			var $dialog = $('#editExt').dialog({
				autoOpen: false,
				modal: true,
				height: 700,
				width: 750,
				title: "Edit Extension",
				open: function() {
					changeModel('_exist', basestationModels);
				}
			});
			$dialog.dialog('open');

			getVpnClients($('.ext').val());
			return false;
		});
	});

	$(document).on('click', '.rebootSangoma', function(e) {
		e.preventDefault();
		var brandval = $(this).attr('data.brand');
		if(brandval == 'sangoma') {
			var cmd = 'rebootSangoma';
		}
		if(brandval == 'digium') {
			var cmd = 'rebootDigium';
		}
		$.get(endpointBaseAjaxUrl + '&command='+cmd+'&ext=' + $(this).attr('data.ext'), function(data) {
			var page = data.message;
			return false;
		});
	});
	$(document).on('click', '.syncSangoma', function(e) {
		e.preventDefault();
		var brandval = $(this).attr('data.brand');
		var account = $(this).attr('data.account');
		if(brandval == 'sangoma') {
			var cmd = 'syncSangoma';
		}
		if(brandval == 'digium') {
			var cmd = 'syncDigium';
		}
	    $.get(endpointBaseAjaxUrl + '&command='+cmd+'&ext=' + $(this).attr('data.ext')+'&account=' + account, function(data) {
			var page = data.message;
			return false;
		});
	});
	$(document).on('click', '.updateConfiguredBy', function(e) {
		e.preventDefault();
		mac = $(this).attr('data.mac');
		if(mac == '') {
			alert(_("Configured By setting can't be changed if MAC Address is empty."));
			return false;
		}
		$.ajax({
			url: "/admin/ajax.php",
			data: {
				module: 'endpoint',
				command: 'updateConfiguredBy',
				ext: $(this).attr('data.ext'),
				config_val : $(this).attr('data.config_val'),
                        },
                        type: "POST",
                        success: function(data) {
				window.location.reload(true);
                        }
                });
	});

	uncheckAllExt();
	$("table").on("page-change.bs.table", function () {
		uncheckAllExt();
	});

	$(document).on('click', '#pjsipExt', function() {
		var extid = $(this).data('id');
		$.get("ajax.php?module=endpoint&command=get_pjsip_AOR&extid="+extid, function (data) {
			if(data.status) {
				$('.modal-body').html(`<pre>${data.message}</pre>`);
				$('#pjsipaor').modal('show');
			}
		});
		return false;
	});
});

/* Ideally this should be done by bootstrap table but seems like 
 * its not behaving properly so adding logic here to uncheck after table loading..*/
function uncheckAllExt() {
	setTimeout(function(){
		$('table#extensions').bootstrapTable('uncheckAll');
		},
	1);
}


function extSubmit(form) {
	$.ajax({
		type: "POST",
		url: window.location.href,
		data: form.serialize(),
		success: function(data) {
			window.location.reload(true);
		    }
	 });
}

function validateAndSubmitExt(form, formId, basestationModels) {
	var dpmastatus = $('#dpma_status').val();
	if (newCount > 1 ) {
		//Adding new extension mapping
		for (i = 1; i < newCount; i++) {
			var bname = $('#brand_'+i).val();
			var model = $('#brand_model_'+i).val();
			var tname = $('#template_'+i).val();
			var mac   = $('#mac_'+i).val();
			var acct  = $('select[name="acct['+i+']"]').val();
			var ext   = $('select[name="ext['+i+']"]').val();

			if (bname == 'Select Brand') {
				alert(_("Please select brand before proceeding with submission.."));
				return false;
			}

			if (model == 'Select') {
				alert(_("Please select model before proceeding with submission.."));
				return false;
			}
			if (basestationModels.includes(model)) {
				mac = $('#basestation_'+i).val();
			} else {
				if (acct == '') {
					alert(_("Please select Account before proceeding with submission.."));
					return false;
				}
			}

			if (mac == '') {
				if(dpmastatus == 'Y' && bname == 'Digium') {
					if(acct != 'account1') {
						alert(_("Mac address must be entered for " + acct));
						return false;
					}
				} else {
					if(!confirm(_("MAC address is blank. This means this extensions will only work with phones that support the hotdesking functionality. Are you ok to configure this extension ?"))) {
						return false;
					}
				}
			}

			//if a mac is included, validate the mac while disregarding any non-alphanumeric chars(delimiters)
			//the actual delimeter cleanup happens before storing to the db
			if (!basestationModels.includes(model) && mac !== '') {
				if (!/^([0-9A-Fa-f]{12})$/.test(mac.replace(/[^0-9A-Za-z]/g, ''))) {
					alert(_('Invalid MAC Address entered.'));
					return false;
				}
			}

			if(dpmastatus == 'Y' && bname == 'Digium' && acct != 'account1' && mac !='') {
				var ret = checkMacAddress(mac);
				obj = JSON.parse(ret.responseText);
				if(!obj.status) {
					alert(_("No matching MAC Address found. The entered MAC Address for this extension mapping must match the MAC Address of an existing Digium extension mapping that is set for Account1."));
					return false;
				}
			}

			templateValidation(ext, tname, bname, model, acct, mac, form, true);
		}
	} else if (formId.trim() == 'extEditModal') {
		//Edit extension
		var bname = $('select[name="brand_exist"]').val();
		var tname = $('select[name="template_exist"]').val();
		var model = $('select[name="brand_model_exist"]').val();
		var acct  = $('select[name="acct_exist"]').val();
		var ext   = $("input[name=ext_exist]").val();
		var mac   = $("input[name=mac_exist]").val();
		var extEditModalTask = $("#extEditModalTask").val();

		if (basestationModels.includes(model) && extEditModalTask != 'delete') {
			if ($("input[name=accessory_exist]").val() == '') {
				if(!confirm(_("IPEI value is blank. Are you ok to configure this "+model+" extension without IPEI ?"))) {
					return false;
				}
			}
		}

		if (!basestationModels.includes(model) && mac !== '' && extEditModalTask != 'delete') {
			if (!/^([0-9A-Fa-f]{12})$/.test(mac.replace(/[^0-9A-Za-z]/g, ''))) {
				alert(_('Invalid MAC Address entered.'));
				return false;
			}
		}

		if (mac == '' && dpmastatus == 'Y' && bname == 'Digium' && acct != 'account1'&& extEditModalTask != 'delete') {
			alert(_("Mac address must be entered for " + acct));
			return false;
		}

		if(dpmastatus == 'Y' && bname == 'Digium' && acct != 'account1' && mac !='' && extEditModalTask != 'delete') {
			var ret = checkMacAddress(mac);
			obj = JSON.parse(ret.responseText);
			if(!obj.status) {
				alert(_("No matching MAC Address found. The entered MAC Address for this extension mapping must match the MAC Address of an existing Digium extension mapping that is set for Account1."));
				return false;
			}
		}

		templateValidation(ext, tname, bname, model, acct, mac, form, true);
	} else {
		count=1;
		//Selecting checkbox from Extension mapping page
		// We should validate all the selected extensions and 
		// then submit form only after last selected extemsions validation.
		$('input[name="btSelectItem"]:checked').each(function() {
			var tname = $(this).closest('tr').data('template');
			var bname = $(this).closest('tr').data('brand');
			var model = $(this).closest('tr').data('model');
			var mac   = $(this).closest('tr').data('mac');
			var acct  = $(this).closest('tr').data('account');
			var ext   = $(this).closest('tr').data('ext');
			if (count == $('input[name="btSelectItem"]:checked').length) {
				templateValidation(ext, tname, bname, model, acct, mac, form, true);
			} else {
				templateValidation(ext, tname, bname, model, acct, mac, form, false);
			}
			count++;
		});
	} 

	return true;
}

var newCount = 1;

function addExtension(ext, brands) {
    $('#epbulk').removeClass('hidden');
    var trCount = $('tr').length;
    var clonedRow = $("tr:last");
    var extensions = $('table#extensions').html();

    var ext_list = '<tr><td><input type="checkbox" name="select[' + newCount + ']" checked></td><td><select name="ext[' + newCount + ']" id="ext[' + newCount + ']" class="ext" >';
    $.each(ext, function(key, value) {
	    ext_list = ext_list + '<option value="' + key + '">' + key + ' ' + value + '</option>';
    });

    ext_list = ext_list + '</select>';
    ext_list = ext_list + '<br /><select name="acct[' + newCount + ']" id="acct[' + newCount + ']" class="acct" >';
    ext_list = ext_list + '<option value="">Select Account</option>';
    for (i = 1; i <= 8; i++) {
        ext_list = ext_list + '<option value="account' + i + '">Account ' + i + '</option>';
    }
    ext_list = ext_list + '</select></td>';

    ext_list = ext_list + '<td><select name="brand[' + newCount + ']" id="brand_' + newCount + '" >';
    ext_list = ext_list + '<option>Select Brand</option>';
    $.each(brands, function(key, value){
	if (value == 'Digium') {
		value = _('Sangoma D & P Series');
	} else if (value == 'Sangoma') {
		value = _('Sangoma S Series');
	}
        ext_list = ext_list + '<option value="' + key + '">' + value + '</option>';
    });
    ext_list = ext_list + '</select><br />';
    ext_list = ext_list + '<input name="mac[' + newCount + ']" id="mac_' + newCount + '" value="" size="15" placeholder="MAC Address">';
    ext_list = ext_list + '<select name="basestation[' + newCount + ']" id="basestation_' + newCount + '" style="display:none;">';
    ext_list = ext_list + '<option value="" selected>Select Basestation</option>';
    ext_list = ext_list + '</select>';
    ext_list = ext_list + '</td>';
    ext_list = ext_list + '<td><select name="template[' + newCount + ']" id="template_' + newCount + '"><option value="0"> Select Template</option></select><br /><select name="brand_model[' + newCount + ']" id="brand_model_' + newCount + '"><option value="0"> Select Model</option></select></td>';
    ext_list = ext_list + '<td></td><td></td></tr>';

    $("table#extensions").append(ext_list);

    newCount += 1;
}

function displayImport(){
    $('#extensions').hide();
    $('#import').show();
}

function displayAdvanced(ext){
    $('.' + ext).toggle();
}
function styleRow(row, idx){
  color = row._data.color;
  var retclass = 'success';
  if(color == '#C69C6D;'){
    retclass = 'warning';
  }
  return {'classes':retclass};

}
$(document).on('change', 'input[name^="btSelect"]', function(){
  if($("input[name='btSelectItem']:checked").length > 0){
    $('#epbulk').removeClass('hidden');
    var html = '';
    $("input[name='btSelectItem']:checked").each(function(){
      var ext = $(this).closest('tr').data('ext');
      html += '<input type="hidden" name="select_exist['+ext+']" value="on">';
    });
    $("#select_exist").html(html);
  }else{
    $('#epbulk').addClass('hidden');
    $("#select_exist").html('');

  }
});

function getVpnClients(extension) {
	clientlist = $('.vpnclient');

	clientlist.empty();

	$.ajax({
		url: "/admin/ajax.php",
		data: {
			module: 'endpoint',
			command: 'getVpnClients',
			extension: extension,
		},
		type: "GET",
		dataType: "json",
 		success: function(data) {
			clients = JSON.parse(data.message);
			$.each(clients, function(id, client) {
				clientlist.append('<option value="' + client['key'] + '"' + (client['key'] == data.selected ? " selected" : "") + '>' + client["description"] + '</option>');
			});
		}
	});

	clientlist.append('<option value="">None</option>');

	return false;
}

function templateValidation(ext, tname, bname, model, acct, mac, form, submit) {
	$.ajax({
		url: "/admin/ajax.php",
		data: {
			module: 'endpoint',
			command: 'tValidation',
			ext: ext,
			template_name: tname,
			brand: bname,
			model: model,
			mac: mac,
			account: acct
		      },
		type: "GET",
 		success: function(data) {
			if (data.status) {
				if (data.message) {
					if (!confirm(data.message)) {
						return false;
					}
				}
				if (submit) {
					extSubmit(form);
				}
			} else {
				alert(data.message);
			}
		}
	});
	
	return true;
}

function checkMacAddress(mac) {
	var result = $.ajax({
			url: "ajax.php?module=endpoint&command=checkMac",
			type: 'POST',
			async: false,
			data: {mac: mac}
		});
	return result;
}
