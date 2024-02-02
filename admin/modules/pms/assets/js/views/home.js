window.onload = function () {
    $.ajax({
        url: "ajax.php?module=pms&status=1",
        dataType:"json",
        success: function (json) {
            var chart = new CanvasJS.Chart("chartContainer",
            {
                title:{
                    text: _("Hotel Activity")
                },
                animationEnabled: true,
                data: [
                {
                    type: "doughnut",
                    innerRadius: "60%",
                    startAngle: 180,
                    toolTipContent: "{legendText}: {y} - <strong>#percent% </strong>",
                    showInLegend: true,
                    explodeOnClick: false, //**Change it to true
                    dataPoints: JSON.parse(json.message)
                },
                ]
            });
            chart.render();
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });
}

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