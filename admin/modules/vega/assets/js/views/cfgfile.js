$(document).ready(function() {
    $("#edit").dialog({  //create dialog, but keep it closed
        autoOpen: false,
        height: 200,
        width: 600,
        modal: true
    });

    $("#applyingcfg").hide();

    $('.edit').click(function(e) {
			e.preventDefault();

			$.get(ajaxurl + '?module=vega&command=editcfgparam&id=' + $(this).attr('data.vegaid')+'&tableid='+$(this).attr('data.id'), function(data) {
				page = data['message'];
				var $dialog = $('#edit')
						 .html(page)
						 .dialog({
							 autoOpen: false,
							 modal: true,
							 height: 200,
							 width: 600,
							 title: ""
						 });
					$dialog.dialog('open');
					return false;
			});
		});

    $('#savecfgparam').click(function(e) {
			e.preventDefault();
			$("#applyingcfg").show();
			$("#savecfgparam").hide();

			$.get(ajaxurl + '?module=vega&command=savecfgparam&id=' + $('#vegaid').val()+'&tableid='+$('#configtableid').val()+'&val='+$('#value').val(), function(data) {
				if (data.status) {
					alert(data.message);
					window.location="?display=vega&action=editconfig&id="+$('#vegaid').val()+"";
				} else {
					$("#applyingcfg").hide();
					$("#savecfgparam").show();
					alert(data.message);
				}
			});
		})
});
