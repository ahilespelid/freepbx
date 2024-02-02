// Auto completion. 

function FindGuest(find_guest)
{
    var arrAction            = new Array();
	var last_name			 = "";
	var first_name			 = "";
	var guest			     = "";
	var id					 = "";
    arrAction["find"]        = find_guest;
	if(find_guest.length == 0) {
		// Hide the suggestion box.
		$('#suggestions').hide();
		} 
              else 
              {
				request("index.php?quietmode=1&module=pms&command=find",arrAction, true, function(arrData,statusResponse,error)
					{
						var result 			= $.parseJSON(arrData);
						$.each(result, function(k, v) {
							//Loading datas in variables.
							last_name 		= v.last_name;
							first_name 		= v.first_name;
							id				= v.id;
							guest 			+= '<ol onClick="fill(\''+id+'\');">' + last_name + ' ' + first_name + '</ol>';
							
		
						});
				if(arrData.length >0) {
					$('#suggestions').show();
					$('#autoSuggestionsList').html(guest);
					}
					}
				);
	}
}

function find_rooms(sort){
    var arrAction            = new Array();
	var room_name			 = "";
	var extension			 = "";
	var room_list			 = "";
    arrAction["find_rooms"]  = sort;
	request("index.php?quietmode=1&module=pms&command=find_rooms",arrAction, true, function(arrData,statusResponse,error){
														var result 			= $.parseJSON(arrData);
														$.each(result, function(k, v) {
														//Loading datas in variables.
														extension		= v.extension;	
														room_name		= v.room_name;
														if(v.free != "1"){
															room_list	+= '<option value=\''+extension+'\'>'+room_name+' &#xf071;</option>';
														}
														else{
															room_list	+= '<option value=\''+extension+'\'>'+room_name+'</option>';
														}
														
													});
	if(arrData.length >0) {
		$('#room').empty();
		$('#room').append(room_list);
	}
	}
	);
}
	
function fill(thisValue) {
    var arrAction		= new Array();
    var arrData			= "";
    arrAction["get"]	= thisValue;
    setTimeout("$('#suggestions').hide();", 200);
    if(thisValue){
    	request("index.php?quietmode=1&module=pms&command=get",arrAction, false, function(arrData,statusResponse,error)
		{
			var result  = $.parseJSON(arrData);
			$('#first_name').val(result["first_name"]);
            $('#last_name').val(result["last_name"]);
            $('#address').val(result["address"]);
            $('#cp').val(result["cp"]);
            $('#city').val(result["city"]);
            $('#phone').val(result["phone"]);
            $('#mobile').val(result["mobile"]);
            $('#fax').val(result["fax"]);
            $('#mail').val(result["mail"]);
			$('#NIF').val(result["NIF"]);
			$('#Off_Doc').val(result["Off_Doc"]);
			$('#comments').val(result["comments"]);
			
			if(result["lang"].length> 0){
				console.log(result["lang"]);
				$('#language').empty();
				$('#language').append('<option value=\''+result["lang"]+'\'>'+result["lang"]+'</option>');
			}
			else{
				$('#language').empty();
				$('#language').append('<option value=\'en\'>en</option>\n<option value=\'fr\'>fr</option>\n<option value=\'es\'>es</option>\n<option value=\'it\'>it</option>');
			}
       	});
    }
}


// Below, (c) Elastix team.
//-------------------------
var current_setTimeout = null;
function request(url,arrParams, recursive, callback)
{
    callback           = callback  || null;
    recursive          = recursive || null;

    var params = {};
    var empty_array = new Array();
    for (var k in arrParams) {

    	if (!(Array.prototype.isPrototypeOf(arrParams) && typeof arrParams[k] == typeof empty_array[k]))
    		params[k] = arrParams[k];
    }

    $.post(url,
        params,
        function(dataResponse){
            var message        = dataResponse.message;
            var statusResponse = dataResponse.statusResponse;
            var error          = dataResponse.error;
            var stop_recursive = false;

			if(statusResponse == "ERROR_SESSION"){
				$.unblockUI();
				var r = confirm(error);
				if (r==true)
				  location.href = 'ajax.php?module=pms';
				return;
			}

            if(callback)
                stop_recursive = callback(message,statusResponse,error);
            if(statusResponse){
                if(recursive & !stop_recursive){
                   current_setTimeout = setTimeout(function(){request(url,arrParams,recursive,callback)},2);
                   
                }
            }
            else{
                //
            }
        },
        'json');
}

function mode() {
	md = document.getElementById('BTbooking').value;

	if ( md == _("Booking")){
		$('#BTbooking').val(_("Check-in"));
		$("#bk0").toggle();
		$("#bk1").toggle();
		$("#bk2").toggle();
		$("#bk3").toggle();
		$('#booking').val('on');
		find_rooms("");
        }
    else{
		$('#BTbooking').val(_("Booking"));
		$("#bk0").toggle();
		$("#bk1").toggle();
		$("#bk2").toggle();
		$("#bk3").toggle();
		$('#booking').val('off');
		find_rooms("1");
	}
}





