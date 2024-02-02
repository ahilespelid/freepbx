$(document).ready(function() {
	$('input[type=radio]').change(function() { 
		switch($(this).attr('name')) {
			case 'register':
				switch($(this).val()) {
					case 'YES':
						$('.portalacct, .portalemail, .noportalemail, .deploymentlocation').hide();
						$('.registerno, .deploymentid').show();
				        break;
                                        case 'NO':
						//$('.registerno, .deploymentid').show();
						$('.portalacct, .portalemail, .registerno, .deploymentid').hide();
                                        break;
				}
			break;
			case 'portal-acct':
				switch($(this).val()) {
					case 'YES':
						$('.portalemail, .deploymentlocation').show();
						$('.noportalemail').hide();	
					break;
					case 'NO':
						$('.noportalemail, .deploymentlocation').show();
						$('.portalemail').hide();	
					break;
                                }
			break;
			case 'unused_dep':
				switch($(this).val()) {
                                        case 'YES':
                                                $('.deploymentid').show();
                                                $('.portalacct, .portalemail, .noportalemail, .deploymentlocation').hide();
                                        break;
                                        case 'NO':
                                                //$('.noportalemail').show();
                                                $('.portalacct, .portalemail, .deploymentlocation').show();
						$('.deploymentid').hide();
                                        break;
                                }
			break;
		}
	});

	var portal_email = $('#portal_email');
	var portal_acct = $('input[name=portal-acct]');
	$("input[type=submit]").click(function(){
		
		$("input[type=submit]").attr('disabled', true);
	
		if (portal_email && portal_email.val() == '' && portal_acct == 'YES') {
      			alert("Email Address is empty or invalid.");
      			return false;
    		} else {
			freepbx_info_bar('Please wait while your action is processed', '10000');
			var form = $(this).parents('form');
			$.ajax({
				    type: "POST",
				    url: form.attr('action'),
				    data: form.serialize(),
				    error: function(xhr, status, error) {
						freepbx_alert_bar('An error has occurred, please try again', '10000');
				    		$("input[type=submit]").attr('disabled', false); 
				    },
				    success: function(response) {
						if (typeof (JSON) !== 'undefined' && typeof (JSON.parse) === 'function') {
							try {
								data = JSON.parse(response);
								if (data.error && data.error !== '') {
									freepbx_alert_bar(data.error, '10000');
								}
							} catch (err) {
								console.log('The following error was encountered:',err);
							}
						}
						//once weve confimed the request, wait five seconds 
						//so that apache has a chance to start up again
						setTimeout("location.reload(true);",5000);
				   }
				});
			return false;
		}
	});	
	
});


