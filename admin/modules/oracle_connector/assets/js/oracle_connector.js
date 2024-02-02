	$("textarea[name='ct_body']")
	.keyup( function() {
		var max = parseInt($(this).attr('maxlength'));
		var len = (this).value.length;
        if (len >= max) {
          (this).value = (this).value.substring(0, max);
        } else {
			$('#charNum').html("&nbsp;&nbsp;&nbsp;&nbsp;<b>"+len+"/"+max+"</b> "+_('characters.'));
		}
	})
	.mouseover( function() {
		var max = parseInt($(this).attr('maxlength'));
		var len = (this).value.length;
        if (len >= max) {
          (this).value = (this).value.substring(0, max);
        } else {
			$('#charNum').html("&nbsp;&nbsp;&nbsp;&nbsp;<b>"+len+"/"+max+"</b> "+_('characters.'));
		}
	})
	.mouseleave( function() {
			$('#charNum').text("");
	});

	$("#remove_all")
	.click( function(){
		$.ajax({
			url: "ajax.php?module=oracle_connector&command=remove_all",
			dataType:"json",
			success: function (json) {
				if (json.message != null){
					if (json.message == 'unknown'){
						json.message = "";
					}
				
				};
				$('#logfiletable').bootstrapTable('refresh', {silent: true});
			}
		});	
	});

	function linkFormatter(value, row, index){
		return decodeHTML(value);
	}

	function decodeHTML(data) {
		var textArea = document.createElement('textarea');
		textArea.innerHTML = data;
		return textArea.value;
	}