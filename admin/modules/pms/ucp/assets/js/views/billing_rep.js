$(document).ready(function (){
    var url = window.location.href;
    $('#billingreport').attr('action', url );
});
 
function paid(thisvalue){
    var invoice_number = thisvalue;
    $.post( "index.php", {command: "paid", quietmode: "1", module: "pms", invoice_number: invoice_number}, function( data_paid ) {
        var retour_paid = JSON.parse(data_paid.message);                
        $('#message').html("<div class='alert alert-success alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Payment Complete.") + "</div></div></div>");
        $("paid"+invoice_number).val("<i class='fa fa-check-circle fa-2x' aria-hidden='true'></i>");
        location.reload();
    });		
}

function setCookie(key, value) {
    var expires = new Date();
    expires.setTime(expires.getTime() + (60 * 1000));
    document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
}
        
function get_pdf(invoice){
    $.ajax({
        url: "index.php?quietmode=1&display=dashboard&module=pms&command=get_invoice&invoice="+invoice,
        dataType:"",
        success: function (json) {
            var win = window.open('', '_blank');
            win.location.href = json.message;
        },
    });	
}