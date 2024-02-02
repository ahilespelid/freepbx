$(function() {
	if (!Sipstation.trunk_groups) {
		$('.trunkgroup').removeClass('hidden');
	}
	updateInfoDisplay();

	sipstationCookie = getCookie('sipstation');
	sipstationToggle = sipstationCookie !== undefined ? $.parseJSON(sipstationCookie) : {};
	if(!$.isEmptyObject(sipstationToggle)) {
		$.each(sipstationToggle, function( section, state ) {
			if(!state) {
				$('.'+section).hide()
				$(this).removeClass('toggle-minus').addClass('toggle-plus');
			}
		});
	}

	//The lowestElement option is the most reliable way of determining the page height.
	//However, it does have a performance impact in older versions of IE.
	//In one screen refresh (16ms) Chrome 34 can calculate the position of around 10,000 html nodes, whereas IE 8 can calculate approximately 50.
	//It is recommend to fallback to max or grow in IE10 and below.
	if (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0) {
		iFrameResize({
			log                     : false,                  // Enable console logging
			heightCalculationMethod : 'max'
		});
	} else {
		iFrameResize({
			log                     : false,                  // Enable console logging
			heightCalculationMethod : 'lowestElement'
		});
	}

});

$("#firewall-test-button").click(function(){
	var oldText = $(this).text();
	$(this).prop("disabled",true);
	$(this).text(_("Checking..."));
	$.post("ajax.php?module=sipstation&command=testFirewall")
	.done(function(data) {
		$(".firewall-test-fields").show();

		$('#firewall_externip').html(data.externip);
		if (data.status == 'success') {
			$('#firewall_status').html("<strong>No issues detected</strong>");
			$('#firewall_status').addClass('firewall-pass').removeClass('firewall-fail');
			/*  Iterate through each localnet:netmask pair. Put them into any fields on the form
			*  until we have no more, than create new ones
			*/
		} else {
			$('#firewall_status').html("<strong>FAIL</strong>");
			$('#firewall_status').addClass('firewall-fail').removeClass('firewall-pass');
			var lab = _("FIREWALL TEST WARNING");
			errorMessage(data.status_message, lab);
		}
	})
	.fail(function() {
		var msg = _("An Error occurred trying run firewall test");
		var lab = _("FIREWALL TEST ERROR");
		errorMessage(msg, lab);
	})
	.always(function() {
		$("#firewall-test-button").prop("disabled",false);
		$("#firewall-test-button").text(oldText);
	})
	return false;
});

function getextinfo(ext,did) {
	var dat = {};
	dat.ext = ext;
	$.post("ajax.php?module=sipstation&command=getextinfo", dat,
		function(data){
			if(data.status) {
				if(data.outboundcid != '') {
					if($("#setcid-"+did+" option[value='"+data.outboundcid+"']").length > 0) {
						$('#setcid-'+did).val(data.outboundcid);
					} else {
						$('#setcid-'+did).val('unchanged');
					}
				} else {
					$('#setcid-'+did).val('none');
				}

				if(data.emergency_cid != '') {
					if($("#selectecid-"+did+" option[value='"+data.emergency_cid+"']").length > 0) {
						$('#selectecid-'+did).val(data.emergency_cid);
					} else {
						$('#selectecid-'+did).val('unchanged');
					}
				} else {
					$('#selectecid-'+did).val('none');
				}
			}
		},
	"json");
}

$(document).on('click', '.sstrialtab', function(e) {
	$('#free_trial_dialog').remove();
	var body = $("#ssfreetrial");
	$.post("ajax.php?module=sipstation&command=freetrial",
		{
			session: (typeof(ssSession) === "object") ? ssSession.get() : ""
		},
		function(data){
			if(data.status) {
				body.html(data.status_message);
			}
		},
	"json");
});

/*
* Get Account Information Button...Button
*/
$("#account-access-button").click(function(){
	updateInfoDisplay();
});

/*
* Generate on screen error message box
*/
function errorMessage(message, label) {
	fpbxToast(message,label,'exception');
}

