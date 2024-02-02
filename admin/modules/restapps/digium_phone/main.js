var app = require('app');
app.init();

var screen = require('screen');
var util = require('util');

var genericConfirm = require('genericConfirm');
var genericForm = require('genericForm');
var genericMenu = require('genericMenu');

var main = {};

main.saveEntry = function(values) {
	this.dataSet(this.pagePath, this.pageArgs, null, JSON.stringify(values), this.pageShow.bind(this));
};

main.editBool = function(entry) {
	/* No edit form.  Just toggle it. */
	var vals = {};
	vals[entry.name] = !entry.value;

	this.saveEntry(vals);
};

main.editNumberField = function(name, display, value) {
	var field = {
		'inputs' : [],
		'values' : {}
	};

	field.inputs[0] = {
		'text' : display,
		'setting' : name,
		'inputType' : 'numeric',
		'inputParams' : {}
	};
	field.values[name] = value;

	return field;
};

main.editNumber = function(entry) {
	var field = this.editNumberField(entry.name, entry.display, entry.value);

	this.editEntry(entry, entry.name, entry.display, field.inputs, field.values);
};

main.editTextField = function(name, display, value, editable, password) {
	var field = {
		'inputs' : [],
		'values' : {}
	};

	field.inputs[0] = {
		'text' : display,
		'setting' : name,
		'inputType' : editable ? 'normal' : 'text',
		'inputParams' : {}
	};
	field.values[name] = password ? '******' : value;

	return field;
};

main.editText = function(entry, editable, password) {
	var field = this.editTextField(entry.name, entry.display, entry.value, editable, password);

	this.editEntry(entry, entry.name, entry.display, field.inputs, field.values);
};

main.editChoiceField = function(name, display, values, value) {
	var field = {
		'inputs' : [],
		'values' : {}
	};

	var options = [];
	for (val in values) {
		options[options.length] = {
			'display' : values[val],
			'value' : val
		};
	}

	field.inputs[0] = {
		'text' : display,
		'setting' : name,
		'inputType' : 'textCycler',
		'inputParams' : {
			'options' : options
		}
	};
	field.values[name] = value;

	return field;
};

main.editChoice = function(entry) {
	var field = this.editChoiceField(entry.name, entry.display, entry.values, entry.value);

	this.editEntry(entry, entry.name, entry.display, field.inputs, field.values);
};

