$(document).ready(function() {
	$("#managetab").on('shown.bs.tab', function () { Sysadmin_SSL.refreshSettings(); });
	$("#caninstallcert").click(function() { Sysadmin_SSL.installPendingCerts(); });
	$("#importcert").click(function() { Sysadmin_SSL.importCert(); });
    $("#certid").change(function() {Sysadmin_SSL.getCertDetails($(this).val());});
    $(".details").hide();
    $(".apacheprotoE").prop('checked', false); 
    $(".apacheprotoD").prop('checked', false); 
    var opt = getSSLprotocol();
    if(opt["conf"].indexOf('+') == 0){
        $("#ALLfalse").click();
    };
    $(".confProto").html("SSLProtocol <b>"+opt["conf"]+"</b>");
    update_protocol(opt["data"]);

});

$("#certid").on("change", function(){
	if(this.value != ""){
		$(".details").show();
	}
	else{
		$(".details").hide();
	}
});

$(".all").on("change", function(){
    if(this.value == "enabled"){
        $(".apacheprotoE").attr('disabled', true);
        $(".apacheprotoD").attr('disabled', false);
        $(".apacheprotoE").prop('checked', false); 
        $(".apacheprotoD").prop('checked', false);
        $(".apacheprotoE").data("waschecked", false);
        $(".apacheprotoD").data("waschecked", false);
    }
    if(this.value == "disabled"){
        $(".apacheprotoE").attr('disabled', false);
        $(".apacheprotoD").attr('disabled', true);
        $(".apacheprotoE").prop('checked', false); 
        $(".apacheprotoD").prop('checked', false);
        $(".apacheprotoE").data("waschecked", false);
        $(".apacheprotoD").data("waschecked", false);
    }

    build_options();
});

$(".delete-cust-proto").on("click", function(){
    prot = $(this).data("for");
    if($("#"+prot+"true").prop("checked") || $("#"+prot+"false").prop("checked")){
        fpbxToast(prot+" "+_("is already in use. Unable to delete. Please release it before to delete."),_("Warning!"),'warning');
    }
    else{
        $("#confirmProto").modal("show");
        $(".delete-modal-btn").data("prot", prot);
    }   
})

$(".delete-modal-btn").on("click", function(){
    // Modal Confirm
    prot = $(".delete-modal-btn").data("prot");
    if(delCustomProtocol(prot)){
        fpbxToast(_("Custom Protocol deleted successfuly."),_("Done"),'success');
        window.location = window.location.href;
    }
    else{
        fpbxToast(_("An error occurred while deleting."),_("Alert!"),'error');
    }
    $("#confirmProto").modal("hide");
})

$(".cancel").on("click", function(){
    $(".save").prop("disabled", false);
    var prot = getSSLprotocol();
    $(".confProto").html("SSLProtocol <b>"+prot["conf"]+"</b>");
    update_protocol(prot["data"]);
})

$(".reset").on("click", function(){
    $(".save").prop("disabled", false);
    $(".apacheprotoE").prop('disabled', false);
    $(".apacheprotoD").prop('disabled', true);
    $("#ALLfalse").click();
    $('#TLSv1\\.2true').click();
    
    if(saveSSLprotocol("+TLSv1.2","enable")){
        fpbxToast(_("SSl Protocol reseted successfuly."),_("Done"),'success');
    }
    else{
        fpbxToast(_("An error occurred while reseting."),_("Alert!"),'error');
    }

    var prot = getSSLprotocol();
    $(".confProto").html("SSLProtocol <b>"+prot["conf"]+"</b>");
    $("#weakciphertrue").prop('checked', true); 
    update_protocol(prot["data"]);
})

$(".apacheprotoD").on("click", function(){
    var radio = $(this);
    if(radio.data("waschecked") == true){
        radio.prop("checked", false);
        radio.data("waschecked", false);
    } else{
        radio.prop("checked", true);
        radio.data("waschecked", true);
    } 
    prot = build_options();

    if(sslCheckFull(prot) == true){
        $(".confProto").html("SSLProtocol <b>"+prot+"</b>");
        $(".save").prop("disabled", false); 
    }
    else{
        $(".confProto").html('<i class="fa fa-exclamation-triangle"></i> ' + _("You have to enable at least one protocol!"),_("Alert!"),'error');
        $(".save").prop("disabled", true);   
    }
})

$( "input:radio[name=weakcipher]").click(function() {
    $(".save").prop("disabled", false);
});

$(".apacheprotoE").on("click", function(){
    var radio = $(this);
    if(radio.data("waschecked") == true){
        radio.prop("checked", false);
        radio.data("waschecked", false);
    } else{
        radio.prop("checked", true);
        radio.data("waschecked", true);
    }
    build_options();
})

$(".input-cust-prot").on('keyup', function(){
    if ($(this).val().match(/^[a-zA-Z0-9.]+$/) || $(this).val() == ""){
        $(".save-custom").prop("disabled", false);  
    }
    else{
        fpbxToast(_("Illegal Protocol format. Only Alpha, Numeric and dot are allowed."),_("Alert!"),'error');
        $(".save-custom").prop("disabled", true);
    }
})

$(".input-cust-desc").on('keyup', function(){
    if ($(this).val().match(/^[a-zA-Z0-9.\s]+$/) || $(this).val() == ""){
        $(".save-custom").prop("disabled", false);  
    }
    else{
        fpbxToast(_("Illegal Protocol format. Only Alpha, Numeric and dot are allowed."),_("Alert!"),'error');
        $(".save-custom").prop("disabled", true);
    }
})

