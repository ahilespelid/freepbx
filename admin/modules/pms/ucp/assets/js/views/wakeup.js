function delete_wakeup(extension, id){
    $.ajax({
        url: "index.php?quietmode=1&display=dashboard&module=pms&command=wakeup_delete&extension="+extension+"&id="+id,
        dataType:"json",
        success: function (json) {
            //var reload_status = JSON.parse(json.message);
            $("#wakeupgrid").bootstrapTable("removeAll");
            $("#wakeupgrid").bootstrapTable("refresh", "{silent: true}");
        },
    });	
};
$('#modal-container-success').on('hidden.bs.modal', function () {
    $("#wakeupgrid").bootstrapTable("removeAll");
    $("#wakeupgrid").bootstrapTable("refresh", "{silent: true}");
})	