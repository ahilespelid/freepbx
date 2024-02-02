$(document).ready(function(){

	//don allow more than PAGINGMAXPARTICIPANTS items to be selected
	$('select[name="pagelist[]"]').change(function(e){
		if ($(this).val().length > fpbx.conf.PAGINGMAXPARTICIPANTS) {
			alert('You cannot add more than ' + fpbx.conf.PAGINGMAXPARTICIPANTS + ' participants');
			$('select[name="pagelist[]"] option[value=' + e.currentTarget.value + ']')
						.attr('selected', false);
			return false;
		}
	});

	var time = $("#servertime").data("time");
	var tz = $("#servertime").data("tz");
	var mo = moment.unix(time);
	mo.utcOffset(tz);
	function updateTime() {
		$("#servertime").text(mo.add(1,'second').format('LTS'));
	};
	var t = setInterval(updateTime,1000);
	$('#page_opts_form').submit(function(e){
		if($('[name="schedulerenable"]').val() == 'yes'){
			if(isNaN(Date.parse($("#startdatepicker").val()))){
				warnInvalid($("#startdatepicker"),_("Please enter a valid start date"));
				return false;
			}
			if(isNaN(Date.parse($("#enddatepicker").val()))){
				warnInvalid($("#enddatepicker"),_("Please enter a valid end date"));
				return false;
			}
		}
		if($('[name="schedulerenable"]').val() == 'yes' && $("#pagepro_calendar").val() == 'yes'){
			warnInvalid($("#schedulerenable"),_("Scheduler and Calendar can not both be enabled"));
			return false;
		}
		if($("#pagepro_calendaryes").prop('checked') && $('[name="timezone"]').val() == ''){
			warnInvalid($('[name="timezone"]'),_("Please select the timezone"));
			return false;
		}
	});

	$("#pagepro_calendarcalendar, #pagepro_calendargroup").change(function() {
		if($("#pagepro_calendarcalendar").val() !== "" && $("#pagepro_calendargroup").val() !== "") {
			$(this).val("");
			warnInvalid($(this),_("You cant set both a group and a calendar"));
		}
	});
});
