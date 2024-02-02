$("[id^='exportCSV_']").click(function () {
	name = $(this).attr('name');
	reportdata = 'reportData_' + name;
	reportname = 'reportName_' + name;
	var csv = new XlsExport(eval(reportdata), eval(reportname));
	csv.exportToCSV(eval(reportname) + '.csv')
})
$(document).ready(function () {

	//enable checked row for "Start Date for Each Scheduled Report" block
	$("input[name='date-schedule-report']").each((i, data) => {
		let e = $("input[name='date-schedule-report']")[i];
		if (e.checked === false) {
			$("#" + e.id).next().css("color", "gray");
			$("#" + e.id).parent().next().children().attr('disabled', true);
		} else {
			$("#" + e.id).next().css("color", "black");
			$("#" + e.id).parent().next().children().attr('disabled', false);
		}
	})

	//enable checked row when user clicks on radio buttons for "Start Date for Each Scheduled Report" block
	$("input[name='date-schedule-report']").click(function () {
		$("input[name='date-schedule-report']").next().css("color", "gray");
		$("input[name='date-schedule-report']").parent().next().children().attr('disabled', true);
		$(this).next().css("color", "black");
		$(this).parent().next().children().attr('disabled', false);
	})

	//multiple select dropdown for selecting week in Daily Occurence type 
	$('.multi-week').select2({
		placeholder: "Days of the week",
		closeOnSelect: false,
		allowClear: true
	});
	//multiple select dropdown for selecting month in monthly Occurence type 
	$('.multi-month').select2({
		placeholder: "Month of the Year",
		closeOnSelect: false,
		allowClear: true
	});

	//disable end date based on "Run Forever" button
	let enddate_toggle = $("input[name='end_date_toggle']:checked").val();
	$.fn.endDateRadio = function (value) {
		if (value === "1") {
			$("#date_end").attr('disabled', true);
			$(".date-align:eq(1)").css("color", "gray");
		}
		else {
			$("#date_end").attr('disabled', false);
			$(".date-align:eq(1)").css("color", "black");
		}
	};
	$("input[name='end_date_toggle']").endDateRadio(enddate_toggle);

	$("input[name='end_date_toggle']").click(function () {
		$(this).endDateRadio($(this).val())
	})

	//enable hour dropdown based on yes/no in hourly Occurence type	
	let hourly_toggle = $("input[name='hourly_run_all_day']:checked").val();
	$.fn.hourlyRadio = function (value) {
		if (value === "1") {
			$(".hour-time").attr('disabled', true);
			$(".hour-time").css("color", "gray");
		}
		else {
			$(".hour-time").attr('disabled', false);
			$(".hour-time").css("color", "black");
		}
	};
	$("input[name='hourly_run_all_day']").hourlyRadio(hourly_toggle);

	$("input[name='hourly_run_all_day']").click(function () {
		$(this).hourlyRadio($(this).val())
	})

	//enable week dropdown based on yes/no in Daily Occurence type	
	let daily_toggle = $("input[name='daily_run_on_daily']:checked").val();
	$.fn.dailyRadio = function (value) {
		if (value === "1") {
			$(".multi-week").attr('disabled', true);
			$(".multi-week").parent().siblings().css("color", "gray");
			$(".multi-week").siblings().children().find("span.select2-selection").removeClass('dropdown-error');
			$("#run_xday").attr('disabled', false);
			$("#run_xday").parent().siblings().css("color", "black");

		}
		else {
			$(".multi-week").attr('disabled', false);
			$(".multi-week").parent().siblings().css("color", "black");
			$("#run_xday").attr('disabled', true);
			$("#run_xday").parent().siblings().css("color", "gray");
			$('#run_xday').closest(".row").removeClass('has-error');
		}
	};
	$("input[name='daily_run_on_daily']").dailyRadio(daily_toggle);
	$("input[name='daily_run_on_daily']").click(function () {
		$(this).dailyRadio($(this).val())
	});

	//enable month dropdown based on yes/no in Monthly Occurence type	
	let monthly_toggle = $("input[name='monthly_run_date_month']:checked").val();
	$.fn.monthlyRadio = function (value) {
		if (value === "1") {
			$("#day-month").attr('disabled', false);
			$("#day-month").parent().siblings().css("color", "black");
			$(".monthly-dropdown").children().attr('disabled', true);
			$(".monthly-dropdown").parent().siblings().css("color", "gray");
		}
		else {
			$("#day-month").attr('disabled', true);
			$("#day-month").parent().siblings().css("color", "gray");
			$(".monthly-dropdown").children().attr('disabled', false);
			$(".monthly-dropdown").parent().siblings().css("color", "black");
		}
	}
	$("input[name='monthly_run_date_month']").monthlyRadio(monthly_toggle);
	$("input[name='monthly_run_date_month']").click(function () {
		$(this).monthlyRadio($(this).val())
	});

	$(".time-section").hide();

	//Showing Occurence type based on user selection in Edit Scheduler
	var a = ['hourly', 'daily', 'weekly', 'monthly'];

	let time = $('#type option:selected').val();
	$('#' + time).toggle();

	$('#type').change(function () {
		a.filter((time) => {
			if (time !== $(this).val()) {
				$('#' + time).hide();
			}
		})
		for (let i = 0; i < a.length; i++) {
			if ($(this).val() === a[i]) {
				$('#' + a[i]).toggle();
			}

		}
	});
	$("input[type='number']").each(function () {
		$(this).click(function () {
			$(this).closest(".row").removeClass('has-error');
		});
	});

	//Submit Validation
	$("#submit").click(function () {
		let type = $('#type').val(), email = $("#delivery_email").val(), date_end = $("#date_end").val();
		let multiWeekLength = $('.multi-week').select2('data').length, multiMonthLength = $('.multi-month').select2('data').length;

		if (!$("#report_name").val()) {
			return warnInvalid($("#report_name"), _("Name can not be blank!"));
		}
		if (!$("#delivery_email").val()) {
			return warnInvalid($("#delivery_email"), _("Please enter your Email Id!"));
		}
		if (type === null) {
			return warnInvalid($("#type"), _("Please select Occurence Type."));
		}
		else {
			if (type === "hourly" && $('#hourly').is(':visible')) {
				if (!$("#run_xhr").val()) {
					alert(_('Please Enter no of hours to run in Hourly Occurence Type.'));
					$('#run_xhr').closest(".row").addClass('has-error');
					return false;
				}
			}
			if (type === "daily" && $('#daily').is(':visible')) {
				if (!$("#run_xday").val() && !$('#run_xday').is(':disabled')) {
					alert(_('Please Enter number in Daily Occurence Type.'));
					$('#run_xday').closest(".row").addClass('has-error');
					return false;
				}
				if (multiWeekLength === 0 && !$('.multi-week').is(':disabled')) {
					alert(_('Please Select multiple days from Daily Occurence Type.'));
					$(".multi-week").siblings().children().find("span.select2-selection").addClass('dropdown-error');
					return false;
				}
			}
			if (type === "weekly" && $('#weekly').is(':visible')) {
				if (!$("#run_xweek").val()) {
					alert(_('Please Enter Week(s) for Weekly Occurence Type.'));
					$('#run_xweek').closest(".row").addClass('has-error');
					return false;
				}

			}
			if (type === "monthly" && $('#monthly').is(':visible')) {
				if (multiMonthLength === 0) {
					alert(_("Please Select the month's from Monthly Occurence Type."));
					$(".multi-month").siblings().children().find("span.select2-selection").addClass('dropdown-error');
					return false;
				}
			}
		}
		if (date_end === "" && !$('#date_end').is(':disabled')) {
			alert(_('Select the End Date.'));
			$('.end-date').addClass('has-error');
			return false;
		}
		if (!$("#date_time_minus").val() && !$('#date_time_minus').is(':disabled')) {
			return warnInvalid($("#date_time_minus"), _("Please select Date/Time minus(x)"));
		}
		if (!$("#from_the_date").val() && !$('#from_the_date').is(':disabled')) {
			return warnInvalid($("#from_the_date"), _("Please select From the Date"));
		}
		if ($('#template :selected').length === 0) {
			return warnInvalid($("#template"), _("Please select the Template"));
		}
		if ($('#queues :selected').length === 0) {
			return warnInvalid($("#queues"), _("Please select the Queues"));
		}
		if ($('#agents :selected').length === 0) {
			return warnInvalid($("#agents"), _("Please select the Agents"));
		}
		return true;
	});

	$("#download").click(function () {
		$('[name="action"]').val("csvdownload");
		generatedownloadID();
		$('.fpbx-submit').submit();
		$(this).prop("disabled", true);
		$('.loaderdiv').show();
		$('[name="action"]').val("result");
	});
});
function generatedownloadID() {
	var rdnum = Math.floor(100000 + Math.random() * 900000);
	$('#downloadid').val(rdnum);
	var intervalId = window.setInterval(function () {
		var token = getCookie("downloadid");
		if (token == 100) {
			$("#download").prop("disabled", false);
			$('.loaderdiv').hide();
			window.clearInterval(intervalId);
			expireCookie("downloadid");
		}
	}, 1000);
}
function getCookie(name) {
	function escape(s) { return s.replace(/([.*+?\^$(){}|\[\]\/\\])/g, '\\$1'); }
	var match = document.cookie.match(RegExp('(?:^|;\\s*)' + escape(name) + '=([^;]*)'));
	return match ? match[1] : null;
}

