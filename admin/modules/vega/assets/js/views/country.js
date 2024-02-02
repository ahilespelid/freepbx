window.countrycodes = {
	"CA": "Canada",
	"US": "United States",
	"UK": "United Kingdom",
	"AU": "Australia",
	"AR": "Argentina",
	"AT": "Austria",
	"BE": "Belgium",
	"BR": "Brazil",
	"CL": "Chile",
	"CN": "China",
	"DE": "Germany",
	"ES": "Estonia",
	"FR": "France",
	"IN": "India",
	"IR": "Iran",
	"IT": "Italy",
	"MX": "Mexico",
	"NL": "Netherlands",
	"PH": "Philippines",
	"RU": "Russia",
	"SA": "Saudi Arabia",
	"SE": "Sweden",
	"SG": "Singapore",
	"UAE": "UAE",
};

$(document).ready(function () {

	// Load the countries into the selectbox
	var c = $("#C");
	var current = c.data('current');
	$.each(window.countrycodes, function (i, v) {
		c.append("<option value='" + i + "'>" + v + "</option>");
	});

	// Does our current 'data' country exist in our known good list?
	if ($("option[value="+current+"]", "#C").length === 0) {
		// No. Set it to Canada
		current = "UK";
	}

	// And this will set the country to be what it should be, and update the states
	c.val(current);

	c.prop("disabled", false);

	// On Country change , fetch country specific configuration parameters
	$("#C").change(function(e) {
			e.preventDefault();
			$.post("ajax.php?module=vega&command=countrychange", { command: 'countrychange', module: "vega", country: $("#C").val() }, function(data){
				console.log(data);
				if (data.status) {
				if (data.config['fxscallerid']) {
					value = data.config['fxscallerid'].trim("\n");
					$('#fxscallerid').val(value);
				}
				if (data.config['fxocallerid']) {
					value = data.config['fxocallerid'].trim("\n");
					$('#fxocallerid').val(value);
				}
				} else {
					alert(data.message);
				}
				});
	});
});
