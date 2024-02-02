$(document).ready(function (){
    var room = document.getElementsByName("room")[0].value;
    if (room == "") {
        fpbxToast(_("There are no rooms configured at this time to be able to set a wake up call for."),_("Info"),'info');
        $("#add-wu").removeAttr("style").hide();
    }		
});


function add_wu(){
    var dt_wu = $("[name='date_wu']").val();
    var tm_wu = $("[name='time_wu']").val();
    var dest  = $("[name='room']").val();

    $.post( "ajax.php", {command: "savecall", module: "hotelwakeup", destination: dest, time: tm_wu, day: dt_wu}, function( data ) {
        if(!data.status) {
            fpbxToast(data.message,_("Warning!!"),'warning');
        } else {
            fpbxToast(_("Alarm clock scheduled"),_("Success"),'success');
            $('#wakeupgrid').bootstrapTable("refresh","{silent: true}");
        }
    });		
}