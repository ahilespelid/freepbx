function change_type(type){
    $("#file_list").toggle();
}

function validateForm(){
    
    if(!$("#add_service").is(":visible")){
        return false;
    }
    
    if($('#sn').val() == ""){
        fpbxToast(_("Please fill in the Service Number field"),_("Warning"),'warning');
        return false; 
    }
    
    if($('#label').val() == ""){
        fpbxToast(_("Please fill in the Label field"),_("Warning"),'warning');
        return false; 
    }
    return true;
}	


function clean_fields(){
    $("#ref").val("");
    $("#type").val("");
    $("#label").val("");
    $("#price").val("");
    $("#charge" ).val("<?PHP echo count($charges) ?>").change();
}

function add() {
    $("#add_service").toggle();
}

function check_sn(){
    if($('#sn').val().length == 2 && $('#sn').val() >= 1  && $('#sn').val() <= 14){
        $('#sn').css("background-color", "white");
    }
    else {
        $('#sn').css("background-color", "red");
    }
}