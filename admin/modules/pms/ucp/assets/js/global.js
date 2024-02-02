	var PmsC = UCPMC.extend({
		init: function() {
			this.socket = null;
			this.subscribed = 0;
			this.wasTalking = {};
		},
		display: function() {
			$.getScript( "/admin/modules/pms/ucp/assets/js/canvasjs/canvasjs.min.js", function( data, textStatus, jqxhr ) {});
			
			$.getScript( "/admin/modules/pms/ucp/assets/js/canvasjs/jquery.canvasjs.min.js", function( data, textStatus, jqxhr ) {});			
		},
		displayWidget: function() {
			if(typeof window.CanvasJS === "undefined") {
				$.getScript( "/admin/modules/pms/ucp/assets/js/canvasjs/canvasjs.min.js", function( data, textStatus, jqxhr ) {
					$(document).trigger("canvasjsloaded");
				});

				$.getScript( "/admin/modules/pms/ucp/assets/js/canvasjs/jquery.canvasjs.min.js", function( data, textStatus, jqxhr ) {
				});
			}
			$("#datepicker_ci").datepicker();
			$("#datepicker_co").datepicker();
			$("#timepicker_ci").timepicker({timeFormat: 'h:ia', step: 5});
			$("#timepicker_co").timepicker({timeFormat: 'h:ia', step: 5});
			$('[data-toggle="tooltip"]').tooltip();
			
			$('#checkin').submit(function() { 
				var date_ci = document.forms["checkin"]["date_ci"].value;
				var date_co = document.forms["checkin"]["date_co"].value;
				var time_ci = document.forms["checkin"]["time_ci"].value;
				var time_co = document.forms["checkin"]["time_co"].value;
				var first_n = document.forms["checkin"]["first_name"].value;
				var last_n  = document.forms["checkin"]["last_name"].value;
				var dt_ci	= date_ci.split('/');
				var tm_ci	= time_ci.split(':');
				var dt_co	= date_co.split('/');
				var tm_co	= time_co.split(':');
				var d_ci	= new Date(dt_ci[2],dt_ci[0]-1,dt_ci[1],0,0).getTime();
				var d_co	= new Date(dt_co[2],dt_co[0]-1,dt_co[1],0,0).getTime();
				var today 	= new Date();
				var now		= new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime(); 
				
				if( $("#message").html() != ""){					
					return false;
				}
				
				if (d_co < d_ci) {
					$('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The check-out date must be longer than the check-in date.") + "</div></div></div>");
					return false;
				}

				if(check_group() === false){
					$('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("The group relating Hotel Guests seems to be corrupted! Please fix check it, submit and try again.") + "</div></div></div>");
					return false;			
				}

				if ( d_ci < now && $("#BTbooking").val() == _("Check-in") ) {
					$('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Check-in date must be longer than today.") + "</div></div></div>");
					return false;
				}
				
				if ( date_ci == "" || date_co == "" || time_ci == "" || time_co == "" || first_n == "" || last_n == "") {
					$('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Some fields must be filled out. Check please and try again.") + "</div></div></div>");
					return false;
				}
				
				if ( d_ci > now && $("#BTbooking").val() == _("Booking") ) {
					$('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Check-in date should not be longer than today.") + "</div></div></div>");
				return false;
				}		
				if ( !room ){
					$('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("No more room available for check in!! You have been switched in Booking mode right now.") + "</div></div></div>");
					return false;
				}
				window.scrollTo(0, 0);
				
				// submit the form Check-in
				var queryString = $(this).formSerialize();
				$.post({
					url: "ajax.php?module=pms&command=ci&"+queryString,
					dataType:"json",
					success: function (json) {
							var ci_result = JSON.parse(json.message);
							$("#message").html(ci_result["message"]);
							$("#datepicker_ci").html(ci_result["today"]);
							$("#timepicker_ci").html(ci_result["now"]);
							$("#language").empty().append(ci_result["language"]);
							$("#vm_pwd").html(ci_result["vm_pwd"]);
							$("#Sroom").html(ci_result["Sroom"]);
							$("#Sextension").html(ci_result["Sextension"]);
							$("#Sname").html(ci_result["Sname"]);
							$("#Svm_password").html(ci_result["Svm_password"]);
							$("#Svm_prefix").html(ci_result["Svm_prefix"]);
							$("#Sweb_user").html(ci_result["Sweb_user"]);
							$("#Sweb_password").html(ci_result["Sweb_password"]);
							$("#ticket_footer").val(ci_result["ticket_footer"]);
							$("#ticket_body").val(ci_result["ticket_body"]);
							$("#ticket_header").val(ci_result["ticket_header"]);
							$("#room_list").empty().append(ci_result["room_list"]);
							if(ci_result["Sname"] != "" && ci_result["message"] == ""){;
								$("#summary").modal('show');
								$("#reload_button").modal('show');
							}
							
							if($('#BTbooking').val() == _("Check-in")){
								location.reload();
							}
							
					}
				});
				
				return false; 
			});
	
			$('#group_list').submit(function() { 
				// submit the form group list
				var queryString = $(this).formSerialize();
				$.post('ajax.php?module=pms&command=gl', queryString); 
				$("#group").val("");
				$("#rooms").val([]);
				$("#getgrouptable").bootstrapTable("removeAll");
				$("#getgrouptable").bootstrapTable("refresh", {silent: true});
				return false; 
			});
			
			function setCookie(key, value) {
				var expires = new Date();
				expires.setTime(expires.getTime() + (60 * 1000));
				document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
			}
	
			$('#booking_list').submit(function() { 
				// submit the form  booking list
				var queryString = $(this).formSerialize();
				$.post('ajax.php?module=pms&command=bl', queryString); 
				$("#bookinglisttable").bootstrapTable("removeAll");
				$("#bookinglisttable").bootstrapTable("refresh", {silent: true});
				location.reload();
				return false; 
			});
			
			$('#booking_status').submit(function() { 
				// submit the form  booking status
				setCookie("date_ci", $("#datepicker_ci").val());
				setCookie("date_co", $("#datepicker_co").val());
				return true; 
			});
			
			$('#customer_edit').submit(function() { 
				// submit the form customer edit.
				var queryString = $(this).formSerialize();
				$.post('ajax.php?module=pms&command=ce', queryString); 
				$("#list").show();
				$("#edit").hide();
				$("#message").html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+_("Guest updated.")+"</div></div></div>");
				window.scrollTo(0, 0);
				$("#customertable").bootstrapTable("removeAll");
				$("#customertable").bootstrapTable("refresh", {silent: true});
				return false; 
			});
			
		},
		poll: function(data) {
			var Pms = this;

			// Detect if emergency alert is present and forwarding url, excepted if it's on emergency page.
			page = window.location.href;

			if (data["emergency_alert"] != "none"){
				
				if($("#emergency").val() != "ok" && (typeof rl == 'undefined')) {
					rl = "1";
					window.location.reload();
					
				};
			};

			/**
			 * Get messages and billing 
			 */
			if($("#ext").length){
				var ext= $("#ext").html();			
				$.ajax({
					url: "index.php?quietmode=1&display=dashboard&module=pms&view=room_status&command=get_billing&ext="+ext,
					dataType:"json",
					success: function (json) {
						var list_billing = jQuery.parseJSON(json.message);						
						$("#billing").html(list_billing);
					},
				});	

				$.ajax({				
					url: "index.php?quietmode=1&display=dashboard&module=pms&view=room_status&command=get_messages&ext="+ext,
					dataType:"json",
					success: function (json) {
						var list_msg = jQuery.parseJSON(json.message);
						$("#list_msg").html(list_msg);
					},
				});		
			}

			/**
			 * Get all wakeup call
			 */			
			if ($("[name='room']").length) {
				var dest  = $("[name='room']").val();
				$.post({
					url: "index.php?quietmode=1&module=pms&command=wu&get_wu="+dest,
					dataType:"json",
					success: function (json) {
						if (json.message != null){			
							$("#wakeup").html(jQuery.parseJSON(json.message));
						};
					},
				});					
			}	

			// Detect any room services.
			if ($("#roomlisttable").length){
				new_nbrs = $("#nbrs").val();
				$.ajax({
					url: "?quietmode=1&module=pms&command=room_services",
					dataType:"json",
					success: function (json) {
						var room_service = JSON.parse(json.message);
						if(room_service != "none"){
							cur_nbrs = 0;
							$.each(room_service, function(room_ext, v) {
								cur_nbrs++;
								$("#"+room_ext).html("<i class='fa fa-trash' onclick='del_rs(\""+room_ext+"\")'></i> "+v['lab']+" "+v['plv']);
								$("#message").html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div style='text-align:center;'><div class='text-danger'>"+_("Room Service present!")+"</div></div></div>");
							});
							if(cur_nbrs != parseInt(new_nbrs) ){
								window.location.reload();
							}
						};
					},
				});
			};
		},
	});
