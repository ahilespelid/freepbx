$(document).ready(function (){
    $("#bt_check_out").hide();

    button_reload = 0;
    if (!$("#room").val()) {
        $('#message').html("<div class='alert alert-info alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("No rooms available for check out.") + "</div></div></div>");
        $("#buttons").removeAttr("style").hide();
    }

    if(check_group() === false){
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The User Management group mapped to Hotel Guests in Privileges appears to be corrupt! Please fix it by browsing to Config, Privileges, check the Hotel Guests group and submit the page.") + "</div></div></div>");
        $("#bt_preview").hide();	
    }

    $.ajax({
        url: "index.php?quietmode=1&display=dashboard&module=pms&view=checkout&command=check_reload",
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

function Preview(thisbutton) {
    action  = thisbutton;
    
    if($("#preview").html() != "" && action == "Preview" ){
        $("#preview").html("");
        $("#bt_preview").html(_('Preview')+' '+'<i class="fa fa-chevron-down" aria-hidden="true"></i>');
        
    }
    else {			
        $("#bt_check_out").show();
        $("#bt_preview").html(_('Hidden')+' '+'<i class="fa fa-chevron-up" aria-hidden="true"></i>');
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
        paid 			= (paid == true) ? "1" : "0";
        details 		= (details == true) ? "1" : "0";
        sendbymail 		= (sendbymail == true) ? "1" : "0";

        $.post( "index.php", {	preview: 		"yes", 
                                command: 		"preview",
                                module: 		"pms", 
                                quietmode:  	1,
                                room: 			room, 
                                date_co: 		date_co, 
                                time_co: 		time_co, 
                                group: 			group, 
                                discount: 		discount, 
                                tourist: 		tourist,
                                details:		details,									
                                paid: 			paid,
                                when:			when,
                                payment_mode: 	payment_mode
                            }, function( data ) {

            var retour  		= JSON.parse(data.message);
            var logo 			= retour[0]["logo"];
            var logo64			= retour[0]["logo64"];
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
            var total_call		= retour[0]["total_call"];
            var total_billing	= retour[0]["total_billing"];
            
            var content = '<div class="row"><div class="col-md-10"></div></div>';
            
                content += '<div class="row"><div class="col-md-1"></div><div class="col-md-8"><div class="fpbx-container">';
                content += '<div class="tab-content display full-border">';
    
                content += '<div class="row justify-content-md-center">';
                content += '<div class="col-md-4">';
                content += '<address>'+company+'</address>';
                content += '</div>';
                content += '<div class="col-md-4">';
                content += '</div>';
                content += '<div class="col-md-4">';
                content += '<img width="75%" height="75%" src='+logo64+'>';
                content += '</div>';
                content += '</div>';
                
                content += '<div class="row justify-content-md-center">';
                content += '<div class="col-md-4">';
                content += '<b>Invoice number: </b>'+invoice_number+'<br><b>'+_("Delivered at: ")+'</b>'+date_co;
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
                content += '</div><div class="col-md-4"></div></div></div>';
                
                if (action == "Preview"){
                    $("#preview").show();
                    $("#preview").html(content); 
                };

                if (action == "Checkout"){
                    $("#preview").html(content);
                    $("#preview").hide();
                    var xhr 	= new XMLHttpRequest();
                    xhr.open( 'post', 'index.php?display=dashboard&mod=pms&view=checkout&invoice='+invoice_number+"&sendbymail="+sendbymail+"&when="+when+"&payment_mode"+payment_mode, true ); //Post to php Script to save to server
                    // Send Ajax request for checkout.
                    date_time_co  = date_co + " " + time_co;
                    $.post( "index.php", {	command:		"checkout",
                                            quietmode:		1,
                                            checkout: 		"yes", 
                                            module: 		"pms", 
                                            view:			"checkout",
                                            room: 			room, 
                                            date_co: 		date_time_co, 
                                            paid: 			paid, 
                                            total_room: 	total_room, 
                                            total_bar: 		total_bar, 
                                            total_call: 	total_call, 
                                            total_billing: 	total_billing, 
                                            payment_mode: 	payment_mode, 
                                            invoice_number: invoice_number, 
                                            sendbymail: 	sendbymail, 
                                            when: 			when
                                        }, function( data_ckeckout ) {
                        var retour_checkout = JSON.parse(data_ckeckout.message);
                        
                        $('#message').html("<div class='alert alert-info alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Checkout done. Submit to apply.") + "</div></div></div>");						
                        $("#preview").html("");
                        $("#reload_button").show();
                        get_invoice(invoice_number);
                        if(sendbymail == "1"){
                            send_invoice(invoice_number);
                        }
                        var room = $("#room").val();
                        $("#room option[value='"+room+"']").remove();
                        $("#bt_check_out").hide();
                        $("#bt_preview").html(_('Preview')+' '+'<i class="fa fa-chevron-down" aria-hidden="true"></i>');
                        if (!$("#room").val()) {
                            $('#message').html("<div class='alert alert-info alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("No rooms available for check out.") + "</div></div></div>");
                            $("#buttons").removeAttr("style").hide();
                        }
                    });
                };
        });				
    }
}

function send_invoice(invoice){
    $.ajax({
        url: "index.php?quietmode=1&display=dashboard&module=pms&command=send_invoice&invoice="+invoice,
        dataType:"",
        success: function (json) {
            //console.log("ok");
        },
    });	
}

function get_invoice(invoice){
    $.ajax({
        url: "index.php?quietmode=1&display=dashboard&module=pms&command=get_invoice&invoice="+invoice,
        dataType:"",
        success: function (json) {
            var win = window.open('', '_blank');
            win.location.href = json.message;
        },
    });	
}

function select_date() {
    var when		= $("[name='when']").val();
    var room		= $("[name='room']").val();
    if(when == "1") {
        $.post( "index.php", {command: "scheduled", quietmode: 1, scheduled: room, module: "pms" }, function( data_sched ) {
        var retour	= JSON.parse(data_sched.message);
        $("#datepicker_co").val(retour[0]["date_sched"]); 
        $("#timepicker_co").val(retour[0]["time_sched"]); 
    });
    };
    if(when == "0") {
        $.post( "index.php", {command: "scheduled", quietmode: 1, scheduled: room, module: "pms"}, function( data_sched ) {
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

    $.ajax({
        url: "index.php?quietmode=1&module=pms&view=checkout&command=find_group&find_group="+grp,
        dataType:"json",
        success: function (json) {
            var ret_grp	= JSON.parse(json.message);
            
            //Loading datas in variables.
            $.each(ret_grp, function(k, v) {
                //Loading datas in variables.
                extension	= v.extension;	
                room_name	= v.room_name;		
                room_list  += '<option value=\''+extension+'\'>'+room_name+'</option>';
            });
        $('#room').empty();
        $('#room').append(room_list);
        },
    });	
}
function check_val(thisvalue) {
    if ( $.isNumeric(thisvalue) == false){
        $('#message').html("<div class='alert alert-info alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Please enter a valid Number.") + "</div></div></div>");					
    }
    
    if ( thisvalue == 0){
        $('#message').html("<div class='alert alert-info alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The value must be greater than zero.") + "</div></div></div>");					
    }
}

function reload_clicked(){
    if(button_reload == 0){
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
    button_reload = 1;
    var reload = setInterval( function () {
        $("#reload_button").hide();
        $.ajax({
            url: "index.php?quietmode=1&display=dashboard&module=pms&view=checkout&command=check_reload",
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
                };
            },
        });	
    }, 5000 );			
}