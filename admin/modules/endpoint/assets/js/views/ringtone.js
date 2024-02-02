var recordings = {}, recording = false, soundBlob = null, recordTimer = null;
$(document).ready(function() {
	/** File Drop **/
	//Stop the browser from showing us the file we dropped.
	//Thaaaaaanx chrome, I dont want to see it
	$('.dropzone').on('drop dragover', function (e) {
		e.preventDefault();
	});
	//remove our cool class when we drop or leave
	$('.dropzone').on('dragleave drop', function (e) {
		$(this).removeClass("activate");
	});
	//add our cool class when we hover a file to be dropped
	$('.dropzone').on('dragover', function (e) {
		$(this).addClass("activate");
	});
	//the upload container magic (note this is an each)
	$(".fileupload-container").each(function() {
		var input = $(this).find(".input-upload"),
				dropzone = $(this).find(".dropzone"),
				progressBar = $(this).find(".progress-bar"),
				key = $(this).data("key");

		input.fileupload({
			dataType: 'json',
			dropZone: dropzone,
			add: function (e, data) {
				//build pattern of supported formats
				var sup = "\.("+supportedRegExp+")$",
						patt = new RegExp(sup),
						submit = true;
				//only one file is allowed here
				if(data.files.length > 1) {
					alert(_("Only one file is allowed at a time"));
					return false;
				}
				//loop over files... file
				$.each(data.files, function(k, v) {
					if(!patt.test(v.name.toLowerCase())) {
						submit = false;
						alert(_("Unsupported file type"));
						return false;
					}
				});
				//ok they look good now submit
				if(submit) {
					data.submit();
				}
			},
			//what to do when the file is dropped
			drop: function () {
				progressBar.css("width", "0%");
			},
			//drag over, same thing
			dragover: function (e, data) {
			},
			change: function (e, data) {
			},
			//file has been uploaded. AJAX done.
			done: function (e, data) {
				if(data.result.status) {
					$("#jquery_jplayer_"+key).jPlayer( "clearMedia" );
					recordings[key] = data.result.localfilename;
				} else {
					alert(data.result.message);
				}
			},
			//during progress
			progressall: function (e, data) {
				var progress = parseInt(data.loaded / data.total * 100, 10);
				progressBar.css("width", progress+"%");
			},
			//AJAX Faile: file failed :-(
			fail: function (e, data) {
			},
			//AJAX Always
			always: function (e, data) {
			}
		});
	});
	/** End file Drop **/

	/** In-Browser Playback **/
	$(".browser-player-container").each(function() {
		var key = $(this).data("key"),
				uploadProgress = $(this).find(".browser-recorder-progress"),
				player = $("#jquery_jplayer_"+key),
				container = player.data("container");

		//show it
		$(this).removeClass("hidden");
		$("#jquery_jplayer_"+key).jPlayer({
			ready: function(event) {
				$("#"+container + " .jp-play").click(function() {
					if(!player.data("jPlayer").status.srcSet) {
						$("#"+container).addClass("jp-state-loading");
						//it is a temp file OR a ringtone file
						if(typeof recordings[key] !== "undefined" || !isNaN(parseInt(player.data("recording-id")))) {
							var type = (typeof recordings[key] !== "undefined") ? "temp" : "ringtone",
									id = (typeof recordings[key] !== "undefined") ? recordings[key] : player.data("recording-id");
							//get our html5 file, hope we have one
							$.ajax({
								type: 'POST',
								url: "ajax.php",
								data: {module: "endpoint", command: "gethtml5", id: id, type: type},
								dataType: 'json',
								timeout: 30000,
								success: function(data) {
									if(data.status) {
										player.on($.jPlayer.event.error, function(event) {
											$("#"+container).removeClass("jp-state-loading");
											console.log(event);
										});
										player.one($.jPlayer.event.canplay, function(event) {
											$("#"+container).removeClass("jp-state-loading");
											player.jPlayer("play");
										});
										player.jPlayer( "setMedia", data.files);
									} else {
										alert(data.message);
										$("#"+container).removeClass("jp-state-loading");
									}
								}
							});
						} else {
							alert(_("No file to load!"));
						}
					} else {
						//source is already set
					}
				});
			},
			//moves our ball
			timeupdate: function(event) {
				$("#jp_container_"+key).find(".jp-ball").css("left",event.jPlayer.status.currentPercentAbsolute + "%");
			},
			//puts our ball back at the start
			ended: function(event) {
				$("#jp_container_"+key).find(".jp-ball").css("left","0%");
			},
			cssSelectorAncestor: "#jp_container_"+key,
			swfPath: "http://jplayer.org/latest/dist/jplayer",
			supplied: supportedHTML5,
			wmode: "window",
			useStateClassSkin: true,
			autoBlur: false,
			keyEnabled: true,
			remainingDuration: true,
			toggleDuration: true
		});
		var acontainer = null;
		$('#jp_container_'+key+' .jp-play-bar').mousedown(function (e) {
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
	});
	/** End In Browser Playback **/
});

$("#ringtone-frm").submit(function() {
	//are there recordings?
	$.each(recordings, function(k, v){
		$("#" + k).val(v);
	});
});
