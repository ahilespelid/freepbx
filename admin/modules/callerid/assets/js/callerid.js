'use strict';

var modalMode = null;
var deleteExts = [];

$("#cidform input[name=name]").change(function(){
	var allData = $('#entry_table').bootstrapTable('getData');
	if(allData !== undefined && allData != null && allData.length > 0){
		for( var i = 0, len = allData.length; i < len; i++ ) {
			if( allData[i]["name"] == $(this).val() ) {
				name: $("#cidform input[name=name]").val(allData[i]["name"]+"-1");
				break;
			}
		}
	};
});

function fillcidModal() {
	var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
	var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
	var cidnum = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
	var cidname = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
	var persistent = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
	var id = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
	var latest = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;
	var allData = $('#entry_table').bootstrapTable('getData');	
	
	if(prefix != '' && allData.length > 0 && name.length == 0){
		/*
			We get all data and use the latest record.
			We separate the code (* or #) of the num to get only the num.
			eg: *20 giving * | 20 and using 20 for increment 
			Just rebuild code + num.
			
		*/			
		var last_prefix = (allData[allData.length - 1]["prefix"]);
		var Prefix_num 	= last_prefix.replace( /^\D+/g, '');
		var Prefix_code = last_prefix.replace(/[^*+#+]+/g, '');
		prefix 			= Prefix_code+(parseInt(Prefix_num) + 1);
		allData 		= null;
	}
	
	$("#cidform input[name=id]").val(id)
	$("#cidform input[name=name]").val(name)
	$("#cidform input[name=prefix]").val(prefix)
	$("#cidform input[name=cidname]").val(cidname)
	$("#cidform input[name=cidnum]").val(cidnum)

	if(persistent == 1) {
		$("#permyes").prop('checked', true);
	} else {
		$("#permno").prop('checked', true);
	}
}

$("#entry_table").on("post-body.bs.table", function() {
	$("table .edit").click(function() {
		var data = $('#entry_table').bootstrapTable('getRowByUniqueId', $(this).data('id'))
		modalMode = 'edit';
		$('#cidmodal').modal('show')
		fillcidModal(data.name,data.prefix,data.cidnum,data.cidname,data.perm,data.id)
	})
	$("#entry_table .delete").click(function() {
		var data = $('#entry_table').bootstrapTable('getRowByUniqueId', $(this).data('id'))
		deleteExts = [$(this).data('id')]
		$(".btn-remove").click()
	})
})

$("#savecid").click(function() {
	var data = {
		name: $("#cidform input[name=name]").val(),
		prefix: $("#cidform input[name=prefix]").val(),
		cidname: $("#cidform input[name=cidname]").val(),
		cidnum: $("#cidform input[name=cidnum]").val(),
		perm: $("#permyes").is(':checked')
	};

	if(!data.name.length) {
		return warnInvalid($("#cidform input[name=name]"),_('Name field is mandatory'));
	}

	if(!data.prefix.length) {
		return warnInvalid($("#cidform input[name=prefix]"),_('Prefix field is mandatory'));
	}

	if(!data.cidnum.length) {
		return warnInvalid($("#cidform input[name=cidnum]"),_('CallerID Number field is mandatory'));
	}

	if(data.cidname.length && !isAlphanumeric(data.cidname)) {
		return warnInvalid($("#cidform input[name=cidname]"),_('CallerID Name must be valid alphanumeric'));
	}

	if(!isCallerID(data.cidnum)) {
		return warnInvalid($("#cidform input[name=cidnum]"),_('CallerID Number must be in Caller ID format'));
	}

	if(modalMode === 'add') {
		$.post('ajax.php?module=callerid&command=add',data)
		.done(function(data) {
			if(data.status) {
				$('#cidmodal').modal('hide')
				$('#entry_table').bootstrapTable('refresh')
				toggle_reload_button("show");
			} else {
				return warnInvalid($("#cidform input[name=prefix]"), data.message);
			}
		})
		.fail(function() {
			alert( "error" );
		})
		.always(function() {
		});
	} else {
		data.id = $("#cidform input[name=id]").val();
		$.post('ajax.php?module=callerid&command=edit',data)
		.done(function(data) {
			if(data.status) {
				$('#cidmodal').modal('hide')
				$('#entry_table').bootstrapTable('refresh')
				toggle_reload_button("show");
			}
		})
		.fail(function() {
			alert( "error" );
		})
		.always(function() {
		});
	}
})

$('#add_entry').click(function(e){
	modalMode = 'add';
	e.preventDefault();
	$('#cidmodal').modal('show')
	fillcidModal(undefined, '*200')
});

$("#entry_table").on('check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table', function () {
	var toolbar = $(this).data("toolbar"), button = $(toolbar).find(".btn-remove"), id = $(this).prop("id");
	button.prop('disabled', !$("#"+id).bootstrapTable('getSelections').length);
	deleteExts = $.map($("#"+id).bootstrapTable('getSelections'), function (row) {
		return row.id;
  });
});

$(".btn-remove").click(function() {
	var btn = $(this);
	if(confirm(_("Are you sure you wish to delete these caller id mappings?"))) {
		btn.find("span").text(_("Deleting..."));
		btn.prop("disabled", true);
		deleteEntries(deleteExts, function() {
			$('#entry_table').bootstrapTable('refresh')
			btn.find("span").text(_("Delete"));
			btn.prop("disabled", true);
			toggle_reload_button("show");
		})
	}
});

function deleteEntries(deleteExts, cb) {
	$.post( "ajax.php", {command: "delete", module: "callerid", mappings: deleteExts}, function(data) {
		if(data.status) {
			$.each(deleteExts, function (i,v) {
				//delete(extmap[v]);
			})
			deleteExts = [];
			cb();
		} else {
			alert(data.message);
		}
	});
}

function formatActions(value, row, index, field) {
	return '<a class="clickable edit" data-id="'+row.id+'"><i class="fa fa-edit"></i></a><a class="clickable delete" data-id="'+row.id+'"><i class="fa fa-trash"></i></a>'
}

function formatPersistent(value, row, index, field) {
	return value == 1 ? _('Yes') : _('No');
}
