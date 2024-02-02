$(document).ready(function() {
   //used for ajax call to eliminate excessive input variables
    $('#submit').click(function(event) {
        event.preventDefault();
        var dat = JSON.stringify($('#snom').serializeArray());
        var url = $('#snom').attr('action') + '&template=' + $('#template_name').val();
        alert('Please wait until page reloads.');
        $.ajax({
			type: "POST",
			url: url,
			data: {'data': dat},
			success: function(data,textStatus,jqXHR) {
				location.href=url;
			},
			error:function(xhr, textStatus, errorThrown){
				alert('fail');
			}
        });
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
				$("#" + name + 'keyevent').hide();
				break;
			case 'Key Event':
				var modelVal = $("input[name='model']").val();
				switch(modelVal) {
					case 'S-D335':
					case 'S-D385':
					case 'S-D862':
					case 'S-D865':
					case 'S-D713':
						$("#" + name + 'value').hide();
						$("." + name + 'valueFill').hide();
						$("." + name + 'label').show();
						$("." + name + 'labelFill').hide();
						$("#" + name + 'keyevent').show();
					break;
					default:
					break;
				}
				break;
			default:
				$("#" + name + 'xml').hide();
				$("#" + name + 'value').show();
				$("." + name + 'value').show();
				$("." + name + 'valueFill').hide();
				$("." + name + 'label').show();
				$("." + name + 'labelFill').hide();
				$("#" + name + 'park').hide();
				$("#" + name + 'keyevent').hide();
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