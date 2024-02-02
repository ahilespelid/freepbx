$(document).ready(function() {
	var baseurl = endpointBaseAjaxUrl +"&command=getdnsport";
	var transport = $('#mdns_transport').val();
	var mdns_port_val = $('#mdns_port_value').val();
	portchangeajax(baseurl, transport, mdns_port_val);
	$("#dpma").submit(function() {
		if ($("#default_template_for_ulist").val().trim() == "") {
			warnInvalid($("#default_template_for_ulist"),_("Default User List Template must be selected."));
			return false;
		};
		if ($("#mdns_port").val().trim() == "") {
			warnInvalid($("#mdns_port"),_("Selected mDNS discovery transport is not enabled. please check in sipsettings!"));
			return false;
		};
	});
});

$(document).on('change', "#mdns_transport", function(e){
	var url = endpointBaseAjaxUrl +"&command=getdnsport";
	var transport = $('#mdns_transport').val();
	portchangeajax(url, transport, false);
});

function portchangeajax(url, transport, mdns_port_val){
	$.ajax({
		type: "POST",
		url: url,
		success: function(data){
			var select = $('#mdns_port').empty();
			var defaultappend = '<option value="">-- Please Select mDNS Port --</option>';
			if(transport === 'udp'){
				$.each(data.sip, function(si,sipitem) {
					if(sipitem.hasOwnProperty('udp')){
						$option = $('<option value="'
                                                        + sipitem.udp
                                                        + '">'
                                                        + sipitem.udp
                                                        + '</option>');
						if (sipitem.udp === mdns_port_val) {
							$option.attr('selected', 'selected');
						}
						select.append($option);
					}else{
						select.append(defaultappend);
					}
				});
				$.each(data.pjsip, function(pjsi,pjsipitem) {
					if(pjsipitem.hasOwnProperty('udp')){
					$option = $('<option value="'
                                                        + pjsipitem.udp
                                                        + '">'
                                                        + pjsipitem.udp
                                                        + '</option>');
						if (pjsipitem.udp ===  mdns_port_val) {
							$option.attr('selected', 'selected');
						}
						select.append( $option );
					}else{
						select.append(defaultappend);
					}
				});
			}else{
				$.each(data.pjsip, function(i,item) {
					switch(transport){
						case 'tcp':
							if(item.hasOwnProperty('tcp')){
								$option = $( '<option value="'
										+ item.tcp
										+ '">'
										+ item.tcp
										+ '</option>' );
								if (item.tcp ===  mdns_port_val) {
									$option.attr('selected', 'selected');
								}
								select.append( $option );
							}else{
								select.append(defaultappend);
							}
						break;
						case 'tls':
							if(item.hasOwnProperty('tls')){
								$option = $( '<option value="'
										+ item.tls
										+ '">'
										+ item.tls
										+ '</option>' );
								if (item.tls ===  mdns_port_val) {
									$option.attr('selected', 'selected');
								}
								select.append( $option );
							}else{
								select.append(defaultappend);
							}
						break;
						default : select.append(defaultappend);
						break;
					}
				});
			}
		}
	});
}
