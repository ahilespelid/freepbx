function check_mini(thisvalue) {
    if ( $.isNumeric(thisvalue) == false ) {
            if ( thisvalue != ""){
                fpbxToast(_("Please enter a valid number."),_("Warning"),'warning');
            }
        }
}