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
				break;
			
			//now xml-api
			case 'XML-API':
				$("#" + name + 'xml').show();
				$("." + name + 'value').show();
				$("#" + name + 'value').hide();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				break;
				
			default:
				$("#" + name + 'xml').hide();
				$("#" + name + 'value').show();
				$("." + name + 'value').show();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'park').hide();
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
});

