$(document).ready(function() {
    	$('.type').change(function() {
            	var name = $(this).attr('name');
		var length = name.length;
		name = name.substr(0, length - 4);		
                if($(this).attr('value') == 'xml'){
                    $("#" + name + 'xmlP').show();
                    $("#" + name + 'value').hide();
                    $("#" + name + 'xml').hide();
                } else {
                    if($(this).attr('value') != 'XML-API'){
                        $("#" + name + 'xmlP').hide();
                        $("#" + name + 'value').show();
                        $("#" + name + 'xml').hide();
                    }
                }
	});
});