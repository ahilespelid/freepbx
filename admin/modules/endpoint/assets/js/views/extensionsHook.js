document.addEventListener('DOMContentLoaded', function(ev) {
	document.removeEventListener('DomContentLoaded', arguments.callees, false);


	if ($('.endpointBrand_1').val() != 'Select') {
		var oldFunction = frm_extensions_changeDriver;
		frm_extensions_changeDriver = function () {
				if (confirm(_("Extension is configured in EPM."+
					" Changing SIP Channel Driver means you need to reconfigure the EPM for this extension again.\n"+
					" Are you Sure you want to reconfigure EPM again after changing the SIP Channel Driver" +
					"(as EPM might delete this extension automatically after changing SIP channel driver) ?'"))) {
				oldFunction();
			}
		};
	}

	var pjsip_max_contacts = $('#devinfo_max_contacts').val();
	$('#devinfo_max_contacts').change(function() {
		if ($('.endpointBrand_1').val() != 'Select') {
		if (!confirm(_("Extension is configured in EPM."+
					" Changing PJSIP max contacts value means you need to reconfigure the EPM for this extension again.\n"+
					" Are you Sure you want to reconfigure EPM again after changing the max contacts " +
					"(as EPM might delete this extension automatically after changing max contacts ) ?'"))) {
			//revert to previous value
			$('#devinfo_max_contacts').val(pjsip_max_contacts);
			$('#devinfo_max_contacts').text(pjsip_max_contacts);
			return false;
		  }
		}
	});

	$(document).ready(function(){
	$('.endpointBrand').change(function(){
		var name = $(this).prop('name');
		endpointChangeBrand(name);
	});

	$('.endpointBrand').click(function(){
		var name = $(this).prop('name');
		endpointChangeBrand(name);
	});

	});
});

function endpointChangeBrand(name) {
		var idTemp = name.replace(/endpointBrand\[/, '');
		var id = idTemp.replace(/]/, '');

		var ext_list = '';
		var mod_list = '';

		var name = '.endpointBrand_' + id;

		if($(name).val() == 'Aastra'){
			$.each(aastra, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(aastraModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Algo'){
			$.each(algo, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(algoModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'AND'){
			$.each(and, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(andModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Audiocodes'){
			$.each(audiocodes, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(audiocodesModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Cisco'){
			$.each(cisco, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(ciscoModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Cortelco'){
			$.each(cortelco, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(cortelcoModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Cyberdata'){
			$.each(cyberdata, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(cyberdataModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Digium'){
			$.each(digium, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(digiumModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Grandstream'){
			$.each(grandstream, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(grandstreamModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Incom'){
			$.each(incom, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(incomModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Konftel'){
			$.each(konftel, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(konftelModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Mitel'){
			$.each(mitel, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(mitelModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Mocet'){
			$.each(mocet, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(mocetModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Obihai'){
			$.each(obihai, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(obihaiModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Panasonic'){
			$.each(panasonic, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(panasonicModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Phoenix'){
			$.each(phoenix, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(phoenixModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Polycom'){
			$.each(polycom, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(polycomModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Sangoma'){
			$.each(sangoma, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(sangomaModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Snom'){
			$.each(snom, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(snomModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}       
		if($(name).val() == 'Uniden'){
			$.each(uniden, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(unidenModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Vtech'){
			$.each(vtech, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(vtechModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		} 
		if($(name).val() == 'Xorcom'){
			$.each(xorcom, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(xorcomModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}
		if($(name).val() == 'Yealink'){
			$.each(yealink, function(key, value){
				ext_list = ext_list + '<option value="' + value + '">' + value + '</option>';
			});
			$.each(yealinkModels, function(key, value){
				mod_list = mod_list + '<option value="' + value + '">' + value + '</option>';
			});
		}

		// For first time extenstion creation, endpointExt[x] will be empty so set this properly.
		if ($('input[name="endpointExt['+id+']"]').val() == "") {
			$('input[name="endpointExt['+id+']"]').val($('#extension').val());
		}


		$('.endpointTemplate_' + id).find('option')
																		.remove()
																		.end()
																		.append(ext_list);
		$('.endpointModel_' + id).find('option')
																 .remove()
																 .end()
																 .append(mod_list);
	}
function displayAdvanced(ext){
    if($("." + ext).css('display') != 'none'){
        $('.' + ext).hide();
    } else {
        $('.' + ext).show();
    }
    
}