/*
* Generate on screen notification message box
*/
function noticeMessage(message, label) {
	fpbxToast(message,label,'notice');
}

/*
* Checks Asterisk Registration
*/
function updateAstRegister(member) {
	$.each(member, function(key){
		if (key != 'srv') {
			if (this == 'Registered') {
				$('#asterisk_registry_'+key).addClass('label-success').removeClass('label-danger').text(this);
			} else {
				$('#asterisk_registry_'+key).addClass('label-danger').removeClass('label-success').text(this);
			}
		}
	});
}

/*
* Update on screen status of servers
*/
function updateInfoDisplay(_callback) {
	if (Sipstation.status != "valid") {
		if(typeof _callback === "function") {
			_callback(data)
		}
		return;
	}
	var text = $("#account-access-button").text();
	$("#account-access-button").text(_('Refreshing Account Info'));
	$("#account-access-button").prop("disabled",true);
	$.get(
		"ajax.php?module=sipstation&command=getAccountInfo"
	)
	.success(function(data) {
		if(typeof _callback === "function") {
			_callback(data)
		}
		if (data.status == 'success') {
			if(data.message.message != '') {
				if(data.message.type == 'error') {
					errorMessage(data.message.message, _("Message from SIPStation"));
				} else {
					noticeMessage(data.message.message, _("Message from SIPStation"));
				}
			}
			if (data.asterisk_registry != undefined) {
				updateAstRegister(data.asterisk_registry);
			}
			if (data.trunk_qualify != undefined) {
				$.each(data.trunk_qualify, function(key){
					// Change ping status to color coded and don't show misleading ping times
					// since the server gives ping responses a lower priority and these pings are for signaling
					// and don't reflect the rtp media latencies which go elsewhere but confuse many users who
					// think these times are represented of QoS and performance which they are not.
					var ping = this.match(/(\d+) ms/i);
					if(ping == null) {
						$('#trunk_qualify_'+key).val(this).css( {'background-color':'#BA0000', 'color':'#F0EDED'} );
					} else {
						if(ping[1] < 1500) {
							$('#trunk_qualify_'+key).val('OK').css( "background-color", "#00cc00" );
						} else {
							$('#trunk_qualify_'+key).val('OK').css( "background-color", "#eaff33" );
						}
					}
				});
			}
			if(data.trunk_message != '' && data.trunk_message != undefined) {
				noticeMessage(data.trunk_message, _("Trunk Updates"));
			} else if(data.did_message != '' && data.did_message != undefined) {
				noticeMessage(data.did_message, _("DID Updates"));
			}
			if(data.show_reload == 'yes') {
				toggle_reload_button("show");
			}
			$("#account-access-button").val(_("Refresh Asterisk Account Info"));
			for(var member in data) {
				switch(member) {
					case 'failover_dest':
						$("#global_failover_dest_badge").text(data[member] ? data[member] : _("Not Set"));
					break;
					case 'failover_num':
						$("#global_failover_num_badge").text(data[member] ? data[member] : _("Not Set"));
					break;
					case 'asterisk_registerattempts':
						if(data[member] != 0) {
							$('#asterisk-registerattempts-msg').show();
						} else {
							$('#asterisk-registerattempts-msg').hide();
						}
					break;
					case 'trunk_codecs':
						$.each(data[member], function(key, value){
							if (value != '' && value !== null) {
								$('#'+member+'_'+key).val(value);
							} else if (value === null) {
								$('#'+member+'_'+key).val(_("UNKNOWN")).addClass('no_codecs');
							} else {
								$('#'+member+'_'+key).val(_("NO CODECS")).addClass('no_codecs');
							}
						});
					break;
					case 'trunk_id':
						$.each(data[member], function(key, value){
							if (value != '') {
								$('#trunkid_'+key).val(value);
							}
						});
					break;
					case 'routes':
						return true;
						$.each(data[member], function(route,trunks){
							$('#'+route+'_id1').prop('checked',trunks.gw1);
							$('#'+route+'_id2').prop('checked',trunks.gw2);
						});
					break;
				}
			}
		} else {
			var lab = _("ERROR");
			errorMessage(data.status, lab);
		}
	})
	.fail(function(data) {
		if(typeof _callback === "function") {
			_callback(data)
		}
		var msg = _("An Error occurred trying to contact the server for account settings.");
		var lab = _("SERVER ERROR");
		errorMessage(msg, lab);
	})
	.always(function() {
		$("#account-access-button").text(text);
		$("#account-access-button").prop("disabled",false);
	})
}

