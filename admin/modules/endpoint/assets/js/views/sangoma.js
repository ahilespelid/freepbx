$(document).ready(function() {
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
				$("." + name + 'state').hide();
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
				break;

			//now park
			case 'Call Park':
				$("#" + name + 'park').show();
				$("#" + name + 'xml').hide();
				$("." + name + 'value').hide();
				$("#" + name + 'value').hide();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("#" + name + 'label').val($(this).find("option:selected").text());
				$("." + name + 'labelFill').hide();
				$("." + name + 'state').hide();
				break;

			case 'Conference':
			case 'DND':
			case 'Hold':
			case 'Intercom':
			case 'LDAP':
			case 'Record':
			case 'Redial':
			case 'Transfer':
			case 'Voicemail':
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
				$("#" + name + 'xml').hide();
				$("#" + name + 'value').show();
				$("." + name + 'value').show();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'park').hide();

				break;

			case 'DTMF':
			case 'Multicast Paging':
				$("#" + name + 'xml').hide();
				$("#" + name + 'value').show();
				$("." + name + 'value').show();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'park').hide();
				$("." + name + 'state').hide();
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

	//for hor states
	$(document).on('change', '.horDropDown', function() {
		var name = $(this).prop('name');
		var length = name.length;
		name = name.substr(0, length - 5);
		var txt = $(this).find("option:selected").text();
		var lTxt = txt.length;
		console.log($(this).find("option:selected").text());
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
				$("#" + name + 'action').hide();
				break;
			case 'Speeddial':
				$("#" + name + 'action').show();
				break;
			default:
				$("#" + name + 'label').val(txt);
				$("#" + name + 'action').hide();
				break;
		}
	});

	backupdstsettings();
	sipkeepalivesetting();
	$("[name='backupdestEnable']").change(function(){
		backupdstsettings();
	});
	$("[name='sipkeepaliveEnable']").change(function(){
		sipkeepalivesetting();
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
function backupdstsettings() {
	if($('#backupdest-enable').is(':checked')) {
		$("#backupDest").attr('disabled', false);
		$("#backupPort").attr('disabled', false);
	}else{
		$("#backupDest").attr('disabled', true);
		$("#backupPort").attr('disabled', true);
	}
}

function sipkeepalivesetting() {
	if($('#sipkeepalive-enable').is(':checked')) {
		$("#sipkeepaliveinterval").attr('disabled', false);
	}else{
		$("#sipkeepaliveinterval").attr('disabled', true);
	}
}
