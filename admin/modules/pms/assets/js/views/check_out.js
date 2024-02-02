$(document).ready(function (){
    $("#bt_check_out").hide();
    
    if(check_group() === false){
        fpbxToast(_("The User Management group mapped to Hotel Guests in Privileges appears to be corrupt! Please fix it by browsing to Config, Privileges, check the Hotel Guests group and submit the page."),_("Warning"),'warning');			
        $("#bt_preview").hide();
    }

    if (!$("#room").val()) {
        fpbxToast(_("There's no room to check out."),_("Info"),'info');
        $("#buttons").removeAttr("style").hide();
    }
    
});

function Preview(thisbutton) {
    action  = thisbutton;
    
    if($("#preview").html() != "" && action == "Preview" ){
        $("#preview").html("");
        $("#bt_preview").html(_('Preview')+' '+'<i class="fa fa-chevron-down" aria-hidden="true"></i>');
    }
    else{
        $("#bt_check_out").show();
        $("#bt_preview").html(_('Hide')+' '+'<i class="fa fa-chevron-up" aria-hidden="true"></i>');
      date_co 		= $("[name='date_co']").val();
      time_co 		= $("[name='time_co']").val();
        room  			= $("[name='room']").val();
        group 			= $("[name='groupe']").val();
        discount		= $("[name='discount']").val();
        details 		= $("[name='details']").prop('checked');
        tourist 		= $("[name='tourist']").val();	
        paid 			= $("[name='paid']").prop('checked');
        sendbymail		= $("[name='sendbymail']").prop('checked');
        when	 		= $("[name='when']").val();
        payment_mode 	= $("[name='payment_mode']").val();
        action  		= thisbutton;
        if (paid == true){
            paid = "1";
        }
        else{
            paid = "0";
        }

        if (details == true){
            details = "1";
        }
        else{
            details = "0";
        }			
        
        if (sendbymail == true){
            sendbymail = "1";
        }
        else{
            sendbymail = "0";
        }
        
        $.post( "ajax.php", {	preview: 	"yes", 
                                module: 	"pms", 
                                room: 		room, 
                                date_co: 	date_co, 
                                time_co: 	time_co, 
                                group: 		group, 
                                discount: 	discount, 
                                tourist: 	tourist, 
                                details:	details,
                                paid: 		paid,
                                when:		when,
                                payment_mode: payment_mode
                            }, function( data ) {

            var retour  		= JSON.parse(data.message);
            var logo 			= retour[0]["logo"];
            var company 		= retour[0]["company"];
            var guest_address 	= retour[0]["guest_address"];
                invoice_number 	= retour[0]["invoice_number"];
            var table_header_h 	= retour[0]["table_header_h"];
            var table_footer	= retour[0]["table_footer"];
            var table_header_m 	= retour[0]["table_header_m"];
            var line_minib		= retour[0]["line_minib"];
            var table_header_res= retour[0]["table_header_res"];
            var line_restaurant	= retour[0]["line_restaurant"];
            var table_header_cd	= retour[0]["table_header_cd"];
            var table_header_c	= retour[0]["table_header_c"];
            var table_footer	= retour[0]["table_footer"];
            var line_hotel		= retour[0]["line_hotel"];
            var line_calls		= retour[0]["line_calls"];
            var line_calls_det	= retour[0]["line_calls_det"];
            var line_sum		= retour[0]["line_sum"];
            var table_header_t	= retour[0]["table_header_t"];
            
            var total_room		= retour[0]["total_room"];
            var total_bar		= retour[0]["total_bar"];
            var total_restaurant= retour[0]["total_restaurant"];
            var total_call		= retour[0]["total_call"];
            var total_billing	= retour[0]["total_billing"];
            
            var content = '<p></p><div class="fpbx-container">';
            
                content += '<div class="tab-content display full-border">';
    
                content += '<div class="row justify-content-md-center">';
                content += '<div class="col-md-4">';
                content += '<address>'+company+'</address>';
                content += '</div>';
                content += '<div class="col-md-4">';
                content += '</div>';
                content += '<div class="col-md-4">';
                content += '<img width="75%" height="75%" src='+logo+'>';
                content += '</div>';
                content += '</div>';
                
                content += '<div class="row justify-content-md-center">';
                content += '<div class="col-md-4">';
                content += '<b>Invoice number: </b>'+invoice_number+'<br><b>'+_("Delivered at : ")+'</b>'+date_co;
                content += '</div>';
                content += '<div class="col-md-4">';
                content += '</div>';
                content += '<div class="col-md-4">';
                content += '<address>'+guest_address+'</address>';
                content += '</div>';
                content += '</div>';
                
                content += '<div class="row"><div class="col-md-12" style="text-align: center"><h1>'+_("Invoice")+'</h1></div></div>';
                content += table_header_h;
                content += line_hotel;
                content += table_footer;
                
                // Mini-bar
                content += table_header_m;
                content += line_minib;
                content += table_footer;
                
                // Restaurant
                content += table_header_res;
                content += line_restaurant;
                content += table_footer;
                
                // Calls
                if(details == true){
                    content += table_header_cd;
                    content += line_calls_det;
                    content += table_footer;	
                }
                else {
                    content += table_header_c;
                    content += line_calls;
                    content += table_footer;					
                };
                
                content += '<div class="row"><div class="col-md-12"><div class="row"><div class="col-md-4"></div><div class="col-md-4"></div><div class="col-md-4">';
                content += table_header_t;
                content += line_sum;
                content += table_footer;				
                content += '</div></div></div></div>';

                content += '</div>';
                content += '</div></p>';
                
                if (action == "Preview"){
                    $("#preview").html(content); 

                };
                
                if (action == "Checkout"){
                    $("#preview").html(content);
                    $("#preview").hide();
                    var xhr = new XMLHttpRequest();
                    xhr.open( 'post', 'config.php?display=pms&view=checkout&invoice='+invoice_number+"&sendbymail="+sendbymail+"&when="+when+"&payment_mode"+payment_mode, true ); //Save to server
                    // Send Ajax request for checkout.
                    date_time_co  = date_co + " " + time_co;
                    $.post( "ajax.php", {	checkout: 			"yes", 
                                            module: 			"pms", 
                                            room: 				room, 
                                            date_co: 			date_time_co, 
                                            paid: 				paid, 
                                            total_room: 		total_room, 
                                            total_bar: 			total_bar, 
                                            total_restaurant:	total_restaurant,
                                            total_call: 		total_call, 
                                            total_billing: 		total_billing, 
                                            payment_mode: 		payment_mode, 
                                            invoice_number: 	invoice_number, 
                                            sendbymail: 		sendbymail, 
                                            when: 				when
                                        }, function( data_ckeckout ) {
                        var retour_checkout = JSON.parse(data_ckeckout.message);
                        
                        fpbxToast(_("Checkout done. Please apply the configuration by clicking the Apply Config button"),_("Success"),'success');
                        $("#preview").html("");
                        //location.href = "/admin/config.php?display=pms&view=checkout&sendbymail="+sendbymail+"&invoice="+invoice_number;
                        window.open("/admin/config.php?display=pms&view=checkout&sendbymail="+sendbymail+"&invoice="+invoice_number,'_blank');
                        window.location = window.location.href;
                    });
                    
                };
        });			
    };
}

