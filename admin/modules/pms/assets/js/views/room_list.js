$(document).ready(function(){		
    if(check_group() === false){
        fpbxToast(_("The User Management group mapped to Hotel Guests in Privileges appears to be corrupt! Please fix it by browsing to Config, Privileges, check the Hotel Guests group and submit the page."),_("Warning"),'warning');			
    }
});

function Transfer(exten, Vtitle) {
    $(function() {
        $( "#DialTrans"+exten ).dialog({ 
        width: 'auto', 
        autoOpen: false, 
        resizable: false,
        width: 400,
        modal: true,
        title: Vtitle,
        buttons: {
            'Cancel': function() {
                $( this ).dialog( "close" );
            },

            'Valid': function() {
                $.ajax({
                    url: "ajax.php?module=pms&transfer=yes&from="+exten+"&to="+$("#select"+exten).val(),
                    dataType:"json",
                    success: function (json) {
                        
                        if (json.message != null){			
                            $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
                            window.location.reload();
                            clearInterval(check_alert);
                        };
                    },
                    error: function(d) {
                        d.suppresserrors = true;
                    },
                });	
            }
        }
        });
        $(".ui-dialog").find(".ui-dialog-titlebar").css("background-color", "#D6E4DD");
        $(".ui-dialog").find(".ui-dialog-title").css("color", "black");
        $(":button:contains('Cancel')").html("<i class='fa fa-ban fa-2x' aria-hidden='true'></i>").css("background-color", "#D6E4DD").css("color", "black");
        $(":button:contains('Valid')").html("<i class='fa fa-check fa-2x' aria-hidden='true'></i>").css("background-color", "#D6E4DD").css("color", "black");
        $( "#DialTrans"+exten ).css("visibility", 'visible');
        $( "#DialTrans"+exten ).dialog("open");
    });
}


function dnd_status(extension,status) {
    if (status == "NO"){
        $.ajax({
            url: "ajax.php?module=pms&room_dnd="+extension+"&status=NO",
            dataType:"json",
            success: function (json) {
                if (json.message != null){			
                    $("#dnd"+extension).html("<img src='./modules/pms/images/d.png' onclick='dnd_status(\""+extension+"\",\"YES\")'>");
                    $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
                };
            },
            error: function(xhr, status, error) {
                fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
                console.error(xhr, status, error);
            }
        });
    }
    else{
        $.ajax({
            url: "ajax.php?module=pms&room_dnd="+extension+"&status=YES",
            dataType:"json",
            success: function (json) {
                if (json.message != null){			
                    $("#dnd"+extension).html("<img src='./modules/pms/images/dnd.png' onclick='dnd_status(\""+extension+"\",\"NO\")'>");
                    $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
                };                    
            },
            error: function(xhr, status, error) {
                fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
                console.error(xhr, status, error);
            }
        });
    }
}

