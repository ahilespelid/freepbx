<?php
	$global_failover_trunkgroup = '';
	$global_failover_type = 'fqdn';
	if(is_numeric($global_failover_dest)){
		$global_failover_trunkgroup = $global_failover_dest;
		$global_failover_dest = '';
		$global_failover_type = 'trunkgroup';
	}
?>
<div class="modal fade" id="configureFailoverModal">
	<div class="modal-dialog" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
				<h4 class="modal-title" id="configureFailover_label"><?php echo _("Failover Configuration")?></h4>
			</div>
			<div class="modal-body">
				<div class="alert alert-danger hidden-object" role="alert" id="global_failover_error_box" style="display: none;"></div>
			<div class="row">
				<div class="col-md-12">
					<form class="form-horizontal" id="global_failover_form">
						<div class="alert alert-info" role="alert">
							<p class="text-justify"><?php echo _("In the event that your system is not registered or our servers can not reach you, you can provide an IP, a full domain where we should try to deliver your calls or select another trunk group that you have. If we can't deliver the call to this address or trunk group and you have a failover number set, we will send the call there")?></p>
						</div>
						<div class="panel panel-success">
							<div class="panel-heading">
								<h3 class="panel-title"><?php echo _("Primary Failover")?></h3>
							</div>
							<div class="panel-body">
								<div class="form-group">
									<div class="radio col-md-12 col-sm-12">
										<label class="col-md-12 col-sm-12">
											<input type="radio" name="failover_radio" id="failover_fqdn_ip" value="fqdn_ip" <?php echo ($global_failover_type == 'fqdn')?'checked="checked"':''?>>
											<label class="col-sm-4 control-label failover-fqdn-trunkgroup-label" id="failover_fqdn_label" for="failover_fqdn"><?php echo _("Failover FQDN / IP:")?></label>
											<div class="col-md-8 col-sm-8 failover-fqdn-trunkgroup-div">
												<input type="text" name="failover_fqdn" id="failover_fqdn" class="form-control failover-group" placeholder="<?php echo is_null($global_failover_num) ? _('Not Set') : '' ?>" value="<?php echo $global_failover_dest?>">
											</div>
										</label>
									</div>
									<div class="radio col-md-12 col-sm-12">
										<label class="col-md-12 col-sm-12">
											<input type="radio" name="failover_radio" id="failover_trunkgroup" value="trunk_group" <?php echo ($global_failover_type == 'trunkgroup')?'checked="checked"':''?>>
											<label class="col-md-4 col-sm-4 control-label failover-fqdn-trunkgroup-label" id="failover_trunkgroup_label" for="failover_trunkgroup_select"><?php echo _("Trunk Group Name:")?></label>
											<div class="col-md-8 col-sm-8 failover-fqdn-trunkgroup-div">
                        <?php echo FreePBX::Sipstation()->drawTrunkGroupFailover('global_failover_trunkgroup', $global_failover_trunkgroup)?>
											</div>
										</label>
									</div>
								</div>
							</div>
						</div>
						<div class="panel panel-success">
							<div class="panel-heading">
								<h3 class="panel-title"><?php echo _("Secondary Failover")?></h3>
							</div>
							<div class="panel-body">
								<div class="form-group">
									<label class="col-sm-4 control-label" for="failover_number"><?php echo _("Failover Number:")?></label>
									<div class="col-sm-8">
										<input type="text" name="failover_number" id="failover_number" class="form-control failover-phone failover-group" maxlength="17" placeholder="<?php echo is_null($global_failover_num) ? _('Not Set') : '' ?>" value="<?php echo $global_failover_num ?>">
									</div>
								</div>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
		<div class="modal-footer">
			<div class="row">
				<div class="col-sm-3 col-sm-offset-2" id="delete_failover_footer_div">
					<button class="btn btn-primary btn-block" type="button" id="save_global_failover"><?php echo _("Update")?></button>
				</div>
				<div class="col-sm-3 hidden-object" id="delete_failover_div" style="display: block;">
					<button class="btn btn-danger btn-block" type="button" id="delete_global_failover"><?php echo _("Clear Failover")?></button>
				</div>
				<div class="col-sm-3">
					<button class="btn btn-default btn-block" type="button" data-dismiss="modal"><?php echo _("Close")?></button>
				</div>
			</div>
		</div>
	</div>
</div>
</div>