main.editList = function(entry) {
	if (entry.listId == undefined) {
		var handler = {};
		handler.processMenuAction = function(params) {
			if (params.actionId == undefined) {
				params.actionId = 'select';
			}

			switch (params.actionId) {
			case 'add':
				var inputs = [];
				var values = {};

				for (i = 0; i < entry.value.length; i++) {
					switch (entry.subtype) {
					case 'text':
						field = this.editTextField(entry.name + '_' + i, '', entry.value[i], false, false);
						inputs[i] = field.inputs[0];
						values[entry.name + '_' + i] = field.values[entry.name + '_' + i];
						break;
					case 'password':
						field = this.editTextField(entry.name + '_' + i, '', entry.value[i], false, true);
						inputs[i] = field.inputs[0];
						values[entry.name + '_' + i] = field.values[entry.name + '_' + i];
						break;
					case 'number':
						field = this.editNumberField(entry.name + '_' + i, '', entry.value[i]);
						inputs[i] = field.inputs[0];
						values[entry.name + '_' + i] = field.values[entry.name + '_' + i];
						break;
					default:
						break;
					}
				}

				/* And one for the addition */
				switch (entry.subtype) {
				case 'text':
					field = this.editTextField(entry.name + '_' + i, '', '', true, false);
					inputs[i] = field.inputs[0];
					values[entry.name + '_' + i] = field.values[entry.name + '_' + i];
					break;
				case 'password':
					field = this.editTextField(entry.name + '_' + i, '', '', true, true);
					inputs[i] = field.inputs[0];
					values[entry.name + '_' + i] = field.values[entry.name + '_' + i];
					break;
				case 'number':
					field = this.editNumberField(entry.name + '_' + i, '', '');
					inputs[i] = field.inputs[0];
					values[entry.name + '_' + i] = field.values[entry.name + '_' + i];
					break;
				default:
					break;
				}

				this.editEntry(entry, entry.name, entry.display, inputs, values);
				for (i = 0; i < entry.value.length; i++) {
					widget = genericForm.getInputWidget({'setting' : entry.name + '_' + i});
					widget.focusable = false;
				}
				widget = genericForm.getInputWidget({'setting' : entry.name + '_' + i});
				widget.takeFocus();
				break;
			case 'delete':
				var vals = {};
				vals[entry.name] = [];

				for (i = 0; i < entry.value.length; i++) {
					if (i != params.selectionId.listId) {
						vals[entry.name][vals[entry.name].length] = entry.value[i];
					}
				}

				this.saveEntry(vals);
				break;
			case 'select':
				this.menuSelect(params.selectionId);
				break;
			case 'exit':
			default:
				digium.background();
				break;
			}
		}.bind(this);

		var softkeys = [
			{
				'label'		: 'Cancel',
				'actionId'	: 'exit',
				'icon'		: app.images.softKeys.cancel
			},
			{
				'label'		: 'Change',
				'actionId'	: 'select',
				'icon'		: app.images.softKeys.select
			},
			{
				'label'		: 'Add New',
				'actionId'	: 'add'
			},
			{
				'label'		: 'Delete',
				'actionId'	: 'delete'
			}
		];

		var items = [];
		for (i = 0; i < entry.value.length; i++) {
			newEntry = {};
			newEntry.listId = i;
			for (prop in entry) {
				newEntry[prop] = entry[prop];
			}
			items[i] = {
				'text' : entry.value[i],
				'id' : newEntry
			};
		}

		genericMenu.show({
			'id' : this.pageData.application_name + '-' + this.pageData.page_name + '-' + entry.name,
			'title' : entry.display,
			'object' : handler,
			'menu' : items,
			'softkeys' : softkeys,
			'onkeyselect' : this.menuSelect,
			'forceRedraw' : true
		});
	} else {
		var inputs = [];
		var values = {};

		for (i = 0; i < entry.value.length; i++) {
			switch (entry.subtype) {
			case 'text':
				field = this.editTextField(entry.name + '_' + i, '', entry.value[i], (i == entry.listId), false);
				inputs[i] = field.inputs[0];
				values[entry.name + '_' + i] = field.values[entry.name + '_' + i];
				break;
			case 'password':
				field = this.editTextField(entry.name + '_' + i, '', entry.value[i], (i == entry.listId), true);
				inputs[i] = field.inputs[0];
				values[entry.name + '_' + i] = field.values[entry.name + '_' + i];
				break;
			case 'number':
				field = this.editNumberField(entry.name + '_' + i, '', entry.value[i]);
				inputs[i] = field.inputs[0];
				values[entry.name + '_' + i] = field.values[entry.name + '_' + i];
				break;
			default:
				break;
			}
		}

		this.editEntry(entry, entry.name, entry.display, inputs, values);
		for (i = 0; i < entry.value.length; i++) {
			widget = genericForm.getInputWidget({'setting' : entry.name + '_' + i});
			if (i == entry.listId) {
				widget.takeFocus();
			} else {
				widget.focusable = false;
			}
		}
	}
};

main.editDial = function(entry) {
	/* No edit form.  Just dial the number. */
	dial = {
		'number' : entry.value
	};
	digium.phone.dial(dial);
};

