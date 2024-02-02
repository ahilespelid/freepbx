$(document).ready(function() {
	$('form[name=editCalllimit]').submit(function(){		
		var calllimit_name = $("#name").val().trim();
		if(calllimit_name === "") {
			$("#name").focus();
	        	return warnInvalid($("#name"),_("You must set a valid name for this call limit"));
		}else{
			if($.inArray(calllimit_name, calllimit_names) != -1){
	        		alert(sprintf(_("The Name %s already used, please use a different name."),calllimit_name));
				return false;
			}
		}
	})	
});
