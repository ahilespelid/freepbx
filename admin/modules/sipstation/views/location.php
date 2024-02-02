<div class="alert alert-info">
<small> <?php echo sprintf(_("To disable account access, click %s. To update account information, click %s. If port forwarding is configured on your firewall/router, you can test it with the %s button.
		Port forwarding can provide more reliable service and better quality and we recommend setting it up.
		The test sends a packet to an unused Asterisk RTP port at your WAN address and results in a PASS if the packet is properly received."),
		"<i>".$cancelOrRemove."</i>","<i>"._("Update Account Info")."</i>","<i>"._("Run Firewall Test")."</i>") ?></small><br /><br />
		<small><?php echo sprintf(_("Questions or Issues can be directed to our %s at %s"),'<a href="https://support.sangoma.com" target="_sipstationsupport" title="SIPstation Support">'._("Support Center").'</a>',
		'<a href="https://support.sangoma.com" target="_sipstationsupport" title="SIPstation Support">https://support.sangoma.com</a>')?></small><br/><br/>
</div>
<?php if (!empty($verify_message)) { ?>
<div class="alert alert-danger unverified">
	<small><?php echo $verify_message; ?></small><br/><br/>
</div>
<?php } ?>

<?php if ($account_type == 'TRIAL') { ?>
<div class="account_access_section convert">
	<a href="/admin/config.php?display=sipstation&action=convert">
	<?php echo $expirynotice; ?>
	<div class="convert-trial"></div>
	</a>
</div>
<?php } ?>
<div class="btn-group" role="group" aria-label="actionbuttons">
<?php if ($account_type != 'TRIAL') { ?>
	<input type="submit" class="btn btn-default" name="remove_key" id="remove_key" value="<?php echo _("Remove Key")?>" tabindex="<?php echo ++$tabindex;?>" />&nbsp;
	<input type="submit" class="btn btn-default" name="remove_key_del_trunks" id="remove_key_del_trunks"  value="<?php echo _("Remove Key & Delete Trunks")?>" tabindex="<?php echo ++$tabindex;?>" />&nbsp;
<?php } else { ?>
	<input type="submit" class="btn btn-default" name="cancel_freetrial" id="cancel_freetrial"  value="<?php echo _("Cancel Free Trial")?>" tabindex="<?php echo ++$tabindex;?>" />&nbsp;
<?php } ?>
</div>

<form autocomplete="off" id="editaccount" name="editaccount" action="" method="post">
<input id="global_failover_old" name="global_failover_old" type="hidden" value="<?php echo $global_failover_num ?>">
<input type="hidden" value="editaccount" name="type">
<!--SIP Username-->
<div class="element-container">
  <div class="row">
    <div class="col-md-12">
      <div class="row">
        <div class="form-group">
          <div class="col-md-3">
            <label class="control-label" for="unw"><?php echo _("SIP Username") ?></label>
            <i class="fa fa-question-circle fpbx-help-icon" data-for="unw"></i>
          </div>
          <div class="col-md-9">
            <span id="sip_username"><?php echo $sip_username ?></span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-md-12">
      <span id="unw-help" class="help-block fpbx-help-block"><?php echo _("Sip Username")?></span>
    </div>
  </div>
</div>
<!--END SIP Username-->
<!--Sip Password-->
<div class="element-container">
  <div class="row">
    <div class="col-md-12">
      <div class="row">
        <div class="form-group">
          <div class="col-md-3">
            <label class="control-label" for="spw"><?php echo _("Sip Password") ?></label>
            <i class="fa fa-question-circle fpbx-help-icon" data-for="spw"></i>
          </div>
          <div class="col-md-9">
            <span id="sip_password"><?php echo $sip_password ?></span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-md-12">
      <span id="spw-help" class="help-block fpbx-help-block"><?php echo _("Sip Password")?></span>
    </div>
  </div>
</div>
<!--END Sip Password-->
<!--Gateways-->
<div class="element-container">
  <div class="row">
    <div class="col-md-12">
      <div class="row">
        <div class="form-group">
          <div class="col-md-3">
            <label class="control-label" for="gww"><?php echo _("Gateways") ?></label>
            <i class="fa fa-question-circle fpbx-help-icon" data-for="gww"></i>
          </div>
          <div class="col-md-9">
            <table class="table table-striped">
              <tr><th><?php echo _("Primary") ?></th><td><span id="gw1"><?php echo $gw1_name ?></span></td></tr>
              <tr><th><?php echo _("Secondary") ?></th><td><span id="gw2"><?php echo $gw2_name ?></span></td></tr>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-md-12">
      <span id="gww-help" class="help-block fpbx-help-block"><?php echo _("Sip Gateways")?></span>
    </div>
  </div>
</div>
<!--END Gateways-->
<!--Channels-->
<div class="element-container">
  <div class="row">
    <div class="col-md-12">
      <div class="row">
        <div class="form-group">
          <div class="col-md-3">
            <label class="control-label" for="chw"><?php echo _("Channels") ?></label>
            <i class="fa fa-question-circle fpbx-help-icon" data-for="chw"></i>
          </div>
          <div class="col-md-9">
            <span id="num_trunks"><?php echo $num_trunks ?></span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-md-12">
      <span id="chw-help" class="help-block fpbx-help-block"><?php echo _("Number of Channels")?></span>
    </div>
  </div>
</div>
<!--END Channels-->

</form>
