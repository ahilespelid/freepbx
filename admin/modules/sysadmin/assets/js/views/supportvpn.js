$(document).ready(function() {
	$('button[type=submit]').click(function(e){
		e.preventDefault();
		freepbx_info_bar('Please wait while your action is proccesed');
		var form = $(this).parents('form');
		var data = form.serialize();
		data = data + "&" + $(this).attr("name") + "=" + $(this).val();
		$('button[type=submit]').prop("disabled",true);
		$('button[type=submit]').text(_("Working..."));
		$.ajax({
			type: "POST",
			data: data,
			error: function(xhr, status, error) {
				console.log('error')
				//do something about the error
			},
			success: function(response) {
				location.reload(true);
			}
		});
		return false;
	});
});
