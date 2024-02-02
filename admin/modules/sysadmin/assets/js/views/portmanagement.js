/* New Portmanagement code */

/* Make sure we know what the port was before it was changed */
$(".portsel").on("click", function() {
	var iam = $(this);
	iam.data("previous", this.value);
	checkForce();
}).on("change", function() {
	/* And ensure we're bound to all the select boxes */
	// Is this a custom port?
	if ($(this).val() == "custom") {
		showCustom($(this));
	} else {
		updatePort($(this));
	}

	if(!getForceButtonActiveStatus()){
		checkForce(true);		
	}else{
		checkForce();
	}
	
});

/* Catch when the text inputs lose focus */
$(".autohide").on("focusout", function() {
	var iam = $(this);
	var txtval = iam.val().trim();
	var selname = iam.data('selectname');
	var previous = $("#"+selname).data("previous");
	// If, somehow, previous is 'custom', then don't.
	if (previous == "custom") {
		previous = "disabled";
	}
	// If it was empty, then there's no need to change anything.
	if (txtval.length == 0) {
		// Set our select box back to what it was
		$("#"+selname).val(previous).change();
	} else {
		// It was set to something, so validate it and add it
		// if needed
		var num = Number(txtval);
		// num !== num is the only way to reliably check for NaN before ES6
		if (num < 80 || num > 65534 || (num !== num)) {
			// It can only be a number, and it can't be stupid. Error.
			iam.addClass('pulsebg');
			// Remove that class when the animation has finished
			setTimeout(function() { iam.removeClass('pulsebg'); }, 2100);
			return;
		}
		if (!validatePortNumber(txtval, selname)) {
			// It errored. Don't rehide;
			window.setTimeout(function() { iam.focus(); }, 100);
			return;
		}
	}
	iam.hide();
	$("#"+selname).show();
})

/* Wait for document ready, and then bind to the updateports button,
 * as that's generated after all this */
$(document).ready(function() {
	$('#updateports').click(function(e){
		// We'll reload when we're good and ready
		e.preventDefault();
		validateSaveClick();
	});
	getForce();
	checkForce();
});

/**
 * LE is used
 * We use menu select.
 */
if($("#fqdn-select").length){
	window.le = "yes";
	$("#fqdn-select").on("change", function() {
		checkForce(true);
	});	
}

/**
 * LE not used
 * We use input text.
 */
if($("#fqdn-input").length){
	window.le = "no";
	$("#fqdn-input").on("change", function() {
		checkForce();		
	}).on("mouseout", function() {
		checkForce();
	});	

	$("#fqdn-import").on("click", function(){
		$("#fqdn-input").val($("#fqdn-apache").val());
		checkForce();
	})
}

function checkForce(msg = false){
	if(checkFQDN(msg) == false){
		$(".force").addClass("disabled");
	}
	else{
		$(".force").removeClass("disabled");
	}
	checkSelectSSL();
}

function checkFQDN(msg = false){
	if($("#fqdn-select").length){
		fqdn = $("#fqdn-select option:selected").val(); 
		if(fqdn == ""){
			if(msg){
				fpbxToast(_("You must define a valid FQDN."),'Warning','warning');
			}	
			return false;
		}
	}
	else{
		fqdn = $("#fqdn-input").val();
		if(fqdn == ""){
			if(msg){
				fpbxToast(_("You must define a valid FQDN."),'Warning','warning');
			}			
			return false;
		}			
	}
	return fqdn;
}

function updatePort(t) {
	// Start by checking to make sure there's no conflicts
	// with another port.
	var iam = t.attr('name');
	var myport = t.val();

	if (myport !== "disabled") {
		$.each($('.portsel'), function() {
			var thisobj = $(this);
			// If this is me, skip.
			if (thisobj.attr('name') == iam) {
				return;
			}
			// It's not me, so make sure they don't have my port.
			// If they do, set it to disabled.
			if (thisobj.val() == myport) {
				// If thisobj is acp or sslacp, then that wins, as it doesn't
				// have the ability to be disabled, so THIS gets disabled, instead
				if (thisobj.attr('name') == 'acp' || thisobj.attr('name') == 'sslacp') {
					t.val('disabled').change();
				} else {
					thisobj.val("disabled");
				}
				thisobj.addClass('pulsebg');
				// Remove that class when the animation has finished
				setTimeout(function() { thisobj.removeClass('pulsebg'); }, 2100);
			}
		});
	}
}

function showCustom(t) {
	var iam = t.attr('name');
	// Hide our select box, and show the input box
	$("#select-"+iam).hide();
	$("#autohide-"+iam).show().focus();
}

