$(document).ready(function() {
	var brand = document.getElementById("brand_basestation").value;
	var url = endpointBaseAjaxUrl +"&command=getTemplate&brand="+brand;
	var template_value = document.getElementById("template_value").value;
	templatechangeajax(url, template_value);
	snomBasestationSettings(brand);
	$("[name='sync_data_transport']").change(function() {
		syncDataTransportSettings();
	});
	$("form#basestation").submit(function() {
		const name = $("input[name=name]").val();
		const macAddress = $("input[name=mac]").val();
		const brandName = $('select[name="brand"]').val();
		const templateName = $('select[name="template"]').val();
		var isVisiblePrimaryDataSync = $('#primary_data_sync_ip').is(':visible');
		if(isVisiblePrimaryDataSync) {
			const primaryDataSyncIp = $("input[name=primary_data_sync_ip]").val();
			const vIpAddress = validateIpAddress(primaryDataSyncIp);
			if (!vIpAddress) {
				return false;
			}
		}
		//I'm not stripping letters G-Z at this point, so that
		//the user will see the invalid mac alert when trying to submit
		//something weird like 00:11:22:33:44:55:gg
		const sMacAddress = macAddress.toUpperCase().replace(/[^0-9A-Z]/g, '');

		//an array of all the existing basestation macs
		const macsUpperCase = basestationMacs.map(function(val) {
			return val.toUpperCase();
		});

		if (name.length === 0) {
			alert('Basestation Name is required.');
			return false;
		}

		if (macAddress.length === 0) {
			alert('Basestation MAC Address is required.');
			return false;
		}

		//valid letters in a MAC are A-F.
		//This just validates the input before submission.
		//'views/page.endpoint.php' is where the strtoupper and 
		//delimeter stripping happens before writing to the db 
		const sMacRegex = /^([0-9A-F]{12})$/i;
		if (!sMacRegex.test(sMacAddress)) {
			alert(_('Invalid MAC Address entered.'));
			return false;
		}


		//alert if trying to add/modify using an existing mac address,
		//except when modifying and mac stays the same
		if (macsUpperCase.includes(sMacAddress) && sMacAddress !== currentMac.toUpperCase()) {
			alert(_('A basestation with that MAC Address already exists.'));
			return false;
		}
		if (brandName.toLowerCase() == 'snom') {
			var ret = btValidation(brandName, templateName);
			obj = JSON.parse(ret.responseText);
			if (!obj.status) {
				alert(obj.message);
				return obj.status;
			}
		}
		$(':disabled').each(function(e) {
			$(this).removeAttr('disabled');
		})
	});
});

$(document).on('change', "#brand_basestation", function(e) {
	var brand = document.getElementById("brand_basestation").value;
	var url = endpointBaseAjaxUrl +"&command=getTemplate&brand="+brand;
	snomBasestationSettings(brand);
	templatechangeajax(url, false);
});

function templatechangeajax(url, template_value){
	$.ajax({
		type: "POST",
		url: url,
		success: function(data){
			var select = $('#basestation_template').empty();
			$.each(data, function(si,item) {
				$option = $('<option value="'
					+ item
					+ '">'
					+ item
					+ '</option>');
				if (item === template_value) {
					$option.attr('selected', 'selected');
				}
				select.append($option);
			});
		}
	});
}

function snomBasestationSettings(brand) {
	if (brand.toLowerCase() == 'snom') {
		$("#repeater1mac").show( "slow" );
		$("#repeater2mac").show( "slow" );
		$("#repeater3mac").show( "slow" );
		$("#multicellsettings").show( "slow" );
		$("#sync_chain_id").show( "slow" );
		$("#sync_time").show( "slow" );
		$("#sync_data_transport").show( "slow" );
		syncDataTransportSettings();
		$("#sync_debug_enable").show( "slow" );
	} else {
		$("#repeater1mac").hide("slow");
		$("#repeater2mac").hide("slow");
		$("#repeater3mac").hide("slow");
		$("#multicellsettings").hide("slow");
		$("#sync_chain_id").hide("slow");
		$("#sync_time").hide("slow");
		$("#sync_data_transport").hide( "slow" );
		$("#primary_data_sync_ip").hide( "slow" );
		$("#sync_debug_enable").hide( "slow" );
	}
}

function syncDataTransportSettings() {
	var sync_data_transport = $('#sync_data_transport').find(":selected").val();
	if (sync_data_transport.toLowerCase() == 'peer-to-peer') {
		$("#primary_data_sync_ip").show( "slow" );
	} else {
		$("#primary_data_sync_ip").hide( "slow" );
	}
}

function btValidation(bname, tname) {
	var result = $.ajax({
		url: "ajax.php?module=endpoint&command=btValidation",
		type: 'POST',
		async: false,
		data: {template_name: tname, brand: bname}
	});
	return result;
}

function validateIpAddress(primaryDataSyncIp) {
	var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
	if(ipformat.test(primaryDataSyncIp)) {
		return true;
	} else {
		warnInvalid($("#primary_data_sync_ip"),_("Invalid IP Address is entered in Primary Data Sync IP"));
		return false;
	}
 }