$(document).ready(function() {
    $("input[name='dest_option']").click(function() {
        if ($("input[name='dest_option']:checked").val() == 'internal') {
            $('#destination').val($('#int_ip').val());
        } else if ($("input[name='dest_option']:checked").val() == 'external') {
            $('#destination').val($('#ext_ip').val());
        }

    });

    $("input[name='tftp_option']").click(function() {
        if ($("input[name='tftp_option']:checked").val() == 'internal') {
            $('#tftp_server').val($('#int_ip').val());
        } else if ($("input[name='tftp_option']:checked").val() == 'external') {
            $('#tftp_server').val($('#ext_ip').val());
        }

    });
    
    $(":checkbox").change(function(){
        var id = $(this).attr('name');
        if (this.checked) {
            $('#' + id).show();
        } else {
            $('#' + id).hide();
        }
    }); 
    
    //used for ajax call to eliminate excessive input variables.
    $('#submit').click(function(event) {
        $('#show').hide();
        $('#wait').show();
        event.preventDefault();
        var dat = JSON.stringify($('#polycom').serializeArray());
        var url = $('#polycom').attr('action') + '&template=' + $('#template_name').val();
        alert('Please wait until page reloads.');
        $.ajax({
        type: "POST",
        url: url,
        data: {'data': dat},
        success: function(data,textStatus,jqXHR) {
                //alert('success ');
                //$("#errors").html('result ' + jqXHR.responseText);
                //$("#errors").html('<br />json<br />' + dat);
                location.href=url;
        },
        error:function(xhr, textStatus, errorThrown){
            alert('fail');
            //$("#errors").html(xhr.responseText);
        }
        });

        //console.log(dat,url);
    });
});

function addItem(ext) {
    var trCount = $('tr').length;
    var clonedRow = $("tr:last");
    var directory = $('#directory').html();
     
    list = '<tr><td><input name="ln[]" id="ln[]" size="10" value=""></td>';
    list = list + '<td><select name="ct[]" id="ct[]" >';
    $.each(ext, function(key, value) {
        list = list + '<option value="' + key + '">' + key + ' ' + value + '</option>'; 
    });
    list = list + '</select></td><td><input name="sd[]" id="sd[]" size="2" value="">';
    list = list + '</td><td><input name="bw[]" id="bw[]" size="2" value="">';
    list = list + '</td></tr>';
    $("#directory").append(list);
}