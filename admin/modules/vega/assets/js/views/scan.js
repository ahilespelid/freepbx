$(document).ready(function() {
$(".scanvega").hide();
$("#scanspinner").hide();
	$("#scansubmit").click(function() {
		$(".scanvega").show();
		$("#scansubmit").hide();
		$("#scanspinner").show();
	});
});