function expireCookie(cName) {
	document.cookie =
		encodeURIComponent(cName) + "=deleted; expires=" + new Date(0).toUTCString();
}
function dataFormatter(value, row, index, field) {
	switch (field.substr(0, 3)) {
		case 'per':
			return Math.round(value) + '%';
		case 'day':
			if (value == 'Totals:' || value == '~') {
				return (value);
			} else {
				return moment.unix(value).tz(timezone).format("Y-MM-DD");
			}
		case 'dat':
			if (value == 'Totals:' || value == '~') {
				return (value);
			} else {
				return moment.unix(value).tz(timezone).format("Y-MM-DD HH:mm:ss");
			}
		case 'tot':
		case 'avg':
		case 'min':
		case 'max':
		case 'sec':
		case 'dur':
			return moment.duration(parseInt(value), 'seconds').format('D[ day] H[ hour(s)] m[ minute] s[ second]');
		case 'age':
			value = (value == '' ? '&nbsp;' : value);
			return value.replace(/^[a-zA-Z0-9]{3,32}\/(\d{3,32}).*/, '$1');
		case 'dis':
			return clean_reason(value);
		case 'aba':
			return (value > 0 ? value : '&nbsp;');
		case 'cid':
			value = (value == 'estricted' ? 'Restricted' : value);
		case 'aba':
		case 'act':
		case 'que':
		case 'dow':
		case 'rea':
			return (value ? value : '&nbsp;');
		case 'cal':
		case 'rin':
		case 'hou':
		case 'cou':
		case 'ori':
			return (value ? value : '0');
		default:
			return (value ? value : '');

	}
}