$(".save").on("click", function(){
    prot = build_options();  
    weakercipher = $( "input:radio[name=weakcipher]:checked").val();
    if(saveSSLprotocol(prot,weakercipher)){
        fpbxToast(_("SSl Protocol saved successfuly."),_("Done"),'success');
    }
    else{
        fpbxToast(_("An error occurred while saving."),_("Alert!"),'error');
    }
})
$(".close-custom").on("click", function(){
    $("#Protocol").val("");
    $("#Description").val("");
})

$(".save-custom").on("click", function(){
    var opt = getSSLprotocol();
    var error = false;
    var prot  = $.trim($("#Protocol").val());
    if(prot == "" || $("#Description").val() == ""){
        fpbxToast(_("Please, fill in both fields."),_("Warning!"),'warning');
        error = true;
        $("#CustomProtocol").modal("hide");
    }

    // Check duplicated proto from base.
    switch(prot) {
        case "all":
        case "SSLv3":
        case "TLSv1":
        case "TLSv1.1":
        case "TLSv1.2":
            error = true;
            break;
        case "TLSv1.3":
            error = true;
            if($('div[id="TLSv1.3"]').length == 0){
                error = false;
            }            
            break;
    }

    // Check duplicated proto already set.
    $.each(opt["data"],function(option) {
        if(option == prot){
            error = true;
        }
    });

    if(error){
        fpbxToast(_("This protocol already exists."),_("Warning!"),'warning');
        error = true;
        $("#Protocol").val("");
        $("#Description").val("");
        $("#CustomProtocol").modal("hide");
    }

    if(!error){
        if(addCustomProtocol()){
            fpbxToast(_("Protocol added successfuly."),_("Done"),'success');
        }
        else{
            fpbxToast(_("An error occurred while adding."),_("Alert!"),'error');
        }
    
        $("#Protocol").val("");
        $("#Description").val("");
        $("#CustomProtocol").modal("hide");
        window.location = window.location.href;     
    }
})

function build_options(){
    var options = "";
    if($(".all").prop("checked")){
        options += "all ";
        $('.apacheprotoD').each( function(){
            if(this.checked == true){
               options += "-"+this.name+" "; 
            }            
        });
    }
    else{
        $('.apacheprotoE').each( function(){
            if(this.checked == true){
               options += "+"+this.name+" "; 
            }            
        });     
    }

    if(options != ""){
        $(".confProto").html("SSLProtocol <b>"+options+"</b>");
        $(".save").prop("disabled", false);
    }
    else{
        $(".confProto").html(_('SSLProtocol <i class="fa fa-exclamation-triangle"></i> <b>Cannot be empty.</b>'));        
        $(".save").prop("disabled", true);
    }    
    return options;
}

function sslCheckFull(options){
    var result = false;
	$.ajax({
		url: window.ajaxurl,
        data: { command: 'ssl_check_full', module: window.modulename, options: options },
        async: false,
		success: function(data) {
            result = (data["status"] == true && data["message"] == "ok") ? true : false;
        },
    });
    return result;  

}
 
function saveSSLprotocol(options,weakercipher){
    var result = false;
	$.ajax({
		url: window.ajaxurl,
        data: { command: 'save_ssl_protocol', module: window.modulename, options: options,weakercipher:weakercipher },
        async: false,
		complete: function(data) {
            result = data["status"];
        },
        error: function(error){
            var opt = getSSLprotocol();
            if($.trim(opt["conf"]) == $.trim(options)){
                fpbxToast(_("SSl Protocol saved successfuly."),_("Done"),'success');  
            }
            else{
                fpbxToast(_("An error occurred while saving."),_("Alert!"),'error');                
            }
            window.location = window.location.href; 
        },
    });
    return result;
}

function delCustomProtocol(prot){
    var result = false;
   
	$.ajax({
		url: window.ajaxurl,
        data: { command: 'del_cust_protocol', module: window.modulename, protocol: prot },
        async: false,
		success: function(data) {
            result = data["status"];
		},
    });
    
    return result;
}

function addCustomProtocol(){
    prot = $("#Protocol").val();
    desc = $("#Description").val();
    var result = false;
	$.ajax({
		url: window.ajaxurl,
        data: { command: 'add_cust_protocol', module: window.modulename, protocol: prot, description: desc },
        async: false,
		success: function(data) {
            result = data["status"];
		},
    });
    
    return result;
}

function getSSLprotocol(){
    var result = [];
	$.ajax({
		url: window.ajaxurl,
        data: { command: 'get_ssl_protocol', module: window.modulename, },
        async: false,
		success: function(data) {
            result = data;
		},
    });
    return result;
}

function update_protocol(opt){
    $.each(opt, function(key, value){
        key = key.replace(".", "\\.");
        if( key == "ALL" && value == "enabled"){
            $("#ALLtrue").prop('checked', true);
            $(".apacheprotoE").attr('disabled', true);
            $(".apacheprotoD").attr('disabled', false);
        }

        if( key == "ALL" && value == "disabled"){
            $("#ALLfalse").prop('checked', true);
            $(".apacheprotoE").attr('disabled', false);
            $(".apacheprotoD").attr('disabled', false);
        }

        if($("#ALLtrue").prop('checked')){
            if(value == "enabled"){
                $("#"+key+"true").prop('checked', true);
                $("#"+key+"true").data("waschecked", true);
            }
            if(value == "disabled"){
                $("#"+key+"false").prop('checked', true);
                $("#"+key+"false").data("waschecked", true);
            }            
        }

        if($("#ALLfalse").prop('checked')){
            if(value == "enabled"){
                $("#"+key+"true").prop('checked', true); 
                $("#"+key+"true").data("waschecked", true); 
            }
            if(value == "disabled"){
                $("#"+key+"false").prop('checked', true);
                $("#"+key+"false").data("waschecked", true); 
            }    
        }
    });
}