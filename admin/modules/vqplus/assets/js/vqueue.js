$(document).ready(function() {
	$('form').unbind( "submit");
	$('#maxp_cb').one("click change", function() {
		$(this).parents(".element-container").removeClass("has-error has-warning has-success");
                $(this).parents(".element-container").find(".input-warn").remove();
        });
	$('#minp_cb').one("click change", function() {
		$(this).parents(".element-container").removeClass("has-error has-warning has-success");
		$(this).parents(".element-container").find(".input-warn").remove();
	}); 
	$('form[name=vqplus_vq_form]').submit(function() {
		var tmp_name = $('input[name=name]')[0].value;
		if (!isAlphanumeric(tmp_name.trim())){
			return warnInvalid($('input[name=name]'), _("Please enter a valid Name"));
	        }else{
			if($.inArray(tmp_name.trim(), vq_names) != -1){
				return warnInvalid($('input[name=name]')[0], tmp_name.trim()  + _(" already used, please use a different name."));
			}
		}
		if ($('#minp_cb')[0].checked && $('input[name=min_penalty]')[0].value.trim() == ''){
			return warnInvalid($('input[name=min_penalty]'), _("Initial Min Penalty is required!"));
		}
		if ($('#maxp_cb')[0].checked && $('input[name=max_penalty]')[0].value.trim() == ''){
			return warnInvalid($('input[name=max_penalty]'), _("Initial Max Penalty is required!"));
		}
		if ($('#minp_cb')[0].checked && $('#maxp_cb')[0].checked){
	       		if( Number($('input[name=min_penalty]')[0].value) >= Number($('input[name=max_penalty]')[0].value)){
				return warnInvalid($('input[name=max_penalty]'), _("Initial Max Penalty must greater than Initial Min Penalty!"));
			}
		}
        	return true;
	});
	$('#vqplus_qr_form').submit(function() {
		if($("#name").val() === "") {
				return warnInvalid($("#name"),_("Queue Rule Name require a valid name"));
			}
		if (qrulesnames.indexOf($("#name").val()) >= 0) {
				return warnInvalid($("#name"),_("Queue Rule name already exist"));
			}
	});

	$('#queuepausecodes').submit(function() {
		if ((queuePauseCodes.indexOf($("#code").val()) >= 0) && $("#code").val() != currentqueuecode) {
			return warnInvalid($("#code"),_("Queue pause code already exist"));
		}else if(queueCodes.indexOf($("#featurecode").val() + $("#code").val()) >= 0){
			return warnInvalid($("#code"),_("Pause code already used by feature code"));
		}
	});

	$('#vqplus_callback_form').submit(function() {
		if($("#name").val() === "") {
				return warnInvalid($("#name"),_("Queue Callback Name require a valid name"));
			}
		if (qcbnames.indexOf($("#name").val()) >= 0) {
				return warnInvalid($("#name"),_("Queue Callback name already exist"));
			}
	});
	$('form').submit(function(e) {
		if (!e.isDefaultPrevented()){
			$(".destdropdown2").filter(".hidden").remove();
		}
	});

	$("input[name = 'Submit']").on( "click", function(e){
		var id = $(this).attr('id');
		if(!confirmsubmit(id)){
			e.preventDefault();
		}
	});

});

function confirmsubmit(id){
	var sucmsg = _('Do you want to clear the successful callback logs');
	var failedmsg = _('Do you want to clear the Failed callback logs');
	if (id == 'submitsuccess') {
		return confirm(sucmsg);
	} else {
		 return confirm(failedmsg);
	}
}

