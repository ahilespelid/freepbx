$(document).ready(function (){
    button_reload = 0;
});

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

function reload_clicked(){
    if(button_reload == 0){
        $.ajax({
            url: "index.php?quietmode=1&display=dashboard&module=pms&view=checkout&command=reload",
            dataType:"json",
            success: function (json) {
                var reloading = JSON.parse(json.message);
                if (reloading['reload'] == "1"){	
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
    }, 1000 );			
}

function filter(f){
        $("#bookinglisttable").bootstrapTable("removeAll");
        $("#bookinglisttable").bootstrapTable("refresh",{url: "?quietmode=1&module=pms&command=getbookinglisttable&filter="+f});
}

$(".btn-group > .btn").click(function(){
    $(".btn-group > .btn").removeClass("active");
    $(this).addClass("active");
});