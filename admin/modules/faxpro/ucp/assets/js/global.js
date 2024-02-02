//$("#fax-grid").bootstrapTable('showRow', {index: 1444166808988, isIdField: true})
function faxpro_get_dest_from_initiate(){
	/*
		Get the destionation number from contact Widget.
	*/
	if(typeof did_init === "undefined"){
		return null;
	}
	else{
		return did_init;
	}	
}

var FaxproC = UCPMC.extend({
	init: function() {
		this.forwardID = null;
		this.initalized = false;
		this.faxData = { files: [] };
		this.folderCounts = {};
	},
	resize: function(widget_id) {
		$(".grid-stack-item[data-id='"+widget_id+"'] .fax-grid").bootstrapTable('resetView',{height: $(".grid-stack-item[data-id='"+widget_id+"'] .widget-content").height()});
		//$(".grid-stack-item[data-id='"+widget_id+"'] .fixed-table-container").css("max-height",$(".grid-stack-item[data-id='"+widget_id+"'] .widget-content").height());
	},
	saveSettings: function() {
		var data = {};
		$("#widget_settings input[type!=checkbox]").each(function( index ) {
			data[$(this).prop("name")] = $(this).val();
		});
		$("#widget_settings select").each(function( index ) {
			data[$(this).prop("name")] = $(this).val();
		});
		$.post( UCP.ajaxUrl+"?module=faxpro&command=save", data, function( data ) {
			$("#message").addClass("alert-success").text("Saved Settings").fadeIn("slow", function(event) {
				setTimeout(function() { $("#message").fadeOut("slow"); }, 2000);
			});
		});
	},
	displayWidgetSettings: function(widget_id, dashboard_id) {
		var $this = this,
				extension = $("div[data-id='"+widget_id+"']").data("widget_type_id");

		$('#widget_settings .widget-settings-content input[type!=checkbox]').change(function() {
			$(this).one("blur",function() {
				$this.saveSettings();
			});
		});
		$('#widget_settings .widget-settings-content select').change(function() {
			$this.saveSettings();
		});

		$('#widget_settings .widget-settings-content input[type=checkbox]').change(function() {
			Cookies.remove('fax-refresh-'+extension, {path: ''});
			if($(this).is(":checked")) {
				Cookies.set('fax-refresh-'+extension, 1);
			} else {
				Cookies.set('fax-refresh-'+extension, 0);
			}
		});
		if((typeof Cookies.get('fax-refresh-'+extension) === "undefined" && (typeof Cookies.get('fax-refresh-'+extension) === "undefined" || Cookies.get('fax-refresh-'+extension) == 1)) || Cookies.get('fax-refresh-'+extension) == 1) {
			$("#widget_settings .widget-settings-content input[id=fax-refresh]").prop("checked",true);
		} else {
			$("#widget_settings .widget-settings-content input[id=fax-refresh]").prop("checked",false);
		}
		$("#widget_settings .widget-settings-content input[id=fax-refresh]").bootstrapToggle('destroy');
		$("#widget_settings .widget-settings-content input[id=fax-refresh]").bootstrapToggle({
			on: _("Enable"),
			off: _("Disable")
		});
	},
	displayWidget: function(widget_id, dashboard_id) {
		var $this = this,
				extension = $(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"']").data("widget_type_id");

		$(".grid-stack-item[data-id='"+widget_id+"'] .voicemail-grid").one("post-body.bs.table", function() {
			setTimeout(function() {
				$this.resize(widget_id);
			},250);
		});

		$(".grid-stack-item[data-id='"+widget_id+"'] .fax-grid").on("post-body.bs.table", function()  {
			$(".grid-stack-item[data-id='"+widget_id+"'] .fax-grid .showFax").click(function() {
				$this.showPDF($(this).data("id"));
			});
			$(".grid-stack-item[data-id='"+widget_id+"'] .fax-grid .forwardFax").click(function() {
				$this.forward($(this).data("id"), $(this).data("dest"));
			});
			$(".grid-stack-item[data-id='"+widget_id+"'] .fax-grid .stopFax").click(function() {
				var id = $(this).data("id");
				$this.stopFax(id, function(data) {
					if(data.status) {
						$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .fax-grid").bootstrapTable('hideRow', {index: id, isIdField: true});
						//$this.updateFolderCount("out","-",1);
					}
				});
			});
			$(".grid-stack-item[data-id='"+widget_id+"'] .fax-grid .deleteFax").click(function() {
				var id = $(this).data("id");
				$this.deleteFax(id, function(data) {
					if(data.status) {
						$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .fax-grid").bootstrapTable('hideRow', {index: id, isIdField: true});
						//$this.updateFolderCount("delete","-",1);
					}
				});
			});
		});

		$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .folder").click(function() {
			$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .folder").removeClass("active");
			$(this).addClass("active");
			folder = $(this).data("folder");
			if(folder == 'out' || folder == 'failed' || folder == 'sent') {
				$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .fax-grid").bootstrapTable('showColumn','dest');
				$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .fax-grid").bootstrapTable('hideColumn','callid');
			} else {
				$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .fax-grid").bootstrapTable('hideColumn','dest');
				$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .fax-grid").bootstrapTable('showColumn','callid');
			}
			$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .fax-grid").bootstrapTable('refreshOptions',{
				url: UCP.ajaxUrl+'?module=faxpro&command=grid&folder='+folder+'&ext='+extension
			});
		});

		$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .fax-grid").on("check.bs.table uncheck.bs.table check-all.bs.table uncheck-all.bs.table", function () {
			var sel = $(this).bootstrapTable('getAllSelections'),
					dis = true;
			if(sel.length) {
				dis = false;
			}
			$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .delete-selection").prop("disabled",dis);
			//$("#forward-selection").prop("disabled",dis);
		});

		$(document).on("click",".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .delete-selection", function() {
			UCP.showConfirm(_("Are you sure you wish to delete these faxes?"),'info',function() {
				var sel = $(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .fax-grid").bootstrapTable('getAllSelections');
				$.each(sel, function(i, v){
					$this.deleteAllFax(v.faxid, function(data) {
						if(data.status) {
							$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .fax-grid").bootstrapTable('hideRow', {index: v.faxid, isIdField: true});
						}
					});
				});
				$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .delete-selection").prop("disabled",true);
			});
		});

		$(".grid-stack-item[data-rawname=faxpro][data-id='"+widget_id+"'] .send-fax").click(function() {
			UCP.showDialog(_("Send Fax"),UCP.Modules.Widgets.activateWidgetLoading(),'<button id="send-btn" class="btn btn-default">'+_('Send')+'</button>',function() {
				$.post( UCP.ajaxUrl+"?module=faxpro&command=senddialog", { extension: extension }, function( data ) {
					$("#globalModal .modal-body").html(data.html);
					$("#globalModal #coversheet").bootstrapToggle({
						on: _("On"),
						off: _("Off")
					});
					var initalDropMessage = $("#globalModal .faxsend .filedrop .message").html();
					$("#globalModal .faxsend #coversheet").change(function(event) {
						if ($(this).is(":checked") && !$(".faxsend .extras").is(":visible")) {
							$(".faxsend .extras").removeClass("hidden");
						} else if ($(".faxsend .extras").is(":visible")) {
							$(".faxsend .extras").addClass("hidden");
						}
					});
					var fq = Cookies.get("faxquality");
					if(typeof fq !== "undefined") {
						$("#globalModal .faxsend #faxresolution").val(fq);
					}
					$("#globalModal .faxsend #faxresolution").change(function() {
						Cookies.set("faxquality",$(this).val());
					});

					$("#globalModal .modal-header .close").click(function() {
						$('ul li').each(function(i){
							attach = $(this).attr('id');							
							if(typeof attach != "undefined"){
								UCP.Modules.Faxpro.deleteAttachment(attach.replace('attachment-', ''));
							}						
						});
					});

					$("#globalModal .faxsend input[type=\"file\"]").fileupload({
						url: UCP.ajaxUrl + "?module=faxpro&command=upload",
						dropZone: $(".faxsend .filedrop"),
						dataType: "json",
						add: function(e, data) {
							var badFile = null;
							$.each(data.files, function(i, v) {
								if(v.size > maxFileSize.size) {
									badFile = v;
									return false;
								}
							});
							if(badFile === null) {
								$("#globalModal .faxsend .filedrop .message").text(_("Uploading..."));
								data.submit();
							} else {
								UCP.showAlert(sprintf(_("File was too large. Please reduce the file size or increase %s"), maxFileSize.type),'warning');
								data.abort();
							}
						},
						done: function(e, data) {
							if (data.result.status) {
								var html = "<li id=\"attachment-" + data.result.id + "\" class=\"list-group-item attachment\" data-filename=\"" + data.result.localfilename + "\">" +
								"<div>" + data.result.filename + " <div class='icons'>" +
								"<a target='_blank' href='"+UCP.ajaxUrl+"?module=faxpro&command=viewtemp&faxid=" + data.result.localfilename + "'><i class=\"fa fa-file-pdf-o\"></i></a>" +
								"<a onclick=\"UCP.Modules.Faxpro.deleteAttachment('" + data.result.id + "')\"><i class=\"fa fa-trash-o\"></i><a>" +
								"</div></div></li>";
								$("#globalModal .files .list-group").append(html);
								$("#globalModal .files").removeClass("hidden");
								$("#globalModal .faxsend .filedrop .pbar").css("width", "0%");
								$("#globalModal .faxsend .filedrop .message").html(initalDropMessage);
								$this.faxData.files.push(data.result.localfilename);
							} else {
								$("#globalModal .faxsend .filedrop .pbar").css("width", "0%");
								$("#globalModal .faxsend .filedrop .message").text(data.result.message);
							}
						},
						progressall: function(e, data) {
							var progress = parseInt(data.loaded / data.total * 100, 10);
							$("#globalModal .faxsend .filedrop .pbar").css("width", progress + "%");
						},
						drop: function(e, data) {
							$("#globalModal .faxsend .filedrop").removeClass("hover");
						},
						submit: function(e, data) {
							var $this = $(this);
							data.formData = { test: "123" };
							$this.fileupload("send", data);
							return false;
						}
					});

					$("#globalModal .faxsend .filedrop").on("dragover", function(event) {
						if (event.preventDefault) {
							event.preventDefault(); // Necessary. Allows us to drop.
						}
						$(this).addClass("hover");
					});
					$("#globalModal .faxsend .filedrop").on("dragleave", function(event) {
						$(this).removeClass("hover");
					});
					$("#globalModal .faxsend #msg").bind("input propertychange", function() {
						var max = 1340;
						$("#globalModal #msg-left").text(max - $(this).val().length);
						if ((max - $(this).val().length) < 0) {
							$("#globalModal #msg-left").addClass("red");
						} else {
							$("#globalModal #msg-left").removeClass("red");
						}
					});
					$("#globalModal #send-btn").click(function() {
						$this.sendFax();
					});
				});
			});
		});
	},
	contactClickOptions: function(type) {
		if (type != "number" || false) {
			return false;
		}
		return [ { text: _("Send Fax"), function: "contactClickInitiate", type: "fax" } ];
	},
	contactClickInitiate: function(did) {
		/*
			Globalizing did initiate 'did_init'
		*/
		did_init    = did;
		var ext 	= $("#faxpro-module").attr("data-ext"); // Get extension number (user)
		var faxpro 	= $('#faxpro-toolbar-'+ext).val();
		var dest	= $("#destination").val();				// Get destination number.
		if(faxpro === undefined) {
			UCP.showAlert('This functionality requires FAX widget to be selected in the dashboard. Please add the same.','warning');
			return false;
		}
		if ((dest === undefined || dest === null) && (faxpro !== undefined || faxpro !== null)) {
			/*
				Send a click event to the button "Send Fax" if the Widget is present.
				If Faxpro is not present, There's nothing to do.
			*/
			$(".send-fax").click();	
		}
	},
	updateFolderCount: function(folder,operation,amount) {
		var count = (operation == "+") ? this.folderCount[folder] + parseInt(amount) : this.folderCount[folder] - parseInt(amount);
		$(".grid-stack-item[data-rawname=faxpro] .folder-list .folder[data-folder="+folder+"] .badge").text(count);
	},
	poll: function(data) {
		if (data.status && $(".grid-stack-item[data-rawname=faxpro]").length) {
			if(typeof this.folderCounts.new !== "undefined") {
				if ((this.folderCounts.new.count < data.folderCounts.new.count) && UCP.notify) {
					var faxproNotification = new Notify("Fax", {
						body: sprintf(_("You Have %s New Fax"), (data.folderCounts.new.count - this.folderCounts.new.count)),
						icon: "modules/Faxpro/assets/images/fax.png"
					});
					faxproNotification.show();
				}
			}

			var folder = $(".grid-stack-item[data-rawname=faxpro] .folder-list .folder.active").data("folder"),
					extension = $(".grid-stack-item[data-rawname=faxpro]").data("widget_type_id");

			if(typeof this.folderCounts[folder] !== "undefined" && (data.folderCounts[folder].count != this.folderCounts[folder].count) && (typeof Cookies.get('fax-refresh-'+extension) === "undefined" && (typeof Cookies.get('fax-refresh-'+extension) === "undefined" || Cookies.get('fax-refresh-'+extension) == 1)) || Cookies.get('fax-refresh-'+extension) == 1) {
				$(".grid-stack-item[data-rawname=faxpro] .fax-grid").bootstrapTable('refresh',{silent: true});
			}

			this.folderCounts = data.folderCounts;
			$.each(data.folderCounts, function( folder, data ) {
				$(".grid-stack-item[data-rawname=faxpro] .folder-list .folder[data-folder="+folder+"] .badge").text(data.count);
			});
		}
	},
	deleteAttachment: function(id) {
		var $this = this;
		if ($("#globalModal #attachment-" + id).length !== 0) {
			if ($("#globalModal .files .list-group-item").length === 1) {
				$("#globalModal .files").addClass("hidden");
				$.post( UCP.ajaxUrl + "?module=faxpro&command=deleteattachment", { name: $("#attachment-" + id).data("filename") }, function( data ) {
					if (data.status) {
						var i = $this.faxData.files.indexOf($("#attachment-" + id).data("filename"));
						if (i != -1) {
							$this.faxData.files.splice(i, 1);
						}
						$("#attachment-" + id).remove();
					}
				});
			} else {
				$.post( UCP.ajaxUrl + "?module=faxpro&command=deleteattachment", { name: $("#attachment-" + id).data("filename") }, function( data ) {
					if (data.status) {
						var i = $this.faxData.files.indexOf($("#globalModal #attachment-" + id).data("filename"));
						if (i != -1) {
							$this.faxData.files.splice(i, 1);
						}
						$("#globalModal #attachment-" + id).remove();
					}
				});
			}
		}
	},
	stopFax: function(id, callback) {
		UCP.showConfirm(_("Are you sure you wish to stop this fax?"),'info', function() {
			$.post( UCP.ajaxUrl + "?module=faxpro&command=stopfax", { id: id }, function( data ) {
				if(typeof callback === "function") {
					callback(data);
				}
			});
		});
	},
	deleteFax: function(id, callback) {
		UCP.showConfirm(_("Are you sure you wish to delete this fax?"),'info', function() {
			$.post( UCP.ajaxUrl + "?module=faxpro&command=deletefax", { id: id }, function( data ) {
				if(typeof callback === "function") {
					callback(data);
				}
			});
		});
	},
	deleteAllFax: function(id, callback) { 
		$.post( UCP.ajaxUrl + "?module=faxpro&command=deletefax", { id: id }, function( data ) {
			if(typeof callback === "function") {
				callback(data);
			}
		});
	},
	sendFax: function() {
		var $this = this;
		if ($("#globalModal #destination").val() === null || !$("#globalModal #destination").val().length || !$("#globalModal #destination").val().match(/^[0-9*#]+(?:;[0-9*#]+)*$/)) {
			UCP.showAlert(_("Please Enter a valid Destination"),'warning');
			$("#globalModal #destination").focus();
			return false;
		}
		if (!$this.faxData.files.length && !$("#globalModal #coversheet").is(":checked")) {
			UCP.showAlert(_("Please upload at least one file or enable a coversheet"),'warning');
			return false;
		}
		$this.faxData.destination = $("#globalModal #destination").val();
		$("input[type!=\"checkbox\"][type!=\"file\"]").each(function( index ) {
			$this.faxData[$(this).prop("name")] = $(this).val();
		});
		$("input[type=\"checkbox\"]").each(function( index ) {
			$this.faxData[$(this).prop("name")] = $(this).is(":checked");
		});
		$("select[name!=\"destination\"]").each(function( index ) {
			$this.faxData[$(this).prop("name")] = $(this).val();
		});
		$("textarea").each(function( index ) {
			$this.faxData[$(this).prop("name")] = $(this).val();
		});
		$("#globalModal #send-btn").prop("disabled", true);
		$("#globalModal #destination").prop("disabled", true);
		$("#globalModal .file-controls").hide();
		$("#globalModal .filedrop").hide();
		$("#globalModal #coversheet").prop("disabled", true);
		$("#globalModal .attachment img").remove();
		$.post( UCP.ajaxUrl + "?module=faxpro&command=sendfax", $this.faxData, function( data ) {
			if (data.status) {
				UCP.closeDialog(function() {
					$(".grid-stack-item[data-rawname=faxpro] .folder-list .folder[data-folder=out]").click();
				});
			} else {
				$("#globalModal #message").addClass("alert-danger").text(data.message).fadeIn("slow");
				$("#globalModal #send-btn").prop("disabled", false);
			}
			$("#globalModal #dashboard-content").animate({ scrollTop: 0 }, "slow");
			//clear files
			$this.faxData = { files: [] };
		});
	},
	showPDF: function(id) {
		UCP.showDialog(_("Fax Preview"),
			"<object type='application/pdf' width='100%' height='100%' data='"+UCP.ajaxUrl + "?module=faxpro&command=view&faxid="+id+"'>" +
			"<p>"+sprintf(_('Your Web browser is not configured to display PDF files. Click here %s to download the PDF file'),"<span class='link'><a href='"+UCP.ajaxUrl+"?module=faxpro&command=view&faxid="+id+">"+_('Here')+"</a></span>")+"</a></p>" +
			"</object>",
			'<a class="btn btn-info download" href="'+UCP.ajaxUrl + "?module=faxpro&command=download&faxid="+id+'"><i class="fa fa-cloud-download"></i> '+_("Download")+'</a><button type="button" class="btn btn-default" data-dismiss="modal">'+_("Close")+'</button>',
			function() {
				$("#globalModal .modal-body object").css("height","calc(100vh - 218px)");
			}
		);
	},
	forward: function(id, dest) {
		UCP.showDialog(_("Forward Fax"), "<label>" + _("Please enter a phone number or extension") + ":</label><br/>" +
			"<input type='text' class='form-control' name='dest' value='"+dest+"'></br>" +
			"<div class='row'>"+
			"<div class='col-md-12'>"+
			"<span id='destination-help' class='help-block fpbx-help-block'>Phone numbers or extensions should be separated by semicolon(;) </spam>"+
			"</div>"+
			"</div>"+
			"<div class='form-group'>" +
			"<label for='faxresolution'>"+_('Resolution')+"</label>" +
			"<select id='faxresolution' name='resolution' class='form-control'>" +
			"<option value='standard'>"+_("Standard")+"</option>" +
			"<option value='fine' selected>"+_("Fine")+"</option>" +
			"<option value='superfine'>"+_("Super Fine")+"</option>" +
			"</select>" +
			"</div>",
		"<button class='btn btn-default send'>"+_("Send")+"</button>",function(){
			$("#globalModal .send").click(function() {
				var dest = $("#globalModal input[name=dest]").val(), local, resolution = 'fine';
				if (dest === "") {
					UCP.showAlert(_("Destination Can Not Be Blank"));
				} else {
					local = $("#globalModal checkbox[name=faxlocal]").is(":checked");
					resolution = $("#globalModal checkbox[name=resolution]").val();
					$.post( UCP.ajaxUrl + "?module=faxpro&command=forward", { dest: dest, resolution: resolution, local: local, id: id }, function( data ) {
						if (data.status) {
							UCP.closeDialog(function() {
								$(".grid-stack-item[data-rawname=faxpro] .folder-list .folder[data-folder=out]").click();
							});
						} else {
							UCP.showAlert(data.message);
						}
					});
				}
			});
		});
	},
	controlFormatter: function (value, row, index) {
		var folder = $(".grid-stack-item[data-rawname=faxpro] .folder-list .folder.active").data("folder"),
				controls = '',
				dest = '';

		if(folder == "failed") {
			dest = row.dest;
		}
		controls += '<a class="showFax" data-id="'+row.faxid+'"><i class="fa fa-file-pdf-o"></i></a><a href='+UCP.ajaxUrl+'?module=faxpro&command=download&faxid='+row.faxid+' target="_blank"><i class="fa fa-cloud-download"></i></a>';
		if(folder !== "out") {
			controls += '<a class="forwardFax" data-id="'+row.faxid+'" data-dest="'+dest+'"><i class="fa fa-share"></i></a>';
			controls += '<a class="deleteFax" data-id="'+row.faxid+'"><i class="fa fa-trash-o"></i></a>';
		} else {
			controls += '<a class="stopFax" data-id="'+row.faxid+'"><i class="fa fa-times"></i></a>';
		}
		return controls;
	},
	dateFormatter: function(value, row, index) {
		return UCP.dateFormatter(value);
	},
	dateTimeFormatter: function(value, row, index) {
		return UCP.dateTimeFormatter(value);
	},
});
