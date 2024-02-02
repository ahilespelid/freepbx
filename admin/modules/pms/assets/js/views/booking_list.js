setInterval( function () {
    $.ajax({
        url: "ajax.php?module=pms&emergency=yes",
        dataType:"json",
        success: function (json) {
            if (json.message >= 1){	
                window.location = "config.php?display=pms&view=emergency";
            };
        },
        error: function(d) {
            d.suppresserrors = true;
        }
    });	
}, 2000 );

function filter(f){
    $("#bookinglisttable").bootstrapTable("removeAll");
    $("#bookinglisttable").bootstrapTable("refresh",{url: "ajax.php?module=pms&getbookinglisttable=yes&filter="+f});
}

$(".btn-group > .btn").click(function(){
    $(".btn-group > .btn").removeClass("active");
    $(this).addClass("active");
});