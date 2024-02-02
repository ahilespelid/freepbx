$(document).ready(function() {
	$("#model").dialog({  //create dialog, but keep it closed
		autoOpen: false,
		height: 700,
		width: 1000,
		modal: true
	});

	$('.model').click(function(e) {
		var checked = $(this).attr('checked');

		if (checked === undefined || checked === true || checked == 'checked') {
			e.preventDefault();
		}
		var brand = $(this).attr('data.brand');
		var model = $(this).attr('data.model');

		$.get(endpointBaseAjaxUrl + '&command=model&template=' + $(this).attr('data.template') + '&model=' + $(this).attr('data.model') + '&brand=' + $(this).attr('data.brand'), function(data) { 
			page = data['message'];

			var $dialog = $('#model')
				.html(page)
				.dialog({
					autoOpen: false,
					modal: true,
					height: 700,
					width: 1000,
					title: model
				});
				$dialog.dialog('open');
				return false;
		});
	});

	//used on extensions page for admin ucp integration
	$(document).on('click', '.extCustom', function(e) {
		var checked = $(this).attr('checked');
		if (checked === undefined || checked === true) {
			e.preventDefault();
		}
		var ext = $(this).attr('data.ext');
		$.get(endpointBaseAjaxUrl + '&command=ucp&sub=' + $(this).attr('data.ext'), function(data) { 
			page = data['message'];

			var $dialog = $('#model')
				.html(page)
				.dialog({
					autoOpen: false,
					modal: true,
					height: 700,
					width: 1000,
					title: ext
				});
				$dialog.dialog('open');
				return false;
		});
	});

	//uncheck all boxes for keytypes
	$(document).on('change', '.keyType', function() {
		var box = $(this).attr('name');
		$('.keyType').prop("checked", false);
		$('#' + box).prop("checked", true);
	});

	//uncheck all boxes for horizontal states
	$(document).on('change', '.hkeyType', function() {
		var box = $(this).attr('name');
		$('.hkeyType').prop("checked", false);
		$('#' + box).prop("checked", true);
	});

	//show/hide boxes for horizontal states
	$(document).on('change', '.hkeyType', function() {
		var box = $(this).attr('name');
		$('.hideHorSoftKeys').hide();
		$('.' + box).show();
	});

	//show/hide boxes for algo 8128 mode selection
	$(document).on('change', '.mode', function() {
		$('.modeNotify').hide();
		$('.modeMessage').hide();
		$('.modeRing').hide();
		var box = $(this).attr('id');
		$('.' + box).show();
		//console.log($(this).attr('id'));
	});
});
