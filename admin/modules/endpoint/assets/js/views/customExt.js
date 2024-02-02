$(document).ready(function() {
	$("form#ext").submit(function() {
		if($.inArray($("input[name=ext]").val(), customExt) != -1)
		{
			return warnInvalid($("input[name=ext]"),_("Extension number already exist"));
		}

		if ($("input[name=ext]").val().length === 0) {
			return warnInvalid($("input[name=ext]"),_("Extension number must not be blank"));
		}
		if ($("input[name=secret]").val().length === 0) {
			return warnInvalid($("input[name=secret]"),_("Extension password must not be blank"));
		}

		if ($("input[name=label]").val().length === 0) {
			return warnInvalid($("input[name=label]"),_("Extension label must not be blank"));
		}

		if ($("input[name=destination]").val().length === 0) {
			return warnInvalid($("input[name=destination]"),_("Destination must not be blank"));
		}

		if ($("input[name=sipPort]").val().length === 0) {
			return warnInvalid($("input[name=sipPort]"),_("SIP port must not be blank"));
		}
	});
});