main.editEntry = function(entry, name, display, inputs, values) {
	genericForm.show({
		'id' : name,
		'labelWidth' : (digium.phoneModel === 'D70') ? 140 : 125,
		'inputs' : inputs,
		'values' : values,
		'object' : {
			processCustomValidation : function(settings) {
				var errorMsgs = [];

				if (entry) { /* TODO: Set min/max on the inputs, and check those instead of entry. */
					for (valNum in settings.values) {
						switch (entry.type) {
						case 'number':
							if (entry.min && settings.values[valNum].value < parseInt(entry.min, 10)) {
								errorMsgs[errorMsgs.length] = "'" + entry.display + "' may not be fewer than " + entry.min + ".";
							}

							if (entry.max && settings.values[valNum].value > parseInt(entry.max, 10)) {
								errorMsgs[errorMsgs.length] = "'" + entry.display + "' may not be greater than " + entry.max + ".";
							}
							break;
						case 'text':
						case 'password':
						case 'list':
							if (entry.min && settings.values[valNum].value.length < parseInt(entry.min, 10)) {
								errorMsgs[errorMsgs.length] = "'" + entry.display + "' may not be fewer than " + entry.min + " characters.";
							}

							if (entry.max && settings.values[valNum].value.length > parseInt(entry.max, 10)) {
								errorMsgs[errorMsgs.length] = "'" + entry.display + "' may not be greater than " + entry.max + " characters.";
							}
							break;
						default:
							break;
						}
					}
				}

				return errorMsgs;
			}.bind(this),
			processBack : function() {
				this.pageShow();
			}.bind(this),
			processSubmit : function(settings) {
				var vals = {};

				for (valNum in settings.values) {
					if (settings.values[valNum].setting == settings.formId) {
						vals[settings.formId] = settings.values[valNum].value;
					} else if (settings.values[valNum].setting.substr(0, settings.formId.length) == settings.formId) {
						if (!vals[settings.formId]) {
							vals[settings.formId] = [];
						}

						if (settings.values[valNum].value.length > 0) {
							vals[settings.formId][vals[settings.formId].length] = settings.values[valNum].value;
						}
					} else {
						vals[settings.values[valNum].setting] = settings.values[valNum].value;
					}
				}

				this.saveEntry(vals);
			}.bind(this)
		},
		'title' : display + ((entry && entry.min && entry.max) ? ' (' + entry.min + '-' + entry.max + ')' : ''),
		'onkeyline1' : digium.background,
		'onkeycancel' : this.pageShow.bind(this),
		'forceRedraw' : true
	});
};

main.menuSelect = function(selection) {
	switch (selection.type) {
	case 'bool':
		this.editBool(selection);
		break;
	case 'number':
		this.editNumber(selection);
		break;
	case 'label':
		this.editText(selection, false, false);
		break;
	case 'text':
		this.editText(selection, true, false);
		break;
	case 'password':
		this.editText(selection, true, true);
		break;
	case 'choice':
		this.editChoice(selection);
		break;
	case 'list':
		this.editList(selection);
		break;
	case 'link':
		this.dataGet(selection.value, selection.args, null, this.pageShow.bind(this));
		break;
	case 'dial':
		this.editDial(selection);
		break;
	default:
		break;
	}
};

main.pageAction = function(page) {
	for (entryNum in page.layout) {
		entry = page.layout[entryNum];

		switch (entry.type) {
		case 'noop':
			digium.background();
			break;
		case 'transfer':
			if (this.currentCall) {
				/* This isn't happy.  Haven't looked into why.  Blind xfer is good though.
				if (entry.dtmf) {
					digits = entry.dtmf + entry.value + '#';
					for (var i = 0; i < digits.length; i++) {
						digium.phone.sendDTMF({
							'digit' : digits.charAt(i)
						});
					}
				} else {*/
					transfer = {
						'callHandle' : this.currentCall,
						'number' : entry.value,
						'handler' : this.handleCall.bind(this)
					};
					digium.phone.transfer(transfer);
				/*}*/

				digium.background();
			}
			break;
		case 'dial':
			if (entry.dial) {
				dial = {
					'number' : entry.dial,
					'handler' : function(callData) {
						switch (callData.state) {
						case 'EARLY':
						case 'CONFIRMED':
							this.currentCall = callData.callHandle;

							if (entry.value) {
								this.pagePath = entry.value;
								this.pageArgs = entry.args;
								digium.foreground();
							}
							break;
						case 'DISCONNCTD':
							this.currentCall = null;
							break;
						default:
							break;
						}
					}.bind(this)
				};
				this.currentCall = digium.phone.dial(dial);
			}
			break;
		case 'redirect':
			if (entry.dtmf !== undefined) {
				digium.phone.sendDTMF({
					'digit' : entry.dtmf
				});
			}

			if (entry.value) {
				this.pagePath = entry.value;
				this.pageArgs = entry.args;
				digium.foreground();
			}

			if (entry.endcall) {
				this.endcall = entry.endcall;
				this.endcallArgs = entry.endcall_args;
			}
			break;
		case 'config':
			util.debug('Executing digium.updateXmlConfig()');
			digium.updateXmlConfig();
			util.debug('Executed digium.updateXmlConfig()');
			digium.background();
			break;
		default:
			break;
		}
	}
};

