function delete_guest(guest_id) {
    $.ajax({
        url: "ajax.php?module=pms&delete_guest="+guest_id,
        dataType:"json",
        success: function (json) {
            if (json.message != null){			                                
               if(json.message == '"done"'){
                   fpbxToast(_("Guest Deleted"),_("Success"),'success');
                   setTimeout(function(){}, 2000);
                   location.reload();
               };
               if(json.message == '"busy"'){
                   fpbxToast(_("Unable to delete this guest!"),_("Warning"),'warning');
               };
            };
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });
}

function edit_guest(guest_id) {
    var id = guest_id;
    location.href='/admin/config.php?display=pms&extdisplay=1&view=customer_edit&id='+id;
}