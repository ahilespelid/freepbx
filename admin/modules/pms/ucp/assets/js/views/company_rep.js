$(document).ready(function (){
    var date_start 	= $("[name='date_start']").val();
    var date_stop 	= $("[name='date_stop']").val();
    var thisreport 	= $("[name='type_of_report']").val();    
    var dt_s	    = date_start.split('/');
    var dt_e	    = date_stop.split('/');
    var d_s		    = new Date(dt_s[0],dt_s[1]-1,dt_s[2],0,0,0);
    var d_e		    = new Date(dt_e[0],dt_e[1]-1,dt_e[2],12,59,59,'pm');
    if (d_e < d_s){
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The end date must be after the start date") + "</div></div></div>");
        return false;
    }
    
    if (thisreport == "cico"){
        checkin_out(date_start, date_stop);
    }
    if (thisreport == "financial"){
        financial(date_start, date_stop);
    }	
});

function select_report(){
    var date_start 	= $("[name='date_start']").val();
    var date_stop 	= $("[name='date_stop']").val();
    var thisreport 	= $("[name='type_of_report']").val();    
    var dt_s	    = date_start.split('/');
    var dt_e	    = date_stop.split('/');
    var d_s		    = new Date(dt_s[0],dt_s[1]-1,dt_s[2],0,0,0);
    var d_e		    = new Date(dt_e[0],dt_e[1]-1,dt_e[2],12,59,59,'pm');
    if (d_e < d_s){
        $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The end date must be after the start date.") + "</div></div></div>");
        return false;
    }
    
    if (thisreport == "cico"){
        checkin_out(date_start, date_stop);
    }
    if (thisreport == "financial"){
        financial(date_start, date_stop);
    }
}

function checkin_out(date_start, date_stop) {
    var type_of_report = $("[name='type_of_report']").val();
    $.post( "index.php", {command: 'report', quietmode: 1, module: 'pms', report: 'yes', date_start: date_start, date_stop: date_stop, type_of_report: type_of_report}, function( data ) {
        retour = JSON.parse(data.message);
        var chart = new CanvasJS.Chart("container", {
            title: {
                text: _("Hotel Occupancy Rates")
            },
            exportFileName: _("Hotel Occupancy Rates"),
            exportEnabled: true,	
            axisY:{
                title: _("Number of Rooms")
            },
            legend: {
                cursor: "pointer",
                itemclick: function (e) {
                    if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                        e.dataSeries.visible = false;
                    } else {
                        e.dataSeries.visible = true;
                    }
                    e.chart.render();
                }
            },
            data: retour,
        });
        chart.render();
    });		
}

function financial(date_start, date_stop){
    var type_of_report = $("[name='type_of_report']").val();
    $.post( "index.php", {command: 'report', quietmode: 1, module: 'pms', report: 'yes', date_start: date_start, date_stop: date_stop, type_of_report: type_of_report}, function( data ) {
        retour = JSON.parse(data.message);
        var chart = new CanvasJS.Chart("container", {
            title: {
                text: _("Sales and Billing Reporting")
            },
            exportFileName: _("Hotel Occupancy Rates"),
            exportEnabled: true,	
            axisY:{
                title: _("Revenue Amount")
            },
            legend: {
                cursor: "pointer",
                itemclick: function (e) {
                    if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                        e.dataSeries.visible = false;
                    } else {
                        e.dataSeries.visible = true;
                    }
                    e.chart.render();
                }
            },
            data: retour,
        });
        chart.render();
    });			
}