function addRoutes() {
	var dat = {};
	dat.sip_username = (Sipstation.sip_username) ? Sipstation.sip_username : '';
	$.post("ajax.php?module=sipstation&command=addroutes", dat,
		function(data){
			if(data.status) {
				updateInfoDisplay()
			} else {
				var lab = _("ERROR");
				errorMessage(data.status_message, lab);
			}
		},
	"json");
}

$(document).on("fpbx_reload", function(event, data) {
	console.log(data);
});

function getCookie(name) {
	var cookie;
	try {
		cookie = $.cookie(name);
	} catch (e) {
		cookie = Cookies.get(name);
	}

	return cookie;
}
function setCookie(name, data) {
	try {
		$.cookie(name, data);
	} catch (e) {
		Cookies.set(name, data);
	}
}


$('.sipstation-section').click(function() {
	var section = $(this).attr('id');
	if($('.'+section).is(":visible")) {
		$('.'+section).hide()
		$(this).removeClass('toggle-minus').addClass('toggle-plus');
		//set cookie of hidden section
		sipstationToggle = $.parseJSON(getCookie('sipstationToggle')) || {};
		sipstationToggle[section] = false;
		setCookie('sipstationToggle', JSON.stringify(sipstationToggle));
	} else {
		$('.'+section).show()
		$(this).removeClass('toggle-plus').addClass('toggle-minus');
		//set cookie of hidden section
		sipstationToggle = $.parseJSON(getCookie('sipstationToggle')) || {};
		if (sipstationToggle.hasOwnProperty(section)){
			sipstationToggle[section] = true;
			setCookie('sipstationToggle', JSON.stringify(sipstationToggle));
		}
	}
});

$('#cancel_freetrial').click(function() {
	var cancel = confirm(_("Are you sure you want to cancel your Free Trial Account?"));
	if (cancel !== true) {
		return false;
	}
	return true;
});

//refresh the page on a successful apply changes
$(document).on( "fpbx_reload", function( event, data ) {
	if (data.complete && typeof(data.errors.data) === "object" && !data.errors.data.status) {
		//location.href = "config.php?display=sipstation"
	}
});

$("#ssroutes").on("post-body.bs.table", function () {
	bind_did_table();
	bind_dests_double_selects();
});

$("#save_global_failover").on('click',function(){
	if($("[name='failover_radio']:checked").val() == 'trunk_group'){
		var dest = $("#global_failover_trunkgroup").val();
	}else{
		var dest = $("#failover_fqdn").val();
	}
	var num = $("#failover_number").val();
	updateFailover('',dest,num,function(data){
		if(data.status == true){
			$('#configureFailoverModal').modal('hide');
			updateInfoDisplay();
		}else{
			errorMessage(data.message, _("Error"))
		}
	});
});
$("#delete_global_failover").on('click',function(){
	clearFailover(function(data){
		if(data['status'] == true){
			$('#configureFailoverModal').modal('hide');
			$('#failover_fqdn').val("")
			$('#failover_number').val("")
			updateInfoDisplay();
		}
	});
});

var tgid = $('#global_failover_trunkgroup_badge').data('id');
Sipstation['trunk_groups'].forEach(function(elem){
	if(parseInt(elem['id']) === tgid){
		$("#global_failover_trunkgroup_badge").html(elem['title']);
		$("#failover_fqdn_label").html(_("Trunk Group: ")+elem['title']);
		$("#global_failover_dest_badge").html(_("Trunk Group: ")+elem['title']);
	}
});

