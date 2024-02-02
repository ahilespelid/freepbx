var deleteWidg = [];
$(".btn-danger").prop("disabled", true);
$(document).ready(function() {
	$("#widgetCreate").on("click", show_create_modal);
	$("#widgetsave").on("click", save_widget);
	$("#widgetupdate").on("click", update_widget);
	$("#srvsave").on("click", save_srv);
	$("#srvupdate").on("click", update_srv);
	$("#addRemote").on("click", show_create_modal_srv);
	$("#widgetDelete").on("click", delete_selected);
	// When our modal is finished being shown, always focus on name
	$("#widgetmodal").on('shown.bs.modal', function () {
		$(".autofocus", "#widgetmodal").focus();
	});
	$("#widgettable").on("page-change.bs.table", function () {
		if (deleteWidg.length === 0) {
			$(".btn-danger").prop("disabled", true);
		}
	});
	$("#widgettable").on('uncheck-all.bs.table', function () {
		deleteWidg = [];
		$(".btn-danger").prop("disabled", true);
	})
	$("#widgettable").on('uncheck.bs.table', function () {
		deleteWidg = $.map($("#widgettable").bootstrapTable('getSelections'), function (row) {
		    rmPosWidg = row.uuid;
		    position = deleteWidg.indexOf(rmPosWidg);
			if ( ~position ) {
				deleteWidg.splice(position, 1);
			}
			return row.uuid;
	  	});
		if (deleteWidg.length === 0) {
			$(".btn-danger").prop("disabled", true);
		}
	});
	$("#widgettable").on('check.bs.table', function () {
		deleteWidg = $.map($("#widgettable").bootstrapTable('getSelections'), function (row) {
			return row.uuid;
	  	});
		if (deleteWidg.length > 0) {
			$(".btn-danger").prop("disabled", false);
		}else{
			$(".btn-danger").prop("disabled", true);
		}
	});
	$("#widgettable").on('check-all.bs.table', function () {
		$(".btn-danger").prop("disabled", false);
		var chosen = $("#widgettable").bootstrapTable("getSelections");
		$(chosen).each(function(){
			isInArray = deleteWidg.includes(this.uuid);
			if (!isInArray) {
				deleteWidg.push(this.uuid);
			}
		});
	});
});

function get_modal_vals() {
	var vals = {};
	$(".widgetinput").each(function(i,v) {
		vals[$(v).attr('name')] = $(v).val();
	});
	return vals;
}

function save_widget() {
	$.ajax({
		method: "POST",
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'createNewWidget', widgetvals: get_modal_vals() },
		success: function() {
			$("#widgettable").bootstrapTable('refresh');
			$("#widgetmodal").modal('hide');
		}
	});
}

function update_widget(t) {
	$.ajax({
		method: "POST",
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'updateWidget', uuid: $("#widgetupdate").data('uuid'), widgetvals: get_modal_vals() },
		success: function() {
			$("#widgettable").bootstrapTable('refresh');
			$("#widgetmodal").modal('hide');
		}
	});
}

function delete_selected(target) {
		var allchosen = $("#widgettable").bootstrapTable("getSelections");
		infost = "";
		$(allchosen).each(function(i){
			infost += "*Widget_"+this.type+" "+this.params;
		   	if (i === allchosen.length - 1){
		    	infost += "*.";
		   	}else{
		   		infost += "*, ";
		   	}
		});
		if(confirm(sprintf(_("Are you sure you wish to delete these: %s?"),infost))) {
			$.ajax({
				method: "POST",
				url: window.FreePBX.ajaxurl,
				data: { module: "queuestats", command: 'deleteWidgetSelected', todelete: deleteWidg },
				success: function() {
					$("#widgettable").bootstrapTable('refresh');
					$(".btn-danger").prop("disabled", true);
					$("#widgetmodal").modal('hide');
					deleteWidg = [];
				}
			});
		}
}

function delete_widget(target) {
	$.ajax({
		method: "POST",
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'deleteWidget', uuid: $(target).data('uuid') },
		success: function() {
			$("#widgettable").bootstrapTable('refresh');
			$("#widgetmodal").modal('hide');
		}
	});
}

