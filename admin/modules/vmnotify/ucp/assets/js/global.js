var VmnotifyC = UCPMC.extend({
	init: function(){
	},

	/**
	* Display Widget
	* @method displayWidget
	* @param  {string}      widget_id    The widget ID on the dashboard
	* @param  {string}      dashboard_id The dashboard ID
	*/
	displayWidget: function(widget_id,dashboard_id) {
		var self = this;
		var ext = $(".grid-stack-item[data-id="+widget_id+"][data-rawname=vmnotify]").data('widget_type_id');
		$(".grid-stack-item[data-id='"+widget_id+"'][data-rawname=vmnotify] .widget-content input[name='vmnenable']").change(function() {
			var sidebar = $(".widget-extra-menu[data-module='vmnotify'][data-widget_type_id='"+ext+"']:visible input[name='vmnenable']"),
				checked = $(this).is(':checked'),
				name = $(this).prop('name');
			if(sidebar.length && sidebar.is(":checked") !== checked) {
				var state = checked ? "on" : "off";
				sidebar.bootstrapToggle(state);
			}
			// submit the form group list
			self.saveSettings({key: "vmnenable", value: $(this).is(':checked'), ext: ext});
		});
	},

	/**
	* Display Widget Settings
	* @method displayWidgetSettings
	* @param  {string}      widget_id    The widget ID on the dashboard
	* @param  {string}      dashboard_id The dashboard ID
	*/
	displayWidgetSettings: function(widget_id, dashboard_id) {
		var self = this;
		var ext = $("#widget_settings").data('widget_type_id');
		$("#widget_settings .widget-settings-content .vmnrecip").change(function() {
			// submit the form group list
			self.saveSettings({key: "vmnrecip", value: $(this).val(), ext: ext});
		});
	},

	/**
	* Display Side Bar Widget
	* @method displaySimpleWidget
	* @param  {string}            widget_id The widget id in the sidebar
	*/
	displaySimpleWidget: function(widget_id) {
		var self = this;
		var ext = $(".widget-extra-menu[data-id="+widget_id+"]").data('widget_type_id');
		$(".widget-extra-menu[data-id="+widget_id+"] .small-widget-content input[name='vmnenable']").change(function() {
			var checked = $(this).is(':checked'),
				name = $(this).prop('name'),
				el = $(".grid-stack-item[data-rawname=vmnotify][data-widget_type_id='"+ext+"']:visible input[name='vmnenable']");

			if(el.length) {
				if(el.is(":checked") !== checked) {
					var state = checked ? "on" : "off";
					el.bootstrapToggle(state);
				}
			} else {
				self.saveSettings({key: "vmnenable", value: $(this).is(':checked'), ext: ext});
			}
		});
	},

	/**
	* Display Simple Widget Settings
	* @method displaySimpleWidgetSettings
	* @param  {string}      widget_id    The widget ID on the sidebar
	*/
	displaySimpleWidgetSettings: function(widget_id) {
		var self = this;
		var ext = $("#widget_settings").data('widget_type_id');
		$("#widget_settings .widget-settings-content .vmnrecip").change(function() {
			// submit the form group list
			self.saveSettings({key: "vmnrecip", value: $(this).val(), ext: ext});
		});
	},

	saveSettings: function(data) {
		data.module = "vmnotify";
		data.command = "settings";
		$.post( UCP.ajaxUrl, data, function( data ) {
			UCP.showAlert(data.message,data.alert,function() {
			});
		});
	},

});
