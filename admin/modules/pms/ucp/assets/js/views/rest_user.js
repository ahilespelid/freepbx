$( document ).ready(function() {
    $("#table_customer").hide();
    $("#product_area").hide();
    if($("#version").val() == "yes"){
        $('#minibar').bootstrapToggle();
    }    
});

function show_grid_message(){
    content = '<div class="panel panel-primary" ><div class="panel-heading"><h3 class="panel-title"><b>'+ _("Please enter a product in Search field.") +'</b> </h3></div></div>';
    $("#grid").html(content);
}

function show_all(){
    var mb = ($("#minibar").is(":checked"))? "yes" : "no";
    
    if($("#show-all").html() == _("Show All")){
        $.ajax({
            url: "index.php?quietmode=1&module=pms&command=rest_search&rest_search=%&staff=yes&minibar="+mb,            
            dataType:"json",
            async: false,
            success: function (json) {
                if (json.message != null){			
                    $("#grid").html(json.message);
                };
            }
        });	
        $("#show-all").html(_("Hide All"));	
    }
    else{
        show_grid_message();
        $("#show-all").html(_("Show All"));				
    }
}	

function select_room(content_selected) {
    room_id	= $("#room").val();
    var mb = ($("#minibar").is(":checked"))? "yes" : "no";

    if(room_id == ""){
        
        // None selected
        $("#minibar").bootstrapToggle("off");
        $("#minibar")[0].checked = false;
        $("#minibar_toggle").hide();
        $("#table_customer").hide();
        $("#product_area").hide();
        show_grid_message();
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
            show_grid_message();
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
            show_grid_message();
            $("#show-all").html(_("Show All"));					
        }
    };

    $.ajax({
        url: "index.php?quietmode=1&module=pms&command=guest_customer_by_room_id&room_id="+room_id+'&minibar='+mb,
        dataType:"json",
        async: false,
        success: function (json) {
            if (json.message != null){			
                result = JSON.parse(json.message);
                $("#First_name").html(result['first_name']);
                $("#Last_name").html(result['last_name']);
                $('#productgrid').bootstrapTable("removeAll");
                $('#productgrid').bootstrapTable("refresh",{url: "index.php?quietmode=1&module=pms&command=getproductgrid&getproductgrid="+room_id+'&minibar='+mb});
            };
        }
    });	
}

function minibar_change(){
    room_id	= $("#room").val();
    var mb = ($("#minibar").is(":checked"))? "yes" : "no";

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
            show_grid_message();
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
            content = '<div class="panel panel-primary" ><div class="panel-heading"><h3 class="panel-title"><b>'+ _("Please enter a product in Search field.") +'</b> </h3></div></div>';
            $("#grid").html(content);
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
    
    $.ajax({
        url: "index.php?quietmode=1&module=pms&command=guest_customer_by_room_id&guest_customer_by_room_id="+room_id+'&minibar='+mb,
        dataType:"json",
        async: false,
        success: function (json) {
            if (json.message != null){			
                //$("#grid").html(json.message);
                result = JSON.parse(json.message);
                $("#First_name").html(result['first_name']);
                $("#Last_name").html(result['last_name']);
                $('#productgrid').bootstrapTable("removeAll");
                if($("#version").val() == "yes"){
                    $('#productgrid').bootstrapTable("refresh",{url: 'ajax.php?module=pms&command=getproductgrid&getproductgrid='+room_id+'&minibar='+mb});
                }
                else{
                    $('#productgrid').bootstrapTable("refresh",{url: 'index.php?quietmode=1&module=pms&command=getproductgrid&getproductgrid='+room_id+'&minibar='+mb});
                }
            };
        }
    });	
  
}	

function add_product(product){
    room_id	= $("#room").val();
    var mb = ($("#minibar").is(":checked"))? "yes" : "no";

    $.ajax({
        url: "index.php?quietmode=1&module=pms&command=addrestproduct&addrestproduct="+room_id+"&product="+product+"&minibar="+mb,
        dataType:"json",
        async: false,
        success: function (json) {
            if (json.message != null){	
                $('#productgrid').bootstrapTable("removeAll");				
                $('#productgrid').bootstrapTable("refresh",{url: "index.php?quietmode=1&module=pms&command=getproductgrid&getproductgrid="+room_id+"&minibar="+mb});
            };
        }
    });		
}

function rest_search(to_find){
    var mb = ($("#minibar").is(":checked"))? "yes" : "no";
    
    if($("#search").val() == ""){
        show_grid_message();
    }
    else{
        $.ajax({
            url: "index.php?quietmode=1&module=pms&command=rest_search&rest_search="+to_find+"&staff=yes&menu="+$("#room").val()+"&minibar="+mb,
            dataType:"json",
            async: false,
            success: function (json) {
                if (json.message != null){			
                    $("#grid").html(json.message);
                };
            }
        });					
    }

}

function delete_product(room_id,ref){
    var mb = ($("#minibar").is(":checked"))? "yes" : "no";
    
    $.ajax({
        url: "index.php?quietmode=1&module=pms&command=delete_product&delete_product="+room_id+"&ref="+ref+"&minibar="+mb,
        dataType:"json",
        async: false,
        success: function (json) {
            $('#productgrid').bootstrapTable("removeAll");
            $('#productgrid').bootstrapTable("refresh",{url: "index.php?quietmode=1&module=pms&command=getproductgrid&getproductgrid="+room_id+"&minibar="+mb});
        }
    });
}