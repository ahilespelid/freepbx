function checkannouce(form){
	var msgInvalid = _('Invalid Park & Announce Extension specified');
	if (isEmpty(form.announceext.value)){
		alert(msgInvalid);
		return false;
	}
	else{
		if(getannouncements(form.announceext.value,form.announceextid.value)){
			msgInvalid = _('Invalid Park & Announce Extension already exists');
			alert(msgInvalid);
			return false;			
		};
	}
	return true;
}

function getannouncements(ext,id=null){
	var result = false;
	$.ajax({
		url: "ajax.php?module=parkpro&command=getAnnounceGrid",
		dataType:"json",
		async: false,
		success: function (json) {
			for (var key in json){
				if(ext === json[key].announceext && id != json[key].id){
					result = true;
				}
			}
		}
	});	
	return result;
	
}

var oldtime = 0;
$(function() {
	$( "#announce_order_sortable" ).sortable({
		placeholder: "sortable-placeholder",
		tolerance: "pointer",
		cursorAt: {top:25, left:15}
	});
	$( "#announce_order_sortable" ).disableSelection();

	$('#parkannounceform').submit(function() {
		if (!$("select[name=\"page_id\"]").length || $("select[name=\"page_id\"]").val() === "" || $("select[name=\"page_id\"]").val() == "invalid") {
			alert("Invalid Page Group");
			return false;
		}
		var sortedIDs = $( "#announce_order_sortable" ).sortable( "toArray" );
		$('#parkannounceform').append("<input type='hidden' name='announce_order' value='"+JSON.stringify(sortedIDs)+"' />");
	});
	$("select[name=\"page_id\"]").change(function() {
		if ($(this).val() == "invalid") {
			$(this).css("background-color", "red");
		} else {
			$(this).css("background-color", "transparent");
		}
	})
	if($('input[type=radio][name=record_message]:checked').val() == 'yes') {
		$('.pa_record_tr').show()
		$('#pa_crm').show()
	} else {
		$('.pa_record_tr').hide()
		$('#pa_crm').hide()
	}

	if(!$('#page_announcement_id_1').val()) {
		$('#pa_pa1').hide()
	} else {
		var html = $('#page_announcement_id_1 option:selected').text()
		html = html.length > 12 ? html.substring(0,12)+'...' : html
		$('#pa_pa1').html(html)
		$('#pa_pa1').show()
	}

	if(!$('#page_announcement_id_2').val()) {
		$('#pa_pa2').hide()
	} else {
		var html = $('#page_announcement_id_2 option:selected').text()
		html = html.length > 12 ? html.substring(0,12)+'...' : html
		$('#pa_pa2').html(html)
		$('#pa_pa2').show()
	}

	if(!$('#page_announcement_id_3').val()) {
		$('#pa_pa3').hide()
	} else {
		var html = $('#page_announcement_id_3 option:selected').text()
		html = html.length > 12 ? html.substring(0,12)+'...' : html
		$('#pa_pa3').html(html)
		$('#pa_pa3').show()
	}

	if($('input[type=radio][name=slot_announce_enable]:checked').val() == 'yes') {
		$('#pa_parked').show()
	} else {
		$('#pa_parked').hide()
	}

	var pid = $('#park_id').val()
	if($("#parkingtime_enable").length && !$('#parkingtime_enable').is(':checked')) {
		$('#parkingtime').val(parkinglots[pid]['parkingtime'])
		$('#parkingtime').prop("disabled",true)
	}
	oldtime = $('#parkingtime').val()
});
$('input[type=radio][name=record_message]').change(function(){
	if($(this).val() == 'yes') {
		$('.pa_record_tr').fadeIn("slow")
		$('#pa_crm').fadeIn("slow")
	} else {
		$('.pa_record_tr').fadeOut("slow")
		$('#pa_crm').fadeOut("slow")
	}
});

$('input[type=radio][name=slot_announce_enable]').change(function(){
	if($(this).val() == 'yes') {
		$('#pa_parked').fadeIn("slow")
	} else {
		$('#pa_parked').fadeOut("slow")
	}
});

$('#page_announcement_id_1').change(function(){
	if(!$(this).val()) {
		$('#pa_pa1').html("PA1")
		$('#pa_pa1').fadeOut("slow")
	} else {
		var html = $('#page_announcement_id_1 option:selected').text()
		html = html.length > 12 ? html.substring(0,12)+'...' : html
		$('#pa_pa1').html(html)
		$('#pa_pa1').fadeIn("slow")
	}
});

$('#page_announcement_id_2').change(function(){
	if(!$(this).val()) {
		$('#pa_pa2').html("PA1")
		$('#pa_pa2').fadeOut("slow")
	} else {
		var html = $('#page_announcement_id_2 option:selected').text()
		html = html.length > 12 ? html.substring(0,12)+'...' : html
		$('#pa_pa2').html(html)
		$('#pa_pa2').fadeIn("slow")
	}
});

$('#page_announcement_id_3').change(function(){
	if(!$(this).val()) {
		$('#pa_pa3').html("PA1")
		$('#pa_pa3').fadeOut("slow")
	} else {
		var html = $('#page_announcement_id_3 option:selected').text()
		html = html.length > 12 ? html.substring(0,12)+'...' : html
		$('#pa_pa3').html(html)
		$('#pa_pa3').fadeIn("slow")
	}
});

$('#park_id').change(function(){
	var pid = $(this).val()
	if(!$('#parkingtime_enable').is(':checked')) {
		$('#parkingtime').val(parkinglots[pid]['parkingtime'])
	}
});

$('#parkingtime_enable').change(function(){
	var pid = $('#park_id').val()
	if($(this).is(':checked')) {
		$('#parkingtime').prop("disabled",false);
		$('#parkingtime').val(oldtime)
	} else {
		oldtime = $('#parkingtime').val()
		$('#parkingtime').prop("disabled",true);
		$('#parkingtime').val(parkinglots[pid]['parkingtime'])
	}
});