function updateE911(did,name,address1,address2,city,state,zip,master,_callback){
	$.getJSON( "ajax.php", {module:'sipstation',name:name,did:did,address1:address1,address2:address2,city:city,state:state,zip:zip,master,command:'updateE911'}, function( data ) {
		_callback(data);
	});
}
function updateCID(did,cid,ecid,_callback){
	$.getJSON( "ajax.php", {module:'sipstation',did:did,cid:cid,ecid:ecid,command:'updateCID'}, function( data ) {
		toggle_reload_button("show");
		_callback(data);
	});
}
function updateFailover(did,dest,num,_callback){
	$.getJSON( "ajax.php", {module:'sipstation',did:did,dest:dest,num:num,command:'updateFailover'}, function( data ) {
		_callback(data);
	});
}
function updateDest(did,dest,_callback){
	$.getJSON( "ajax.php", {module:'sipstation',did:did,dest:dest,command:'updateDest'}, function( data ) {
		toggle_reload_button("show");
		_callback(data);
	});
}
function updateAreaCode(areacode,_callback){
	$.getJSON( "ajax.php", {module:'sipstation',areacode:areacode,command:'updateAreaCode'}, function( data ) {
		_callback(data);
	});
}

function clearFailover(_callback){
	$.getJSON( "ajax.php", {module:'sipstation',command:'clearFailover'}, function( data ) {
		_callback(data);
	});
}

function bind_did_table() {
	$.each(Sipstation.dids, function(key, did) {
		if($('select#goto'+did.did).val() == 'Extensions') {
			$(document).on('change', 'select#Extensions'+did.did, function() {
				var select = $(this).val();
				var match = select.match(/from-did-direct,(.*),/)
				getextinfo(match[1],did.did);
			});
		}
		$(document).on('change', 'select#goto'+did.did, function() {
			var did = $(this).attr('data-id');
			if($(this).val() == 'Extensions') {
				$('#setcid-'+did).show()
				$('#selectecid-'+did).show();
				$(document).on('change', 'select#Extensions'+did.did, function() {
					var select = $(this).val();
					var match = select.match(/from-did-direct,(.*),/)
					getextinfo(match[1],did);
				});
				var select = $('select#Extensions'+did.did).val();
				var match = select.match(/from-did-direct,(.*),/)
				getextinfo(match[1],did);
			} else {
				$('#setcid-'+did).hide()
				$('#selectecid-'+did).hide();
				$(document).off('change', 'select#Extensions'+did.did);
			}
		});
		$("#dialog-"+did.did).dialog({
			autoOpen: false,
			height: 620,
			width: 500,
			modal: true
		})
	})
}

function did_did_formatter(v,r){
	var url = '?display=did&view=form&extdisplay='+r.did+encodeURIComponent('/')
	return '<a href="'+url+'">'+v+'</a>';
}

function route_name_formatter(v,r){
	var url = '?display=routing&view=form&id='+r.id;
	return '<a href="'+url+'">'+v+'</a>';
}

function route_gateway_formatter1(v,r){
	if(r['gw1_checked'] == true){
		var yeschecked = 'checked';
		var nochecked = '';
	}else{
		var yeschecked = '';
		var nochecked = 'checked';
	}
	var html = '';
	html += '<span class="radioset">';
	html += '<input type="radio" data-gw="1" data-route="'+r.id+'" name="route'+r.id+'_1" id="routeyes'+r.id+'_1" value="set" '+yeschecked+'>';
	html += '<label for="routeyes'+r.id+'_1">'+ _("Yes")+'</label>';
	html += '<input type="radio" data-gw = "1" data-route="'+r.id+'" name="route'+r.id+'_1" id="routeno'+r.id+'_1" value="unset" '+nochecked+'>';
	html += '<label for="routeno'+r.id+'_1">'+ _("No")+'</label>';
	html += '</span>';
	return html;
}