function reset_widget_modal() {
	$("#widgetsave,#widgetupdate").hide();
	$("#mheader,#typehelp").text(" ");
	$("#widgetname").val("");
	$("#settingsdiv").html("");
	$("#widgettype").empty().prop('disabled', true).append('<option>'+_('Loading')+'</option>');
}

function show_create_modal() {
	reset_widget_modal();
	$("#mheader").text(_("Create Widget"));
	$("#widgetsave").show();
	$("#widgetmodal").modal();
	// Load all the servers that have been configured
	get_all_srvr(undefined,function() {
		// Load the types of widgets we know about
		get_all_widget_types(undefined,function() {
		});
	});
}

function load_edit_modal(target) {
	reset_widget_modal();
	$("#mheader").text(_("Edit Widget"));
	$("#widgetname").text(_("Loading")).prop('disabled', true);
	$("#widgetupdate").prop("disabled",true);
	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'getWidgetConf', uuid: $(target).data('uuid') },
		success: function(d) {
			$("#widgetname").prop('disabled', false);
			get_all_srvr(d,function() {
				// Load the types of widgets we know about
				get_all_widget_types(d,function() {
					$("#widgetupdate").prop("disabled",false);
				});
			});
		},
	});
}

function get_all_widget_types(current,callback) {
	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'getAllWidgetTypes', server: $('#widgetsrv').val() },
		success: function(d) {
			update_widget_types(d, current);
			if(typeof callback === "function") {
				callback();
			}
		}
	});
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function update_widget_types(data, current) {
	$("#widgettype").empty().prop('disabled', false).off('change');
	// Add our widget types
	for (var widgetname in data) {
		// I use jquery to append as it handles all the escaping of chars.
		$("#widgettype").append($('<option>', { value: widgetname, text: data[widgetname].name }));
	}

	// Do we have a current selection?
	if (typeof current !== "undefined") {
		$("#widgettype").val(capitalizeFirstLetter(current.rawtype));
	}

	// Rebind the change event and trigger it.
	$("#widgettype").on('change', function() { load_widget_params(current); }).trigger('change');
}

function load_widget_params(current) {
	// Disable our select, and all our existing inputs,
	// so we look like we're doing something
	$("#widgettype,.widgetsetting").prop("disabled", true);

	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'getWidgetInfo', widgetname: $("#widgettype").val(), server: $('#widgetsrv').val() },
		success: function(d) {
			render_widget_params(d, current);
		},
		complete: function() {
			$("#widgettype,.widgetsetting").prop("disabled", false);
		}
	});
}

function render_widget_params(data, current) {
	if (typeof data.params === "undefined") {
		// Wut.
		console.log("Error: No params returned", data, current);
		return;
	}

	if (typeof data.description !== "undefined") {
		$("#typehelp").text(data.description);
	}

	var sd = $("#settingsdiv");
	// Remove our existing settings
	sd.html("");

	//if (typeof current == 'undefined' && typeof data.widgetname !== 'undefined' && data.widgetname == "agentstate") {
	if (typeof data.widgetname !== 'undefined' && data.widgetname == "agentstate") {
		create_params(data, current, sd);
		$(".wqueuenum").on('change', function() { get_all_agent_members(current,data) }).trigger('change');
	} else {
		create_params(data, current, sd);
		verify_queues(data,data.widgetname);
	}
}

function verify_queues(data,modid){
	if ( typeof data.params.queuenum !== "undefined" ) {
		var qvalues = data.params.queuenum.values;
		switch(modid) {
		    case "agentstate":
		        var elmnt = $(".wqueuenum");
		    break;
		    default:
		        var elmnt = $("#queuenum");
		    break;
		}
		if( qvalues.length === 1 ){
			elmnt.hide();
			elmnt.replaceWith(_('<label class="form-control widgetinput widgetsetting widgetparams2">'+qvalues[0]+'</label>'));
		}
	}
	if ( typeof data.params.agentnum !== "undefined" ) {
		var qvalues = data.params.agentnum.values;
		var elmnt = $(".agentnum");
	}
	if ( typeof data.params.agents !== "undefined" ) {
		var qvalues = data.params.agents.values;
		var elmnt = $(".agents");
	}
	if( qvalues.length === 1 ){
		//elmnt.attr('disabled','disabled');
		elmnt.hide();
		elmnt.replaceWith(_('<label class="form-control widgetinput widgetsetting widgetparams2">'+qvalues[0]+'</label>'));
	}
}

