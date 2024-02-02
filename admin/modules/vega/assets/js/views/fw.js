$(document).ready(function() {
	$("#divdelete").hide();
	$("#step-2").click(function() {
		$("#divdelete").show();
		$("#divfwupload").hide();
		});
		$("#step-1").click(function() {
		$("#divfwupload").show();
		$("#divdelete").hide();
		});
	$(".button").click(function() {
		$("#divdelete").show();
		$("#divfwupload").hide();
		});	

	$('#fwuploadsubmit').bind("click",function() { 
		if(!$('#fwfile').val()){
			alert(_("Vega Firmware not selected.. Please select Vega firmware"));
			return false;
		} });
});

function validateUpgrade() {
	//validate fw selected or not  ?
	$("input[name='selectedvega[]']:checked").each(function ()
	{	var mac= $(this).val();
		var ip = $("#ip-"+mac).val();
		var fw = $("#fw-"+mac).val();
		var actfw = $("#actfw-"+mac).val().trim("\n");
		if($("#fw-"+mac).val() == 0){
		alert("Select Firmware For the IP Address:"+ip);
		breakOut = true;
		return false;
		} else {
			if(actfw == fw) {
			alert(_("Selected Firmware " +fw+" for the vega "+ip+" is same as current active firmware"));
			breakOut = true;
			return false;
			}
		}
	});
	if(breakOut) {
	    breakOut = false;
	    return false;
	} 

	var newLine = "\r\n";
	var message = _("Firmware upgrade process requires Vega to reboot immediately");
	var message1 = _("Are you ok to proceed with firmware upgrade (reboot vega) now ? ");
	var message2 = _("Firmware upgrade process will take 3 to 5 minute");
	message += newLine;	
	message += message1;
	message += newLine;	
	message += message1;
	return confirm(message);
}