function route_gateway_formatter2(v,r){
	if(r['gw2_checked'] == true){
		var yeschecked = 'checked';
		var nochecked = '';
	}else{
		var yeschecked = '';
		var nochecked = 'checked';
	}
	var html = '';
	html += '<span class="radioset">';
	html += '<input type="radio" data-gw="2" data-route="'+r.id+'" name="route'+r.id+'_2" id="routeyes'+r.id+'_2" value="set" '+yeschecked+'>';
	html += '<label for="routeyes'+r.id+'_2">'+ _("Yes")+'</label>';
	html += '<input type="radio" data-gw = "2" data-route="'+r.id+'" name="route'+r.id+'_2" id="routeno'+r.id+'_2" value="unset" '+nochecked+'>';
	html += '<label for="routeno'+r.id+'_2">'+ _("No")+'</label>';
	html += '</span>';
	return html;
}

$('#ssroutes').on('post-body.bs.table', function () {
	$('input[type=radio][name^=route]').change(function(e) {
		var gateway = $(this).data('gw');
		var route = $(this).data('route');
		var inc = $(this).val();
		var command = inc+"gw"+gateway;
		$.getJSON( "ajax.php", {module:'sipstation',action:command,route:route,command:'updateroute'}, function( data ) {
			fpbxToast(_('Route Updated, Apply Config'));
			toggle_reload_button("show");
		});
	});
});

function failoverFormatter(v,r){
	if(Sipstation.account_type == "TRIAL"){
		return _("Not Availible on Trial accounts");
	}
	var failover = '';
	if(v.num){
		failover = v.num;
	}else if(v.dest !== null){
		failover = v.dest;
	}
	return '<a href="#"  class="failoverlink" data-dest="'+(v.dest ? v.dest : '')+'" data-num="'+(v.num ? v.num : '')+'" data-did="'+r.did+'"><i class="fa fa-edit"></i> '+failover+'</a>';
}
function destinationFormatter(v,r){
	var dest = '';
	var ddest = '';

	if (destinations[v]) {
		ddest = v;
		dest = destinations[v].description;
	}
	return '<a href="#"  class="destlink" data-dest="'+ddest+'" data-did="'+r.did+'"><i class="fa fa-edit"></i> '+dest+'</a>';
}
function e911Formatter(v,r){
	if(Sipstation.account_type == "TRIAL"){
		return _("Not Availible on Trial accounts");
	}
	return `<a href="#" class="e911link" data-did="${r.did}" data-name="${v.name}" data-street1="${v.street1}" data-street2="${v.street2}" data-city="${v.city}" data-state="${v.state}" data-zip="${v.zip}"><i class="fa fa-edit"></i>`+_("Edit/Update")+ '</a>';
}
function cidFormatter(v,r){
	//only show for extensions
	var regex = new RegExp(/from-did-direct,\d+,/)
	//When this is false it breaks the formatting
	if(r.ecid == false){
		r.ecid = '';
	}
	//They should always have a cid but lets assume it is possible they don't
	if(r.cid == false){
		r.cid = '';
	}
	if(!regex.test(r.destination)) {
		return _('N/A');
	}
	return `<a href="#" class="cidlink" data-did="${r.did}" data-cid="${r.cid}" data-ecid="${r.ecid}"><i class="fa fa-edit"></i>`+_("Edit/Update")+'</a>';
}
function descriptionFormatter(v,r){
	return v
}

