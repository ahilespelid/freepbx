function show_all(){
    if($("#show-all").html() == _("Show All")){
        $.ajax({
            url: "ajax.php?module=pms&rest_search=%",
            dataType:"json",
            success: function (json) {
                if (json.message != null){			
                    $("#grid").html(json.message);
                };
            },
            error: function(xhr, status, error) {
                fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
                console.error(xhr, status, error);
            }
        });	
        $("#show-all").html(_("Hide All"));	
    }
    else{
        content = '<div class="panel panel-primary" ><div class="panel-heading"><h3 class="panel-title"><b><?PHP echo _("Please enter your product in the search field.");?></b> </h3></div></div>';
        $("#grid").html(content);
        $("#show-all").html(_("Show All"));				
    }
    

}

function rest_search(to_find){
    if($("#search").val() == ""){
        content = '<div class="panel panel-primary" ><div class="panel-heading"><h3 class="panel-title"><b><?PHP echo _("Please enter your product in the search field.");?></b> </h3></div></div>';
        $("#grid").html(content);
    }
    else{
        $.ajax({
            url: "ajax.php?module=pms&rest_search="+to_find,
            dataType:"json",
            success: function (json) {
                if (json.message != null){			
                    $("#grid").html(json.message);
                };
            },
            error: function(xhr, status, error) {
                fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
                console.error(xhr, status, error);
            }
        });					
    }

}

function detailFormatter(index, row) {
    var html = [];
    $.each(row, function (key, value) {
        if(key == "ref"){
            ref = value;
        }
        if(key == "image"){
            html.push('<div class="row" style="display: inline;"><div class="col-md-3" ><img src="./modules/pms/pms_data/images/'+value+'" class="img-rounded" alt="SPM Image" width="100%"></div></div>');
        }
        
    });
    return html.join('');
}	

function validateForm(){
    
    if(!$("#panel-element-add").hasClass('in')){
        return false;
    }

    if ($("#file").val().length >= 50) {
        fpbxToast(_("The image should have 50 characters max. Please rename the image and try again."),_("Warning"),'warning');
        return false; 			
    }
    
    if($('#ref').val() == ""){
        fpbxToast(_("Please fill in the Ref field"),_("Warning"),'warning');
        return false; 
    }
    
    if($('#type').val() == ""){
        fpbxToast(_("Please fill in the Type field."),_("Warning"),'warning');
        return false; 
    }
    
    if($('#price').val() == ""){
        fpbxToast(_("Please fill in the price field."),_("Warning"),'warning');
        return false; 
    }
    
    if($('#label').val() == ""){
        fpbxToast(_("Please fill the label field."),_("Warning"),'warning');
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

function delete_rest(to_delete){
    $.ajax({
        url: "ajax.php?module=pms&rest_delete="+to_delete,
        dataType:"json",
        success: function (json) {
            $.ajax({
                url: "ajax.php?module=pms&rest_search="+"to_delete",
                dataType:"json",
                success: function (json) {
                    if (json.message != null){			
                        $("#search").val("");
                        content = '<div class="panel panel-primary" ><div class="panel-heading"><h3 class="panel-title"><b><?PHP echo _("Please enter your product in the search field.");?></b> </h3></div></div>';
                        $("#grid").html(content);
                    };
                }
            });	
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });
}

function edit_rest(ref,type,product,price, charge, image){
    $("#panel-element-add").collapse('show');
    $("#ref").val(ref);
    $("#type").val(type);
    $("#label").val(product);
    $("#price").val(price);
    $("#charge" ).val(charge).change();
}