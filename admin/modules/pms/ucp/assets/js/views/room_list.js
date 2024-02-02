$(document).ready(function (){
    button_reload = 0;

    if(check_group() === false){
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The User Management group mapped to Hotel Guests in Privileges appears to be corrupt! Please fix it by browsing to Config, Privileges, check the Hotel Guests group and submit the page.") + "</div></div></div>");
    }

    $.ajax({
        url: "index.php?quietmode=1&display=dashboard&module=pms&command=check_reload",
        dataType:"json",
        success: function (json) {
            var reload_status = JSON.parse(json.message);
            if (reload_status['reload'] == "1"){
                if(button_reload == 0){
                // Display Reload button
                    $("#reload_button").show();						
                }
                else{
                    $("#reload_button").hide();		
                };
            };
        },
    });	
});

function reload_clicked(){
    if(button_reload == 0){
        $.ajax({
            url: "index.php?quietmode=1&display=dashboard&module=pms&command=reload",
            dataType:"json",
            success: function (json) {
                var reloading = JSON.parse(json.message);
                if (reloading['reload'] == "1"){	
                    //console.log("launching reload.")
                };
            },
        });				
    };
    button_reload = 1;
    var reload = setInterval( function () {
        $("#reload_button").hide();
        $.ajax({
            url: "index.php?quietmode=1&display=dashboard&module=pms&command=check_reload",
            dataType:"json",
            success: function (json) {
                var reload_status = JSON.parse(json.message);
                if (reload_status['reload'] == "1"){	
                    
                    // Display Reload button
                    $("#reload_spinner").show();
                }
                else{
                    $("#reload_spinner").hide();
                    button_reload = 0;
                    clearInterval(reload);
                    $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
                };
            },
        });	
    }, 1000 );			
}

function cos_change(extension){
    $("#modal-cos").modal('show');
    $("#ext_new_cos").val(extension);
}

function force_free(room_id, job){ 
    var r = confirm( _("The room will be available after this") + " " +job + "\n\n" + _("Force this room to become available now?"));
    if (r == true) {
        $.ajax({
            url: "index.php?quietmode=1&display=dashboard&module=pms&command=force_free&room_id="+room_id,
            dataType:"json",
            success: function (json) {
                if (json.message != null){			
                    $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
                };
            }
        });
    } 
}

function save_new_cos(){
    var ext = $("#ext_new_cos").val();
    var cos = $("#new_cos").val();

    $.ajax({
        url: "index.php?quietmode=1&display=dashboard&module=pms&command=new_cos&ext="+ext+"&cos="+cos,
        dataType:"json",
        success: function (json) {
            if (json.message == "\"ok\""){
                $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-info'>"+ _("Class of Service has been changed.") + "</div></div></div>");
    
            };
        },
        error: function(d) {
            $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("An error occurred during save, Please try again.") + "</div></div></div>");
            d.suppresserrors = true;
        }
    });
    $("#modal-cos").modal('hide');
    $("#reload_button").show();			
}

function send_message_box(extension){
    $("#text_content").val("");
    $("#send_to_ext").val(extension);
    $("#modal-sms").modal('show');
}	

function send_message() {
    var extension 	= $("#send_to_ext").val();
    var text 		= $("#text_content").val();
    $.ajax({
        url: "index.php?quietmode=1&display=dashboard&module=pms&command=send_message&send_message="+extension+"&message="+text,
        dataType:"json",
        success: function (data) {
                var result = JSON.parse(data.message);
                $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ result["Message"] + "</div></div></div>");							
        }
    });
}	

var check_alert = setInterval( function () {
    room_service = "";
}, 2000 );