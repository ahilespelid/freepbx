function more() {
    $("#options").toggle();
}

$(document).ready(function(){
    if(check_group() === false){
        fpbxToast(_("The User Management group mapped to Hotel Guests in Privileges appears to be corrupt! Please fix it by browsing to Config, Privileges, check the Hotel Guests group and submit the page."),_("Warning"),'warning');			
    }

    $('[data-toggle="tooltip"]').tooltip();
    if ( !$('#room').val()){
        fpbxToast(_("There are no rooms available to accommodate this arrival! You have been switched to Booking Mode."),_("Warning"),'warning');
        $('#BTbooking').val("Check-in");
        $("#bk0").toggle();
        $("#bk1").toggle();
        $("#bk2").toggle();
        $("#bk3").toggle();
        $('#booking').val('on');
        find_rooms("");	
    };
});

function print_doc(){
    printElement(document.getElementById("printThis"));				
    var modThis = document.querySelector("#printSection");			
    window.print();
};

function check_checked_out(){
    var text = $("#room option[value='"+$("#room").val()+"']").text();
    var term = "";
    if( text.indexOf( term ) != -1 ){
        fpbxToast(_("Please verify this room, as it is not checked out yet."),_("Warning"),'warning');
    }			
}

function validateForm() {
    var date_ci = document.forms["checkin"]["date_ci"].value;
    var date_co = document.forms["checkin"]["date_co"].value;
    var time_ci = document.forms["checkin"]["time_ci"].value;
    var time_co = document.forms["checkin"]["time_co"].value;
    var first_n = document.forms["checkin"]["first_name"].value;
    var last_n  = document.forms["checkin"]["last_name"].value;
    var dt_ci	= date_ci.split('/');
    var tm_ci	= time_ci.split(':');
    var room	= $('#room').val();
    var dt_co	= date_co.split('/');
    var tm_co	= time_co.split(':');
    var d_ci	= new Date(dt_ci[2],dt_ci[0]-1,dt_ci[1],0,0).getTime();
    var d_co	= new Date(dt_co[2],dt_co[0]-1,dt_co[1],0,0).getTime();
    var today 	= new Date();
    var now		= new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime(); 
    
    if( $("#message").html() != ""){
        fpbxToast(_("An error has occurred."),_("Warning"),'warning');
        return false;
    }

    if(check_group() === false){
        fpbxToast(_("The User Management group mapped to Hotel Guests in Privileges appears to be corrupt! Please fix it by browsing to Config, Privileges, check the Hotel Guests group and submit the page."),_("Warning"),'warning');	
        return false;			
    }

    if (d_co < d_ci){
        fpbxToast(_("The check-out date must be after the check-in date."),_("Warning"),'warning');
        return false;
    }
    if ( date_ci == "" || date_co == "" || time_ci == "" || time_co == "" || first_n == "" || last_n == "") {
        fpbxToast(_("Some required fields are missing information. Please try again."),_("Warning"),'warning');
        return false;
    }	
    
    if ( d_ci < now && $("#BTbooking").val() == _("Check-in") ) {
        fpbxToast(_("Check-in date must be after today."),_("Warning"),'warning');
    return false;
        }
        
    if ( d_ci > now && $("#BTbooking").val() == _("Booking") ) {
        fpbxToast(_("Check-in date should not be after today."),_("Warning"),'warning');
        return false;
    }	
    
    if ( !room ){
        fpbxToast(_("There are no more rooms available for check-in! You have been switched to Booking Mode."),_("Warning"),'warning');
        return false;
    }
}

function view_ticket(Sextension){
    var ticket_header 	= $("#ticket_header").val();
    var ticket_body 	= $("#ticket_body").val();
    var ticket_footer 	= $("#ticket_footer").val();
    location.href='config.php?quietmode=1&display=pms&view=ticket&ticket_header='+ticket_header+'&ticket_body='+ticket_body+'&ticket_footer='+ticket_footer+"&ext="+Sextension+"&ucpui=off"; //Save to server		
}

function printElement(elem) {
    var domClone = elem.cloneNode(true);
    
    var $printSection = document.getElementById("printSection");
    
    if (!$printSection) {
        var $printSection = document.createElement("div");
        $printSection.id = "printSection";
        document.body.appendChild($printSection);
    }
    
    $printSection.innerHTML = "";
    
    $printSection.appendChild(domClone);
}