/**
 * Documentation https://wiki.freepbx.org/pages/viewpage.action?pageId=71271742
 * @type {[type]}
 */
var ZuluC = UCPMC.extend({
	init: function(){
		if(typeof Cookies === "undefined") {
			return;
		}
		var $this = this;
		this.connected = false;
		this.config = {}
		this.uuid = null

		this.phone = null;
		this.activeCalls = {};
		this.activeCallId = null;
		this.answering = false;
		this.userBlocked = false;
		this.silenced = false;
		this.autoRegister = false;
		this.displayState = null;
		this.state = null;
		this.timerObject = null;
		this.contacts = null;
		this.interactions = null;
		this.publicInteractions = null;
		this.token = null;
		this.myName = null;
		this.simpleWidgetIDContacts = null;
		this.simpleWidgetIDRooms = null;
		this.errorZuluServer = false;
		this.authenticationFailed = false;
		this.zuluAccess = true;
		this.callBinds = [
			"progress",
			"accepted",
			"rejected",
			"failed",
			"terminated",
			"cancel",
			"refer",
			"replaced",
			"dtmf",
			"muted",
			"unmuted",
			"bye",
			"addStream"
		];

		this.callOptions = {
			"media": {
				"constraints": {
					"audio": true,
					"video": false
				},
				"render": {
					"remote": null
				}
			}
		};

		this.notification = null;
		var st = Cookies.get("zulu-silenced");
		st = (st === "1") ? true : false;
		this.silence(st);

		var rg = Cookies.get("zulu-register");
		this.autoRegister = (typeof rg === "undefined" || rg === "1") ? true : false;


		this.zuluSocket = null
		this.credentials = {
			token: null
		}

		$(document).ajaxError(function( event, request, settings ) {
			UCP.showAlert("Error requesting page " + settings.url,'danger');
		});

		$(document).on("post-body.simplewidgetsettings", function(event, widget_id) {
			if(widget_id === 'user') {
				$("#zulu-gen-qr").click(function() {
					var self = this
					$(self).prop("disabled",true);
					$(self).text(_("Generating..."));
					$.post( UCP.ajaxUrl+'?module=zulu&command=generateQR',"json")
					.done(function(data) {
						if(data.status) {
							$("#zulu-qr-code").html(data.qrcode);
						} else {
							UCP.showAlert(data.message,'warning')
							$(self).prop("disabled",false);
							$(self).text(_('Generate QR Code'));
						}
					})
				});
				$("input[name='zulu_enable_callStatus']").change(function() {
					$this.setCallStatus($(this).val()).then(() => {})
					.catch(err => {
						 UCP.showAlert(err,'danger')
					})
				});
			}
		});

		//event for chat window added to screen
		// https://wiki.freepbx.org/pages/viewpage.action?pageId=71271742#DevelopingforUCP14+-chatWindowAdded
		$(document).on("chatWindowAdded", function(event, windowId, module, object) {
			if (module == "Zulu") {
				object.on("click", function() {
					object.find(".title-bar").css("background-color", "");
				});
				var from = object.data("from"),
				to = object.data("to"),
				cwindow = $(".message-box[data-id=\"" + windowId + "\"] .window");
				var ea = object.find("textarea").emojioneArea()[0].emojioneArea;
				ea.on("keyup", function(editor, event) {
					if (event.keyCode == 13) {
						//$(".message-box[data-id=\"" + windowId + "\"] .response .emojionearea-editor").addClass("hidden");
						var interactionId = cwindow.data('interaction-id')
						var text = ea.getText()
						var chatCommand = {
							id: Math.random(),
							command: 'push',
							type: 'sendMessage',
							text: text,
							interactionId: interactionId
						}
						$(".message-box[data-id='" + windowId + "'] textarea").val("");
						ea.setText(" ");
						$(".message-box[data-id='" + windowId + "'] .response-status").html(_("Sending..."));
						$this.socketSendJSON(chatCommand)
						//$(".message-box[data-id=\"" + windowId + "\"] .response .emojionearea-editor").removeClass("hidden");
						//$(".message-box[data-id=\"" + windowId + "\"] .response .emojionearea-editor").focus();
					}
				});
			}
		});
	},
	startChat: function() {

	},
	/**
	 * This method is called when a client logs in to UCP
	 * Username and Password are only populated on inital login
	 * refreshes after login will have username and password as null
	 * @method
	 * @param  {[type]} username [description]
	 * @param  {[type]} password [description]
	 * @return {[type]}          [description]
	 */
	connect: function(username, password) {
		if(typeof Cookies === "undefined") {
			return;
		}
		var $this = this
		$.post( UCP.ajaxUrl+'?module=zulu&command=generateTempZuluToken',"json")
		.done(function(data) {
			if(data.status) {
				$this.login(data.token)
			} else {
				$this.zuluAccess = false
			}
		})
	},
	/**
	 * This method is called when the browser detects no internet connection
	 * @method
	 * @return {[type]} [description]
	 */
	disconnect: function() {
		if(typeof Cookies === "undefined") {
			return;
		}
		if (this.phone !== null &&
				this.phone.isConnected()) {
			this.phone.stop();
		}
	},
	displaySimpleWidgetSettings: function(widget_id) {
		var $this = this;
		switch(widget_id) {
			case "phone":
				var st = Cookies.get("zulu-silenced");
				st = (st === "1") ? true : false;

				$("#zulu-silence-switch").prop("checked",st);

				$("#zulu-silence-switch").bootstrapToggle('destroy');
				$("#zulu-silence-switch").bootstrapToggle({
					on: _("Enable"),
					off: _("Disable")
				});

				$("#zulu-disconnect-switch").prop("checked",!this.autoRegister);

				$("#zulu-disconnect-switch").bootstrapToggle('destroy');
				$("#zulu-disconnect-switch").bootstrapToggle({
					on: _("Enable"),
					off: _("Disable")
				});

				if(this.phone === null) {
					$("#zulu-silence-switch").bootstrapToggle('disable');
					$("#zulu-disconnect-switch").bootstrapToggle('disable');
					return;
				}

				$("#zulu-silence-switch").change(function() {
					$this.silence();
				});
				$("#zulu-disconnect-switch").change(function(e) {
					$this.toggleRegister();
				});
			break;
			case "chatlist":
			case "roomList":
			break;
		}
	},
	chatWindowBinds: function(cwindow,windowid, contactid) {
		var cwindow = $(".message-box[data-id=\"" + windowid + "\"] .window");
		cwindow.data('interaction-id', windowid)
		cwindow.data('interaction-to', contactid)
		console.log('bound');
	},
	/**
	 * https://wiki.freepbx.org/pages/viewpage.action?pageId=71271742#DevelopingforUCP14+-displaySimpleWidget
	 * @method
	 * @param  {[type]} widget_id [description]
	 * @return {[type]}           [description]
	 */
	displaySimpleWidget: function(widget_id) {
		var $this = this;
		var widget = $(".custom-widget[data-widget_id='"+widget_id+"']");
		switch(widget.data("widget_type_id")) {
			case "chatList":
				$this.simpleWidgetIDContacts = widget_id;
				var contentBox = $(".widget-extra-menu[data-id='"+widget_id+"'] .small-widget-content")
				if(!this.zuluAccess) {
					contentBox.append("<div data-id='zulu-error'>User does not have access to Zulu</div>")
				}
				else if(this.errorZuluServer) {
					contentBox.append("<div data-id='zulu-error'>Websocket connection to zulu failed</div>")
				}
				else if(this.authenticationFailed) {
					contentBox.append("<div data-id='zulu-error'>Failed zulu authentication</div>")
				}
				else if(this.contacts) {
					this.displayContacts().then(() => {
					})
					.catch(err => {
						UCP.showAlert(err,'danger')
					})
				} else {
					contentBox.append("<div data-id='loading'>Loading...</div>")
				}
			break;
			case "roomList":
				$this.simpleWidgetIDRooms = widget_id;
				var contentBox = $(".widget-extra-menu[data-id='"+widget_id+"'] .small-widget-content")
				if(!this.zuluAccess) {
					contentBox.append("<div data-id='zulu-error'>User does not have access to Zulu</div>")
				}
				else if(this.errorZuluServer) {
					contentBox.append("<div data-id='zulu-error'>Websocket connection to zulu failed</div>")
				}
				else if(this.authenticationFailed) {
					contentBox.append("<div data-id='zulu-error'>Failed zulu authentication</div>")
				}
				else if(this.interactions && this.publicInteractions) {
					this.displayRooms().then(() => {
					})
					.catch(err => {
						UCP.showAlert(err,'danger')
					})
				} else {
					contentBox.append("<div data-id='loading'>Loading...</div>")
				}
			break;
			case "phone":
				var contentBox = $(".widget-extra-menu[data-id='"+widget_id+"'] .small-widget-content")
				if(!this.zuluAccess) {
					contentBox.append("<div data-id='zulu-error'>User does not have access to Zulu</div>")
				} else {
					$("#menu_zulu_phone .status span").text(this.displayState);

					if(this.phone === null) {
						$("#menu_zulu_phone input.dialpad").prop("disabled",true);
						return;
					}

					if(this.state == "hold") {
						this.switchState('accepted');
						this.switchState('hold');
					} else {
						this.switchState(this.state);
					}

					if(typeof this.phone === "object" && this.phone !== null && this.phone.isRegistered()) {
						$("#menu_zulu_phone .action").prop("disable",false);
					}

					$("#menu_zulu_phone .keypad td").click(function() {
						var text = $("#menu_zulu_phone .dialpad").val() + $(this).data("num"),
							button = $("#menu_zulu_phone button.action");
						if ($this.state == "registered" || $this.state == "accepted") {
							if ($this.state == "registered") {
								$( "#menu_zulu_phone .message").text("To: " + text);
							}
							$("#menu_zulu_phone .dialpad").val(text);
							$this.DTMF($(this).data("num"));
							button.prop("disabled", false);
							$("#menu_zulu_phone .message-container").textfill();
						}
					});

					$("#menu_zulu_phone .clear-input").click(function() {
						var button = $("#menu_zulu_phone button.action");
						$("#menu_zulu_phone .dialpad").val("");
						if ($this.state == "registered") {
							$( "#menu_zulu_phone .message").text("");
							button.prop("disabled", true);
						}
					});
					$("#menu_zulu_phone .dialpad").on('keyup paste', function() {
						var button = $("#menu_zulu_phone button.action"),
							text = $("#menu_zulu_phone .dialpad").val();
						if ($(this).val().length === 0 && ($this.state == "accepted" || $this.state == "registered")) {
							$( "#menu_zulu_phone .message").text("");
							button.prop("disabled", true);
						} else {
							$( "#menu_zulu_phone .message").text("To: " + text);
							$this.DTMF(text.slice(-1));
							button.prop("disabled", false);
						}
						$("#menu_zulu_phone .message-container").textfill();
					});
					$("#menu_zulu_phone button.action").click(function() {
						switch ($this.state) {
							case "registered":
								$this.call($("#menu_zulu_phone .dialpad").val());
							break;
							case "hold":
							case "accepted":
								$this.hangup();
							break;
							case "invite":
								$this.answer();
							break;
						}
					});
					$("#menu_zulu_phone button.secondaction").click(function() {
						switch ($this.state) {
							case "hold":
							case "accepted":
								$this.toggleHold();
							break;
							case "invite":
								$this.hangup();
							break;
						}
					});
					$("#menu_zulu_phone .message-container").textfill();
				}
			break;
		}
	},
	/**
	 * Widget is deletec
	 * @method
	 * @param  {[type]} widget_id [description]
	 * @return {[type]}           [description]
	 */
	deleteSimpleWidget: function(widget_id) {
		if($(".custom-widget[data-widget_id='"+widget_id+"']").data("widget_type_id") === "phone" && this.phone !== null) {
			this.disconnect();
		}
	},
	connectPhone: function() {
		if ((typeof this.staticsettings !== "undefined") &&
				this.staticsettings.enabled &&
				Modernizr.getusermedia &&
				this.phone !== null &&
				!this.phone.isConnected()) {
			this.phone.start();
		}
	},
	login: function(token) {
		this.credentials.token = token
		//do websocket login here
		this.zuluSocket = new WebSocket("wss://"+window.location.host.split(':')[0]+":8002");
		this.zuluSocket.onopen = this.socketOpen.bind(this)
		this.zuluSocket.onmessage = this.socketOnmessage.bind(this)
		this.zuluSocket.onclose = this.socketOnclose.bind(this)
		this.zuluSocket.onerror = this.socketOnerror.bind(this)
	},
	getContacts: function() {
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "https://" + window.location.host.split(':')[0] + ":8002/api/contact",
				type: "GET",
				headers: {
					'X-Auth-Token': this.token
				}
			})
			.done(function(data) {
				return resolve(data)
			})
		});
	},
	getInteractions: function() {
		return new Promise((resolve, reject) => {
	                $.ajax({
				url: "https://" + window.location.host.split(':')[0] + ":8002/api/v2/interaction",
		        	type: "GET",
		        	headers: {
					'X-Auth-Token': this.token
			        }
		        })
		        .done(function(data) {
				return resolve(data.rows);
			})
		})
	},
	getPublicInteractions: function() {
		return new Promise((resolve, reject) => {
			$.ajax({
				url: "https://" + window.location.host.split(':')[0] + ":8002/api/interaction/group/public",
				type: "GET",
				headers: {
					'X-Auth-Token': this.token
				}
			})
			.done(function(data) {
				return resolve(data)
			})
		})
	},
	createInteraction: function(contactID) {
		return new Promise((resolve, reject) => {
			var data = {
				'members' : {
					'contact': [contactID]
				}
			}
			$.ajax({
				url: "https://" + window.location.host.split(':')[0] + ":8002/api/interaction/interaction",
				type: "POST",
				headers: {
					'X-Auth-Token': this.token
				},
				data: JSON.stringify(data),
				contentType: "application/json",
				dataType: "json"
			})
			.done(function(interaction) {
				return resolve(interaction.id)
			})
		})
	},
	setCallStatus: function(value) {
		return new Promise((resolve, reject) => {
			if(value === 'true') {
				value = true
			} else if(value === 'false') {
				value = false
			} else if(value !== 'inherit' && value !== 'callerid') {
				return reject(new Error('Invalid parameter value'))
			}
			data = {
				'enable_callStatus': value
			}
			$.ajax({
				url: "https://" + window.location.host.split(':')[0] + ":8002/api/user/callstatus",
				type: "PUT",
				headers: {
					'X-Auth-Token': this.token
				},
				data: JSON.stringify(data),
				contentType: "application/json",
				dataType: "json"
			})
			.done(function(result) {
				if(result.status === true) {
					return resolve()
				} else {
					return reject(new Error(result.message))
				}
			})
		})
	},
	joinRoom: function(interactionid) {
		return new Promise((resolve, reject) => {
			let interaction = this.interactions.find(o => o.id === interactionid)
			if(interaction) {
				return resolve()
			} else {
				$.ajax({
					url: "https://" + window.location.host.split(':')[0] + ":8002/api/interaction/" + interactionid + "/member",
					type: "POST",
					headers: {
						'X-Auth-Token': this.token
					},
					contentType: "application/json",
					dataType: "json"
				})
				.done(function(data) {
					if(data.status) {
						return resolve()
					} else{
						return reject(new Error(data.message))
					}
				})
			}
		})
	},
	getDisplayName: function(contactuuid) {
		return new Promise((resolve, reject) => {
			var displayName = ''
			var found = false
			async.each(this.contacts, function(contact, callback) {
				if(contact.id === contactuuid) {
					displayName = contact.displayName
					found = true
				}
				callback()
			}, function(err) {
				if(err) {
					return reject(err)
				}
				else {
					if(found) {
						return resolve(displayName)
					}
					else {
						return resolve(null)
					}
				}
			})
		})
	},
	getInteractionID: function(contactuuid) {
		return new Promise((resolve, reject) => {
			var interactionID = null
			async.each(this.interactions, function(interaction, callback) {
				if(interaction.contacts[0] === contactuuid && interaction.type === 'direct') {
					interactionID = interaction.id
				}
				callback()
			}, function(err) {
				if(err) {
					return reject(err)
				}
				else {
					return resolve(interactionID)
				}
			})
		})
	},
	displayContacts: function(contactname='') {
		var $this = this;
		return new Promise((resolve, reject) => {
			if(!$this.simpleWidgetIDContacts) {
				return resolve()
			}
			var contentBox = $(".widget-extra-menu[data-id='"+$this.simpleWidgetIDContacts+"'] .small-widget-content")
			if($("div[data-id='loading']").length) {
				$(".widget-extra-menu[data-id='"+$this.simpleWidgetIDContacts+"'] .small-widget-content div[data-id='loading']").remove()
			}
			if($("div[data-id='zulu-error']").length) {
				$(".widget-extra-menu[data-id='"+$this.simpleWidgetIDContacts+"'] .small-widget-content div[data-id='zulu-error']").remove()
			}
			if(!$("div[data-id='searchBox']").length) {
				contentBox.append('<div data-id="searchBox"><input type="text" class="zulu-search"></div>')
				$('.zulu-search').on('input', function() {
					$('.zulu-contact').remove()
					$this.displayContacts($(this).val()).then(() => {})
					.catch(err => {
						UCP.showAlert(err,'danger')
					})
				})
			}
			contactname = contactname.toLowerCase()
			async.each($this.contacts, function(contact, callback) {
				let searchName = contact.displayName.toLowerCase()
				if(contact.id !== $this.uuid && ((contactname !== '' && searchName.includes(contactname)) || (contactname === '' && contact.chatConnected))) {
					let style = ''
					if(contact.chatConnected) {
						style = 'style="color:green"'
					}
					contentBox.append('<div data-id="'+contact.id+'" data-name="'+contact.displayName
					+'" class="zulu-contact clickable"><i class="fa fa-user" '+style+'></i> '+contact.displayName+'</div>')
				}
				callback()
			}, function(err) {
				if(err) {
					return reject(err)
				} else {
					$(document).off("click",".zulu-contact");
					$(document).on("click",".zulu-contact",function() {
						console.log("Load ucpchat for user "+$(this).data('id'))
						var contactid = $(this).data('id');
						$this.getInteractionID(contactid).then((interactionid) => {
							if(interactionid === null) {
								return $this.createInteraction(contactid)
							}
							else {
								return Promise.resolve(interactionid)
							}
						})
						.then((interactionid) => {
							var windowid = interactionid
							UCP.addChat(
								'Zulu',
								windowid,
								'fa fa-comments',
								$this.myName,
								$(this).data('name'),
								$(this).data('name'),
								undefined,
								undefined,
								function() {
									var cwindow = $(".message-box[data-id=\"" + windowid + "\"] .window");
									$this.chatWindowBinds(cwindow, windowid, contactid)
								}
							)
						}).catch((err) => {
							UCP.showAlert(err,'danger')
						})
					})
					return resolve()
				}
			})
		})
	},
	displayRooms: function(roomname='') {
		var $this = this;
		return new Promise((resolve, reject) => {
			if(!$this.simpleWidgetIDRooms) {
				return resolve()
			}
			var contentBox = $(".widget-extra-menu[data-id='"+$this.simpleWidgetIDRooms+"'] .small-widget-content")
			if($("div[data-id='loading']").length) {
				$(".widget-extra-menu[data-id='"+$this.simpleWidgetIDRooms+"'] .small-widget-content div[data-id='loading']").remove()
			}
			if($("div[data-id='zulu-error']").length) {
				$(".widget-extra-menu[data-id='"+$this.simpleWidgetIDRooms+"'] .small-widget-content div[data-id='zulu-error']").remove()
			}
			if(!$("div[data-id='searchRoom']").length) {
				contentBox.append('<div data-id="searchRoom"><input type="text" class="zulu-roomSearch"></div>')
				$('.zulu-roomSearch').on('input', function() {
					$('.zulu-room').remove()
					$this.displayRooms($(this).val()).then(() => {})
					.catch(err => {
						UCP.showAlert(err,'danger')
					})
				})
			}
			roomname = roomname.toLowerCase()
			let loop
			if(roomname !== '') {
				loop = $this.interactions.concat($this.publicInteractions)
			} else {
				loop = $this.interactions
			}
			async.each(loop, function(interaction, callback) {
				let interactionTopic = (interaction.topic) ? interaction.topic.toLowerCase() : ''
				if(interaction.type !== 'direct' && ((roomname !== '' && interactionTopic.includes(roomname)) || (roomname === ''))) {
					let icon
					let style
					let objInteraction = $this.interactions.find(o => o.id === interaction.id)
					if(objInteraction) {
						style = 'style="color:green"'
					}
					if(interaction.type === 'public') {
						icon = '<i class="fa fa-hashtag"></i>'
					} else {
						icon = '<i class="fa fa-lock"></i>'
					}
					if(!$(".zulu-room[data-id='"+interaction.id+"']").length) {
			                	contentBox.append('<div data-id="'+interaction.id+'" data-name="'+interaction.topic
							+'" class="zulu-room clickable"><i class="fa fa-users" ' + style + '></i> '+interaction.topic+' ' + icon +'</div>')
					}
				}
			        callback()
			}, function(err) {
				if(err) {
					return reject(err)
			        } else {
					$(document).off("click",".zulu-room");
					$(document).on("click",".zulu-room",function() {
						let interactionid = $(this).data('id');
						$this.joinRoom(interactionid).then(() => {
							if($(".zulu-room[data-id='"+interactionid+"']").length) {
								$("div[data-id='"+interactionid+"'] i.fa-users").css('color', 'green')
							}
							var windowid = interactionid
							UCP.addChat(
								'Zulu',
								windowid,
								'fa fa-comments',
								$this.myName,
								$(this).data('name'),
								$(this).data('name'),
								undefined,
								undefined,
								function() {
									var cwindow = $(".message-box[data-id=\"" + windowid + "\"] .window");
									$this.chatWindowBinds(cwindow, windowid, null)
								}
							)
						}).catch((err) => {
							UCP.showAlert(err,'danger')
						})
					})
					return resolve()
				}
			})
		})
	},
	displayError: function(errMessage) {
		if(this.simpleWidgetIDContacts) {
			var contentBox = $(".widget-extra-menu[data-id='"+this.simpleWidgetIDContacts+"'] .small-widget-content")
			contentBox.append("<div data-id='zulu-error'>"+errMessage+"</div>")
		}
	},
	socketOpen: function(event) {
		let loginCommand = {
			command: 'login',
			data: {
				token: this.credentials.token,
				auth: "token",
				lastconnected: null,
				clientversion: "3.1",
				clienttype: "ucp"
			}
		}

		return this.socketSendJSON(loginCommand)
	},
	socketOnmessage: function(event) {
		var data = JSON.parse(event.data)
		var $this = this
		if(!this.connected && typeof data.type !== 'undefined' && data.type == "auth") {
			this.connected = true;
			this.config = data.config
			this.token = data.token
			this.uuid = data.uuid
			this.getContacts().then((contacts) => {
				this.contacts = contacts;
				return this.getInteractions();
			})
			.then((interactions) => {
				this.interactions = interactions;
				return this.getPublicInteractions();
			})
			.then((publicInteractions) => {
				this.publicInteractions = publicInteractions;
				return this.getDisplayName(this.uuid);
			})
			.then((displayName) => {
				this.myName = (displayName === null) ? '' : displayName;
				return this.displayContacts();
			})
			.then(() => {
				return this.displayRooms()
			})
			.catch((err) => {
				UCP.showAlert(err,'danger')
			});
			return
		}
		if(this.connected && data.subscription === 'stream' && data.data.add.type === 'CHAT_MESSAGE') {
			//HERE YOU RECEIVE A NEW STREAM NOTIFICATION
			var direction = (data.data.add.contact !== this.uuid) ? 'in' : 'out';
			var cname = null
			var windowid = data.data.add.interaction_id
			this.getDisplayName(data.data.add.contact).then((displayName) => {
				if(displayName === null) {
					return this.getContacts()
				} else {
					cname = displayName
					return Promise.resolve(this.contacts)
				}
			})
			.then((contacts) => {
				this.contacts = contacts
				if(cname === null) {
					return this.getDisplayName(data.data.add.contact)
				}
			        else {
					return Promise.resolve(cname)
				}
			})
			.then((displayName) => {
				let objInteraction = this.interactions.find(o => o.id === data.data.add.interaction_id)
				if(objInteraction) {
					let name
					let text
					let notificationText
					let contactName = (displayName === null) ? 'Unknown' : displayName
					if(objInteraction.type === 'direct') {
						name = contactName
						text = emojione.shortnameToImage(data.data.add.body.text)
						notificationText = emojione.unifyUnicode(data.data.add.body.text)
					} else {
						name = objInteraction.topic
						if(direction === 'in') {
							text = "<b>" + contactName + ":</b> " + emojione.shortnameToImage(data.data.add.body.text)
						} else {
							text = emojione.shortnameToImage(data.data.add.body.text)
						}
						notificationText = contactName + ": " + emojione.unifyUnicode(data.data.add.body.text)
					}
					var Notification = new Notify(sprintf(_("New Message from %s"), name), {
						body: notificationText,
						icon: "modules/Sms/assets/images/comment.png",
						timeout: 3
					});

					if(direction === 'out') {
						$(".message-box[data-id='" + windowid + "'] .response-status").html("");
					}

					//https://wiki.freepbx.org/pages/viewpage.action?pageId=71271742#DevelopingforUCP14+-UCP.addChat
					UCP.addChat(
						"Zulu",
						windowid,
						"fa fa-comments-o",
						name,
						this.myName,
						name,
						data.data.add.id,
						text,
						function() {
							var cwindow = $(".message-box[data-id=\"" + windowid + "\"] .window");
							$this.chatWindowBinds(cwindow, windowid, data.data.add.contact)
						},
						true,
						direction
					);
					if (UCP.notify && direction === 'in') {
						Notification.show();
					}
				}
			}).catch((err) => {
				$(".message-box[data-id='" + windowid + "'] .response-status").html(err);
				UCP.showAlert(err,'danger')
			})
		}
		if(this.connected && data.subscription === 'kicked_interaction') {
			let objInteraction = this.interactions.find(o => o.id === data.data.add.id)
			if(objInteraction) {
				let index = this.interactions.indexOf(objInteraction)
				this.interactions.splice(index,1)
			}
			if(this.simpleWidgetIDRooms !== null) {
				if($(".zulu-room[data-id='"+data.data.add.id+"']").length) {
					let searchVal = $('.zulu-roomSearch').val()
					if(!searchVal) {
						searchVal = ''
					}
					if(searchVal === '') {
						$(".widget-extra-menu[data-id='"+this.simpleWidgetIDRooms+"'] .small-widget-content div[data-id='"+data.data.add.id+"']").remove()
					} else {
						$("div[data-id='"+data.data.add.id+"'] i.fa-users").css('color', '')
					}
				}
			}
		}
		if(this.connected && data.subscription === 'interaction') {
			let objInteraction = this.interactions.find(o => o.id === data.data.add.id)
			if(objInteraction) {
				let index = this.interactions.indexOf(objInteraction)
				this.interactions.splice(index,1)
				this.interactions.push(data.data.add)
			} else {
				this.interactions.push(data.data.add)
				if(this.simpleWidgetIDRooms !== null && data.data.add.type !== 'direct') {
					let searchVal = $('.zulu-roomSearch').val()
					if(!searchVal) {
						searchVal = ''
					}
					let compare = data.data.add.topic.toLowerCase()
					searchVal = searchVal.toLowerCase()
					if(searchVal === '' || compare.includes(searchVal)) {
						if(!$(".zulu-room[data-id='"+data.data.add.id+"']").length) {
							let icon
							if(data.data.add.type === 'public') {
								icon = '<i class="fa fa-hashtag"></i>'
							} else {
								icon = '<i class="fa fa-lock"></i>'
							}
							var contentBox = $(".widget-extra-menu[data-id='"+this.simpleWidgetIDRooms+"'] .small-widget-content")
							contentBox.append('<div data-id="'+data.data.add.id+'" data-name="'+data.data.add.topic
								+'" class="zulu-room clickable"><i class="fa fa-users" style="color:green"></i> '+data.data.add.topic+' ' + icon +'</div>')
						}
					}
				}
			}
		}
		if(this.connected && data.subscription === 'public_interaction') {
			let objInteraction = this.publicInteractions.find(o => o.id === data.data.add.id)
			if(objInteraction) {
				let index = this.publicInteractions.indexOf(objInteraction)
				this.publicInteractions.splice(index,1)
				this.publicInteractions.push(data.data.add)
			} else {
				this.publicInteractions.push(data.data.add)
				if(this.simpleWidgetIDRooms !== null) {
					let searchVal = $('.zulu-roomSearch').val()
					if(!searchVal) {
						searchVal = ''
					}
					let compare = data.data.add.topic.toLowerCase()
					searchVal = searchVal.toLowerCase()
					if(searchVal !== '' && compare.includes(searchVal)) {
						if(!$(".zulu-room[data-id='"+data.data.add.id+"']").length) {
							var contentBox = $(".widget-extra-menu[data-id='"+this.simpleWidgetIDRooms+"'] .small-widget-content")
							contentBox.append('<div data-id="'+data.data.add.id+'" data-name="'+data.data.add.topic
								+'" class="zulu-room clickable"><i class="fa fa-users" ></i> '+data.data.add.topic+' <i class="fa fa-hashtag"></i></div>')
						}
					}
				}
			}
		}
		if(this.connected && data.action === 'chat::user-connection' && data.contactId !== this.uuid) {
			var name = null
			this.getDisplayName(data.contactId).then((displayName) => {
				if(displayName === null) {
					return this.getContacts()
				}
				else {
					name = displayName
					return Promise.resolve(this.contacts)
				}
			})
			.then((contacts) => {
				this.contacts = contacts
				if(name === null) {
					return this.getDisplayName(data.contactId)
				}
				else {
					return Promise.resolve(name)
				}
			})
			.then((displayName) => {
				name = displayName
				let searchVal = $('.zulu-search').val()
				if(!searchVal) {
					searchVal = ''
				}
				searchVal = searchVal.toLowerCase()
				let compare = name.toLowerCase()
				let contactElement = this.contacts.findIndex(function(element) {
					return element.id === data.contactId
				})
				if(contactElement !== -1) {
					if(data.state === 'connected') {
						this.contacts[contactElement].chatConnected = true
					}
					if(data.state === 'disconnected') {
						this.contacts[contactElement].chatConnected = false
					}
				}
				if(this.simpleWidgetIDContacts !== null) {
					if(data.state === 'connected') {
						if(searchVal === '' || compare.includes(searchVal)) {
							if(!$(".zulu-contact[data-id='"+data.contactId+"']").length) {
								var contentBox = $(".widget-extra-menu[data-id='"+this.simpleWidgetIDContacts+"'] .small-widget-content")
								contentBox.append('<div data-id="'+data.contactId+'" data-name="'+name
					                	+'" class="zulu-contact clickable"><i class="fa fa-user" style="color:green"></i> '+name+'</div>')
							} else {
								$("div[data-id='"+data.contactId+"'] i.fa-user").css('color', 'green')
							}
						}
					}
					if(data.state === 'disconnected') {
						if(searchVal === '' || !compare.includes(searchVal)) {
							if($(".zulu-contact[data-id='"+data.contactId+"']").length) {
								$(".widget-extra-menu[data-id='"+this.simpleWidgetIDContacts+"'] .small-widget-content div[data-id='"+data.contactId+"']").remove()
							}
						} else {
							if($(".zulu-contact[data-id='"+data.contactId+"']").length) {
								$("div[data-id='"+data.contactId+"'] i.fa-user").css('color', '')
							}
						}
					}
				}
			})
			.catch((err) => {
				UCP.showAlert(err,'danger')
			})
		}
	},
	socketOnclose: function(event) {
		this.connected = false;
		if(!this.authenticationFailed) {
			this.authenticationFailed = true;
			this.displayError('Failed zulu authentication')
		}
		console.log("close")
	},
	socketOnerror: function(event) {
		console.log("error")
		if(!this.errorZuluServer) {
			this.errorZuluServer = true;
			this.displayError('Websocket connection to zulu failed')
		}
	},
	socketSendRawMessage: function(message) {
		this.zuluSocket.send(message);
	},
	socketSendJSON: function(json) {
		this.socketSendRawMessage(JSON.stringify(json));
	},
	addSimpleWidget: function(widget_id) {
		if($(".custom-widget[data-widget_id='"+widget_id+"']").data("widget_type_id") === "phone") {
			this.initiatePhoneLibrary();
		}
	},
	engineEvent: function(type, event) {
		console.log("Engine " + type);
		switch (type){
			case "invite":
				this.manageSession(event,"inbound");
				this.switchState("invite");
			break;
			case "registered":
				this.switchState("registered");
			break;
			case "unregistered":
				this.switchState("unregistered");
			break;
			case "registrationFailed":
				this.switchState("registrationfailed");
			break;
			case "connected":
				this.switchState("connected");
			break;
			case "disconnected":
				this.switchState("disconnected");
			break;
			case "connecting":
				this.switchState("connecting");
			break;
			case "registering": //custom event type
				this.switchState("registering");
			break;
		}
	},
	setDisplayState: function(state) {
		this.displayState = state;
		$("#menu_zulu_phone .status span").text(this.displayState);
	},
	playRing: function() {
		if(!this.silenced) {
			$("#ringtone").trigger("play");
		}
	},
	stopRing: function() {
		$("#ringtone").trigger("pause");
		$("#ringtone").trigger("load");
	},
	manageSession: function(session, direction) {
		var Zulu = this,
				id,
				displayName,
				status,
				cnum,
				cnam,
				call = session;

		id = Math.floor((Math.random() * 100000) + 1);
		// If the session exists with active call reject it.
		// TODO this can be useful for call waiting
		if (this.activeCallId) {
			call.terminate();
			return false;
		}

		// If this is a new session create it
		if (!this.activeCallId) {
			this.activeCallId = id;
			this.activeCalls[id] = call;
		}

		cnum = this.activeCalls[id].remoteIdentity.uri.user;
		cnam = this.activeCalls[this.activeCallId].remoteIdentity.displayName || "";
		displayName = (cnam !== "") ? cnam + " <" + cnum + ">" : cnum;
		$("#menu_zulu_phone .contactDisplay .contactImage").css("background-image",'url("?quietmode=1&module=Zulu&command=cimage&did='+cnum+'")');
		Zulu.answering = false;
		if (direction === "inbound") {
			if (UCP.notify) {
				this.notification = new Notify(sprintf(_("Incoming call from %s"), displayName), {
					body: _("Click this window to answer or close this window to ignore"),
					icon: "modules/Zulu/assets/images/no_user_logo.png", //TODO: get the user logo
					notifyClose: function() {
						if (Zulu.answering) {
							Zulu.answering = false;
						} else {
							Zulu.hangup();
						}
					},
					notifyClick: function() {
						Zulu.answering = true;
						Zulu.answer();
						$(".custom-widget[data-widget_rawname=zulu]").click();
						Zulu.notification.close();
					}
				});
				this.notification.show();
			}
		}

		$.each(this.callBinds, function(i, v) {
			Zulu.activeCalls[Zulu.activeCallId].on(v, function(data, cause) {
				Zulu.sessionEvent(v, data, cause);
			});
		});
	},
	sessionEvent: function(type, data, cause) {
		console.log("Session " + type);
		switch (type){
			case "terminated":
				this.switchState("terminated");
				this.endCall(data, cause);
			break;
			case "accepted":
				this.switchState("accepted");
				this.startCall(data);
			break;
			case "progress":
				this.switchState("progress");
			break;
			case "dtmf":
				this.switchState("dtmf");
			break;
			case "muted":
				this.switchState("muted");
			break;
			case "unmuted":
				this.switchState("unmuted");
			break;
		}
	},
	endCall: function(message, cause) {
		this.activeCalls[this.activeCallId] = null;
		this.activeCallId = null;
		if (this.notification !== null) {
			this.notification.close();
		}
		if(typeof cause !== "undefined" && cause === SIP.C.causes.USER_DENIED_MEDIA_ACCESS) {
			this.userBlocked = true;
		}
		$("#menu_zulu_phone .btn-primary").prop("disabled", false);
		this.stopRing();
	},
	startCall: function(event) {
		if (this.notification !== null) {
			this.notification.close();
		}
		this.stopRing();
	},
	silence: function(state) {
		state = (typeof state !== "undefined") ? state : !this.silenced;
		if(!$("#zulu-silence").length) {
			$(".custom-widget[data-widget_rawname=zulu] .fa-phone").after('<i id="zulu-silence" class="fa fa-ban fa-stack-2x hidden"></i>');
		}
		if(state) {
			this.stopRing();
			$("#zulu-silence").removeClass("hidden");
			$("#zulu-silence .fa-check").removeClass("hidden");
		} else {
			$("#zulu-silence").addClass("hidden");
			$("#zulu-silence .fa-check").addClass("hidden");
		}
		Cookies.set("zulu-silenced",(state ? "1" : "0"));
		this.silenced = state;
	},
	call: function(number) {
		if (this.phone.isConnected() && !this.userBlocked) {
			$("#menu_zulu_phone .btn-primary").prop("disabled", true);
			var session = this.phone.invite(number, this.callOptions);
			this.manageSession(session,"outbound");
		} else if(this.phone.isConnected() && this.userBlocked) {
			alert(_("Unable to start call. Please allow the WebRTC session in your browser and refresh"));
		}
	},
	answer: function() {
		if (this.activeCallId !== null) {
			this.answering = true;
			this.activeCalls[this.activeCallId].accept(this.callOptions);
		}
	},
	toggleHold: function() {
		if (this.activeCallId !== null) {
			var call = this.activeCalls[this.activeCallId],
					holds = this.activeCalls[this.activeCallId].isOnHold();
			if (!holds.local) {
				this.switchState("hold");
				call.hold();
			} else {
				this.switchState("unhold");
				call.unhold();
			}
		}
	},
	DTMF: function(num) {
		if (this.state == "accepted" && this.activeCallId !== null) {
			this.activeCalls[this.activeCallId].dtmf(num);
		}
	},
	hangup: function() {
		if ((this.state == "accepted" || this.state == "invite") && this.activeCallId !== null) {
			this.activeCalls[this.activeCallId].terminate();
		}
		this.stopRing();
	},
	switchState: function(t) {
		var button = $("#menu_zulu_phone button.action"),
				secondbutton = $("#menu_zulu_phone button.secondaction"),
				input = $("#menu_zulu_phone input.dialpad"),
				type = (typeof t !== "undefined" && t !== null) ? t : "registered",
				$this = this;
		this.state = type;
		button.data("type", type);
		switch (type){
			case "dtmf":
				this.state = "accepted";
			break;
			case "invite":
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").addClass("shake");
				this.playRing();
				$("#menu_zulu_phone .activeCallSession .keypad").hide();
				$("#menu_zulu_phone .activeCallSession .input-container").hide();
				$("#menu_zulu_phone .contactDisplay").show();
				secondbutton.removeClass().addClass("btn btn-danger secondaction").text("Ignore");
				$("#menu_zulu_phone .actions .right").show();
				button.removeClass().addClass("btn btn-success action").text("Answer");
				button.prop("disabled", false);
			break;
			case "hold":
				secondbutton.removeClass().addClass("btn btn-success secondaction").text("UnHold");
				secondbutton.css("background-color","orange");
				if(!$("#zulu-hold").length) {
					$(".custom-widget[data-widget_rawname=zulu] .fa-phone").after('<i id="zulu-hold" class="fa fa-pause fa-stack-2x blink hidden"></i>');
				}
				$("#zulu-hold").removeClass("hidden");
			break;
			case "unhold":
				secondbutton.removeClass().addClass("btn btn-success secondaction").text("Hold");
				secondbutton.css("background-color","");
				if($("#zulu-hold").length) {
					$("#zulu-hold").addClass("hidden");
				}

				this.state = "accepted";
			break;
			case "accepted":
				this.stopRing();
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").removeClass("shake");
				$("#menu_zulu_phone .contactDisplay").hide();
				$("#menu_zulu_phone .activeCallSession .keypad").show();
				$("#menu_zulu_phone .activeCallSession .input-container").show();
				secondbutton.removeClass().addClass("btn btn-success secondaction").text("Hold");
				secondbutton.css("color","");
				$("#menu_zulu_phone .actions .right").show();

				input.prop("disabled", false);
				button.prop("disabled", false);
				button.removeClass().addClass("btn btn-danger action").text("Hangup");
				$("#menu_zulu_phone .contact-info").addClass("in");
				$("#zulu-timer-container").remove();
				clearInterval(this.timerObject);
				$('#zulu-disconnect-switch').bootstrapToggle('disable');
				var updateTimer = function() {
					if($this.activeCallId === null) {
						clearInterval($this.timerObject);
						$("#menu_zulu_phone .contact-info").removeClass("in");
						$('#zulu-disconnect-switch').bootstrapToggle('enable');
						return;
					}
					//
					var start = moment($this.activeCalls[$this.activeCallId].startTime);
					var end = moment();
					var duration = moment.duration(end.diff(start));

					var padLeft = function(nr){
						return Array(2-String(nr).length+1).join('0')+nr;
					};

					var time = padLeft(duration.hours())+":"+padLeft(duration.minutes())+":"+padLeft(duration.seconds());

					if($("#menu_zulu_phone .contact-info .timer").is(":visible")) {
						$("#menu_zulu_phone .contact-info .timer").text(time);
					} else {
						if(!$("#zulu-timer-container").length) {
							$(".custom-widget[data-widget_rawname=zulu] .fa-phone").after('<div id="zulu-timer-container"><div class="timer">'+time+'</div></div>');
						} else {
							$("#zulu-timer-container .timer").text(time);
						}
					}
				};
				updateTimer();
				this.timerObject = setInterval(updateTimer,1000);

				var cnam = this.activeCalls[this.activeCallId].remoteIdentity.displayName || "",
						cnum = this.activeCalls[this.activeCallId].remoteIdentity.uri.user,
						displayName = (cnam !== "") ? cnam + " <" + cnum + ">" : cnum;
				$("#menu_zulu_phone .contact-info .contact").text(displayName);
			break;
			case "terminated":
				this.stopRing();
				$("#menu_zulu_phone .actions .right").hide();
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").removeClass("shake");
				$("#menu_zulu_phone .activeCallSession .keypad").show();
				$("#menu_zulu_phone .activeCallSession .input-container").show();
				$("#menu_zulu_phone .contactDisplay").hide();
				button.removeClass().addClass("btn btn-primary action").text("Call");
				$("#menu_zulu_phone .contact-info .contact").text("");
				this.state = "registered";
			break;
			case "registered":
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").removeClass("registering");
				this.setDisplayState(_("Registered"));
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "green");
				input.prop("disabled", false);
				input.val("");
				$("#menu_zulu_phone .keypad").removeClass("disable");
				button.prop("disabled", true);
				$("#menu_zulu_phone .actions .right").hide();
				button.removeClass().addClass("btn btn-primary action").text("Call");
			break;
			case "unregistered":
				this.setDisplayState(_("Unregistered"));
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").removeClass("registering");
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "yellow");
				$("#menu_zulu_phone .keypad").addClass("disable");
				input.prop("disabled", true);
				input.val("");
			break;
			case "registrationfailed":
				this.setDisplayState(_("Registration Failed"));
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").removeClass("registering");
				$("#zulu-dc a span").text(_("Connect Phone"));
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "red");
				$("#menu_zulu_phone .keypad").addClass("disable");
				input.prop("disabled", true);
				input.val("");
			break;
			case "connected":
				this.setDisplayState(_("Unregistered"));
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").removeClass("connecting");
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "yellow");
			break;
			case "disconnected":
				this.setDisplayState(_("Disconnected"));
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").removeClass("connecting");
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").removeClass("registering");
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "red");
				$("#menu_zulu_phone .keypad").addClass("disable");
				input.prop("disabled", true);
				input.val("");
			break;
			case "connecting":
				this.setDisplayState(_("Connecting to socket..."));
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "red");
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").addClass("connecting");
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").removeClass("registering");
			break;
			case "registering": //custom event type
				this.setDisplayState(_("Registering..."));
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").addClass("registering");
			break;
		}
	},
	register: function() {
		if(!this.phone.isConnected()) {
			this.connectPhone();
		}
		if (this.phone !== null &&
				!this.phone.isRegistered()) {
		}
		this.phone.register();
	},
	unregister: function() {
		if(!this.phone.isConnected()) {
			throw "Phone is not connected, nothing to register";
		}
		if (this.phone !== null &&
				this.phone.isRegistered()) {
		}
		this.phone.unregister();
	},
	toggleRegister: function() {
		if(!this.phone.isConnected()) {
			return; //nope
		}
		if($(".custom-widget[data-widget_rawname=zulu] .fa-phone").hasClass("registering")) {
			return; //we are already doing something
		}
		if(!this.phone.isRegistered()) {
			this.register();
			Cookies.set("zulu-register",1);
		} else {
			this.unregister();
			Cookies.set("zulu-register",0);
		}

	},
	initiatePhoneLibrary: function() {
		var $this = this,
				ver = "0.7.7";

		if(typeof SIP === "object") {
			$this.loadPhone();
			return;
		} else {
			if(!$("html").hasClass("getusermedia")) {
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "red");
				this.setDisplayState(_("Not supported in this browser"));
				console.warn("WebRTC is not supported in this browser");
				return;
			}

			if(document.location.protocol !== "https:") {
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "red");
				this.setDisplayState(_("Only supported over HTTPS"));
				console.warn("WebRTC is not supported in non-SSL mode");
				return;
			}

			if(!$(".custom-widget[data-widget_rawname=zulu]").length) {
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "red");
				console.warn("WebRTC Widget has not been added");
				return;
			}

			if(typeof moduleSettings.Zulu === "undefined") {
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "red");
				console.warn("WebRTC is not configured properly");
				return;
			}

			if(!moduleSettings.Zulu.enabled) {
				$(".custom-widget[data-widget_rawname=zulu] .fa-phone").css("color", "red");
				console.warn(moduleSettings.Zulu.message);
				this.setDisplayState(moduleSettings.Zulu.message);
				return;
			}

			$.getScript("modules/Zulu/assets/jssiplibs/sip-" + ver + ".min.js")
			.done(function( script, textStatus ) {
				$this.loadPhone()
			}).fail(function( jqxhr, settings, exception ) {
				//could not load script, remove button
			});
		}
	},
	loadPhone: function() {
		var $this = this;
		$("#footer").append("<audio id=\"audio_remote\" autoplay=\"autoplay\" />");
		$("#footer").append("<audio id=\"ringtone\"><source src=\"modules/Zulu/assets/sounds/ring.mp3\" type=\"audio/mpeg\"></audio>");
		$this.callOptions.media.render.remote = document.getElementById('audio_remote');
		$this.phone = new SIP.UA(
			{
				"wsServers": moduleSettings.Zulu.settings.wsservers.replace('%sip_server%',window.location.host.split(':')[0]),
				"uri": moduleSettings.Zulu.settings.uri.replace('%sip_server%',window.location.host.split(':')[0]),
				"password": moduleSettings.Zulu.settings.password,
				"log": {
					"builtinEnabled": false,
					"level": moduleSettings.Zulu.settings.log
				},
				"register": $this.autoRegister,
				"hackWssInTransport": true,
				"stunServers": moduleSettings.Zulu.settings.iceServers,
				"iceCheckingTimeout": moduleSettings.Zulu.settings.gatheringTimeout,
				// The rtcpMuxPolicy option is being considered for removal and may be removed no earlier than M60, around August 2017.
				// If you depend on it, please see https://www.chromestatus.com/features/5654810086866944 for more details.
				// https://nimblea.pe/monkey-business/2017/01/19/webrtc-asterisk-and-chrome-57/
				// https://issues.asterisk.org/jira/browse/ASTERISK-26732
				"rtcpMuxPolicy": "negotiate",
				"userAgentString": "Zulu"
			}
		);

		var binds = [
			"connected",
			"disconnected",
			"registered",
			"unregistered",
			"registrationFailed",
			"invite",
			"message",
			"connecting"
			];
		$.each(binds, function(i, v) {
			$this.phone.on(v, function(e) {
				$this.engineEvent(v, e);
			});
		});

		$this.connectPhone();
	}
});