function wu_del(filename){
    $.ajax({
        url: "ajax.php?module=pms&wu_del="+filename,
        dataType:"json",
        success: function (json) {
            if (json.message != null){			
                $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
            };
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });
}

function force_free(room_id, job){ 
    var r = confirm( _("The room will be available after this") + " " +job + "\n\n" + _("Force this room to become available now?"));
    if (r == true) {
        $.ajax({
            url: "ajax.php?module=pms&force_free="+room_id,
            dataType:"json",
            success: function (json) {
                if (json.message != null){			
                    $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
                };
            },
            error: function(xhr, status, error) {
                fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
                console.error(xhr, status, error);
            }
        });
    } 
}
  
 function clean_status(extension,status) {
    if (status == "NO"){
        $.ajax({
            url: "ajax.php?module=pms&room_clean="+extension+"&status=NO",
            dataType:"json",
            success: function (json) {
                if (json.message != null){			
                    $("#clean"+extension).html("<img src='./modules/pms/images/0.png' onclick='clean_status(\""+extension+"\",\"YES\")'>");
                    $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
                };
            },
            error: function(xhr, status, error) {
                fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
                console.error(xhr, status, error);
            }
        });
    }
    else{
        $.ajax({
            url: "ajax.php?module=pms&room_clean="+extension+"&status=YES",
            dataType:"json",
            success: function (json) {
                if (json.message != null){			
                    $("#clean"+extension).html("<img src='./modules/pms/images/1.png' onclick='clean_status(\""+extension+"\",\"NO\")'>");
                    $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
                };                    
            },
            error: function(xhr, status, error) {
                fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
                console.error(xhr, status, error);
            }
        });
    }
}

function msgbox(thisvalue, ext) {
    var extension = ext;
    $.post( "ajax.php", {cdr: extension, module: "pms"}, function( data ) {
        if(!data.status) {
            fpbxToast(data.message ,_("Warning"),'warning');	
        } else {
            var content = JSON.parse(data.message);
            var detail = thisvalue+content;
            $(function() {
                var SplitText = "Title";
                var $dialog = $('<div></div>')
                .html(SplitText)
                .dialog({
                title: 'Details',
                width: 400,
                resizable: false,			
                modal: true,
                 buttons: {
                    Ok: function() {
                        $( this ).dialog( "close" );
                    },
                    Send: function(){
                        $.ajax({
                            url: "ajax.php?module=pms&summary="+extension,
                            dataType:"json",
                            success: function (json) {
                                //console.log("ok");
                            }
                        });
                        $( this ).dialog( "close" );
                    }
                }});
                $dialog.dialog('open');
                $dialog.html(detail);
                $(".ui-dialog").find(".ui-dialog-titlebar").css("background-color", "#D6E4DD");
                $(".ui-dialog").find(".ui-dialog-title").css("color", "black");
                $(".ui-dialog-buttonset").find(".ui-button").css("background-color", "#D6E4DD");
                $(".ui-dialog-buttonset").find(".ui-button").css("color", "black");
                $(".ui-dialog-buttonset").find(".ui-button").css("font-weight", "bold");
            });				
        }
    });				
}

function del_rs(extension){
    $.ajax({
        url: "ajax.php?module=pms&delete_rs="+extension,
        dataType:"json",
        success: function (json) {
            $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });			
}

function cos_change(extension){
    $("#modal-cos").modal('show');
    $("#ext_new_cos").val(extension);
}

function send_message_box(extension){
    $("#text_content").val("");
    $("#send_to_ext").val(extension);
    $("#modal-sms").modal('show');
    
}	

function send_message() {
    var extension 	= $("#send_to_ext").val();
    var text 		= $("#text_content").val();
    $.ajax({
        url: "ajax.php?module=pms&send_message="+extension+"&message="+text,
        dataType:"json",
        success: function (data) {
                var result = JSON.parse(data.message);
                fpbxToast( result["Message"],_("Info"),'info');
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });
}	

function save_new_cos(){
    var ext = $("#ext_new_cos").val();
    var cos = $("#new_cos").val();
    $.ajax({
        url: "ajax.php?module=pms&new_cos=yes&ext="+ext+"&cos="+cos,
        dataType:"json",
        success: function (json) {
            if (json.message == "\"ok\""){
                fpbxToast(_("Class of Service has been changed."),_("Info"),'info');
                window.location.reload();
            };
        },
        error: function(d) {
            fpbxToast(_("An error occurred during save, Please try again."),_("Danger"),'danger');
            d.suppresserrors = true;
        }
    });
    
    clearInterval(check_alert);    
}

var check_alert = setInterval( function () {
    $.ajax({
        url: "ajax.php?module=pms&emergency=yes",
        dataType:"json",
        success: function (json) {
            if (json.message >= 1){
                window.location = "config.php?display=pms&view=emergency";
            };
        },
        error: function(d) {
            d.suppresserrors = true;
        }
    });	

    new_nbrs = $("#nbrs").val();

    $.ajax({
        url: "ajax.php?module=pms&room_services=yes",
        dataType:"json",
        success: function (json) {
            var room_service = JSON.parse(json.message);
            if(room_service != "none"){
                cur_nbrs = 0;
                $.each(room_service, function(room_ext, v) {
                    cur_nbrs++;
                    $("#"+room_ext).html("<i class='fa fa-trash' onclick='del_rs(\""+room_ext+"\")'></i> "+v['lab']+" "+v['plv']);
                    $("#message").html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div style='text-align:center;'><div class='text-danger'>"+_("Room Service present!")+"</div></div></div>");
                });	
                if(cur_nbrs != parseInt(new_nbrs) ){
                    $("#nbrs").val(cur_nbrs);
                    $("#roomlisttable").bootstrapTable("refresh", "{silent: true}");                        
                }
            };
        },
        error: function(d) {
            d.suppresserrors = true;
        }
    });	
    room_service = "";
}, 5000 );
