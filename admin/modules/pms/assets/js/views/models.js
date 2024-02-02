$(document).ready(function(){
    if( $("#model").val() != "" && $("#price").val() != "" ){
        $("#add_type").toggle();
    }
});

function add() {
        $("#add_type").toggle();
}

function validateForm(){
    
    if(!$("#add_type").is(":visible")){
        return false;
    }

    if($("#price").val() == ""){
        fpbxToast(_("Please enter a valid price."),_("Warning"),'warning');
        return false;
    }
    
    if($("#model").val() == ""){
        fpbxToast(_("Please enter a valid room type."),_("Warning"),'warning');
        return false;
    }

    if($("#vat option:selected" ).text() == ""){
        fpbxToast(_("Please enter a valid taxe. It should not be empty."),_("Warning"),'warning');
        return false;
    }
}