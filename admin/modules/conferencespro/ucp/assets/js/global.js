var ConferencesproC = UCPMC.extend({
	init: function() {
		this.socket = null;
		this.subscribed = [];
		this.wasTalking = {};
	},
	displayWidget: function(widget_id,dashboard_id) {
		var $this = this,
				conference = $(".grid-stack-item[data-rawname=conferencespro][data-id='"+widget_id+"']").data("widget_type_id");
		$(".grid-stack-item[data-rawname=conferencespro][data-id='"+widget_id+"'] .invite-action").click(function(e){
			e.preventDefault();
			var adminable = $(".grid-stack-item[data-rawname=conferencespro][data-id='"+widget_id+"']").find(".conference-data").data("admin-allowed");
			UCP.showDialog(_("Invite to Conference"),
				'<label for="type">'+_("User Type")+'</label>'+
				'<select id="type" data-toggle="select" class="form-control"><option value="user">'+_("User")+'</option>'+(adminable ? '<option value="admin">'+_("Admin")+'</option>' : '')+'</select>'+
				'<label for="invite">'+_("Number")+':</label><input class="form-control" id="invite" multiple>',
				'<button class="btn btn-default" id="inviteConference">'+_("Invite")+'</button>',
				function() {
					var call = function(to, type) {
						if(to === "") {
							UCP.showAlert(_("Please enter a valid number!"),'danger');
							return;
						}
						$this.invite(conference, to, type);
						UCP.closeDialog();
					};
					$("#inviteConference").click(function() {
						call($("#invite").val(), $("#type").val());
					});
					$("#invite").keypress(function(event) {
						if (event.keyCode == 13) {
							call($("#invite").val(), $("#type").val());
						}
					});
				}
			);
		});
		$(".grid-stack-item[data-rawname=conferencespro][data-id='"+widget_id+"'] .conference-room.room .user-list tr .kick").click(function() {
			$this.kick($(".grid-stack-item[data-rawname=conferencespro][data-id='"+widget_id+"']"), $(this).parents("tr").data("channel"));
		});
		$(".grid-stack-item[data-rawname=conferencespro][data-id='"+widget_id+"'] .conference-room.room .user-list tr .muter").click(function() {
			$this.toggleMute($(".grid-stack-item[data-rawname=conferencespro][data-id='"+widget_id+"']"), $(this).parents("tr").data("channel"));
		});
		$(".grid-stack-item[data-rawname=conferencespro][data-id='"+widget_id+"'] .lock i").click(function() {
			$this.toggleLock($(".grid-stack-item[data-rawname=conferencespro][data-id='"+widget_id+"']"));
		});
	},
	displayWidgetSettings: function(widget_id, dashboard_id) {
		var $this = this;
		var conference = $("#widget_settings .widget-settings-content .conferencesettings").data("id");
		$('#widget_settings .widget-settings-content .conferencesettings input[type!=checkbox], .conferencesettings select').change(function() {
			$this.saveSettings(conference, { key: $(this).prop("name"), value: $(this).val() });
		});
		$('#widget_settings .widget-settings-content .conferencesettings input[type=checkbox]').change(function() {
			var val = "";
			if ($(this).is(":checked")) {
				val = $(this).val();
			}
			$this.saveSettings(conference, { key: $(this).prop("name"), value: val });
		});
	},
	prepoll: function(data) {
		var conferences = [];
		$(".grid-stack-item[data-rawname=conferencespro]").each(function() {
			conferences.push($(this).data("widget_type_id"));
		});
		return {
			websocket: (this.socket !== null && this.socket.connected),
			conferences: conferences
		};
	},
	poll: function(data, url) {
		var $this = this;
		if ((this.socket === null || !this.socket.connected) && data.status) {
			$(".grid-stack-item[data-rawname=conferencespro]").each(function() {
				var id = $(this).data("widget_type_id");
				if(typeof data.conferences[id] === "undefined" && $(this).find(".conference-room.room:visible").length) {
					$this.endRoom($(this));
				}
			});
			async.forEachOf(data.conferences, function (data, id, callback) {
				var widget = $(".grid-stack-item[data-rawname=conferencespro][data-widget_type_id="+id+"]"),
						appType = widget.find(".conference-room.room").data("type"),
						channels = [];

				widget.find(".statuses .lock span").text(data.Locked);
				widget.find(".statuses .marked span").text(data.Marked);
				widget.find(".statuses .users span").text(data.Parties);

				$this.startRoom(widget);

				$.each(data.users, function(i, v) {
					channels.push(v.ChannelClean);
					if (widget.find("[data-channel-clean=" + v.ChannelClean + "]").length) {
						$this.updateUser(widget, v.Channel, v.type);
					} else {
						$this.addUser(widget, v.Channel, v.CallerIDName, v.CallerIDNum, v.type, appType);
					}
				});
				$.each(widget.find(".user-list tr"), function() {
					if (jQuery.inArray( $(this).data("channel-clean"), channels ) < 0) {
						var chan  = $(this).data("channel-clean");
						$this.removeUser(widget, chan);
					}
				});

				callback();
			}, function (err) {
				if (err) console.error(err.message);

			});
		}
	},
	startRoom: function(widget) {
		if(!widget.find(".conference-room.room").is(":visible")) {
			widget.find(".conference-room.room").removeClass("hidden");
			widget.find(".conference-room.no-data").addClass("hidden");
		}
	},
	endRoom: function(widget) {
		if(widget.find(".conference-room.room").is(":visible")) {
			widget.find(".conference-room.room").addClass("hidden");
			widget.find(".conference-room.no-data").removeClass("hidden");
			widget.find(".conference-room.room table").html("");
			widget.find(".lock i").addClass("fa-unlock").removeClass("fa-lock");
			widget.find(".lock span").text(_("No"));
		}
	},
	updateTalk: function(widget, channel, talking) {
		var id = channel.replace(/[^a-z0-9\-]/ig, "");
		if (talking) {
			widget.find(".user-list tr[data-channel-clean=" + id + "]").data("talking", true);
			widget.find(".user-list tr[data-channel-clean=" + id + "] .talking i").removeClass("hidden");
		} else {
			widget.find(".user-list tr[data-channel-clean=" + id + "]").data("talking", false);
			widget.find(".user-list tr[data-channel-clean=" + id + "] .talking i").addClass("hidden");
		}
	},
	updateUser: function(widget, channel, type) {
		var id = channel.replace(/[^a-z0-9\-]/ig, "");
		var admin = widget.find(".user-list tr[data-channel-clean=" + id + "]").data("admin");
		widget.find(".user-list tr[data-channel-clean=" + id + "]").data("waiting", false);
		widget.find(".user-list tr[data-channel-clean=" + id + "]").data("muted", false);

		type = (type !== null) ? type : (admin ? 'admin' : '');

		switch (type) {
			case "waiting":
				widget.find(".user-list tr[data-channel-clean=" + id + "]").data("waiting", true);
				widget.find(".user-list tr[data-channel-clean=" + id + "] .muter").addClass("hidden");
				widget.find(".user-list tr[data-channel-clean=" + id + "] .muter .mute").addClass("muted");
				widget.find(".user-list tr[data-channel-clean=" + id + "] .user .fa-user").removeClass().addClass("fa fa-user fa-stack-1x muted");
				widget.find(".user-list tr[data-channel-clean=" + id + "] .talking i").addClass("hidden");
			break;
			case "muted":
				widget.find(".user-list tr[data-channel-clean=" + id + "]").data("muted", true);
				widget.find(".user-list tr[data-channel-clean=" + id + "] .muter").removeClass("hidden");
				widget.find(".user-list tr[data-channel-clean=" + id + "] .muter .mute").addClass("muted");
				widget.find(".user-list tr[data-channel-clean=" + id + "] .user .fa-user").removeClass().addClass("fa fa-user fa-stack-1x muted");

				//track the talking state when muted as Asterisk keeps the state
				//"true" until the channel is unlocked, meaning no talk monitoring
				//is done unitl after the user is unmuted, therefore the states stay
				//the same
				if(widget.find(".user-list tr[data-channel-clean=" + id + "]").data("talking")) {
					widget.find(".user-list tr[data-channel-clean=" + id + "] .talking i").addClass("hidden");
					widget.find(".user-list tr[data-channel-clean=" + id + "]").data("talking",true);
					this.wasTalking[id] = true;
				}
			break;
			case "admin":
				widget.find(".user-list tr[data-channel-clean=" + id + "]").data("admin", true);
				widget.find(".user-list tr[data-channel-clean=" + id + "] .muter").removeClass("hidden");
				widget.find(".user-list tr[data-channel-clean=" + id + "] .muter .mute").removeClass("muted");
				widget.find(".user-list tr[data-channel-clean=" + id + "] .user .fa-user").removeClass().addClass("fa fa-user fa-stack-1x admin");
			break;
			default:
				widget.find(".user-list tr[data-channel-clean=" + id + "] .muter").removeClass("hidden");
				widget.find(".user-list tr[data-channel-clean=" + id + "] .muter .mute").removeClass("muted");
				if (widget.find(".user-list tr[data-channel-clean=" + id + "]").data("admin")) {
					widget.find(".user-list tr[data-channel-clean=" + id + "] .user .fa-user").removeClass().addClass("fa fa-user fa-stack-1x admin");
				} else {
					widget.find(".user-list tr[data-channel-clean=" + id + "] .user .fa-user").removeClass().addClass("fa fa-user fa-stack-1x");
				}
				//Part of talking tracking
				if(typeof this.wasTalking[id] !== "undefined" && $("#" + id + " .talking i").hasClass("hidden")) {
					widget.find(".user-list tr[data-channel-clean=" + id + "] .talking i").removeClass("hidden");
					delete(this.wasTalking[id]);
				}
			break;
		}
	},
	addUser: function(widget, channel, cnam, cnum, type, appType) {
		var $this = this,
				kick = (appType == "app_confbridge") ? "<td><i class=\"fa fa-times kick\"></i></td>" : "",
				id = channel.replace(/[^a-z0-9\-]/ig, ""),
				displayname = '';

		// added for bringing callerid from the bridged channel. if the connected  conference channel's callerid is invalid eg:Conf: (\XXX conference room)
		//FREEPBX-14512 UCP Conference "INVITE Contact"
		var thisRegex = new RegExp(/^Conf:/i);
		if(thisRegex.test(cnam)) {
			//its call with invalid callerid So read the dialed number from channel Local/{dialed_no}@xxxx
			cnam = channel.substr(6).split('@')[0];
			cnum = _('Outbound Call');
		}
		displayName = (cnam != cnum) ? cnam + " &lt;" + cnum + "&gt;" : cnum;

		widget.find(".conference-room.room table").append(
			'<tr data-channel-clean="' + id +'"  data-admin="' + ((type == "admin") ? "true" : "false") + '" data-channel="' + encodeURIComponent(channel) + '" data-muted="'+((type == "muted") ? "true" : "false")+'" data-waiting="'+((type == "waiting") ? "true" : "false")+'" data-talking="false">' +
			'<td class="user"><span class="fa-stack"><i class="fa fa-user fa-stack-1x ' + ((type == "waiting") ? "muted" : type) + '"></i></td>' +
			'<td class="talking"><i class="fa fa-volume-up hidden"></i></td>' +
			'<td>'+ displayName + '</td>' +
			'<td><span class="fa-stack muter ' + ((type == "waiting") ? "hidden" : "") + '"><i class="fa fa-volume-off fa-stack-1x"></i><i class="fa fa-fw fa-ban fa-stack-1x mute '+((type == "muted") ? "muted" : "")+'"></i></span></td>' +
			'<td><span class="fa-stack '+((appType == "app_meetme") ? "hidden" : "")+'"><i class="fa fa-fw fa-times fa-stack-1x kick"></i></span></td>' +
			'</tr>');

		widget.find(".conference-room.room .user-list tr[data-channel-clean='"+id+"'] .kick").click(function() {
			$this.kick(widget, encodeURIComponent(channel));
		});
		widget.find(".conference-room.room .user-list tr[data-channel-clean='"+id+"'] .muter").click(function() {
			$this.toggleMute(widget, encodeURIComponent(channel));
		});
		var count = widget.find(".statuses .users span").text();
		count = parseInt(count) + 1;
		widget.find(".statuses .users span").text(count);
	},
	removeUser: function(widget, channel) {
		var id = channel.replace(/[^a-z0-9\-]/ig, "");
		widget.find(".user-list tr[data-channel-clean=" + id + "]").remove();
		if(!widget.find(".user-list tr").length) {
			this.endRoom(widget);
		}
		var count = widget.find(".statuses .users span").text();
		count = parseInt(count) - 1;
		widget.find(".statuses .users span").text(count);
	},
	sendEvent: function(key, value) {
		if (this.socket !== null && this.socket.connected) {
			this.socket.emit(key, value);
		}
	},
	toggleLock: function(widget) {
		if(widget.find(".conference-room.no-data").is(":visible")) {
			UCP.showAlert(_("Conference room is not active so it can not be locked"));
			return;
		}
		var mode = !widget.find(".conference-data").data("locked"),
				$this = this;
		if (this.socket !== null && this.socket.connected) {
			this.sendEvent("lock", {
				conference: widget.data("widget_type_id"),
				enable: mode
			});
		} else {
			$.post( UCP.ajaxUrl+"?module=conferencespro&command=lock", { conference: conference }, function( data ) {
				widget.find(".conference-data").data("locked",mode);
				if (mode) {
					widget.find(".lock i").removeClass("fa-unlock").addClass("fa-lock");
					widget.find(".lock span").text(_("Yes"));
				} else {
					widget.find(".lock i").addClass("fa-unlock").removeClass("fa-lock");
					widget.find(".lock span").text(_("No"));
				}
			});
		}
	},
	toggleMute: function(widget, channel) {
		var mode = !widget.find(".user-list tr[data-channel='" + channel + "']").data("muted"),
				conference = widget.data("widget_type_id"),
				$this = this;
		if (this.socket !== null && this.socket.connected) {
			this.sendEvent("mute", {
				conference: conference,
				channel: decodeURIComponent(channel),
				enable: mode
			});
		} else {
			var command = (mode) ? "mute" : "unmute";
			$.post( UCP.ajaxUrl+"?module=conferencespro&command="+command, { channel: decodeURIComponent(channel), conference: conference }, function( data ) {
				$this.updateUser(widget, decodeURIComponent(channel), (mode ? "muted" : null));
			});
		}
	},
	kick: function(widget, channel) {
		var $this = this;
		if (this.socket !== null && this.socket.connected) {
			this.sendEvent("kick", {
				conference: widget.data("widget_type_id"),
				channel: decodeURIComponent(channel)
			});
		} else {
			$.post( UCP.ajaxUrl+"?module=conferencespro&command=kick", { channel: decodeURIComponent(channel), conference: widget.data("widget_type_id") }, function( data ) {
				$this.removeUser(widget, decodeURIComponent(channel));
			});
		}
	},
	saveSettings: function(conference, data) {
		var $this = this;
		data.conference = conference;
		$.post( UCP.ajaxUrl+"?module=conferencespro&command=settings", data, function( data ) {
			if(data.alert == 'success'){
				$(".conferencesettings #message").text(data.message).removeClass("alert-danger");
			}
			$(".conferencesettings #message").text(data.message).addClass("alert-" + data.alert).fadeIn("fast", function() {
				$(this).delay(5000).fadeOut("fast");
			});
		});
	},
	invite: function(conference, invite, type) {
		$.post( UCP.ajaxUrl+"?module=conferencespro&command=invite", { channel: invite, conference: conference, type: type }, function( data ) {

		});
	},
	subscribe: function(conference) {
		if(this.subscribed.indexOf(conference) === -1) {
			this.sendEvent("subscribe", conference);
			this.subscribed.push(conference);
		}
	},
	unsubscribe: function(conference) {
		this.sendEvent("unsubscribe", conference);
		var index = this.subscribed.indexOf(conference);
		if(index > -1) {
			this.subscribed.splice(index, 1);
		}
	},
	disconnect: function() {
		var $this = this,
				listeners = [ "disconnect",
													"connect",
													"list",
													"lock",
													"mute",
													"join",
													"leave",
													"starting",
													"ending",
													"talking" ];
		if (this.socket !== null) {
			$.each(listeners, function(i, v) {
				$this.socket.removeAllListeners(v);
			});
			this.subscribed = [];
		}
	},
	connect: function() {
		var $this = this;
		try {
			UCP.wsconnect("conferences", function(socket) {
				if (socket === false) {
					$this.socket = null;
					return false;
				} else {
					$this.socket = socket;

					$(".grid-stack-item[data-rawname=conferencespro]").each(function() {
						var conference = $(this).data("widget_type_id");
						$this.subscribe(conference);
					});

					$this.socket.on("list", function(conf) {
						if (conf.status) {
							var widget = $(".grid-stack-item[data-rawname=conferencespro][data-widget_type_id='"+conf.conference+"']");
							if(!widget.length) {
								//TODO: unsubscribe it's not here!
								return;
							}

							widget.find(".conference-data").data("locked",conf.locked);
							if(conf.locked) {
								widget.find(".lock i").removeClass("fa-unlock").addClass("fa-lock");
								widget.find(".lock span").text(_("Yes"));
							} else {
								widget.find(".lock i").addClass("fa-unlock").removeClass("fa-lock");
								widget.find(".lock span").text(_("No"));
							}

							if(Object.keys(conf.users).length) {
								$this.startRoom(widget);
							}

							$.each(conf.users, function(i, u) {
								var type = "user";
								if( Array.isArray(u) == false) {
									return;
								}
								if (u.admin) {
									type = "admin";
								} else if (u.waiting) {
									type = "waiting";
								}
								if (u.muted) {
									type = "muted";
								}
								$this.updateUser(widget, u.channel, type);
								$this.updateTalk(widget, u.channel, u.talking);
							});
						}
					});
					$this.socket.on("mute", function(data) {
						var widget = $(".grid-stack-item[data-rawname=conferencespro][data-widget_type_id='"+data.conference+"']");
						if(!widget.length) {
							//TODO: unsubscribe it's not here!
							return;
						}
						$this.updateUser(widget, data.channel, (data.enabled ? "muted" : null));
					});
					$this.socket.on("lock", function(data) {
						var widget = $(".grid-stack-item[data-rawname=conferencespro][data-widget_type_id='"+data.conference+"']");
						if(!widget.length) {
							//TODO: unsubscribe it's not here!
							return;
						}
						widget.find(".conference-data").data("locked",data.enabled);
						if (data.enabled) {
							widget.find(".lock i").removeClass("fa-unlock").addClass("fa-lock");
							widget.find(".lock span").text(_("Yes"));
						} else {
							widget.find(".lock i").addClass("fa-unlock").removeClass("fa-lock");
							widget.find(".lock span").text(_("No"));
						}
					});
					$this.socket.on("join", function(data) {
						var widget = $(".grid-stack-item[data-rawname=conferencespro][data-widget_type_id='"+data.conference+"']");
						if(!widget.length) {
							//TODO: unsubscribe it's not here!
							return;
						}
						$this.addUser(widget, data.channel, data.calleridname, data.calleridnum, (data.admin == "Yes" ? 'admin' : 'user'));
						//have to ask for the list because we don't get user state on join
						$this.sendEvent("list", data.conference);
					});
					$this.socket.on("leave", function(data) {
						var widget = $(".grid-stack-item[data-rawname=conferencespro][data-widget_type_id='"+data.conference+"']");
						if(!widget.length) {
							//TODO: unsubscribe it's not here!
							return;
						}
						$this.removeUser(widget, data.channel);
					});
					$this.socket.on("starting", function(data) {
						$this.sendEvent("list", data.conference);
					});
					$this.socket.on("ending", function(data) {
						var widget = $(".grid-stack-item[data-rawname=conferencespro][data-widget_type_id='"+data.conference+"']");
						if(!widget.length) {
							//TODO: unsubscribe it's not here!
							return;
						}
					});
					$this.socket.on("talking", function(data) {
						var widget = $(".grid-stack-item[data-rawname=conferencespro][data-widget_type_id='"+data.conference+"']");
						if(!widget.length) {
							//TODO: unsubscribe it's not here!
							return;
						}
						$this.updateTalk(widget, data.channel, data.enabled);
					});
				}
			});
		}catch (err) {}
	}
});


$(document).on("post-body.widgets", function(event, widget_id, dashboard_id) {
	if(widget_id === null && typeof UCP.Modules.Conferencespro !== "undefined" && UCP.Modules.Conferencespro.socket !== null) {
		var Conferencespro = UCP.Modules.Conferencespro;
		if(UCP.Modules.Conferencespro.subscribed.length) {
			$.each(UCP.Modules.Conferencespro.subscribed, function(k,v) {
				Conferencespro.unsubscribe(v);
			});
		}
		//dashboard finished loading
		$(".grid-stack-item[data-rawname=conferencespro]").each(function() {
			var conference = $(this).data("widget_type_id");
			Conferencespro.subscribe(conference);
		});
	}
});
