var skip = false;
$(function () {
	$("#previousBtn").click(function () {
		$("#wizard").smartWizard('goBackward');
	});
	$("#nextBtn").click(function () {
		$("#wizard").smartWizard('goForward');
	});
	$("#skipBtn").click(function () {
		skip = true;
		$("#wizard").smartWizard('goForward');
	});
	$('#wizard').smartWizard({
		includeFinishButton: false,
		onLeaveStep: function (obj, context) {
			switch (context.fromStep) {
				case 1:
					if ($("#pbx_type").val() == 'unknown' && $("#pbx_type_name").val().trim() === "") {
						$("#pbx_type_name").focus();
						alert("Please provide a valid Distribution Name");
						return false;
					}
					/*
					if(!$("#tos").is(":checked")) {
						if(!confirm("Are you sure you dont want to win a free iPad? Please read and accept the contest rules if so. Otherwise click OK to continue.")) {
							return false;
						}
					}
					*/
					break;
			}
			if ($("#additional-information").is(":visible") && context.toStep !== 1) {
				if (!skip) {
					/*
					if(isEmpty($('#name').val()) && isEmpty($('#email').val()) && !confirm("Are you sure you don't want to supply this information? You will lose out on important security and feature updates from the development team")) {
						return false;
					}
					*/

					if (!isEmpty($("#phone").val()) && !isDialDigits($("#phone").val().replace(/\-/g, "").replace(/\+/g, ""))) {
						alert("Please enter a valid phone number");
						return false;
					}

					if (!isEmpty($("#email").val()) && !isEmail($("#email").val())) {
						alert("Please enter a valid email number");
						return false;
					}
				}
				/*
				if($("#tos").is(":checked") && (isEmpty($("#email").val()) || isEmpty($('#name').val()))) {
					alert("You can not enter the contest without providing at least your name and email.");
					return false;
				}
				*/
				skip = false;
				$("#skipBtn").addClass("hidden");
			}
			return true;
		},
		onShowStep: function (obj, context) {
			if ($("#pbx_type").is(":visible")) {
				$("#nextBtn").removeClass("hidden");
				$("#previousBtn").removeClass("hidden").prop("disabled", true);
			}
			if ($("#additional-information").is(":visible")) {
				$("#previousBtn").removeClass("hidden");
				$("#skipBtn").removeClass("hidden");
				$("#nextBtn").removeClass("hidden");
			}
			if ($("#upgrader").is(":visible")) {
				$("#previousBtn").addClass("hidden");
				$("#nextBtn").addClass("hidden");
				$("#upgradeModal .modal-body .body").html("Step 4");

				//submit all form data
				$("#upgradeModal .modal-body .body").html("Submitting data to servers...");
				var html = $("#upgradeModal .modal-body .body").html(),
						step = $("#wizard").smartWizard('currentStep'),
						data = {
							module_repo: $("#module_repo").val(),
							tos: false,
							pbx_type: $("#pbx_type").val(),
							pbx_type_name: $("#pbx_type_name").val(),
							name: $("#name").val(),
							company: $("#company").val(),
							phone: $("#phone").val(),
							email: $("#email").val()
						};
				for(i = step; i > 0; i--) {
					$("#wizard").smartWizard('disableStep', i);
				}
				$.post( "ajax.php?module=versionupgrade&command=submit", data, function( data ) {
					if(data.continue) {
						$("#upgradeModal .modal-body .body").html(html + "Done</br>");
						$("#close-button").addClass("hidden");
						$("#wizard .actionBar").addClass("hidden");
						$("#wizard .buttonPrevious").addClass("buttonDisabled hidden");
						$("#wizard .buttonNext").addClass("buttonDisabled hidden");
						$("#do-not").removeClass("hidden");
						upgrade(1);
					} else {
						$("#upgradeModal .modal-body .body").html(html + "ERRORS:" + data.message);
						$("#previousBtn").removeClass("hidden");
						for(i = step; i > 0; i--) {
							$("#wizard").smartWizard('enableStep', i);
						}
					}
				}).fail(function() {
					$("#upgradeModal .modal-body .body").html(html + "ERRORS");
					for(i = step; i > 0; i--) {
						$("#wizard").smartWizard('enableStep', i);
					}
				});
			}
			if (context.toStep == 1) {
				$("#previousBtn").prop("disabled", true);
			} else {
				$("#previousBtn").prop("disabled", false);
			}

			if ($("#upgradephp").is(":visible")) {
				$("#listlog").html("");
				var addList = document.getElementById('listlog');
				var text = document.createElement('div');
				$("#nextBtn").addClass("hidden");
				$("#do-not").removeClass("hidden");
				if(confirm('Starting System upgrade process to upgrade php version to 7.4. This is irreversible step so please ensure to take your PBX backup before proceeding. Are you sure to proceed further ?')) {
					$("#previousBtn").addClass("hidden");
					$("#refreshBtn").addClass("hidden");
					const url = new URL(window.location.href);
					text.innerHTML = "<iframe id='node-service' scrolling=no height='285px' width='100%' src=" + url.protocol +'//' + url.hostname  + ":8090/" + url.port +"></iframe>";
					addList.appendChild(text);
					$.post( "ajax.php?module=versionupgrade&command=upgradephp", data, function( data ) {
					}).fail(function() {
						alert("Sorry, PHP upgrade process has failed.");
					});
					var iframe = document.getElementById('node-service');
  					iframe.src = iframe.src;
					setInterval(function(){ 
					  var iframe = document.getElementById('node-service');
  					  iframe.src = iframe.src;
					}, 1200000);
				} else {	
					text.innerHTML = "<h4> Please Confirm, for php upgrade. </h6>";
					addList.appendChild(text);
				}
			}
		},
		onFinish: function (obj) {
			return false;
		}
	});
	$("#pbx_type").change(function () {
		if ($(this).val() == "unknown") {
			$("#distro-name").removeClass("hidden");
		} else {
			$("#distro-name").addClass("hidden");
		}
	});
	$("#refreshBtn").click(function () {
		$(this).text("Refreshing....");
		$(this).prop("disabled", true);
		window.location = 'config.php?display=modules';
	});
	$(".vu-check").removeClass("hidden");
	$("#vu-apply-config").addClass("hidden");
});

