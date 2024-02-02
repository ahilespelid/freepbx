TimezoneC = Class.extend({
	// Our list of timezones
	tz: {},

	init: function(){
		var self = this;

		// Load the countries
		this.tz = TimezoneC.timezones;
		$("option", "#sel_area").remove();
		$.each(this.tz, function(c, r) {
			$("#sel_area").append('<option>'+c+'</option>');
		});

		// Display the region we're currently on
		if (typeof(window.timezone) != "undefined") {
			this.showRegions(window.timezonecountry);
			$("#sel_area").val(window.timezonecountry);
			$("#sel_region").val(window.timezoneregion);
		}

		// Grab the change event on the area
		$("#sel_area").change(function() {
			self.showRegions($(this).val());
		});

	},

	showRegions: function(c) {
		if (typeof(this.tz[c]) == "undefined") {
			console.log("Unknown region "+c);
			return;
		}
		$("option", "#sel_region").remove();
		$.each(this.tz[c], function(r, i) {
			$("#sel_region").append('<option>'+r+'</option>');
		});
	},
});

var localTime = localTimezone = '';
$(document).ready(function() {
	window.Timezone = new TimezoneC();
	localTime = $("#servertime").data("time");
	localTimezone = $("#servertime").data("zone");
	var updateLocalTime = function() {
		$("#servertime span").text(moment.unix(localTime).tz(localTimezone).format('HH:mm:ss z'));
		localTime = localTime + 1;
	};

	setInterval(updateLocalTime,1000);
});
