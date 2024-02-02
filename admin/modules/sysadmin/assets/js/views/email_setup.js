$(document).ready(function() {
	//hide settings if were are using internal smtp

	if ($('input[name="server"]:checked').val() == 'external') {
		$('#ext_provider_info').show();
	} else {
		$('#ext_provider_info').hide();
	}

	if ($('input[name="provider"]:checked').val() == 'other') {
		$('#ext_smtp_info').show();
		if ($('input[name="auth"]:checked').val() == 'yes') {
			$('#auth_info').show();
		} else {
			$('#auth_info').hide();
		}
	} else if ($('input[name="provider"]:checked').val() == 'gmail') {
		$('#ext_smtp_info').hide();
		$('#auth_info').show();
		$('#gmail_alert').show();
	} else if ($('input[name="provider"]:checked').val() == 'office365') {
		$('#ext_smtp_info').hide();
		$('#auth_info').show();
		$('#gmail_alert').hide();
	} else {
		$('#auth_info').hide();
		$('#gmail_alert').hide();
	}

	$('[name=server]').click(function(){
		if ($('input[name="server"]:checked').val() == 'external') {
			$('#ext_provider_info').slideDown();
		} else {
			$('#ext_provider_info').slideUp();
		}
		if ($('input[name="server"]:checked').val() == 'internal') {
			$('#internal_smtp').slideDown();
		} else {
			$('#internal_smtp').slideUp();
		}
	});

	$('[name=provider]').click(function(){
		if ($('input[name="provider"]:checked').val() == 'other') {
			$('#ext_smtp_info').slideDown();
			$('#gmail_alert').slideUp();
		} else if ($('input[name="provider"]:checked').val() == 'gmail') {
			$('#gmail_alert,#auth_info').slideDown();
			$('#ext_smtp_info').slideUp();
		} else if ($('input[name="provider"]:checked').val() == 'office365') {
			$('#auth_info').slideDown();
			$('#gmail_alert').slideUp();
			$('#ext_smtp_info').slideUp();
		}
	});

	$('[name=auth]').click(function(){
		if ($('input[name="auth"]:checked').val() == 'yes') {
			$('#auth_info').slideDown();
		} else {
			$('#auth_info').slideUp();
		}
	});

	if ($('input[name="server"]:checked').val() == 'external') {
		$('#ext_provider_info').show();
	} else {
		$('#ext_provider_info').hide();
	}
	
	if ($('input[name="pf_cust"]:checked').val() == 'yes') {
		$('#main-custom').slideDown();
	} else {
		$('#main-custom').slideUp();
	}

	$('[name=pf_cust]').click(function(){
		if ($('input[name="pf_cust"]:checked').val() == 'yes') {
			$('#main-custom').slideDown();
		} else {
			$('#main-custom').slideUp();
		}
	});

	$('a.disabled').css({"pointer-events": "none", "font-style": "italic"});

	$("#debug").click(function(e){
		e.preventDefault();
		window.location='/admin/config.php?display=sysadmin&view=email_debug';

	});
});
