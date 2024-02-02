	// https://developers.google.com/chart/interactive/docs/gallery/piechart#options
	function decodeEntities(encodedString) {
		var textArea = document.createElement('textarea');
		textArea.innerHTML = encodedString;
		return textArea.value;
	}

	function linkFormatter(value, row, index) {
		return decodeEntities(value);
	}

	function check_int(thisvalue) {
		if ( $.isNumeric(thisvalue) == false){
			$('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Please enter a valid Number.") + "</div></div></div>");
		}
	}	
	
	function check_group(){
		$.ajax({
			url: "index.php?quietmode=1&module=pms&command=check_group",
			dataType:"json",
			async: false,
			success: function (json) {
				if (json.message != null){					
					var result = JSON.parse(json.message);
					if(result === "OK"){
						window.return = true;					
					}
					else{						
						window.return = false;
					}
				};
			},
			error: function(d) {
				d.suppresserrors = true;
			}
		});	
		return window.return;
	}
		
	function cellStyle(value, row, index, field) {
		  return {
			classes: 'bg-white',
		  };
		}

	function cellStyle_c(value, row, index, field) {
		  return {
			classes: 'bg-white tac',
		  };
		}
		
	function cellUCP(value, row, index, field) {
		  return {
			css: {"background": "white"},
		  };
		}		
	
	function check_val(thisvalue) {
		if ( $.isNumeric(thisvalue) == false){
			$('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Please enter a valid Number.") + "</div></div></div>");
		}
		if ( thisvalue == 0){
			$('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The value must be greater than zero.") + "</div></div></div>");
		}
	}
	
	// Room list
	function Transfer(exten, Vtitle) {
		$("#transfer").modal({backdrop: false});
		$("#TrExt").val(exten);
		$("#transfermodalbody").html($("#DialTrans"+exten).html());
	}
	
	function valid_transfer() {
		var exten = $("#TrExt").val();
		console.log("extension d'origine pour le transfert = "+exten);
		$.post("index.php", {quietmode: "1", command: "transfer", transfer: "yes", module: "pms", from: exten, to: $("#select"+exten).val() }, function( data ) {
		
			if(data.status){
				$("#reload_button").show();	
				$("#transfer").modal('hide');
			};
		});	
	}
	
	// DND Toggle
 	function dnd_status(extension,status) {
		if (status == "NO")
			{
				$.ajax({
					url: "index.php?quietmode=1&module=pms&command=dnd&room_dnd="+extension+"&st=NO",
					dataType:"json",
					success: function (json) {
						if (json.message != null){			
							$("#dnd"+extension).html("<i class='fa fa-user green_text' aria-hidden='true' onclick='dnd_status(\""+extension+"\",\"YES\")'></i>");
							$("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
						};
					}
				});
			}
			else
			{
				$.ajax({
					url: "index.php?quietmode=1&module=pms&command=dnd&room_dnd="+extension+"&st=YES",
					dataType:"json",
					success: function (json) {
						if (json.message != null){			
							$("#dnd"+extension).html("<i class='fa fa-user red_text' aria-hidden='true' onclick='dnd_status(\""+extension+"\",\"NO\")'></i>");
							$("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
						};
						
					}
				});

		}
	} 
	
	function wu_del(filename){
			$.ajax({
				url: "index.php?quietmode=1&module=pms&command=wu&wu_del="+filename,
				dataType:"json",
				success: function (json) {
					if (json.message != null){			

					};
				}
			});
	}
	
	// Clean Toggle
 	function clean_status(extension,st) {
		if (st == "NO"){
			$.post("index.php", {quietmode: "1", command: "clean", module: "pms", room_clean: extension, st: "NO"}, function( data ) {
				if(data.status){
					$("#clean"+extension).html("<i class='fa fa-times green_text' aria-hidden='true' onclick='clean_status(\""+extension+"\",\"YES\")'></i>");
					$("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
				};
			});
		}
		else
		{
			$.post("index.php", {quietmode: "1", command: "clean", module: "pms", room_clean: extension, st: "YES"}, function( data ) {
				if(data.status){
					$("#clean"+extension).html("<i class='fa fa-times red_text' aria-hidden='true' onclick='clean_status(\""+extension+"\",\"NO\")'></i>");
					$("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
				};
			});
		};
	}
  
	// Message box in Room List.
	function infobox(thisvalue, ext) {		
		$("#snd_button").click(function(){
			$.post("index.php", {quietmode: "1", command: "summary", module: "pms", ext: ext}, function( data ) {});
			$("#snd_button").off();
		});
		var detail 		= thisvalue;
		$.post("index.php", {quietmode: "1", command: "cdr", module: "pms", ext: ext}, function( data ) {
			if(data.status){
				$("#info").modal();
				$("#infomodalbody").html(detail+JSON.parse(data.message));
			}
		});
	}

	function del_rs(extension){
		$.ajax({
			url: "?quietmode=1&module=pms&command=get_maid_services",
			dataType:"json",
			async: false,
			success: function (json) {
				var maid_services = JSON.parse(json.message);
				window.rs_options = "";
				if($.isArray(maid_services)){
					$.each(maid_services, function(idx, detail) {
						window.rs_options += "<option value='"+detail["service_number"]+"'>"+detail["label"]+"</option>";
					});					
				}
			},
		});

		$.ajax({
			url: "index.php?quietmode=1&module=pms&command=delete_rs&delete_rs="+extension,
			dataType:"json",
			success: function (json) {
				list_box_rs  =	"<div class='row'>";
				list_box_rs +=	"<div class='col-md-12'>";
				list_box_rs +=	"<select class='form-control' name='message' id='message'>";
				list_box_rs +=	window.rs_options;
				list_box_rs +=	"</select>";
				list_box_rs +=	"<br>";
				list_box_rs +=	"<button type='button' class='btn btn-primary' onclick='send_rs(\""+extension+"\")'>"+_("Send")+"</button></div></div>";
				$("#msg_rs").html(list_box_rs);
			}
		});			
	}
	
	function send_rs(extension) {
		$.ajax({
			url: "index.php?quietmode=1&display=dashboard&module=pms&command=send_rs&ext=" + extension + "&rs=" + $("#message").val(),
			dataType: "json",
			success: function (json) {
				updateSelectedExtension(extension);
				if (json.message != "true") {
					console.debug(json);
				}
			}
		});
	};

	function updateSelectedExtension(extension) {
		var message = "";
		$.ajax({
			url: "?quietmode=1&module=pms&command=room_services",
			dataType: "json",
			async: false,
			success: function (json) {
				var room_service = JSON.parse(json.message);
				if (room_service != "none") {
					cur_nbrs = 0;
					$.each(room_service, function (room_ext, v) {
						cur_nbrs++;
						if (room_ext == extension) {
							message = v['lab'];
							$("#msg_rs").html("<li><b>" + message + "</b></li><br><button type='button' class='btn btn-primary' onclick='del_rs(\"" + extension + "\")'>" + _("Delete") + "</button>");
						}
					});
				}
			},
		});
	}	
	
	//---------------

	// Delete emergency alerts
	
	function delete_emergency_alert(){
		$.ajax({
			url: "index.php?quietmode=1&display=dashboard&module=pms&command=delete_emergency_alert&checked=Ok",
			dataType:"json",
			success: function (json) {
				window.location.reload();
			}
		});			
	};	

	//---------------
	
	// Wake up call
	$(document).ready(function (){
		
		var room = $("[name='room']").val();
		if (room == "") {
			$('#modal-container-alert').modal('show');
			$("#add-wu").removeAttr("style").hide();
		}		
	});
	
	function send_checkout(res_num, extension, ba){
		$.ajax({
			url: "index.php?quietmode=1&display=dashboard&module=pms&command=send_checkout&res_num="+res_num+"&room_num="+extension+"&ba="+ba,
			dataType:"json",
			success: function (json) {

			}
		});		
	}
	function add_wu(){
		var dt_wu = $("[name='date_wu']").val();
		var tm_wu = $("[name='time_wu']").val();
		var dest  = $("[name='room']").val();
		
		$.post( "index.php", {quietmode: "1", command: "savecall", module: "pms", destination: dest, time: tm_wu, day: dt_wu}, function( data ) {
			if(!data.status) {
				$('#modal-container-warning').modal('show');
				$("#message_warning").html(data.message);
			} else {
				$('#modal-container-success').modal('show');
				$("#message_success").html(_("Alarm clock scheduled"));
			}
			$('#btn_alarm').click();
		})		
	}; 
	//------------------------------
	
	
	
$(document).ready(

  /* This is the function that will get executed after the DOM is fully loaded */
  function () {
		$("#datepicker_ci").datepicker(); 
		$("#datepicker_co").datepicker();
		$("#timepicker_ci").timepicker({timeFormat: 'h:ia', step: 5});
		$("#timepicker_co").timepicker({timeFormat: 'h:ia', step: 5});
		$('[data-toggle="tooltip"]').tooltip();
	});


