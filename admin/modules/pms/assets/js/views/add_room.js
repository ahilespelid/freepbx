function validateForm() {
    $("#roomaddtable").bootstrapTable("togglePagination");
    return true;
}

function change_type(extension, type){
    $.ajax({
        url: "ajax.php?module=pms&change_type="+extension+"&type="+type,
        dataType:"json",
        success: function (json) {
            if (json.message != null){			
                $("#roomaddtable").bootstrapTable("refresh", "{silent: true}");
            };
        },
        error: function(xhr, status, error) {
            fpbxToast(_("An Ajax error is occured!! Please, check console logs."),'Error','error');
            console.error(xhr, status, error);
        }
    });		
}
