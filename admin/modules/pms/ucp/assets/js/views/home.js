$(document).ready(function (){
    drawChart();
});

function drawChart() {
    $.ajax({
        url: "index.php?quietmode=1&module=pms&command=status",
        dataType:"json",
        success: function (json) {
            var initCanvasJS = function() {
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
            }; 
            if(typeof window.CanvasJS !== "undefined") {
                initCanvasJS();
            } 
            else{ 
                $(document).on(
                    "canvasjsloaded", 
                    function() { 
                        initCanvasJS();								
                    }
                ) 
            };
        }
    });
}