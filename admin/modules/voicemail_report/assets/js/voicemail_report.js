$(function() {
	bindPlayers();
	$('#voicemails').on("post-body.bs.table", function () {
		bindPlayers();
	});
	$('#greetings').on("post-body.bs.table", function () {
		bindPlayers();
	});
	$("#voicemails").bootstrapTable('refreshOptions', {
		exportOptions: {
			fileName:"Voicemails",
			ignoreColumn: ['playback']
		}
	});
});
function dateFormatter(val){
	return moment.unix(val).tz(timeZone).format("MM/DD/YYYY hh:mm:ss A (Z)");
}
function linkFormatter(val,row){
  var html = '<a href="config.php?display=voicemail_report&view=playback&year='+row['year']+'&month='+row['month']+'&day='+row['day']+'&file='+row['file']+'" target="_blank"><i class="fa fa-download"></i></a>';
  html += '&nbsp;&nbsp;<a href="#" class="delAction delREC" data-year="'+row['year']+'" data-month="'+row['month']+'" data-day="'+row['day']+'" data-file="'+row['file']+'"]><i class="fa fa-trash"></i></a>';
	return html;
}
function playFormatter(val,row){
	if(val == 'na') {
		return _("Default");
	}
	return '<div id="jquery_jplayer_'+val+'" class="jp-jplayer" data-container="#jp_container_'+val+'" data-file="'+val+'"></div><div id="jp_container_'+val+'" data-player="jquery_jplayer_'+val+'" class="jp-audio-freepbx" role="application" aria-label="media player">'+
		'<div class="jp-type-single">'+
			'<div class="jp-gui jp-interface">'+
				'<div class="jp-controls">'+
					'<i class="fa fa-play jp-play"></i>'+
					'<i class="fa fa-undo jp-restart"></i>'+
				'</div>'+
				'<div class="jp-progress">'+
					'<div class="jp-seek-bar progress">'+
						'<div class="jp-current-time" role="timer" aria-label="time">&nbsp;</div>'+
						'<div class="progress-bar progress-bar-striped active" style="width: 100%;"></div>'+
						'<div class="jp-play-bar progress-bar"></div>'+
						'<div class="jp-play-bar">'+
							'<div class="jp-ball"></div>'+
						'</div>'+
						'<div class="jp-duration" role="timer" aria-label="duration">&nbsp;</div>'+
					'</div>'+
				'</div>'+
				'<div class="jp-volume-controls">'+
					'<i class="fa fa-volume-up jp-mute"></i>'+
					'<i class="fa fa-volume-off jp-unmute"></i>'+
				'</div>'+
			'</div>'+
			'<div class="jp-no-solution">'+
				'<span>Update Required</span>'+
				'To play the media you will need to either update your browser to a recent version or update your <a href="http://get.adobe.com/flashplayer/" target="_blank">Flash plugin</a>.'+
			'</div>'+
		'</div>'+
	'</div>';
}

function bindPlayers() {
	$(".jp-jplayer").each(function() {
		var container = $(this).data("container"),
				player = $(this),
				file = $(this).data("file");
		$(this).jPlayer({
			ready: function() {
				$(container + " .jp-play").click(function() {
					if(!player.data("jPlayer").status.srcSet) {
						$(container).addClass("jp-state-loading");
						$.ajax({
							type: 'POST',
							url: "ajax.php",
							data: {module: "voicemail_report", command: "gethtml5", file: file},
							dataType: 'json',
							timeout: 30000,
							success: function(data) {
								if(data.status) {
									player.on($.jPlayer.event.error, function(event) {
										$(container).removeClass("jp-state-loading");
										console.log(event);
									});
									player.one($.jPlayer.event.canplay, function(event) {
										$(container).removeClass("jp-state-loading");
										player.jPlayer("play");
									});
									player.jPlayer( "setMedia", data.files);
								} else {
									alert(data.message);
									$(container).removeClass("jp-state-loading");
								}
							}
						});
					}
				});
				var $this = this;
				$(container).find(".jp-restart").click(function() {
					if($($this).data("jPlayer").status.paused) {
						$($this).jPlayer("pause",0);
					} else {
						$($this).jPlayer("play",0);
					}
				});
			},
			timeupdate: function(event) {
				$(container).find(".jp-ball").css("left",event.jPlayer.status.currentPercentAbsolute + "%");
			},
			ended: function(event) {
				$(container).find(".jp-ball").css("left","0%");
			},
			swfPath: "/js",
			supplied: supportedHTML5,
			cssSelectorAncestor: container,
			wmode: "window",
			useStateClassSkin: true,
			autoBlur: false,
			keyEnabled: true,
			remainingDuration: true,
			toggleDuration: true
		});
		$(this).on($.jPlayer.event.play, function(event) {
			$(this).jPlayer("pauseOthers");
		});
	});

	var acontainer = null;
	$('.jp-play-bar').mousedown(function (e) {
		acontainer = $(this).parents(".jp-audio-freepbx");
		updatebar(e.pageX);
	});
	$(document).mouseup(function (e) {
		if (acontainer) {
			updatebar(e.pageX);
			acontainer = null;
		}
	});
	$(document).mousemove(function (e) {
		if (acontainer) {
			updatebar(e.pageX);
		}
	});

	//update Progress Bar control
	var updatebar = function (x) {
		var player = $("#" + acontainer.data("player")),
				progress = acontainer.find('.jp-progress'),
				maxduration = player.data("jPlayer").status.duration,
				position = x - progress.offset().left,
				percentage = 100 * position / progress.width();

		//Check within range
		if (percentage > 100) {
			percentage = 100;
		}
		if (percentage < 0) {
			percentage = 0;
		}

		player.jPlayer("playHead", percentage);

		//Update progress bar and video currenttime
		acontainer.find('.jp-ball').css('left', percentage+'%');
		acontainer.find('.jp-play-bar').css('width', percentage + '%');
		player.jPlayer.currentTime = maxduration * percentage / 100;
	};
}