main.pageAuth = function(page) {
	var inputs = [];
	var values = {};

	for (entryNum in page.layout) {
		entry = page.layout[entryNum];

		switch (entry.type) {
		case 'text':
			field = this.editTextField(entry.name, entry.display, entry.value, true, false);
			break;
		case 'password':
			field = this.editTextField(entry.name, entry.display, entry.value, true, true);
			break;
		case 'number':
		default:
			field = this.editNumberField(entry.name, entry.display, entry.value);
			break;
		}

		inputs[entryNum] = field.inputs[0];
		values[entry.name] = field.values[entry.name];
	}

	this.editEntry(entry, page.page_name + '_auth', 'Authentication Required', inputs, values);
};

main.pageDisplay = function(page) {
	var handler = {};
	handler.processMenuAction = function(params) {
		if (params.actionId == undefined) {
			params.actionId = 'select';
		}

		switch (params.actionId) {
		case 'select':
			this.menuSelect(params.selectionId);
			break;
		case 'dial':
			this.menuSelect(params.selectionId);
			break;
		case 'back':
			this.dataGet(page.exitPath, page.exitArgs, null, this.pageShow.bind(this));
			break;
		case 'exit':
			digium.background();
			break;
		default:
			if (params.actionId.substr(0, 5) == 'link_') {
				args = '&actiondata=' + params.selectionId.value;
				if (params.selectionId.args) {
					args = args + '&' + params.selectionId.args;
				}
				this.dataGet(params.actionId.substr(5), null, args, this.pageShow.bind(this));
			} else if (params.actionId.substr(0, 7) == 'action_') {
				args = 'action=' + params.actionId.substr(7) + '&actiondata=' + params.selectionId.value;
				if (params.selectionId.args) {
					args = args + '&' + params.selectionId.args;
				}
				this.dataGet(this.pagePath, this.pageArgs, args, this.pageShow.bind(this));
			}
			break;
		}
	}.bind(this);

	var need_change = false;
	var change_auto = false;
	var need_select = false;
	var need_dial = false;

	var items = [];
	for (entryNum in page.layout) {
		entry = page.layout[entryNum];

		switch (entry.type) {
		case 'bool':
			need_change = true;
			items[items.length] = {
				'text' : (entry.iconstring ? entry.iconstring : '') + entry.display + ': ' + (entry.value ? (entry.yes ? entry.yes : 'Yes') : (entry.no ? entry.no : 'No')),
				'id' : entry
			};
			break;
		case 'number':
		case 'text':
			need_change = true;
			change_auto = true;
			/*jsl:fallthru*/
		case 'label':
			txt = '';
			if (entry.display && entry.display.length > 0) {
				txt = entry.display + ': ' + entry.value;
			} else {
				txt = entry.value;
			}
			items[items.length] = {
				'text' : (entry.iconstring ? entry.iconstring : '') + txt,
				'id' : entry
			};
			break;
		case 'password':
			need_change = true;
			change_auto = true;
			txt = '';
			if (entry.display && entry.display.length > 0) {
				txt = entry.display + ': ******';
			} else {
				txt = '******';
			}
			items[items.length] = {
				'text' : (entry.iconstring ? entry.iconstring : '') + txt,
				'id' : entry
			};
			break;
		case 'choice':
			need_change = true;
			change_auto = true;
			items[items.length] = {
				'text' : (entry.iconstring ? entry.iconstring : '') + entry.display,
				'id' : entry
			};
			break;
		case 'list':
			need_change = true;
			change_auto = true;
			var value = '[' + entry.value.length + ' items]';
			items[items.length] = {
				'text' : (entry.iconstring ? entry.iconstring : '') + entry.display + ': ' + value,
				'id' : entry
			};
			break;
		case 'link':
			need_select = true;
			items[items.length] = {
				'text' : (entry.iconstring ? entry.iconstring : '') + entry.display,
				'id' : entry
			};
			break;
		case 'dial':
			need_dial = true;
			items[items.length] = {
				'text' : (entry.iconstring ? entry.iconstring : '') + entry.display,
				'id' : entry
			};
			break;
		case 'entry':
			items[items.length] = {
				'text' : (entry.iconstring ? entry.iconstring : '') + entry.display,
				'id' : entry
			};
			break;
		default:
			/* Don't know how to display this type. */
			break;
		}
	}

	if (change_auto && page.layout.length === 1 && page.action.length === 0) {
		/* Shortcut, just show the entry. */
		this.menuSelect(page.layout[0]);
		return;
	}

	var softkeys = [];
	if (page.exitPath) {
		softkeys[softkeys.length] = {
			'label'		: 'Back',
			'actionId'	: 'back',
			'icon'		: app.images.softKeys.back
		};
	} else {
		softkeys[softkeys.length] = {
			'label'		: 'Exit',
			'actionId'	: 'exit',
			'icon'		: app.images.softKeys.cancel
		};
	}

	if (need_change) {
		softkeys[softkeys.length] = {
			'label'		: 'Change',
			'actionId'	: 'select',
			'icon'		: app.images.softKeys.select
		};
	} else if (need_select) {
		softkeys[softkeys.length] = {
			'label'		: 'Select',
			'actionId'	: 'select',
			'icon'		: app.images.softKeys.select
		};
	}

	if (need_dial) {
		softkeys[softkeys.length] = {
			'label'		: 'Dial',
			'actionId'	: 'dial'
		};
	}

	for (actionNum in page.action) {
		action = page.action[actionNum];

		if (action.link) {
			softkeys[softkeys.length] = {
				'label' : action.display,
				'actionId' : 'link_' + action.link
			};
		} else {
			softkeys[softkeys.length] = {
				'label' : action.display,
				'actionId' : 'action_' + action.name
			};
		}
	}

	genericMenu.show({
		'id' : page.application_name + '-' + page.page_name,
		'title' : (page.title ? page.title : page.application_display),
		'object' : handler,
		'menu' : items,
		'softkeys' : softkeys,
		'onkeyselect' : this.menuSelect,
		'forceRedraw' : true
	});
};

