$(document).ready(function() {
	$("form#image_upload").submit(function() {
		const Name = $("input[name=picture1]").val();
		if(isWhitespace(Name) || Name.match(/\s/)) {
			alert(_('Invalid image file name, image name should not have any space.'));
			return false;
		}
		return true;
	});
});
