$(document).ready(function() {
	if($("#btn_actions").length == 0){
		$("#action-area").hide();
	}
	else{
		$("#action-area").show();
	}

    $("#edit").dialog({  //create dialog, but keep it closed
        autoOpen: false,
        height: 600,
        width: 800,
        modal: true
	});

	$('.model_sel').click(function(){
		content = show_button_action($(this));
		baseurl = $("#modelSelect").attr("action").replace("prelog=1&","");
		$("#modelSelect").attr("action", baseurl);
		$("#grp_phone button").removeClass("active");
		$(this).addClass('active');
		$("#edit-area").show();
		$("#basefile").html('');
		$("#basefileDescription").hide();
		$("#action").html(content);
	});

	function show_button_action(e){
		if(e.data("brand") == "sangoma" && e.val().charAt(0) == "S"){
			$("#action-area").show();
			$("#edit-area").show();
			content  = '<div id="btn_actions">';
			content += '<h3>'+_("Model")+" "+e.val()+'</h3></div><div class="btn-group text-center">';
			content += '<button type="submit" class="btn edit-template">Edit Template</button>';
			content += '<button type="submit" name="prelog" value="1" class="btn last-btn prelog">Edit Default Pre-logging</button>';
			content += '<input type="hidden" name="model" value='+e.val()+'>';
			content += '</div><br><br>';
			$("#default_config").val("yes");
		}
		else{
			$("#action-area").hide();
			$("#edit-area").hide();
			e.removeAttr("type").attr("type", "submit");
			e.submit();
		}
		return content;
	}

	function get_active_button(){	
		result = "";	
		$('#grp_phone .active').each(function(){
			result = $(this).val(); 
		}); 
		return result;
	}

	$('.vegaedit').click(function(e) {
		e.preventDefault();
		$.get(endpointBaseAjaxUrl + '&command=vegabasefileEdit&template=' + $(this).attr('data.template') + '&model=' + $(this).attr('data.model') + '&brand=' + $(this).attr('data.brand') + '&oid=' + $(this).attr('data.oid') + '&id=' + $(this).attr('data.id'), function(data) {
			page = data['message'];
			var $dialog = $('#edit')
					.html(page)
					.dialog({
						autoOpen: false,
						modal: true,
						height: 600,
						width: 800,
						title: ""
					});
				$dialog.dialog('open');
				return false;
		});
	});

    $('.edit').click(function(e) {
		e.preventDefault();
		$.get(endpointBaseAjaxUrl + '&command=basefileEdit&template=' + $(this).attr('data.template') + '&model=' + $(this).attr('data.model') + '&brand=' + $(this).attr('data.brand') + '&oid=' + $(this).attr('data.oid') + '&id=' + $(this).attr('data.id'), function(data) {
			page = data['message'];
			var $dialog = $('#edit')
					 .html(page)
					 .dialog({
						 autoOpen: false,
						 modal: true,
						 height: 600,
						 width: 800,
						 title: ""
					 });
				$dialog.dialog('open');
				return false;
		});
	});

	$('.edit-prelog').click(function(e) {
		e.preventDefault();
		$.get(endpointBaseAjaxUrl + '&command=prelogEdit&model=' + $(this).attr('data.model') + '&brand=' + $(this).attr('data.brand') + '&oid=' + $(this).attr('data.oid') + '&id=' + $(this).attr('data.id'), function(data) {
			page = data['message'];
			var $dialog = $('#edit')
					 .html(page)
					 .dialog({
						 autoOpen: false,
						 modal: true,
						 height: 600,
						 width: 800,
						 title: ""
					 });
				$dialog.dialog('open');
				return false;
		});
	});

	//for save/rebuild/restart/reboot
	$(".saveBasefile").click(function(event) {
		event.preventDefault();
		event.stopPropagation();

		var e = document.getElementById("taskBasefile");
		var task = e.options[e.selectedIndex].value;
		var data = $("form").serialize();
		data = (task == "rebuild") ? data + "&rebuild=1":data;
		data = (task == "restart") ? data + "&rebuild=1&restart=1":data;
		data = (task == "reset") ? data + "&reset=1":data;

		$.post( endpointBaseAjaxUrl + "&quietmode=1&command=savebasefile", data, function( data ) {
			if (data.status) {
				location = location.href;
				return true;
			} else {
				location = location.href;
				return false;
			}
		});
	});
});