function select_date() {
    var when		= $("[name='when']").val();
    var room		= $("[name='room']").val();
    if(when == "1") {
        $.post( "ajax.php", {scheduled: room, module: "pms" }, function( data_sched ) {
        var retour	= JSON.parse(data_sched.message);
        $("#datepicker_co").val(retour[0]["date_sched"]); 
        $("#timepicker_co").val(retour[0]["time_sched"]); 
    });
    };
    if(when == "0") {
        $.post( "ajax.php", {scheduled: room, module: "pms" }, function( data_sched ) {
        var retour	= JSON.parse(data_sched.message);
        $("#datepicker_co").val(retour[0]["date_now"]); 
        $("#timepicker_co").val(retour[0]["time_now"]); 
    });
    };
}

function force_dec(){
    var b = $("#pr_bf").html();
    var l = $("#pr_lu").html();
    var d = $("#pr_di").html();
    $("#pr_bf").html(parseInt(b).toFixed(2));
    $("#pr_lu").html(parseInt(l).toFixed(2));
    $("#pr_di").html(parseInt(d).toFixed(2));
}

function find_group(grp){
    var room_list = "";
    $.post( "ajax.php", {find_group: grp, module: "pms" }, function( data_group ) {
            var ret_grp	= JSON.parse(data_group.message);
            
            //Loading datas in variables.
            $.each(ret_grp, function(k, v) {
                //Loading datas in variables.
                extension	= v.extension;	
                room_name	= v.room_name;		
                room_list  += '<option value=\''+extension+'\'>'+room_name+'</option>';
            });
        $('#room').empty();
        $('#room').append(room_list);
    });
}

function check_val(thisvalue) {
    if ( $.isNumeric(thisvalue) == false){
        fpbxToast(_("Please enter a valid Number."),_("Warning"),'warning');
        }
    if ( thisvalue == 0){
        fpbxToast(_("The value must be greater than zero."),_("Warning"),'warning');
        }
}