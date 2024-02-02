function show_all(){
    var mb = ($("#minibar").is(":checked"))? "yes" : "no";

    if($("#show-all").html() == _("Show All")){
        $.ajax({
            url: "ajax.php?module=pms&rest_search=%&staff=yes&minibar="+mb,
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
        $("#show-all").html(_("Show All"));				
    }
    content = '<div class="panel panel-primary" ><div class="panel-heading"><h3 class="panel-title"><b>'+_("Please enter your product in the search field.")+'</b> </h3></div></div>';
    $("#grid").html(content);
}

function select_room() {
    room_id	= $("#room").val();
    var mb  = ($("#minibar").is(":checked"))? "yes" : "no";

    if(room_id == ""){        
        // None selected
        $("#minibar").bootstrapToggle("off");
        $("#minibar")[0].checked = false;			
        $("#minibar_toggle").hide();
        $("#table_customer").hide();
        $("#product_area").hide();
        $("#show-all").html(_("Show All"));	
    }
    else {
        if (room_id != "menu"){
            // Room Selected
            $("#table_customer").show();
            $("#product_area").show();
            $("#minibar_toggle").show();
            if(mb == "no"){
                $('#productgrid').bootstrapTable('showColumn', 'date');
            }
            else{
                $('#productgrid').bootstrapTable('hideColumn', 'date');
            }
            
            $('#productgrid').bootstrapTable('showColumn', 'price');
            $('#productgrid').bootstrapTable('showColumn', 'charge');
            $("#show-all").html(_("Show All"));					
        }
        else {
            // Menu Selected
            $("#table_customer").show();
            $("#product_area").show();
            $("#minibar").bootstrapToggle("off");
            $("#minibar")[0].checked = false;
            $("#minibar_toggle").hide();
            $('#productgrid').bootstrapTable('hideColumn', 'date');
            $('#productgrid').bootstrapTable('hideColumn', 'price');
            $('#productgrid').bootstrapTable('hideColumn', 'charge');
            $("#show-all").html(_("Show All"));					
        }
    };

    content = '<div class="panel panel-primary" ><div class="panel-heading"><h3 class="panel-title"><b>'+_("Please enter your product in the search field.")+'</b> </h3></div></div>';
    $("#grid").html(content);

    $.ajax({
        url: "ajax.php?module=pms&guest_customer_by_room_id="+room_id+'&minibar='+mb,
        dataType:"json",
        success: function (json) {
            if (json.message != null){			
                //$("#grid").html(json.message);
                result = JSON.parse(json.message);
                $("#First_name").html(result['first_name']);
                $("#Last_name").html(result['last_name']);
                $('#productgrid').bootstrapTable("removeAll");
                $('#productgrid').bootstrapTable("refresh",{url: 'ajax.php?module=pms&getproductgrid='+room_id+'&minibar='+mb});
            };
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });	  
}

function minibar_change(){
    room_id	= $("#room").val();
    var mb  = ($("#minibar").is(":checked"))? "yes" : "no";

    if(room_id == ""){        
        // None selected
        $("#minibar_toggle").hide();
        $("#table_customer").hide();
        $("#product_area").hide();
    }
    else {
        if (room_id != "menu" && mb == "no"){
            // Room Selected
            $("#table_customer").show();
            $("#product_area").show();
            $("#minibar_toggle").show();
            $('#productgrid').bootstrapTable('showColumn', 'date');
            $('#productgrid').bootstrapTable('showColumn', 'price');
            $('#productgrid').bootstrapTable('showColumn', 'charge');
            $("#show-all").html(_("Show All"));	
        }
        if (room_id != "menu" && mb == "yes"){
            // Room Selected
            $("#table_customer").show();
            $("#product_area").show();
            $("#minibar_toggle").show();
            $('#productgrid').bootstrapTable('hideColumn', 'date');
            $('#productgrid').bootstrapTable('showColumn', 'price');
            $('#productgrid').bootstrapTable('showColumn', 'charge');	
            $("#show-all").html(_("Show All"));	
        }
        if (room_id == "menu" && mb == "no"){
            // Menu Selected
            $("#table_customer").show();
            $("#product_area").show();
            $("#minibar_toggle").hide();
            $('#productgrid').bootstrapTable('hideColumn', 'date');
            $('#productgrid').bootstrapTable('hideColumn', 'price');
            $('#productgrid').bootstrapTable('hideColumn', 'charge');				
        }
    };
    
    content = '<div class="panel panel-primary" ><div class="panel-heading"><h3 class="panel-title"><b>'+_("Please enter your product in the search field.")+'</b> </h3></div></div>';
    $("#grid").html(content);

    $.ajax({
        url: "ajax.php?module=pms&guest_customer_by_room_id="+room_id+'&minibar='+mb,
        dataType:"json",
        success: function (json) {
            if (json.message != null){			
                result = JSON.parse(json.message);
                $("#First_name").html(result['first_name']);
                $("#Last_name").html(result['last_name']);
                $('#productgrid').bootstrapTable("removeAll");
                $('#productgrid').bootstrapTable("refresh",{url: 'ajax.php?module=pms&getproductgrid='+room_id+'&minibar='+mb});
            };
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });	
  
}

function add_product(product){
    room_id	= $("#room").val();
    var mb  = ($("#minibar").is(":checked"))? "yes" : "no";

    $.ajax({
        url: "ajax.php?module=pms&addrestproduct="+room_id+"&product="+product+"&minibar="+mb,
        dataType:"json",
        success: function (json) {
            if (json.message != null){			
                $('#productgrid').bootstrapTable("refresh",{url: "ajax.php?module=pms&getproductgrid="+room_id+"&minibar="+mb});
            };
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });		
}

function rest_search(to_find){
    var mb = ($("#minibar").is(":checked"))? "yes" : "no";

    if($("#search").val() == ""){
        content = '<div class="panel panel-primary" ><div class="panel-heading"><h3 class="panel-title"><b>'+_("Please enter your product in the search field.")+'</b> </h3></div></div>';
        $("#grid").html(content);
    }
    else{
        $.ajax({
            url: "ajax.php?module=pms&rest_search="+to_find+"&staff=yes&minibar="+mb,
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

function delete_product(room_id,ref){
    var mb = ($("#minibar").is(":checked"))? "yes" : "no";
    
    $.ajax({
        url: "ajax.php?module=pms&delete_product="+room_id+"&ref="+ref+"&minibar="+mb,
        dataType:"json",
        success: function (json) {
            $('#productgrid').bootstrapTable("removeAll");
            $('#productgrid').bootstrapTable("refresh",{url: "ajax.php?module=pms&getproductgrid="+room_id+'&minibar='+mb});
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });
}