function create_params(data, current, settingsdiv){
	// And start creating our new ones.
	for (var p in data.params) {
		settingsdiv.append(generate_param(p, data.params[p]));
		if (typeof data.params[p].defaultval !== "undefined") {
			$(".widgetinput[name="+p+"]").val(data.params[p].defaultval);
		}
	}

	if (typeof current !== "undefined") {
		for (var v in current) {
			$(".widgetinput[name="+v+"]").val(current[v]);
		}
	}

	$(".selectpicker").selectpicker('render');
}

function get_all_agent_members(crnt,dt) {

	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'getAgentNamesByQueue', server: $('#widgetsrv').val(), queuenum: $('.wqueuenum').val() },
		success: function(d) {
			update_agentmembers(d,crnt,dt);
			if(typeof callback === "function") {
				callback();
			}
		}
	});
}

function update_agentmembers(data,crnt,dt) {
	$(".wagentnum").empty().prop('disabled', false).off('change');
	if (data.length == 0) {
		console.log(data.length);
		var msg = _('There are no agents in this queue');
		$(".wagentnum").hide();
		$("#errordiv").show();
		$('#errordiv').html(msg);
	}else {
		$("#errordiv").hide();
		$(".wagentnum").show();
	}
	for (var agentname in data) {
		$(".wagentnum").append($('<option>', { value: agentname, text: data[agentname] }));
	}
	if (typeof crnt !== "undefined"){
		$('.wagentnum').val(crnt.agentnum);
	}
	verify_queues(dt,dt.widgetname);
}
function generate_param(id, pval) {
	var b = '<div class="form-group clearfix"><label for="widget'+id+'" class="col-sm-3 control-label">'+pval.name+'</label>';
	b += '<div class="col-sm-9">';

	// Is this a select?
	if (pval.type === "select") {
		b += generate_param_select(id, pval, false);
	} else if (pval.type === "multiselect" ) {
		b += generate_param_select(id, pval, true);
	} else if (pval.type === "text" ) {
		b += generate_param_text(id, pval, false);
	} else if (pval.type === "textarea" ) {
		b += generate_param_text(id, pval, true);
	}

	b += '</div>';

	// Does the param have helptext?
	if (typeof pval.helptext !== "undefined") {
		b += '<span class="help-block">'+pval.helptext+'</span>';
	}
	b += '</div>';
	return b;
}

function generate_param_text(id, vals, area) {
	if (area) {
		var t = '<textarea id="'+id+'" name="'+id+'" class="form-control widgetinput widgetsetting widgetparams2" rows="5"';
	} else{
		var t = '<input id="'+id+'" name="'+id+'" class="form-control widgetinput widgetsetting widgetparams2" type="text"';
	}
	if (typeof vals.placeholder !== "undefined") {
		t += ' placeholder="'+vals.placeholder+'"';
	}
	t += '>';
	return t;
}

function generate_param_select(id, vals, multi) {
	// Disabled adding 'selectpicker' class, as it derps up for some reason.
	var s = '<select id="'+id+'" name="'+id+'" class="form-control widgetinput widgetsetting"';
	if ( (typeof vals.id !== "undefined") && (vals.id == "aswqueuenum") ) {
		var s = '<select id="'+id+'" name="'+id+'" class="form-control widgetinput widgetsetting wqueuenum"';
	}
	if ( (typeof vals.id !== "undefined") && (vals.id == "aswagentnum") ) {
		var s = '<div id="errordiv" ></div><select id="'+id+'" name="'+id+'" class="form-control widgetinput widgetsetting wagentnum"';
	}
	if ( (typeof vals.id !== "undefined" ) && (vals.id == "queuenum")  ) {
		var s = '<select id="'+id+'" name="'+id+'" class="form-control widgetinput widgetsetting queuenum"';
	}
	if ( (typeof vals.id !== "undefined" ) && (vals.id == "agentnum")  ) {
		var s = '<select id="'+id+'" name="'+id+'" class="form-control widgetinput widgetsetting agentnum"';
	}
	if ( (typeof vals.id !== "undefined" ) && (vals.id == "agents")  ) {
		var s = '<select id="'+id+'" name="'+id+'" class="form-control widgetinput widgetsetting agents"';
	}
	if (multi) {
		s += ' multiple ';
	}
	s += 'data-selected-text-format="count" data-width="100%">';
	if (vals.name === "Queue" && vals.values.length === 0) {
		s += '<option>'+vals.values[0]+'</option>';
	}
	for (var v in vals.values) {
		s += '<option value="'+v+'">'+vals.values[v]+'</option>';
	}
	s += "</select>";
	return s;
}

