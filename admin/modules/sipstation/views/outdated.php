<?php
if(FreePBX::Config()->get('DASHBOARD_FREEPBX_BRAND') == 'FreePBX'){
  $message = _("You must update this module to the newest version to so it can work with this new information and to continue to provide the best user experience. please click the button below to take you to Module Admin where you can update this module, it will only take a minute, will have not affect on your PBX operation and then you can continue forward into the module.");
  $message .= '<br/></br><a href="?display=modules" class="btn btn-default">'._("Go to Module Admin").'</a>';
}else{
  $message =  _("Please check with your reseller to get it updated");
}
?>

<div class="panel panel-danger">
  <div class="panel-heading"><h3><?php echo _("Module Out of date.")?></h3></div>
  <div class="panel-body">
    <strong><?php echo _("The interface on our servers has been updated to provide new information for the SIPStation module.")?></strong><br/>
    <br/>
    <strong><?php echo $message ?></strong>
  </div>
</div>
