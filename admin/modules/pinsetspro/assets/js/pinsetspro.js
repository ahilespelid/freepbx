function queryParams(params){
	var formData = $("#psetpro").serialize();
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

$("#csvreport").click(function(e) {
	e.preventDefault();
	e.stopPropagation();
	var formData = $("#psetpro").serialize();
	var url = 'ajax.php?module=pinsetspro&command=csvreport&'+formData;
	var url2 = 'ajax.php?module=pinsetspro&command=csvsummary&'+formData;
	var iframe = $("<iframe/>").attr({
			src: url,
			style: "visibility:hidden;display:none"
		}).appendTo('body');
	var iframe2 = $("<iframe/>").attr({
			src: url2,
			style: "visibility:hidden;display:none"
		}).appendTo('body');
})
