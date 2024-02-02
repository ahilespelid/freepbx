//Javascript file that is loaded when your module is viewed
//FreePBX 13 uses Jquery 1.11.3 and various other libraries, see admin/assets
//for more information

	function decodeEntities(encodedString) {
		var textArea = document.createElement('textarea');
		textArea.innerHTML = encodedString;
		return textArea.value;
	}

	function linkFormatter(value, row, index) {
		return decodeEntities(value);
	}


/*  jQuery ready function. Specify a function to execute when the DOM is fully loaded.  */

$(document).ready(
  
  	/* This is the function that will get executed after the DOM is fully loaded */
  	function () {
		$("#datepicker_ci").datepicker(); 
		$("#datepicker_co").datepicker();
		$("#timepicker_ci").timepicker();
		$("#timepicker_co").timepicker();
		$("#datepicker_sched").datepicker({dateFormat: 'mm/dd'}); 
	});
	
	function check_group(){
		$.ajax({
			url: "ajax.php?module=pms&check_group=yes",
			dataType:"json",
			async: false,
			success: function (json) {
				if (json.message != null){					
					var result = JSON.parse(json.message);
					if(result === "OK"){
						window.return = true;					
					}
					else{						
						window.return = false;
					}
				};
			},
			error: function(d) {
				d.suppresserrors = true;
			}
		});	
		return window.return;
	}


