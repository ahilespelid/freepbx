$(document).ready(function() {
	$("#addBrand").dialog({  //create dialog, but keep it closed
		autoOpen: false,
		height: 400,
		width: 800,
		modal: true
	});

	$('.addBrand').click(function(e) {
		e.preventDefault();
		page = $(this).attr('href');
		$.get(page, function (data) {
			var html = 'An error occurred';
			if (data.status) {
				html = data.message;	
			}
			var $dialog = $('#addBrand')
			 .html(html)
			 .dialog({
					 autoOpen: false,
					 modal: true,
					 height: 625,
					 width: 500,
					 title: "Add a New Brand"
			 });
			$dialog.dialog('open');
			return false;
		});
	});
});