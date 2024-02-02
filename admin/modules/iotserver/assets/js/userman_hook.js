(function($,window,document,undefined){

	$inviteButton = $('#invite-user');
	$tmpPwd = $('#iotserver_tmp_pwd');
  $enableAdminClass = $('.iot_input_class_is_admin');
  $enalbeAdminDiv   = $('#iot_div_admin_email_alert');
  $enableAdminYesId = 'iot_radio_is_admin_yes';
  $enableAdminYes   = $('#iot_radio_is_admin_yes');
  $emailAlertYes    = $('#iot_radio_email_alert_yes');
  $emailAlertNo     = $('#iot_radio_email_alert_no');
	 $inviteButton.on('click',function(){
      var $this = $(this);

      $this.html(_('Inviting'));
      $this.attr("disabled", true);
      var uid = $(this).data('id');;

      $.post("ajax.php",{command:"generateTmpPwd",module:"iotserver",user:uid},function(data){
      	if(data.status) {
       	  $tmpPwd.val("Pending");
          $this.html("Invite");
          $this.attr("disabled", false);
        }else{
          $this.html("Invite");
          $this.attr("disabled", true);
          alert(data.message);
        }
      });
    });
    $enableAdminClass.on('change',function(){
      var $this = $(this);
      if($this.attr('id') == $enableAdminYesId ){
        $enalbeAdminDiv.show();
        $emailAlertYes.prop('checked',true);
        $emailAlertNo.prop('checked',false);
      }else{
        $enalbeAdminDiv.hide();
      }
    });
    $(document).ready(function(){
      $("#submit").click(function() { 
        var email = $('#email').val();
        var username = $('#username').val();
        if(email){
          $.post("ajax.php",{command:"checkDuplicateEmail", module:"iotserver", email:email, username:username},function(data){
            if(!data.status && data.message) {
              alert(data.message);
            }
          });
        }
      });
      if(false ==  $enableAdminYes.prop("checked")){
        $enalbeAdminDiv.hide();
      }
    });
})(jQuery,window,document);