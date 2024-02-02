$(document).ready(function() {
	if($('#uploadfirm').length){
		var dz = new Dropzone("#uploadfirm",{
		url: `${FreePBX.ajaxurl}?module=endpoint&command=upload_cust_fw`,
		chunking: true,
		forceChunking: true,
		maxFiles: 1,
		maxFilesize: null,
		previewsContainer: false,
		autoProcessQueue: false
		});
		dz.on("sending",function(file, xhr, formData) {
			$("#uploadprogress").addClass('active');
			$("#uploadfirm").html(_("Uploading...")+'<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>');
			formData.append("fwbrand", $('#fwbrand option:selected').val());
			formData.append("fwmodel", $('#fwmodel').val());
			formData.append("fwversion", $('#fwver').val());
		})
		dz.on("addedfile", function(file) {
			var fileName = "File Name :- " +file.name;
			var fileSize = "File Size :- " +file.size;
			$('#filename').text(fileName);
			$('#filesize').text(fileSize);
		});
		dz.on("processing", function() {
			$("#uploadfirm").html(_("Processing...")+'<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>')
		})
		dz.on("uploadprogress", function(event,progress,total){
			if(progress < 100) {
				$("#uploadprogress").text(progress.toFixed(2)+'%');
				$("#uploadprogress").css('width', `${progress}%`);
			}
		});

	}
	$('#fwuploadsubmit').click(function(){
		var fwmodel = $('#fwmodel').val();
		var fwver = $('#fwver').val();
		var fwbrand = $('#fwbrand option:selected').val();
		if($('#fwmodel').val() == 0) {
			alert(_('Please specify phone model'));
			return false;
		}
		if($('#fwver').val() == 0) {
			alert(_('Please specify custom phone firmware version.'));
			return false;
		}
		if(dz.files.length == 0) {
			alert(_('Please upload phone custom firmware file.'));
			return false;
		}
		dz.processQueue();
		dz.on("success", function(file) {
			var result = $.ajax({
				url: "ajax.php?module=endpoint&command=process_cust_fw",
				type: 'POST',
				async: false,
				data: {url: $("#url").val(), fwmodel: fwmodel, fwver: fwver, fwbrand: fwbrand, filename: file.name}
			});
			obj = JSON.parse(result.responseText);
			if(obj.status) {
				window.location = `?display=endpoint&view=custfwupgrade`;
			} else {
				alert(obj.message);
			}
		});
	});

});