function dataFormatterS(value, row, index, field) {
	switch (field.substr(0, 3)) {
		case 'per':
			return Math.round(value) + '%';
		case 'day':
			if (value == 'Totals:' || value == '~') {
				return (value);
			} else {
				return moment.unix(value).tz(timezone).format("Y-MM-DD");
			}
		case 'dat':
			if (value == 'Totals:' || value == '~') {
				return (value);
			} else {
				return moment.unix(value).tz(timezone).format("Y-MM-DD HH:mm:ss");
			}
		case 'tot':
		case 'avg':
		case 'min':
		case 'max':
		case 'sec':
		case 'dur':
			return parseInt(value) + ' seconds';
		case 'age':
			value = (value == '' ? '&nbsp;' : value);
			return value.replace(/^[a-zA-Z0-9]{3,32}\/(\d{3,32}).*/, '$1');
		case 'dis':
			return clean_reason(value);
		case 'cid':
			value = (value == 'estricted' ? 'Restricted' : value);
		case 'aba':
		case 'act':
		case 'que':
		case 'dow':
		case 'rea':
			return (value ? value : '&nbsp;');
		case 'cal':
		case 'rin':
		case 'hou':
		case 'cou':
		case 'ori':
			return (value ? value : '0');
		default:
			return (value ? value : '');

	}
}

function clean_reason(reason) {
	reason = reason.split('/');
	reason = (reason[0] == 'ENTERQUEUE' ? reason[1] : reason[0]);
	switch (reason) {
		case 'COMPLETEAGENT':
			return 'Agent';
		case 'COMPLETECALLER':
			return 'Caller';
		case 'ABANDON':
			return 'Abandon';
		case 'EXITWITHTIMEOUT':
			return 'Timeout';
		case 'EXITWITHKEY':
			return 'Key Pressed';
		case 'EXITEMPTY':
			return 'Queue Empty';
		case 'TRANSFER':
			return 'Agent';
		default:
			return reason;
	}
}
