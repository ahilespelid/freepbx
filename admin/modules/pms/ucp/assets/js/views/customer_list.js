function delete_guest(guest_id) {
    $.ajax({
        url: "?quietmode=1&module=pms&command=delete_guest&guest="+guest_id,
        dataType:"json",
        success: function (json) {
            if (json.message != null){            
                if(json.message == '"done"'){
                    $('#message').html("<div class='alert alert-success alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Guest Deleted.") + "</div></div></div>");
                    setTimeout(function(){}, 2000);
                    $("#customertable").bootstrapTable("removeAll");
                    $("#customertable").bootstrapTable("refresh", "{silent: true}");
                };
                if(json.message == '"busy"'){
                    $('#message').html("<div class='alert alert-warning alert-dismissable'><button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button><div class='tac'><div class='text-danger'>"+ _("Unable to delete this guest!") + "</div></div></div>");
                };
            };
        }
    });
}

function edit_guest(guest_id) {
    $("#list").hide();
    $("#edit").show();
    $.ajax({
        url: "?quietmode=1&module=pms&command=ce&id="+guest_id,
        dataType:"json",
        success: function (json) {
            $("#id").val(guest_id);
            $("#first_name").val(json["first_name"]);
            $("#last_name").val(json["last_name"]);
            $("#address").val(json["address"]);
            $("#cp").val(json["cp"]);
            $("#city").val(json["city"]);
            $("#phone").val(json["phone"]);
            $("#mobile").val(json["mobile"]);
            $("#fax").val(json["fax"]);
            $("#NIF").val(json["NIF"]);
            $("#mail").val(json["mail"]);
            $("#Off_Doc").val(json["Off_Doc"]);
            $("#language").empty().append(json["language"]);
            $("#comments").val(json["comments"]);
        }
    });
}