main.pageShow = function() {
	var page = this.pageData;

	if (page.error.length > 0) {
		var msg = "";

		for (entryNum in page.error) {
			entry = page.error[entryNum];

			msg = msg + "\n" + entry.display;
		}

		var confirm = {};
		confirm.processConfirm = function(params) {
			if (params.confirm === true) {
				this.dataGet(this.pagePath, this.pageArgs, null, this.pageShow.bind(this));
			} else {
				digium.background();
			}
		}.bind(this);

		genericConfirm.show({
			'id' : 'request_failed',
			'message' : msg,
			'title' : 'Error',
			'object' : confirm,
			'confirmBtnText' : 'OK',
			'hideCancelButton' : false,
			'cancelBtnText' : 'Cancel'
		});

		return;
	}

	util.debug('Showing page of type ' + page.type + '.');
	switch (page.type) {
		case 'action':
			this.pageAction(page);
			break;
		case 'auth':
			this.pageAuth(page);
			break;
		case 'display':
		default:
			this.pageDisplay(page);
			break;
	}
};

main.dataSet = function(path, pageArgs, actionArgs, value, callback) {
	var request = new NetRequest();
	request.onreadystatechange = function() {
		if (request.readyState != 4) {
			return;
		}

		if (request.status != 200) {
			var confirm = {};
			confirm.processConfirm = function(params) {
				if (params.confirm === true) {
					this.dataSet(path, pageArgs, actionArgs, value, callback);
				} else {
					digium.background();
				}
			}.bind(this);

			genericConfirm.show({
				'id' : 'request_failed',
				'message' : 'Request failed.  Please try again.',
				'title' : 'Request Failed',
				'object' : confirm,
				'confirmBtnText' : 'OK',
				'hideCancelButton' : false,
				'cancelBtnText' : 'Cancel'
			});
		}

		var resp = JSON.parse(request.responseText);

		this.pagePath = path;
		this.pageArgs = pageArgs;
		this.pageData = resp;

		if (callback) {
			callback();
		}

		clearInterval(this.timerRefresh);
		if (resp.refresh != undefined) {
			this.timerRefresh = setTimeout(function() {
				this.dataGet(path, pageArgs, actionArgs, callback);
			}.bind(this), resp.refresh * 1000);
		}
	}.bind(this);

	var args = null;
	if (pageArgs && actionArgs) {
		args = pageArgs + '&' + actionArgs;
	} else if (pageArgs) {
		args = pageArgs;
	} else if (actionArgs) {
		args = actionArgs;
	}
	request.open('POST', this.config.uri + '/' + path + '?user=' + this.config.user + (args ? '&' + args : ''));
	request.setRequestHeader('X-Digium-MAC', this.config.mac);
	request.setRequestHeader('Content-Type', 'application/json');
	request.setTimeout(3000);
	request.send(value);
};