function get_modalsrv_vals() {
	var vals = {};
	$(".srvinput").each(function(i,v) {
		vals[$(v).attr('name')] = $(v).val();
	});
	return vals;
}

function save_srv() {
	$.ajax({
		method: "POST",
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'createNewConSrvr', srvvals: get_modalsrv_vals() },
		success: function(data) {
			if(data.status) {
				$("#srvtable").bootstrapTable('refresh');
				$("#srvmodal").modal('hide');
			} else {
				if(data.field) {
					warnInvalid($('#'+data.field),data.message);
				} else {
					alert(data.message);
				}
			}
		}
	});
}

function update_srv(t) {
	$.ajax({
		method: "POST",
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'updateSrvr', uuid: $("#srvupdate").data('uuid'), srvvals: get_modalsrv_vals() },
		success: function(data) {
			if(data.status) {
				$("#srvtable").bootstrapTable('refresh');
				$("#srvmodal").modal('hide');
			} else {
				if(data.field) {
					warnInvalid($('#'+data.field),data.message);
				} else {
					alert(data.message);
				}
			}
		}
	});
}

function delete_srv(target) {
	$.ajax({
		method: "POST",
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'deleteSrvr', uuid: $(target).data('uuid') },
		success: function() {
			$("#srvtable").bootstrapTable('refresh');
			$("#srvmodal").modal('hide');
		}
	});
}

function reset_srv_modal() {
	$("#srvsave,#srvupdate").hide();
	$("#srvheader,#typehelp_1").text(" ");
	$("#srvname").val("");
	$("#srvhost").val("");
	$("#srvuser").val("");
	$("#srvpassword").val("");
	$("#srvmysqluser").val("");
	$("#srvmysqlpassword").val("");
}

function show_editsrv_modal(target) {
	if (typeof target == "undefined") {
		// No.
		return false;
	}
	load_editsrv_modal(target);
	$("#srvupdate").data('uuid', $(target).data('uuid')).show();
	$("#srvmodal").modal();
}

function load_editsrv_modal(target) {
	reset_srv_modal();
	$("#srvheader").text(_("Edit Server Connection"));
	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'getSrvConf', uuid: $(target).data('uuid') },
		success: function(d) {
			get_all_srv_info(d);
		},
	});
}

function get_all_srv_info(current) {
	$.each( current, function( key, value ) {
	  var tag = "#" + key;
	  $(tag).val(value);
	});
}

function show_edit_modal(target) {
	if (typeof target == "undefined") {
		return false;
	}
	load_edit_modal(target);
	$("#widgetupdate").data('uuid', $(target).data('uuid')).show();
	$("#widgetmodal").modal();
}

function show_create_modal_srv() {
	reset_srv_modal();
	$("#srvheader").text(_("Create New Server Connection"));
	$("#srvsave").show();
	$("#srvmodal").modal();
}

function get_all_srvr(current,callback) {
	$.ajax({
		url: window.FreePBX.ajaxurl,
		data: { module: "queuestats", command: 'getAllSrvr' },
		success: function(d) {
			update_srv_elements(d, current);
			if(typeof callback === "function") {
				callback();
			}
		}
	});
}

function update_srv_elements(data, current) {
	$("#widgetsrv").empty().prop('disabled', false).off('change');
	$("#widgetsrv").append($('<option>', { value: "local", text: _("Local") }));
	// Add our configured servers
	for (var uuid in data) {
		$("#widgetsrv").append($('<option>', { value: uuid, text: data[uuid].name }));
	}

	// Do we have a current selection?
	if (typeof current !== "undefined") {
		$("#widgetsrv").val(current.widgetsrv);
	}

	$("#widgetsrv").on('change', function() { get_all_widget_types(); });
}

function serverFormatter(value, row, index){
	return servers[value].srvname;
}
