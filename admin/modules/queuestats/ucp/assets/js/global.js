var BogusChartObject = {
	render: function() { return false; },
	options: { data: {} },
	title: { fontsize: "12px" },
};


var QueuestatsC = UCPMC.extend({
	previous_alerts: {},
	charts: {},
	chartdata: {},
	events: {},
	chart_defaults: {
		dailyqueuestats: {
			title: {
				text: "Daily Queue Statistics"
			},
			toolTip:{
				content:"{tooltip}" ,
			},
			data: [
				{
					type: "spline",
					datapoints: []
				}
			],
			axisX: {
				labelFormatter: function (e) {
					return UCP.timeFormatter(e.value);
				}
			}
		},
		weeklyqueuestats: {
			title: {
				text: "Weekly Queue Statistics"
			},
			toolTip:{
				content:"{tooltip}" ,
			},
			data: [
				{
					type: "spline", datapoints: []
				}
			],
			axisX: {
				labelFormatter: function (e) {
					return UCP.timeFormatter(e.value);
				}
			}
		},
		activequeuecalls: { title: { text: "Current Queue Activity" }, data: [ { type: "doughnut", datapoints: [ ] } ] },
		sla: { title: { text: "SLA for Queue" }, data: [ { type: "doughnut", datapoints: [ ] } ] },
		abandonedqueuecalls: { title: { text: "Abandoned Queue Activity" }, data: [ { type: "doughnut", datapoints: [ ] } ] },
		receivedcalls: { title: { text: "Received Calls for Queue" }, data: [ { type: "doughnut", datapoints: [ ] } ] },
		longwaittime: {
			title: {
				text: "LWT for Queue"
			}, data: [
				{
					type: "doughnut", datapoints: [ ]
				}
			]
		},
		avgwaittime: {
			title: {
				text: "Avg Wait Time for Queue"
			},
			toolTip:{
				content:"{tooltip}" ,
			},
			data: [
				{
					type: "spline",
					datapoints: [ ]
				}
			],
			axisX: {
				labelFormatter: function (e) {
					return UCP.timeFormatter(e.value);
				}
			},
			axisY: {
				title : "Seconds"
			}
		},
		queuesummary: { title: { text: "Queue Summary for Queue" }, data: [ { type: "doughnut", datapoints: [ ] } ] },
		genhtmltext: { title: { text: "Generic HTML|Text for Queue" }, data: [ { type: "doughnut", datapoints: [ ] } ] },
		calleroutcome: { title: { text: "Caller Outcome for Queue" }, data: [ { type: "doughnut", datapoints: [ ] } ] },
	},

	init: function() {
		this.iframe = null;
	},
	showDashboard: function(dashboard_id) {
		var self = this;
	},
	resize: function(x, y, z) {
		// Resize all of our charts.
		for (var uuid in this.charts) {
			this.charts[uuid].render();
		}
	},
	displayWidget: function(widget_id,dashboard_id) {
		var uuid = $(".grid-stack-item[data-id='"+widget_id+"']").data('widget_type_id');
		if(this.charts[uuid]) {
			this.charts[uuid].destroy();
			this.charts[uuid] = null;
			delete(this.charts[uuid]);
		}
		this.renderWidgetContent(uuid);
	},
	prepoll: function() {
		// Get our current elements
		var uuids = [];
		$.each($(".grid-stack-item[data-rawname='queuestats']"), function () {
			uuids.push($(this).data('widget_type_id'));
		});
		return uuids;
	},

	poll: function(data) {
		// The data we get back is dict of uuid => { data }, uuid => { data }.
		// Iterate over the UUIDs, and if they've registered in window.QE,
		// give them the data.
		for (var uuid in data) {
			this.chartdata[uuid] = data[uuid];
			this.renderWidgetContent(uuid);
		}

	},
	renderWidgetContent: function(uuid) {
		var self = this,
				data = this.chartdata[uuid];
		// Do we need to do anything with it?
		if (typeof this.events[uuid] === "undefined") {
			console.log("No handler registered for "+uuid+", skipping");
			return;
		}

		var widget = $(".grid-stack-item[data-widget_type_id='"+uuid+"']");
		if (widget.length === 0) {
			console.log("Returned data for uuid "+uuid+", but can't find it.");
			return;
		}

		var handler = this.events[uuid];
		if(typeof handler !== "string") {
			throw "Handler was an object or function when it should have been a string";
		}

		//$('head').append('<link rel="stylesheet" type="text/css" href="widget.css">');

		// Update any i18n fields
		widget.find(".qs-i18n").each(function() {
			self.update_i18n($(this), data);
		});

		widget.find(".qs-bscstff").each(function() {
			self.update_bscstff($(this));
		});

		widget.find(".qs-divtable").each(function() {
			self.update_divtable($(this));
		});

		widget.find(".qs-divtblcell").each(function() {
			self.update_divtblcell($(this));
		});

		widget.find(".qs-flexmain").each(function() {
			self.update_flexmain($(this));
		});

		widget.find(".qs-flexelement").each(function() {
			self.update_flexelement($(this));
		});

		widget.find(".qs-flexgrow").each(function() {
			self.update_flexgrow($(this));
		});

		// If there's a chart in this widget, load it.
		var cd = widget.find(".chartdiv");
		if (cd.length !== 0) {
			if (typeof data.chartdata !== "undefined") {
				var chart = this.get_chart(cd, uuid, cd.data('charttype'));
				chart.options.data = data.chartdata;
				chart.options.title.text = data.title;
				chart.render();
			}
			// Does this chart have a flextext that needs to be resized?
			var ft = widget.find(".flextext");
			if (typeof ft !== "undefined") {
				$(ft).each(function() {
					if (!chart || !chart.title) {
						console.log("Widget "+uuid+" has a flextext but no chart. This is only a warning");
						// Strange. Has a flextext but no chart
						return;
					}
					// Set the font size to be twice the chart title size
					$(this).css('font-size', chart.title.fontSize * 2).
						// and move it down so it's actually in the center
						css('padding-top', chart.title.fontSize);
				});
			}
		}

		// It's something we should know about already
		var methodname = "handler_"+handler;
		if (typeof this[methodname] === "undefined") {
			console.log("Unable to find handler "+handler);
			return;
		}
		this[methodname](widget, uuid, data);
	},

	// This simply dumps data into any 'debug' div it finds.
	handler_debug: function(widget, uuid, data) {
		var debugtext = JSON.stringify(data, null, '\t');
		widget.find('.debug').each(function() { $(this).text(debugtext); });
	},

	update_bscstff: function(div){
		$(div).css("background-color", "white");
	},

	update_divtable: function(div){
		$(div).css("width", "100%");
		$(div).css("height", "100%");
		//$(div).css("background-color", "blue");
	},

	update_divtblcell: function(div){
		$(div).css("border", "5px solid white");
		$(div).css("background-color", "red");
	},

	update_flexmain: function(div){
		$(div).css("display", "flex");
		//$(div).css("flex-flow", "row wrap");
		$(div).css("flex-flow", "row nowrap");
		$(div).css("justify-content", "space-around");
		//$(div).css("justify-content", "center");
		//$(div).css("height", "33%");
		$(div).css("align-items", "center");
	},
/*
	update_flexmain: function(div){
		$(div).css("display", "flex");
		//$(div).css("flex-flow", "row wrap");
		$(div).css("flex-flow", "row nowrap");
		$(div).css("justify-content", "space-around");
		//$(div).css("justify-content", "center");
		$(div).css("height", "33%");
		$(div).css("align-items", "center");
	},

	update_flexelement: function(div){
		$(div).css("background", "tomato");
		$(div).css("padding", "5px");
		$(div).css("width", "200%");
		$(div).css("height", "100%");
		$(div).css("margin-top", "10px");
		$(div).css("line-height:", "100px");
		$(div).css("color", "white");
		$(div).css("font-weight", "bold");
		$(div).css("font-size", "3em");
		$(div).css("text-align", "center");
	},
 */
	update_flexelement: function(div){
		$(div).css("background", "tomato");
		$(div).css("padding", "5px");
		$(div).css("width", "200%");
		$(div).css("height", "100%");
		$(div).css("margin-top", "10px");
		$(div).css("line-height:", "100px");
		$(div).css("color", "white");
		$(div).css("font-weight", "bold");
		$(div).css("font-size", "3em");
		$(div).css("text-align", "center");
	},

/*
	update_flexelement: function(div){
		//$(div).css("background", "tomato");
		//$(div).css("padding", "5px");
		//$(div).css("margin-top", "10px");
		//$(div).css("width", "100%");
		//$(div).css("height", "100%");
		//$(div).css("line-height:", "100px");
		//$(div).css("color", "white");
		$(div).css("font-weight", "bold");
		//$(div).css("font-size", "3em");
		$(div).css("text-align", "center");
	},
*/
	update_flexgrow: function(div){
		$(div).css("flex-grow", "1");
		//$(div).css("align-items", "flex-end");
	},

	update_i18n: function(div, data) {
		// Match anything that is NOT a _, between __ and __
		var regexp = /(__([^_]+)__)/g;
		if(div[0].className == "flextext qs qs-i18n"){
			if(this.iframe == data.text){
				return;
			}
			this.iframe = data.text;
		}
		var newtext = div.data('i18n').replace(regexp, function(x, y, z) {
			// x and y are __WHATEVER__ and z is WHATEVER
			var newval = data[z.toLowerCase()];
			if (typeof newval !== "undefined") {
				if (!newval) {
					return "";
				}
				return newval;
			}
			return "__ERROR-"+z+"__";
		});
		div.html(newtext);
	},

	get_chart: function(chartdiv, uuid, name) {
		var chart = this.charts[uuid];
		// If we don't have a CanvasJS object in the global namespace,
		// return a bogus chart object
		if (typeof CanvasJS === "undefined") {
			return BogusChartObject;
		}

		if (typeof this.charts[uuid]  === "undefined" || this.charts[uuid] === null) {
			var chartOptions = jQuery.extend({backgroundColor: null},this.chart_defaults[name]);
			this.charts[uuid] = new CanvasJS.Chart(chartdiv[0], chartOptions);
		}
		return this.charts[uuid];
	},

	handler_toplwt: function(widget, uuid, data) {
		if (typeof data.title !== "undefined" && typeof this.charts[uuid] !== "undefined") {
			this.charts[uuid].options.title.text = data.title;
		}

		var container = widget.find('ul.list-container');
		container.html("");
		if(data.calls.length) {
			async.each(data.calls, function(call, callback) {
				container.append("<li>"+sprintf(_("On %s at %s caller '%s' waited for %s"),UCP.dateFormatter(call.entrytime),UCP.timeFormatter(call.entrytime),call.callerid,call.holdtimenice)+"</li>");
				callback();
				}, function(err) {
				}
			);
		} else {
			container.append("<li>"+_("No Longest Wait Times on Record")+"</li>");
		}
	},

	handler_sla: function(widget, uuid, data) {
		// Update the title of the chart if we can
		if (typeof data.title !== "undefined" && typeof this.charts[uuid] !== "undefined") {
			this.charts[uuid].options.title.text = data.title;
		}

		if (typeof data.alrtmsg !== "undefined") {
			this.displayNotification(uuid, data.widgetname, data.alrtmsg);
		}
	},

	handler_activecalls: function(widget, uuid, data) {
		widget.find('td.activecalls').text(data.active);
		widget.find('td.waitingcalls').text(data.waiting);
		widget.find('td.agentcount').text(data.agentcount);
	},

	handler_abandoned: function(widget, uuid, data) {

	},

	handler_receivedcalls: function(widget, uuid, data) {
		if (typeof data.title !== "undefined" && typeof this.charts[uuid] !== "undefined") {
			this.charts[uuid].options.title.text = data.title;
		}
	},

	handler_longwaittime: function(widget, uuid, data) {
		// Update the title of the chart if we can
		if (typeof data.title !== "undefined" && typeof this.charts[uuid] !== "undefined") {
			this.charts[uuid].options.title.text = data.title;
		}

		if (typeof data.alrtmsg !== "undefined") {
			this.displayNotification(uuid, data.widgetname, data.alrtmsg);
		}
	},

	map_agent_icon: function(state) {
		var mappings = {
			unknown: {
				"class": [ "fa-user-circle-o" , 'opacity' ],
				"text": _("Logged Out")
			},
			idle: {
				"class": [ "fa-user-circle-o" ],
				"text": _("Idle")
			},
			ringing: {
				"class": [ "fa-phone", "animated", "faa-ring", "green" ],
				"text": _("Ringing")
			},
			queuecall: {
				"class": [ "fa-phone", "green" ],
				"text": _("In Queue Call")
			},
			othercall: {
				"class": [ "fa-phone-square", "green" ],
				"text": _("In Non-Queue Call")
			},
			wrapup: {
				"class": [ "fa-tty", "green" ],
				"text": _("Wrapping Up")
			},
			paused: {
				"class": [ "fa-eye-slash", "green" ],
				"text": _("Paused")
			},
			dnd: {
				"class": [ "fa-eye-slash", "red" ],
				"text": _("DND")
			},
		};

		var icon = (typeof mappings[state] !== "undefined") ? mappings[state] : mappings.unknown;
		return icon;
	},

	handler_agentstate: function(widget, uuid, data) {
		var icon = this.map_agent_icon(data.currentstatus)
		var html = "<i class='fa fa-5x "+icon.class.join(" ")+"'></i>";
		widget.find(".stateicon").each(function() { $(this).html(html); });
		widget.find(".agent-status-text").each(function() { $(this).text(icon.text); });
		return;
	},

	handler_dailyqueuestats: function(widget, uuid, data) {
		// Nothing here, as it's all done backend.
	},

	handler_avgwaittime: function(widget, uuid, data) {
		if (typeof data.title !== "undefined" && typeof this.charts[uuid] !== "undefined") {
			this.charts[uuid].options.title.text = data.title;
		}
	},

	handler_agentsummary: function(widget, uuid, data) {
		var icon = this.map_agent_icon(data.currentstatus)
		var html = "<i class='fa fa-5x "+icon.class.join(" ")+"'></i>";
		widget.find(".stateicon").each(function() { $(this).html(html); });
		widget.find(".agent-status-text").each(function() { $(this).text(icon.text); });
		return;
	},

	handler_multipleagentsummary: function(widget, uuid, data) {
		var self = this;
		widget.find(".agent-container").each(function() {
			var container = $(this);
			var agent = container.data("agent");
			if(typeof data['currentstatus-'+agent] === "undefined") {
				return true;
			}
			var icon = self.map_agent_icon(data['currentstatus-'+agent])
			var html = "<i class='fa fa-5x "+icon.class.join(" ")+"'></i>";
			container.find(".stateicon").each(function() { $(this).html(html); });
			container.find(".agent-status-text").each(function() { $(this).text(icon.text); });
		});
	},

	handler_queuesummary: function(widget, uuid, data) {
		var settings = {
			strokeWidth: 6,
			easing: 'easeInOut',
			duration: 1400,
			color: '#369dad',
			trailColor: 'rgb(202, 202, 202)',
			trailWidth: 1,
			svgStyle: null,
			text: {
				autoStyleContainer: false,
				style: {
					fontSize: "1.7rem",
					textAlign: 'center',
					position: 'absolute',
					top: '0',
					paddingTop: '15px',
					paddingLeft: '6px',
					paddingRight: '6px',
					width: '50%',
					height: '100%',
					color: 'rgb(47, 64, 80)'
				}
			}
		};
		$(".progress-circle-"+uuid).html("");
		var bar = new ProgressBar.Circle('#progress-circle-abandonded-'+uuid, settings);
		bar.set(1);
		//bar.animate(1);
		bar.setText('<span><i class="fa fa-times fa-lg" aria-hidden="true"></i><br/>'+data.abandoned+'</span>');
		$('#progress-circle-abandonded-'+uuid).textfill({
			explicitHeight: $(".progress-circle").one().height()-55
		})

		var bar = new ProgressBar.Circle('#progress-circle-received-'+uuid, settings);
		bar.set(1);
		//bar.animate(1);
		bar.setText('<span><i class="fa fa-phone fa-lg" aria-hidden="true"></i><br/>'+data.received+'</span>');
		$('#progress-circle-received-'+uuid).textfill({
			explicitHeight: $(".progress-circle").one().height()-55
		})

		var bar = new ProgressBar.Circle('#progress-circle-waiting-'+uuid, settings);
		bar.set(1);
		//bar.animate(1);
		bar.setText('<span><i class="fa fa-pause fa-lg" aria-hidden="true"></i><div style="font-size: 0.65em;line-height: 1;margin-top: 0.3em;">'+moment.duration(parseInt(data.avgwaitsec), 'seconds').format('D[ day] H[ hour(s)] m[ minute] s[ second]')+'</div></span>');
		$('#progress-circle-waiting-'+uuid).textfill({
			explicitHeight: $(".progress-circle").one().height()-55
		})
	},

	handler_calleroutcome: function(widget, uuid, data) {
		var settings = {
			strokeWidth: 6,
			easing: 'easeInOut',
			duration: 1400,
			color: '#369dad',
			trailColor: 'rgb(202, 202, 202)',
			trailWidth: 1,
			svgStyle: null,
			text: {
				autoStyleContainer: false,
				style: {
					fontSize: "1.7rem",
					textAlign: 'center',
					position: 'absolute',
					top: '0',
					paddingTop: '15px',
					paddingLeft: '6px',
					paddingRight: '6px',
					width: '50%',
					height: '100%',
					color: 'rgb(47, 64, 80)'
				}
			}
		};
		$(".progress-circle-"+uuid).html("");

		var bar = new ProgressBar.Circle('#progress-circle-answered-'+uuid, settings);
		bar.set(1);
		//bar.animate(1);
		bar.setText('<span><i class="fa fa-phone fa-lg" aria-hidden="true"></i><br/>'+data.answered+'</span>');
		$('#progress-circle-answered-'+uuid).textfill({
			explicitHeight: $(".progress-circle").one().height()-55
		})

		var bar = new ProgressBar.Circle('#progress-circle-timeout-'+uuid, settings);
		bar.set(1);
		//bar.animate(1);
		bar.setText('<span><i class="fa fa-hourglass-end fa-lg" aria-hidden="true"></i><br/>'+data.timeout+'</span>');
		$('#progress-circle-timeout-'+uuid).textfill({
			explicitHeight: $(".progress-circle").one().height()-55
		})

		var bar = new ProgressBar.Circle('#progress-circle-hungup-'+uuid, settings);
		bar.set(1);
		//bar.animate(1);
		bar.setText('<span><i class="fa fa-times fa-lg" aria-hidden="true"></i><br/>'+data.hungup+'</span>');
		$('#progress-circle-hungup-'+uuid).textfill({
			explicitHeight: $(".progress-circle").one().height()-55
		})

	},

	handler_genhtmltext: function(widget, uuid, data) {
		if (typeof data.title !== "undefined" && typeof this.charts[uuid] !== "undefined") {
			this.charts[uuid].options.title.text = data.title;
		}
	},

	displayNotification: function(uuid, title, body) {
		if(!UCP.notify) {
			return;
		}
		if (typeof this.previous_alerts[uuid] === "undefined" || this.previous_alerts[uuid] === null || this.previous_alerts[uuid] !== body) {
			this.previous_alerts[uuid] = body;
			var notification = new Notify(title, {
				body: body,
				icon: "modules/Queuestats/assets/images/alert.png"
			});
			notification.show();

			//after 1 minute re-display the alert
			var $this = this;
			setTimeout(function(){
				if($this.previous_alerts[uuid] !== body) {
					return
				}
				$this.previous_alerts[uuid] = null;
				delete($this.previous_alerts[uuid]);
			},60000);
		}
	}
});