main.dataGet = function(path, pageArgs, actionArgs, callback) {
	var request = new NetRequest();
	request.onreadystatechange = function() {
		if (request.readyState != 4) {
			return;
		}

		if (request.status != 200) {
			var confirm = {};
			confirm.processConfirm = function(params) {
				if (params.confirm === true) {
					this.dataGet(path, pageArgs, actionArgs, callback);
				} else {
					digium.background();
				}
			}.bind(this);

			genericConfirm.show({
				'id' : 'request_failed',
				'message' : 'Request failed.  Please try again.',
				'title' : 'Request Failed',
				'object' : confirm,
				'confirmBtnText' : 'OK',
				'hideCancelButton' : false,
				'cancelBtnText' : 'Cancel'
			});

			return;
		}

		var resp = JSON.parse(request.responseText);

		this.pagePath = path;
		this.pageArgs = pageArgs;
		this.pageData = resp;

		if (callback) {
			callback();
		}

		clearInterval(this.timerRefresh);
		if (resp.refresh != undefined) {
			this.timerRefresh = setTimeout(function() {
				this.dataGet(path, pageArgs, actionArgs, callback);
			}.bind(this), resp.refresh * 1000);
		}
	}.bind(this);

	var args = null;
	if (pageArgs && actionArgs) {
		args = pageArgs + '&' + actionArgs;
	} else if (pageArgs) {
		args = pageArgs;
	} else if (actionArgs) {
		args = actionArgs;
	}
	request.open('GET', this.config.uri + '/' + path + '?user=' + this.config.user + (this.currentCall && !this.endcall ? '&linestate=CONNECTED' : '&linestate=') + (args ? '&' + args : ''));
	request.setRequestHeader('X-Digium-MAC', this.config.mac);
	request.setTimeout(3000);
	request.send();
};

/* Track the currently active call. */
main.handleCall = function(params) {
	var callData = params.eventData;

	if (callData.state == 'CALLING') {
		this.currentCall = callData.callHandle;
	}

	digium.phone.observeCallEvents({
		'callHandle' : callData.callHandle,
		'handler' : function(callData) {
			switch (callData.state) {
			case 'EARLY':
			case 'CONFIRMED':
				this.currentCall = callData.callHandle;
				break;
			case 'DISCONNCTD':
				this.currentCall = null;

				if (this.endcall) {
					this.dataGet(this.endcall, this.endcallArgs, null, this.pageShow.bind(this));

					this.endcall = null;
					this.endcallArgs = null;
				}
				break;
			default:
				break;
			}
		}.bind(this)
	});

};

main.handleContact = function(params) {
	if (params.eventData.url != this.config.subscription) {
		return;
	}

	win = digium.app.idleWindow;

	switch(params.eventData.note) {
	case 'Ready':
		win.clear();
		break;
	case 'On the phone':
		var appInfo = digium.app.getInfo(digium.app.name);
		var txt = new Text(0, 0, win.w, win.h);
		txt.align(Widget.CENTER);
		txt.label = appInfo.displayName + ' active';
		win.add(txt);
		break;
	default:
		break;
	}
};

main.show = function() {
	this.dataGet(this.pagePath, this.pageArgs, null, this.pageShow.bind(this));
};

main.hide = function() {
	this.pagePath = this.config.path;
	this.pageArgs = null;

	clearInterval(this.timerRefresh);
};

main.init = function() {
	var config = app.getConfig().settings;
	this.config = config;
	this.currentCall = null;
	this.endcall = null;

	this.pagePath = this.config.path;
	this.pageArgs = null;
	this.pageData = [];

	digium.app.exitAfterBackground = false;
	digium.app.idleWindow.hideBottomBar = true;

	digium.event.observe({
		'eventName' : 'digium.app.foreground',
		'callback' : this.show.bind(this)
	});

	digium.event.observe({
		'eventName' : 'digium.app.background',
		'callback' : this.hide.bind(this)
	});

	digium.event.observe({
		'eventName' : 'digium.phone.contact_presence',
		'callback' : this.handleContact.bind(this)
	});

	/* Monitor calls, so the active call can be tracked. */
	digium.event.observe({
		'eventName' : 'digium.phone.incoming_call',
		'callback' : this.handleCall.bind(this)
	});

	digium.event.observe({
		'eventName' : 'digium.phone.outgoing_call',
		'callback' : this.handleCall.bind(this)
	});
};

main.init();
