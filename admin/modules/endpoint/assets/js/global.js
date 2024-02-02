//validation functions
function validatePass(passInfo){
  if (passInfo.field.val() === undefined) {
    return;
  }
  if (passInfo) {
    //it's NOT valid
    if (passInfo.field.val().length > 0) {
      if(passInfo.field.val().length <6){
        passInfo.field.addClass("globalError");
        passInfo.error.text(passInfo.name + " Password MUST be at least 6 characters");
        passInfo.error.addClass("globalError");
        return false;
      } else { //it's valid
        passInfo.field.removeClass("globalError");
        passInfo.error.text(" ");
        passInfo.error.removeClass("globalError");
        return true;
      }
    }
  }
}

$(document).ready(function() {
  //global vars
	var form = $("#global");
	var admin = [];
	var user = [];
	var selectedVal, clickedVal;
	admin.field = $("#admin_password");
	admin.name = 'Admin';
	admin.error = $('#adminPass');
	user.field = $("#user_password");
	user.name = 'User';
	user.error = $('#userPass');

    var selected = $("input[type='radio'][name='dpma']:checked");
	if (selected.length > 0) {
    selectedVal = selected.val();
    }	
	(selectedVal === 'Y') ? $('#dpma-radioset a').show() : $('#dpma-radioset a').hide();

	$("input[type='radio'][name='dpma']").click(function() { 
		 clickedVal = $(this).attr("value");
		if(clickedVal === 'Y') {
			if(confirm(_("During this process Asterisk will restart. Are you sure you want to continue?"))){
				var url = endpointBaseAjaxUrl +"&command=checkDPMAModule";
				var title = 'Enable DPMA Process Status';
				process_module_actions(url, title);
				$('#dpma-radioset a').show();
			} else {
				$('#dpma-radioset a').hide();
				return false;
			}
		} else {
			if(confirm(_("Are you sure, the configured d-phones will get unregistered?"))){
				$('#dpma-radioset a').hide();
			} else {
				$('#dpma-radioset a').show();
				return false;
			}
		}
    }); 
	
	//On blur
	// Define an object in the global scope (i.e. the window object)
	admin.field.blur(validatePass(admin));
	user.field.blur(validatePass(user));
	//On key press
	admin.field.keyup(validatePass(admin));
	user.field.keyup(validatePass(user));
	//On Submitting
	form.submit(function(){
		if(validatePass(admin) && validatePass(user)){
			return true;
		} else {
			return false;
		}
	});
	
	//display key types
	$(document).on('change', '.keyType', function() {
		var name = $(this).prop('name');
		var length = name.length;
		name = name.substr(8, length);
		$(".hideKeys").hide();
		$("#" + name).show();
	});

	$(".firmware__container ul li").slice(0, 6).show();
	$("#loadLess").hide();
	if ($("#slot1TA").html().replace(/\t/g, "").replace(/\n/g, "")) {
		$('.slot1_divider').show();
	} else {
		$('.slot1_divider').hide();
	}
	if ($("#slot2TA").html().replace(/\t/g, "").replace(/\n/g, "")) {
		$('.slot2_divider').show();
	} else {
		$('.slot2_divider').hide();
	}

	$("#loadMore").on("click", function (e) {
		e.preventDefault();
		$(".firmware__container ul li:hidden").slice(0, 50).slideDown();
		if ($(".firmware__container ul li:hidden").length == 0) {
			$("#loadMore").hide();
			$("#loadLess").show();
		}
	});
	$("#loadLess").on("click", function (e) {
		e.preventDefault();
		$(".firmware__container ul li").hide();
		$(".firmware__container ul li").slice(0, 5).slideDown()
		$("#loadMore").show();
		$("#loadLess").hide();
	});

	$('#slot1TA').on('DOMSubtreeModified', function () {
		if ($("#slot1TA").html()) {
			$('.slot1_divider').show();
		} else {
			$('.slot1_divider').hide();
		}
	});

	$('#slot2TA').on('DOMSubtreeModified', function () {
		if ($("#slot2TA").html()) {
			$('.slot2_divider').show();
		} else {
			$('.slot2_divider').hide();
		}
	});
});

