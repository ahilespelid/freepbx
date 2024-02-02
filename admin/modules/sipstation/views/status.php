<br/>
<div class="alert alert-info">
	<?php echo sprintf(_('The current trunks are utilizing %s and connecting to %s over port %s using an RTP range of %s-%s'),$driver_info['driver'],$driver_info['host'],$driver_info['port'],$driver_info['rtp_start'],$driver_info['rtp_end'])?>
</div>
<div class="well well-sm">
	<button class="btn btn-default" id="account-access-button"><?php echo _("Refresh Asterisk Account Info")?></button>
</div>
<div class="container-fuild">
	<?php echo $url_status;?>
</div>
<div class="row">
	<div class="col-md-6 col-sm-12">
		<div class="panel panel-info">
			<div class="panel-heading"><h3 class="panel-title"><i class="fa fa-server"></i> <?php echo _("Primary SIPstation Server") ?></h3></div>
				<div class="panel-body">
					<table class='table table-striped'>
						<tr><th><?php echo _("Asterisk Registration Status")?> </th><td><h3><span class="label label-<?php echo $gw1_reg == 'Registered' ? 'success' : 'danger' ?> col-sm-12" id="asterisk_registry_gw1" name="asterisk_registry_gw1"><?php echo !empty($gw1_reg) ? $gw1_reg : _('Unknown') ?> </span></h3></td></tr>
						<tr><th><?php echo _("Your Contact IP")?></th><td><input type="text" style="background-color:<?php echo $ip_color1 ?>" readonly="readonly" size="24" id="contact_ip_gw1" name="contact_ip_gw1" class="register-fields-gw1 form-control" value="<?php echo !empty($gw1_contactip) ? $gw1_contactip : _('Not Available')?>"></td></tr>
						<tr><th><?php echo _("Your Network IP")?></th><td><input type="text" style="background-color:<?php echo $ip_color1 ?>" readonly="readonly" size="24" id="network_ip_gw1" name="network_ip_gw1" class="register-fields-gw1 form-control" value="<?php echo !empty($gw1_networkip) ? $gw1_networkip : _('Not Available') ?>"></td></tr>
						<tr><th><?php echo _("SIP Ping")?></th><td><input type="text" class='form-control' readonly="readonly" size="24" id="trunk_qualify_gw1" name="trunk_qualify_gw1" value="<?php echo _("Not Available") ?>"></td></tr>
						<tr><th><?php echo _("Codec Priorities")?></th><td><input type="text" class='form-control' readonly="readonly" size="24" id="trunk_codecs_gw1" name="trunk_codecs_gw1" value="<?php echo _("Not Available") ?>"></td></tr>
					</table>
				</div>
			</div>
		</div>
		<div class="col-md-6 col-sm-12">
			<div class="panel panel-info">
				<div class="panel-heading">
					<h3 class="panel-title"><i class="fa fa-server"></i> <?php echo _("Secondary SIPstation Server") ?></hr>
				</div>
				<div class="panel-body">
					<table class='table table-striped'>
						<tr><th><?php echo _("Asterisk Registration Status")?></th><td><h3><span class="label label-<?php echo $gw2_reg == 'Registered' ? 'success' : 'danger' ?> col-sm-12" id="asterisk_registry_gw2" name="asterisk_registry_gw2"><?php echo !empty($gw2_reg) ? $gw2_reg : _('Unknown') ?> </span></h3></td></tr>
						<tr><th><?php echo _("Your Contact IP")?></th><td><input type="text" style="background-color:<?php echo $ip_color2 ?>" readonly="readonly" size="24" id="contact_ip_gw2" name="contact_ip_gw2" class="register-fields-gw2 form-control" value="<?php echo !empty($gw2_contactip) ? $gw2_contactip : _('Not Available') ?>"></td></tr>
						<tr><th><?php echo _("Your Network IP")?></th><td><input type="text" style="background-color:<?php echo $ip_color2 ?>" readonly="readonly" size="24" id="network_ip_gw2" name="network_ip_gw2" class="register-fields-gw2 form-control" value="<?php echo !empty($gw2_networkip) ? $gw2_networkip : _('Not Available') ?>" ></td></tr>
						<tr><th><?php echo _("SIP Ping")?></th><td><input type="text" class='form-control' readonly="readonly" size="24" id="trunk_qualify_gw2" name="trunk_qualify_gw2" value="<?php echo _("Not Available") ?>" ></td></tr>
						<tr><th><?php echo _("Codec Priorities")?></th><td><input type="text" class='form-control' readonly="readonly" size="24" id="trunk_codecs_gw2" name="trunk_codecs_gw2" value="<?php echo _("Not Available") ?>" ></td></tr>
					</table>
				</div>
			</div>
		</div>
	</div>


<div class="row">
	<div class="col-md-6 col-sm-12">
		<div class="panel panel-info">
		  <div class="panel-heading">
		    <h3 class="panel-title"><?php echo _("External Connectivity")?></h3>
		  </div>
		  <div class="panel-body">
				<ul class="list-group">
					<li class="list-group-item">
						<strong><?php echo _("Firewall Status") ?></strong>
						<span class="badge" id = "firewall_status"><?php echo _("N/A")?></span>
					</li>
					<li class="list-group-item">
						<strong><?php echo _("External IP") ?></strong>
						<span class="badge" id = "firewall_externip"><?php echo _("N/A")?></span>
					</li>
				</ul>
				<button class="btn btn-default" id="firewall-test-button"><?php echo _("Check Connectivity")?></button>
		  </div>
		</div>
	</div>
</div>
