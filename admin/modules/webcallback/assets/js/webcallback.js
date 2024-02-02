$(document).ready(function() {
	$('form').unbind( "submit");
	$('form[name="webcallback"]').submit(function() {
		var tmp_name = $('input[name=name]')[0].value.trim();
		if (!isAlphanumeric(tmp_name)){
			return warnInvalid($('input[name=name]'), _("Please enter a valid Name."));
		}else{
			if($.inArray(tmp_name, webcallback_names) != -1){
				return warnInvalid($('input[name=name]'), tmp_name  + _(" already used, please use a different Name."));
			}
		}
		if ($('#goto0')[0].value == ''){
			return warnInvalid($('select[name=goto0]'),  _("Please select an item in the list."));	
		}
		return true;
	});
	$('form').submit(function(e) {
		if (!e.isDefaultPrevented()){
			$(".destdropdown2").filter(".hidden").remove();
		}
	});
});
