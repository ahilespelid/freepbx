$(document).ready(function() {
   //used for ajax call to eliminate excessive input variables
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

    $('#submit').click(function(event) {
        event.preventDefault();
        var dat = JSON.stringify($('#yealink').serializeArray());
        var url = $('#yealink').attr('action') + '&template=' + $('#template_name').val();
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
			if($(this).find("option:selected").text() == 'Blank' || $(this).find("option:selected").text() == 'NA'){
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

	backupdstsettingsyealink();
	$("[name='backupdestEnable']").change(function(){
		backupdstsettingsyealink();
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

function backupdstsettingsyealink() {
	if($('#backupdest-enable').is(':checked')) {
		$("#backupDest").attr('disabled', false);
		$("#backupPort").attr('disabled', false);
	}else{
		$("#backupDest").attr('disabled', true);
		$("#backupPort").attr('disabled', true);
	}
}