$("#cidroutesave").on('click',function(){
	var did = $("#routeciddid").val();
	var cid = $("#routecid").val();
	var ecid = $("#routeecid").val();
	updateCID(did,cid,ecid,function(data){
		$("#routecidmodal").modal('hide');
		toggle_reload_button("show");
		$('#ssdids').bootstrapTable('refresh');
	});
});
$("#processareacode").on('click',function(e){
	e.preventDefault();
	var areacode = $("#areacode").val();
	if(!areacode) {
		fpbxToast(_("Area Code is Empty!"));
		return;
	}
	$("#areacode").prop("disabled",true);
	$("#processareacode").prop("disabled",true);
	updateAreaCode(areacode,function(data){
		fpbxToast(data.message);
		toggle_reload_button("show");
		$("#areacode").prop("disabled",false);
		$("#processareacode").prop("disabled",false);
	});
});
$("#routedestsave").on('click',function(){
	var text = $(this).text();
	var $this = this;
	$(this).text(_("Saving..."));
	$(this).prop("disabled",true);
	var did = $('#routedestdid').val();
	var gotoc = $('#goto0').val();
	var gotoid = $('#goto0').data('id');
	var dest = $("#"+gotoc+gotoid).val();
	updateDest(did,dest,function(data){
		if(data.status == true){
			updateInfoDisplay(function() {
				fpbxToast(data.message);
				toggle_reload_button("show");
				resetDrawselects();
				$('#routedestdid').val('');
				$("#routedestmodal").modal('hide');
				$('#ssdids').bootstrapTable('refresh');
			});
		}
		$($this).text(text);
		$($this).prop("disabled",false);
	});
});
$("#didfailoversave").on('click',function(){
	var text = $(this).text();
	var $this = this;
	$(this).text(_("Saving..."));
	$(this).prop("disabled",true);
	var did = $("#did_failover_did").val();
	var num = $("#did_failover_num").val();
	var dest = $("#did_failover_dest").val();
	updateFailover(did,dest,num,function(data){
		if(data.status == true){
			updateInfoDisplay(function() {
				$('#didfailover').modal('hide');
				fpbxToast(_("Failover Information Updated"));
				$("#did_failover_did").val('');
				$("#did_failover_num").val('');
				$("#did_failover_dest").val('');
				$('#ssdids').bootstrapTable('refresh');
			});
		}
		$($this).text(text);
		$($this).prop("disabled",false);
	});
});

$("#e911routemodal").on('hidden.bs.modal', function(e){
	$('#routedid').html('');
	$('#routehiddendid').val('');
	$('#routename').val('');
	$('#routeaddress1').val('');
	$('#routeaddress2').val('');
	$('#routecity').val('');
	$('#routestate').val('');
	$('#routezip').val('');
});
$("#e911routesave").on('click',function(){
	var text = $(this).text();
	var $this = this;
	$(this).text(_("Saving..."));
	$(this).prop("disabled",true);
	var did = $('#routehiddendid').val();
	var name = $('#routename').val();
	var address1 = $('#routeaddress1').val();
	var address2 = $('#routeaddress2').val();
	var city = $('#routecity').val();
	var state = $('#routestate').val();
	var zip = $('#routezip').val();
	updateE911(did,name,address1,address2,city,state,zip,false,function(data){
		$('#e911routemodal').modal('hide');
		$('#ssdids').bootstrapTable('refresh');
		fpbxToast(_("E911 UPDATED"))
		$(this).text(text);
		$(this).prop("disabled",false);
	});
});

$('#ssdids').on('post-body.bs.table', function () {
	$(".cidlink").on('click',function(e){
		e.preventDefault();
		$("#routeciddid").val($(this).data('did'));
		$("#routecid").val($(this).data('cid'));
		$("#routeecid").val($(this).data('ecid'));
		$("#routecidmodal").modal('show');
	});
	$(".destlink").on('click',function(e){
		e.preventDefault();
		var dest = $(this).data('dest');
		var did = $(this).data('did');
		setDrawselect('goto0', dest);
		$('#routedestdid').val(did);
		$("#routedestmodal").modal('show');
	});
	$(".failoverlink").on('click',function(e){
		e.preventDefault();
		var failover = $(this).data();
		$("#did_failover_did").val(failover.did);
		$("#did_failover_num").val(failover.num);
		$("#did_failover_dest").val(failover.dest);
		$('#didfailover').modal('show');
	});
	$(".e911link").on('click', function(e){
		e.preventDefault();
		$('#routedid').html($(this).data('did'));
		$('#routehiddendid').val($(this).data('did'));
		$('#routename').val($(this).data('name'));
		$('#routeaddress1').val($(this).data('street1'));
		$('#routeaddress2').val($(this).data('street2'));
		$('#routecity').val($(this).data('city'));
		$('#routestate').val($(this).data('state'));
		$('#routezip').val($(this).data('zip'));
		$('#e911routemodal').modal('show');
	});
});