$("#global").submit(function() {
	if ((($("#internal").val().trim() == "") && ($("#external").val().trim() == "")) ||
	    (($("#internal").val().trim() == "none") && ($("#external").val().trim() == "none"))) {
		warnInvalid($("#internal"),_("Both Internal and External IP can not be blank!")); 
		return false;
	};
});

//Below is to handle sortable on our ajax calls.
var EndpointSortable;

EndpointSortable = void 0;

EndpointSortable = function() {
  var hidden, result, brand_name;
  hidden = void 0;
  result = void 0;
  brand_name = void 0;
  if ($("ul.sortable").length <= 0) {
    return true;
  }
  $("ul.sortable").sortable({
   change: function () {
	let staticList = $('.static', this).detach();
			if ($('#sortable .row:first').length) {
				staticList.insertBefore('#sortable > .row:first');
			} else {
				$('#sortable').append(staticList);
			}
	},
    update: function(event, ui) {
      var test;
      test = void 0;
      var result = [];

      //Can't use sortable('toArray') here
      $(this).find('li').each(function(i, el){
          result.push($(el).attr('id'));
      });
      test = result[0].split("_"[0]);
      brand_name = $("input[name='brand_name']").val();
      if (brand_name !== 'undefined' && test[1] === 'horsoftkeys' && brand_name === 'digium') {
	hidden = test[0] + "_" + test[1] + "_" + test[2].substr(0, 2) + "order";
      } else {
	//model_keytype_order
	hidden = test[0] + "_" + test[1] + "_order";
      }
      $("input[name=" + hidden + "]").val(result);
    }
  });
};

$( document ).ajaxComplete(function() {
  EndpointSortable();
});

if(typeof fpbx == 'undefined'){
	  var endpointBaseAjaxUrl = '/admin/ajax.php?module=endpoint';
} else if ((fpbx.length > 0) && parseInt(fpbx.conf.ver) > 2.11) {
	var endpointBaseAjaxUrl = '/admin/ajax.php?module=endpoint';
} else {
	var endpointBaseAjaxUrl = '/admin/ajax.php?module=endpoint&quitemode=1&handler=file&file=ajax.php';
}

$(document).on('click', '#migratetonewDPMA', function(e) {
	if(confirm(_("During this migration process Asterisk will restart. Are you sure you want to migrate now?"))){
		var url = endpointBaseAjaxUrl +"&command=migratetonewDPMA";
		var title = 'Migration Process Status';
		process_module_actions(url, title);
		return false;
	} else {
		return false;
	}
});

var box;
function process_module_actions(url, title) {
	var urlStr = '';
	urlStr = url;
	box = $('<div id="moduledialogwrapper"></div>')
	.dialog({
		title: title,
		resizable: false,
		modal: true,
		width: 410,
		height: 325,
		open: function (e) {
			$(".ui-dialog-titlebar-close").hide();
			$('#moduledialogwrapper').html(_('Loading..' ) + '<i class="fa fa-spinner fa-spin fa-2x">');
			var xhr = new XMLHttpRequest(),
			timer = null;
			xhr.open('POST', urlStr, true);
			xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			xhr.send();
			timer = window.setInterval(function() {
				if (xhr.readyState == XMLHttpRequest.DONE) {
					window.clearTimeout(timer);
				}
				if (xhr.responseText.length > 0) {
					if ($('#moduledialogwrapper').html().trim() != xhr.responseText.trim()) {
						$('#moduledialogwrapper').html(xhr.responseText);
						$('#moduleprogress').scrollTop(1E20);
					}
				}
				if (xhr.readyState == XMLHttpRequest.DONE) {
					$("#moduleprogress").css("overflow", "auto");
					$('#moduleprogress').scrollTop(1E20);
					$("#moduleBoxContents a").focus();
				}
			}, 500);
		},
		close: function(e) {
			$(e.target).dialog("destroy").remove();
			window.location.reload(true);
		}
	});
}

function close_module_actions() {
        box.dialog("destroy").remove();
	window.location.reload(true)
}

function close_popup() {
        box.dialog("destroy").remove();
}
