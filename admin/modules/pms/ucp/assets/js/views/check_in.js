$(document).ready(function (){

    button_reload = "0";
    if ( !$('#room').val()){
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("There are no rooms available to accomodate this arrival! You have been switched to Booking mode.") + "</div></div></div>");
        
        $('#BTbooking').val(_("Check-in"));
        $("#bk0").toggle();
        $("#bk1").toggle();
        $("#bk2").toggle();
        $("#bk3").toggle();
        $('#booking').val('on');
        find_rooms("");	
    };

    if(check_group() === false){
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The User Management group mapped to Hotel Guests in Privileges appears to be corrupt! Please fix it by browsing to Config, Privileges, check the Hotel Guests group and submit the page.") + "</div></div></div>");	
    }

    $.ajax({
        url: "index.php?quietmode=1&display=dashboard&module=pms&view=checkout&command=check_reload",
        dataType:"json",
        success: function (json) {				
            var reload_status = JSON.parse(json.message);
            if (reload_status['reload'] == "1"){
                if(button_reload == "0"){
                // Display Reload button
                    $("#reload_button").modal('show');						
                }
                else{
                    $("#reload_button").modal('hide');		
                };
            };
        },
    });	
});

function more() {
    $("#options").toggle();
}

$("#room").on("click", function(){
    $.ajax({
        url: "index.php?quietmode=1&display=dashboard&module=pms&command=getDateTime",
        dataType:"json",
        success: function (data) {				
            $("#datepicker_ci").val(data["date"]);
            $("#datepicker_co").val(data["date"]);
            $("#timepicker_ci").val(data["time"]);
            $("#timepicker_co").val(data["time"]);
        },
    });	
})

function validateForm() {
    var date_ci = document.forms["checkin"]["date_ci"].value;
    var date_co = document.forms["checkin"]["date_co"].value;
    var time_ci = document.forms["checkin"]["time_ci"].value;
    var time_co = document.forms["checkin"]["time_co"].value;
    var first_n = document.forms["checkin"]["first_name"].value;
    var last_n  = document.forms["checkin"]["last_name"].value;
    var dt_ci	= date_ci.split('/');
    var tm_ci	= time_ci.split(':');
    var dt_co	= date_co.split('/');
    var tm_co	= time_co.split(':');
    var d_ci	= new Date(dt_ci[2],dt_ci[0]-1,dt_ci[1],0,0).getTime();
    var d_co	= new Date(dt_co[2],dt_co[0]-1,dt_co[1],0,0).getTime();
    var today 	= new Date();
    var now		= new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime(); 
    
    if( $("#message").html() != ""){
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("An error has occurred! : ")+$("#message").html() + "</div></div></div>");
        return false;
    }

    if(check_group() === false){
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The User Management group mapped to Hotel Guests in Privileges appears to be corrupt! Please fix it by browsing to Config, Privileges, check the Hotel Guests group and submit the page.") + "</div></div></div>");		
        return false;			
    }

    if (d_co < d_ci) {
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The check-out date must be after than the check-in date.") + "</div></div></div>");
        return false;
    }
    
    if ( d_ci < now && $("#BTbooking").val() == _("Check-in") ) {
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Check-in date must be after today.") + "</div></div></div>");
        return false;
    }
    
    if ( date_ci == "" || date_co == "" || time_ci == "" || time_co == "" || first_n == "" || last_n == "") {
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Some fields need to be filled out. Please check and try again.") + "</div></div></div>");
        return false;
    }
    
    if ( d_ci > now && $("#BTbooking").val() == _("Booking") ) {
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Check-in date should not be after today.") + "</div></div></div>");
    return false;
    }		
    if ( !room ){
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("No more rooms available for check in! You have been switched to Booking mode.") + "</div></div></div>");
        return false;
    }
}

function check_checked_out(){
    var text = $("#room option[value='"+$("#room").val()+"']").text();
    var term = "(!)";
    if( text.indexOf( term ) != -1 ){
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Please check this room as it is not checked out yet.") + "</div></div></div>");
    };
                
}

function reload_clicked(){
    if(button_reload == "0"){
        $.ajax({
            url: "index.php?quietmode=1&display=dashboard&module=pms&view=checkout&command=reload",
            dataType:"json",
            success: function (json) {
                var reloading = JSON.parse(json.message);
                if (reloading['reload'] == "1"){	
                    //console.log("launching reload.")
                };
            },
        });				
    };
    button_reload = "1";
    var reload = setInterval( function () {
        $("#reload_button").modal('hide');
        $.ajax({
            url: "index.php?quietmode=1&display=dashboard&module=pms&view=checkout&command=check_reload",
            dataType:"json",
            success: function (json) {
                var reload_status = JSON.parse(json.message);
                if (reload_status['reload'] == "1"){	
                    
                    // Display Reload button
                    $("#reload_spinner").modal('show');;
                }
                else{
                    $("#reload_spinner").modal('hide');;
                    button_reload = "0";
                    $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Submit Completed") + "</div></div></div>");
                    $("#first_name").val("");
                    $("#last_name").val("");
                    $("#address").val("");
                    $("#cp").val("");
                    $("#city").val("");
                    $("#phone").val("");
                    $("#mobile").val("");
                    $("#fax").val("");
                    $("#TIN").val("");
                    $("#Off_Doc").val("");
                    $("#comments").val("");
                    clearInterval(reload);
                    var room = $("#room").val();
                    $("#room option[value='"+room+"']").remove();
                };
            },
        });	
    }, 1000 );			
}

function view_ticket(Sextension){
    var ticket_header 	= $("#ticket_header").val();
    var ticket_body 	= $("#ticket_body").val();
    var ticket_footer 	= $("#ticket_footer").val();
    $.post({
        type: "POST",
        url: "ajax.php?module=pms&command=mk_ticket&ticket_header="+ticket_header+"&ticket_body="+ticket_body+"&ticket_footer="+ticket_footer+"&ext="+$("#room").val()+"&ucpui=on",
        dataType: "html",
        success: function (data) {
                var datas 	= JSON.parse(data);
                var pdf 	= atob(datas.message);
                window.open("data:application/pdf," + escape(pdf)); 
        },
    });
}