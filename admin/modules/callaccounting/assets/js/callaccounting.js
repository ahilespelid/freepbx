function queryParams(params){
	var formData = $("#callaccoutningsearch").serialize();
	$.each(formData.split('&'), function(k,v) {
		var parts = v.split('=');
		params[parts[0]] = parts[1]
	})
	return params;
}
$('#report').on('all.bs.table', function(e){
	var rows = $("#summary").bootstrapTable('getData').length + $("#report").bootstrapTable('getData').length;
	if(rows > 0){
		$("#csvreport").removeClass('hidden');
	}else{
		$("#csvreport").addClass('hidden');
	}
});

$("#refresh").click(function(e) {
	$('#report').bootstrapTable('refresh');
	$('#summary').bootstrapTable('refresh');
})

$("#pdfreport").click(function(e) {
	e.preventDefault();
	e.stopPropagation();
	var formData = $("#callaccoutningsearch").serialize();
	var url = 'ajax.php?module=callaccounting&command=pdfreport&'+formData;
	var iframe = $("<iframe/>").attr({
			src: url,
			style: "visibility:hidden;display:none"
		}).appendTo('body');
})

$("#csvreport").click(function(e) {
	e.preventDefault();
	e.stopPropagation();
	var formData = $("#callaccoutningsearch").serialize();
	var url = 'ajax.php?module=callaccounting&command=csvreport&'+formData;
	var url2 = 'ajax.php?module=callaccounting&command=csvsummary&'+formData;
	var iframe = $("<iframe/>").attr({
			src: url,
			style: "visibility:hidden;display:none"
		}).appendTo('body');
	var iframe2 = $("<iframe/>").attr({
			src: url2,
			style: "visibility:hidden;display:none"
		}).appendTo('body');
})

$(document).ready(function() {
$("#ratedecksubmit").on('click',function(){
	if($("#ratedeck").val().trim() == "") {warnInvalid($("#ratedeck"),_("Call Deck name can not be blank!")); return false;};
		$.post("ajax.php?module=callaccounting&command=addnewcd",
			{ command: 'addnewcd', module: "callaccounting", cdname: $("#ratedeck").val()}, function(data){
				if (data.status) {
					alert(data.message);	
				} else {
					alert(data.message);
			  	}
			});
	});
});

$( "#addpattern" ).submit(function( event ) {
	if($("#dial_pattern").val() ==""){
		return warnInvalid($('input[name=dial_pattern]'), _("Dial pattern can NOT be Empty"));
	}	
	if($("#timegroup").val() ==""){
		return warnInvalid($('input[name=timegroup]'), _("Timegroup can NOT be Empty"));
	}
	var result = $.ajax({
        url: "ajax.php?module=callaccounting&command=duplicatepattern",
        type: 'POST',
		async: false,
        data: {id: $("#id").val(),dial_pattern: $("#dial_pattern").val(), timegroup: $("#timegroup").val(), rate_deck_id: $("#rate_deck_id").val()}
    });
	obj = JSON.parse(result.responseText);
	if(obj.status){
		console.log(' NO duplicate');
		return true;
	} else {
		return warnInvalid($('input[name='+obj.field+']'), _(obj.message));
		console.log(' duplicate');
		event.preventDefault();
		return false;
	}
	return false;
});

function durationFormatter(value, row, index){
	return moment.duration(value, 'seconds').format('D[ day] H[ hour(s)] m[ minute] s[ second]');
}
function dateFormatter(value, row, index){console.log('value' + value);
	return moment.unix(value).format(datetimeformat);
}

function linkFormatter(value, row, index){
	html = '<a href="?display=callaccounting&action=editcd&rate_deck_id='+encodeURIComponent(row['id'])+'"><i class="glyphicon glyphicon-edit" title="Edit Dial Patterns"></i></a>&nbsp;';
	html = html +' <a href="?display=callaccounting&action=cdrlist&rate_deck_id='+row['id']+'"> <i class="fa fa-table" title="View CDRs"> </i></a>&nbsp;&nbsp;';
	html = html +' <a href="?display=callaccounting&action=delete&id='+row['id']+'" class="delAction"> <i class="glyphicon glyphicon-remove " title="Delete"></i></a>&nbsp;&nbsp;';
	return html;
}

function linkFormatterpattern(value, row, index){
	html = '<a href="?display=callaccounting&action=editpattern&rate_deck_id='+row['rate_deck_id']+'&id='+encodeURIComponent(row['id'])+'"><i class="glyphicon glyphicon-edit fa-1x" title="Edit"></i></a>&nbsp;';
	html = html +' <a href="?display=callaccounting&action=deletepattern&rate_deck_id='+row['rate_deck_id']+'&id='+row['id']+'" class="delAction"> <i class="glyphicon glyphicon-remove fa-1x" title="Delete"></i></a>&nbsp;&nbsp;';
	return html;
}

var previous;
$("#timegroup").on('focus', function () {
	// Store the current value on focus and on change
	if(this.value != "popover") {
		previous = this.value;
	}
}).change(function() {
	var $this = this;
	if($(this).val() == "popover") {
		var urlStr = "config.php?display=timegroups&view=form&fw_popover=1", id = 1;
		popover_select_id = this.id;
		popover_box_class = "timegroups";
		popover_box_mod = "timegroups";
		popover_box = $("<div id=\"popover-box-id\" data-id=\"" + id + "\"></div>")
			.html("<iframe data-popover-class=\"" + popover_box_class + "\" id=\"popover-frame\" frameBorder=\"0\" src=\"" + urlStr + "\" width=\"100%\" height=\"95%\"></iframe>")
			.dialog({
				title: "Add",
				resizable: false,
				modal: true,
				width: window.innerWidth - (window.innerWidth * '.10'),
				height: window.innerHeight - (window.innerHeight * '.10'),
				create: function() {
					$("body").scrollTop(0).css({ overflow: "hidden" });
				},
				close: function(e) {
					$($this).val(previous);
					$("#popover-frame").contents().find("body").remove();
					$("#popover-box-id").html("");
					$("body").css({ overflow: "inherit" });
					updateGroups();
					$(e.target).dialog("destroy").remove();
				},
				buttons: [
						{
						text: fpbx.msg.framework.save,
						click: function() {
							pform = $("#popover-frame").contents().find("form").first();
							pform.submit();
						}
					}, {
						text: fpbx.msg.framework.cancel,
						click: function() {
							$(this).dialog("close");
						}
					}
				]
			});
	}
});


function updateGroups(selectLast) {
	$.post( "ajax.php", { module: "timeconditions", command: "getGroups" })
  .success(function( data ) {
		var options = '<option value="">--'+_('Select a Group')+'--</option>';
		$.each(data.groups, function(i,v) {
			options = options + '<option value="'+v.value+'">'+v.text+'</option>';
		});
		options = options + '<option value="popover">'+_('Add New Time Group...')+'</option>';
		$("#timegroup").html(options);
		if(typeof selectLast === "undefined" || !selectLast) {
			$("#timegroup").val(data.last);
		}
  });
}
