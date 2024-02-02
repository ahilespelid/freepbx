$(function(){
    $('.carousel').carousel({
      interval: 5000
    });
});

function check_cur(){
    regex = /^[a-z]+[a-z]\_[A-Z]+[A-Z]$/g;
    str = $("#currency").val();
    if ( regex.exec(str) === null){
        fpbxToast(_("Bad format for country location!! eg: en_US, en_GB, fr_FR."),_("Error"),'error');
        $("#currency").val("en_US");
    }
}

function preview_ticket(){
    var ticket_header 	= $("#ticket_header").val();
    var ticket_body 	= $("#ticket_body").val();
    var ticket_footer 	= $("#ticket_footer").val();		
    location.href='config.php?quietmode=1&display=pms&view=ticket&ticket_header='+ticket_header+'&ticket_body='+ticket_body+'&ticket_footer='+ticket_footer; //Save to server		
}

function calcul_form(formula){
    $.ajax({
        url: "ajax.php?module=pms&calcul_formula="+encodeURIComponent(formula),
        dataType:"json",
        success: function (json) {
            if (json.message != null){
                if (json.message == 'unknown'){
                    json.message = "";
                }
                $("#taxe_value").val(json.message);
            };
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });			
}

function save_charge(){
    $.ajax({
        url: "ajax.php?module=pms&save_charge="+encodeURIComponent($("#taxe_formula").val())+"&taxe_label="+encodeURIComponent($("#taxe_label").val())+"&taxe_value="+$("#taxe_value").val()+"&taxe_id="+$("#taxe_id").val(),
        dataType:"json",
        success: function (json) {
            if (json.message != null){
                if (json.message == 'unknown'){
                    json.message = "";
                }
                if (json.message == 'error'){
                    fpbxToast(_("Error! A tax can not be reused in its own formula."),_("Error"),'error');
                    $("#taxe_formula").val("");	
                    $("#taxe_label").val("");	
                    $("#taxe_value").val("");
                    $("#taxe_id").val("");
                    $("#taxes_to_be_used").val("");
                    $("#addcharge").hide();	
                }
                else{
                    $("#taxe_formula").val("");	
                    $("#taxe_label").val("");	
                    $("#taxe_value").val("");
                    $("#taxe_id").val("");	
                    $("#addcharge").hide();
                    $("#taxes_to_be_used").val("");						
                    $('#chargesgrid').bootstrapTable("refresh",{silent: true});						
                }

            };
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });			
}

function edit_charge(id){
    load_charges();
    $("#addcharge").show();
    $.ajax({
        url: "ajax.php?module=pms&getchargestable="+id,
        dataType:"json",
        success: function (json) {
            $("#taxe_formula").val(json["formula"]);	
            $("#taxe_label").val(json["label"]);	
            $("#taxe_value").val(json["value"]);
            $("#taxe_id").val(json["id"]);	
            var formula = json["formula"];
            var arr_formula = formula.split("+");
            $("#taxes_to_be_used").empty();
            if(json["formula"] != ""){
                
                for (var i = 0, len = arr_formula.length; i < len; i++) {
                    $.ajax({
                        url: "ajax.php?module=pms&getchargestable="+arr_formula[i],
                        dataType:"json",
                        success: function (fdata) {
                            var fid = fdata["id"];
                            var flabel = fdata["label"];								
                            $("#taxes_to_be_used").append("<option value='"+fid+"'>"+flabel+"</option>");
                        }
                    });
                }					
            }
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });	
}

function add_formula(id){
    $.ajax({
        url: "ajax.php?module=pms&getchargestable="+id,
        dataType:"json",
        success: function (json) {
            $("#taxe_formula").val("["+json["label"]+"]+");				
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });			
}

function delete_charge(id){
    $.ajax({
        url: "ajax.php?module=pms&delete_charge="+id,
        dataType:"json",
        success: function (json) {
            $('#chargesgrid').bootstrapTable("refresh",{silent: true});			
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });	
}

function load_charges(){
    $.ajax({
        url: "ajax.php?module=pms&getchargestable=",
        dataType:"json",
        success: function (json) {
            $("#taxes_available").empty();
            for (var i = 0, len = json.length; i < len; i++) {
                var formula 	= "";
                var id 			= json[i]["id"];
                var formula 	= json[i]["formula"];
                var label 		= json[i]["label"];
                var value 		= json[i]["value"];
                $("#taxes_available").append("<option value='"+id+"'>"+label+"</option>");
            }
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });		
}

function populate_select(){
    content = $("#taxes_available").val();
    $("#taxe_formula").val("");
    $("#taxes_to_be_used").empty();		
    for ( j = 0, len = content.length; j < len; j++) {
        selected_t = content[j];
        $.ajax({
            url: "ajax.php?module=pms&getchargestable="+content[j],
            dataType:"json",
            success: function (json) {
                var formula = "";
                var id 		= json["id"];
                var formula = json["formula"];
                var label 	= json["label"];
                var value 	= json["value"];
                $("#taxes_to_be_used").append($("<option></option>").attr("value",id).text(label));
                if ($("#taxe_formula").val() == ""){
                    $("#taxe_formula").val($("#taxe_formula").val() + id); 
                }
                else {
                    $("#taxe_formula").val($("#taxe_formula").val() + "+" + id); 
                }
                $("#taxe_formula").trigger('change');
            },
            error: function(xhr, status, error) {
                fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
                console.error(xhr, status, error);
            }
        });				
    }
    
}

function change_context(){
    if($("#context_select").prop('checked')){
        
        // Need to using COS
        $.ajax({
            url: "ajax.php?module=pms&getcoslist=",
            dataType:"json",
            success: function (json) {
                var cos_list = JSON.parse(json.message);
                
                //Loading datas in variables.
                cos_option = "";
                $.each(cos_list, function(idx,cos_val) {
                    if(cos_val.indexOf("PMS") != -1 || cos_val.indexOf("SPM") != -1){
                        //Loading datas in variables.
                        cos_option  += '<option value=\''+cos_val+'\'>'+cos_val+'</option>';
                    }

                });
                $("#cosci_label").html(_("Class of Service used by default for Check-In"));
                $("#cosco_label").html(_("Class of Service used by default for Check-Out"));
                $("#cosci").empty().append(cos_option);
                $("#cosco").empty().append(cos_option);
            },
            error: function(xhr, status, error) {
                fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
                console.error(xhr, status, error);
            }
        });				
    }
    else{
        // Need to using context from-pms
        cos_option  = '<option value=\'from-pms\'>from-pms</option>';
        $("#cosci_label").html(_("Context used by default for Check-In"));
        $("#cosco_label").html(_("Context used by default for Check-Out"));
        $("#cosci").empty().append(cos_option);		
        $("#cosco").empty().append(cos_option);
    }
}

function delete_discount(label,dt){
    $.ajax({
        url: "ajax.php?module=pms&delete_discount="+label+"&date="+dt,
        dataType:"json",
        success: function (json) {
            window.location = window.location.href;
            window.location;
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });		
}

function delete_room(label,dt){
    $.ajax({
        url: "ajax.php?module=pms&delete_room="+label+"&date="+dt,
        dataType:"json",
        success: function (json) {
            window.location = window.location.href;
            window.location;
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });			
}

function check_discount(){
    if( $("#scheduling_type").val() == "discount"){
        $("#price_rate").html( _("New Rate"));
    }
    else{
        $("#price_rate").html( _("New Price"));
    }
}
function refresh(){
    load_charges();
    $("#taxe_formula").val("");
    $("#taxe_formula").trigger('change');
    $("#taxes_to_be_used").empty();	
}

function display_charge(){
    load_charges();
    $("#addcharge").toggle();
}

function hide_submit(){
        $("#action-bar").hide();
}

function show_submit(){
        $("#action-bar").show();
}

function change_om(om){
    $.ajax({
        url: "ajax.php?module=pms&change_om="+om,
        dataType:"json",
        success: function (json) {
            window.location = window.location.href;
            window.location;
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });	
}

$(document).ready(function() {
    $("textarea[name='ticket_body']")
    .keyup( function() {
        var max = parseInt($(this).attr('maxlength'));
        var len = (this).value.length;
        if (len >= max) {
        (this).value = (this).value.substring(0, max);
        } else {
            $('#charNum').html("&nbsp;&nbsp;&nbsp;&nbsp;<b>"+len+"/"+max+"</b> "+_('characters.'));
        }
    })
    .mouseover( function() {
        var max = parseInt($(this).attr('maxlength'));
        var len = (this).value.length;
        if (len >= max) {
        (this).value = (this).value.substring(0, max);
        } else {
            $('#charNum').html("&nbsp;&nbsp;&nbsp;&nbsp;<b>"+len+"/"+max+"</b> "+_('characters.'));
        }
    })
    .mouseleave( function() {
            $('#charNum').text("");
    });		
}) 