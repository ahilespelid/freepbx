$(document).ready(function() {
    $("#param").change(function(){
        var $input  = $(this);
        val         = $input.val();
        list        = $input.attr('list');
        res         = $('#'+list + ' option').filter(function() { return ($(this).val() === val); });
 
        if(res.length > 0) {            
            $("#description").val(res.data('desc'));
            $("#value").val(res.data('value'));
        } 
    });
    
    /**
     * Do the difference between add and change.
     */
    if($("#param").val() == "" && $("#value").val() == ""){
        $("#save_prelog").attr("value", "Save New Entry");
    }

    /**
     * Select all models 
     */
    $(".checkAll").click( function(){
        $("[id^=model]").attr("checked", true);
    })
});