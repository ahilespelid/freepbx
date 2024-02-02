$(document).ready(function (){
    $(document).tooltip({
            tooltipClass: "grid_tooltip",
    });
});

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