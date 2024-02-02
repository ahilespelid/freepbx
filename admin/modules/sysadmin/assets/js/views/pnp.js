$('input[name="pnpconf"]').click(function(){
	console.log("clonk");
	if ($('input[name="pnpconf"]:checked').val() == 'auto') {
		console.log("slideup");
		$('#manualuridiv').slideUp();
	} else {
		console.log("slidedown");
		$('#manualuridiv').slideDown();
	}
});

$('form').submit(function(event) {
	event.preventDefault();
	if ($('input[name="pnpserver"]:checked').val() == 'enabled'){
		var pnpenabled = 'enabled'
	}
	else{
		var pnpenabled = 'disabled'
	}
	if ($('input[name="pnpconf"]:checked').val() == 'auto') {
		var pnpconf = 'auto';
	}else{
		var pnpconf = 'manual';
	}
	var uri = $('input[name="pnpoverrideuri"]').val();
	var des = $('input[name="pnpdesc"]').val();

	$.ajax({
		url: window.ajaxurl,
		data: { command: "update_pnp", module: "sysadmin", pnpserver: pnpenabled,  pnpoverrideuri: uri, pnpdesc: des, pnpconf:pnpconf },
			success: function(data) {
				if (data.status === 'error') {
					fpbxToast("Error: " + data.message);
					if(data.field == 'uri'){
						 $("input:text:visible:last").focus();
					}
				} else {
				fpbxToast("Status: " + data.message);
				}
			},
	})
});