// Make sure this doesn't conflict with another port
function validatePortNumber(portnum, selname) {
	console.log("I want to validate portnum for selname", portnum, selname);

	var allok = true;
	// Make sure there's no port duplication
	$.each($('.portsel'), function() {
		var thisobj = $(this);
		// If this is me, skip.
		if (thisobj.attr('name') == selname) {
			return;
		}
		// It's not me, so make sure they don't have my port.
		// If they do, flash it and return false
		if (thisobj.val() == portnum) {
			thisobj.addClass('pulsebg');
			// Remove that class when the animation has finished
			setTimeout(function() { thisobj.removeClass('pulsebg'); }, 2100);
			allok = false;
			return false;
		}
	});
	if (!allok) {
		return false;
	}

	// Now we need to check if this port number is in the dropdown list, and if
	// it's not, add it.
	var foundport = false;
	$.each($("#"+selname+" option"), function() {
		if (this.value == portnum) {
			// Yes, it's already here
			$("#"+selname).val(portnum).change();
			foundport = true;
			return false;
		}
	});

	// Did we find it?
	if (foundport) {
		// We did, nothing more to do
		return true;
	}

	// We didn't, and it needs to be added to the select. To stop it growing,
	// we only keep the previous val in the select box.
	//
	// Remove the customselect BEFORE the current, if it exists
	$("#"+selname+" .oldcustomselect").remove();
	// Now mark the current one, if there is one, as oldcustomselect so it'll get
	// pruned next time.
	$("#"+selname+" .customselect").removeClass('customselect').addClass('oldcustomselect');

	// Now add this one as a new one to the select
	var newopt = $('<option>', { value: portnum, text: 'Custom: '+portnum, class: 'customselect', selected: true });
	$("#"+selname).append(newopt).change();
	return true;
}

function validateSaveClick() {
	// Clean out any errors from a previous run
	$(".errclass").html("");
	// Make sure there aren't any input boxes showing. If there
	// are, it means that they have an error.
	var txtboxes = $(".autohide:visible");
	if (txtboxes.length !== 0) {
		// There's an error somewhere. Flash it, and don't submit.
		$.each(txtboxes, function() {
			var thisobj = $(this);
			thisobj.addClass('pulsebg');
			// Remove that class when the animation has finished
			setTimeout(function() { thisobj.removeClass('pulsebg'); }, 2100);
		});
		return false;
	}
	if($("#scdenabled").val()=='Yes' &&  $("#select-sslsngphone").val() !='disabled'){
		if($("#select-sslrestapps").val() == 'disabled'){
			alert("RESTful Phone Apps (https) port is disabled now , Sangomaconect Desktop phone service needs RESTful Phone Apps Https port.");
			return false;
		}
	}
	fqdn = checkFQDN();
	
	if(window.le == "yes"){
		$.ajax({
			url: window.ajaxurl,
			dataType: "json",
			async: false,
			data: { module: "sysadmin", command: "checkFQDN", fqdn: fqdn},
			success: function(d) {
				if(d.error && !getForceButtonActiveStatus()){
					fpbxToast( sprintf( _("%s: %s"),fqdn , d.msg )+" "+_("Create a valid certificate and try again."),'Error','error');
					return false;
				}
			},
			error: function(xhr, status, error) {
				fpbxToast('Ajax request error.','Ajax Error','error');
				console.error(xhr, status, error);
			}
		});
	}

	checkForce();
	if ($("#scdenabled").val() =='Yes') {
		alert("Changing the Sangoma Desktop phone port can cause call disconnection for SCD clients.");
	}
	// No errors. Submit!
	var data = { module: "sysadmin", command: "updateports" };
	$(".portsel").each(function() {
		data[$(this).attr('name')] = this.value;
		$force = $(this).attr('id').replace("select-ssl","");		
		if($force != 'e' && $force.indexOf('select-') == -1){
			saveForce($force);
			if(this.value == "yes" && fqdn == false){
				console.debug("Data not saved");
				return false;
			}
		}
	});

	
	data["fqdn"] 	= fqdn;
	data["le"] 		= window.le;
	console.log("No errors, submitting", data);

	var dstport = data.acp;

	// If this is ssl, we want to connect to the sslacp port
	if (window.location.protocol !== "http:") {
		dstport = data.sslacp;
		if (dstport == "disabled") {
			// default to 443
			dstport = 443;
		}
	}
	var newhost = window.location.hostname+":"+dstport
	var dest = window.location.protocol+"//"+newhost+window.location.pathname+"?display=sysadmin&view=portmgmt";
	// Ajax-pinging address.
	var h = window.location.protocol+"//"+newhost+"/admin/ajax.php";
	
	fpbxToast(_("Saving... Please wait."),'Saving','success');

	$.ajax({
		url: window.ajaxurl,
		data: data,
		error: function(d) { d.suppresserrors = true; window.setTimeout(function() {waitFor(h, dest)}, 1000); },
		complete: function(d) {resp = $.parseJSON(d.responseText);if(resp.status == 0){ alert(resp.msg);return ;} window.setTimeout(function() {waitFor(h, dest)}, 1000); }
	});
}

