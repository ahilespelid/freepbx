$(document).ready(function() {

	if ($('input[id="syes"]').prop('checked')) {
		$('#ups').removeClass('hidden');
	}

	$('[name=ups_enabled]').click(function(){
		if ($(this).val() == "true") {
			$('#ups').removeClass('hidden');
		} else {
			$('#ups').addClass('hidden');
		}
	});
});