function upgrade(step) {
	var evtSource = new EventSource("ajax.php?module=versionupgrade&command=upgrade&stage=" + step),
		body = $("#upgradeModal .modal-body .body");
	evtSource.onerror = function (e) {
		console.warn(e);
		body.html(body.html() + "NETWORK ERROR (see console log for more details): Try running this manually on the CLI to finish: 'fwconsole ma upgradeall'" + "\n");
		evtSource.close();
		$("#closeBtn").removeClass("hidden");
		$("#do-not").addClass("hidden");
	};
	evtSource.addEventListener("total", function (e) {
		var obj = JSON.parse(e.data),
			progressBar = $("#total .progress-bar");

		progressBar.css("width", obj.percent + "%");
		if (obj.percent == "100") {
			progressBar.removeClass("active");
		}
	});
	evtSource.addEventListener("download", function (e) {
		var obj = JSON.parse(e.data),
			read = parseInt(obj.read),
			total = parseInt(obj.total),
			percent = (read / total) * 100,
			progressContainer = $("#module"),
			progressBar = $("#module .progress-bar");
		switch (obj.progress) {
			case "start":
				break;
			case "processing":
				progressBar.css("width", Math.floor(percent) + "%");
				break;
			case "finished":
				progressBar.css("width", "100%");
				setTimeout(function () {
					progressBar.css("width", "0%");
				}, 500);
				break;
			default:
				console.log(obj);
				break;
		}
	});
	evtSource.addEventListener("array", function (e) {
		var obj = null;
		try {
			obj = JSON.parse(e.data);
		} catch (z) {
			return;
		}
		if (obj === null || typeof obj.status === "undefined") {
			console.log(e.data);
			return;
		}
		switch (obj.type) {
			case "error":
				body.html(body.html() + obj.data + "\n");
				body.scrollTop(1E10);
				break;
			case "message":
				body.html(body.html() + obj.data + "\n");
				body.scrollTop(1E10);
				break;
			case "downloading":
				var read = parseInt(obj.data.read),
					total = parseInt(obj.data.total),
					percent = (read / total) * 100,
					progressContainer = $("#module"),
					progressBar = $("#module .progress-bar");
				if (read == 0) {
					//starting
				} else if ((obj.data.read === null & obj.data.total === null) || read == total) {
					progressBar.css("width", "100%");
					setTimeout(function () {
						progressBar.css("width", "0%");
					}, 500);
				} else {
					progressBar.css("width", Math.floor(percent) + "%");
				}
				break;
		}
	});
	evtSource.addEventListener("message", function (e) {
		var obj = JSON.parse(e.data),
			nl = (typeof obj.newline === "undefined") || (obj.newline) ? "\n" : "";
		body.html(body.html() + obj.message + nl);
		body.scrollTop(1E10);
	});
	evtSource.addEventListener("action", function (e) {
		var obj = JSON.parse(e.data);
		switch (obj.action) {
			case "step":
				evtSource.close();
				 upgrade(obj.step);
				break;
			case "error":
				body.html(body.html() + obj.message + "\n");
				body.scrollTop(1E10);
				$("#closeBtn").removeClass("hidden");
				$("#do-not").addClass("hidden");
				evtSource.close();
				break;
			case "finish":
				$("#post-message").removeClass("hidden");
				$("#refreshBtn").removeClass("hidden");
				$("#do-not").addClass("hidden");
				evtSource.close();
				break;
		}
	});
}