function waitFor(h, dest) {
	// Try to connect to h. If it fails, sleep for 500msec and try again.
	$.ajax({
		url: h,
		data: { module: "sysadmin", command: "checkready", },
		success: function() { window.location.href = dest; },
		error: function(d) { d.suppresserrors = true;window.setTimeout(function() {waitFor(h, dest)}, 1000); }
	});
}

$(".force").on("click",function(){
	var button = this.id;
	if($("#"+button).hasClass("active")){
		$("#"+button).removeClass("active");
	}
	else{
		$("#"+button).addClass("active");
	}
	if(!getForceButtonActiveStatus()){
		checkForce(true);
	}	
});

function force(port, status){
	/**
	 * Save Force port 
	 */
	$.ajax({
		url: window.ajaxurl,
		dataType: "json",
		async: false,
		data: { module: "sysadmin", command: "force", port: port, status: status},
		success: function() {
			// Do something if necessary
		},
        error: function(xhr, status, error) {
            fpbxToast('Ajax request error.','Ajax Error','error');
            console.error(xhr, status, error);
        }
	});
}

function getForce(){
	$.ajax({
		url: window.ajaxurl,
		data: { module: "sysadmin", command: "getForce"},
		async: false,
		success: function(data) {
			if(data.acp == "no"){ $("#acp").removeClass("active"); }
			if(data.acp == "yes"){ $("#acp").addClass("active"); }

			if(data.ucp == "no"){ $("#ucp").removeClass("active"); }
			if(data.ucp == "yes"){ $("#ucp").addClass("active"); }

			if(data.hpro == "no"){ $("#hpro").removeClass("active"); }
			if(data.hpro == "yes"){ $("#hpro").addClass("active"); }

			if(data.restapi == "no"){ $("#restapi").removeClass("active"); }
			if(data.restapi == "yes"){ $("#restapi").addClass("active"); }

			if(data.restapps == "no"){ $("#restapps").removeClass("active"); }
			if(data.restapps == "yes"){ $("#restapps").addClass("active"); }
		},
        error: function(xhr, status, error) {
            fpbxToast('Ajax request error on: getForce.','Ajax Error','error');
            console.error(xhr, status, error);
        }
	});	
}

function getForceButtonActiveStatus(){
	if( $("#acp").hasClass('active')){
		return false;
	}
	if( $("#ucp").hasClass('active')){
		return false;
	}
	if( $("#hpro").hasClass('active')){
		return false;
	}
	if( $("#restapi").hasClass('active')){
		return false;
	}
	if( $("#restapps").hasClass('active')){
		return false;
	}
	return true;
}

function saveForce(button){
	checkForce();
	if($("#"+button).hasClass('disabled')){
		force(button, "no");
		return;
	}
	if($("#"+button).hasClass('active')){
		force(button, "yes");
		return;
	}
	else{
		force(button, "no");
	}
	return;
}

function checkSelectSSL(){
	window.http = [];
	$(".portsel").each(function() {
		portsel_name= $(this).attr('name');
		switch(portsel_name){
			case "acp":
			case "ucp":
			case "hpro":
			case "restapi":
			case "restapps":
				$force = $(this).attr('id').replace("select-","");
				if($force.indexOf('select-') == -1){
					selContent = $("#select-"+portsel_name+" option:selected").text();
					window.http["ssl"+$force] = "";
					if(selContent == "Disabled"){
						$("#"+$force).addClass("disabled");		
						if($("#"+$force).hasClass("active")){
							$("#"+$force).removeClass("active");
						}
						window.http["ssl"+$force] = "disabled";
					}
					else{
						$("#"+$force).removeClass("disabled");
					}
				}				
			break;
			case "sslacp":
			case "sslucp":
			case "sslhpro":
			case "sslrestapi":
			case "sslrestapps":
				$force = $(this).attr('id').replace("select-ssl","");
				if($force.indexOf('select-') == -1){
					selContent = $("#select-"+portsel_name+" option:selected").text();
					if(selContent == "Disabled"){
						$("#"+$force).addClass("disabled");
						if($("#"+$force).hasClass("active")){
							$("#"+$force).removeClass("active");
						}
					}
					else{
						if(window.http[portsel_name] != "disabled"){
							$("#"+$force).removeClass("disabled");
						}						
					}
				}
			break;
		}		
	});
}
