function paid(thisvalue){
    var invoice_number = thisvalue;
        $.post( "ajax.php", {paid: "yes", module: "pms", invoice_number: invoice_number}, function( data_paid ) {
                var retour_paid = JSON.parse(data_paid.message);
                
                fpbxToast(_("Payment Complete"),_("Success"),'success');
                $("paid"+invoice_number).val("<i class='fa fa-check-circle fa-2x' aria-hidden='true'></i>");
                location.reload();
        });		
}