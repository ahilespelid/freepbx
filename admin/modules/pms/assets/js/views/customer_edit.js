$(document).ready(function (){
    if($("#last_name").val() == ""){
        window.location.href = "config.php?display=pms&view=customer_list";
    }
});