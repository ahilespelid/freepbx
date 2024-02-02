function add() {
    if($("#obrt option").size() != 0){
        $("#add_rate").toggle();
    }
}

function check_zero(thisvalue) {
if ( $.isNumeric(thisvalue) == true ) {
            if ( thisvalue == 0){
                fpbxToast(_("Please enter a value greater than zero."),_("Warning"),'warning');
                $("#duration").val('');					
            }
        }
        else {
            fpbxToast(_("Please enter a valid number."),_("Warning"),'warning');
            $("#duration").val('');						
        }
}

function edit_rate(obrt,fixed_charge,increment,price,taxe,mask){
    $("#obrt").empty().append($('<option>', {
                        value: obrt,
                        text: obrt
                        }));
    $("#fixed_charge").val(fixed_charge);
    $("#increment").val(increment);
    $("#price").val(price);
    $("#taxe").val(taxe);
    $("#mask").val(mask);
    $("#add_rate").show();
}

function validateForm(){
    
    if($("#obrt option").size() == 0){
        return false; 
    }
    
    if($('#fixed_chage').val() == ""){
        fpbxToast(_("Please enter a valid number for: Connection Charge "),_("Warning"),'warning');
        return false; 
    }
    
    if($('#increment').val() == ""){
        fpbxToast(_("Please enter a valid number for: Billing Duration"),_("Warning"),'warning');
        return false; 
    }
    
    if($('#price').val() == ""){
        fpbxToast(_("Please enter a valid number for: Price"),_("Warning"),'warning');
        return false; 
    }
    
    if($('#mask').val() == ""){
        fpbxToast(_("Please enter a valid number for: Mask"),_("Warning"),'warning');
        return false; 
    }
    return true;
}