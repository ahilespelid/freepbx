<div class="row"><!--row 1 -->
	<div class="col-sm-12 col-md-6">
		<div class="panel panel-default">
			<div class="panel-heading">
				<h3 class="panel-title"><?php echo _("Global Failover")?> <a href="#" data-toggle="modal" data-target="#configureFailoverModal" class="pull-right"><i class="fa fa-edit"></i></a></h3>
			</div>
			<div class="panel-body">
				<ul class="list-group">
					<li class="list-group-item">
						<strong><?php echo _("Global Failover Number") ?></strong>
						<span class="label label-default pull-right" id = "global_failover_num_badge"><?php echo $global_failover_num ?></span>
					</li>
					<li class="list-group-item trunkgroup hidden">
						<strong><?php echo _("Global Failover Trunk Group") ?></strong>
						<span class="label label-default pull-right" id = "global_failover_trunkgroup_badge" data-id="<?php echo $global_failover_dest?>"><?php echo $global_failover_trunkgroup?></span>
					</li>
					<li class="list-group-item">
						<strong><?php echo _("Global Failover Destination") ?></strong>
						<span class="label label-default pull-right" id = "global_failover_dest_badge"><?php echo $global_failover_dest ?></span>
					</li>
				</ul>
			</div>
		</div>
	</div>
	<div class="col-sm-12 col-md-6">
		<div class="panel panel-default">
			<div class="panel-heading">
				<h3 class="panel-title"><?php echo _("Account Services")?></h3>
			</div>
			<div class="panel-body">
				<ul class="list-group">
				  <li class="list-group-item"><strong><?php echo _("Global Failover IP/FQDN") ?></strong><span class="pull-right label label-default" id="failover_fqdn_label"><?php echo $global_failover_dest ?></span></li>
				  <li class="list-group-item"><strong><?php echo _("International Calling") ?></strong><span class="pull-right label label-<?php echo !empty($server_settings['international'])?'success':'default'?>"><?php echo !empty($server_settings['international']) ? _('Yes') : _('No') ?></span></li>
				  <li class="list-group-item"><strong><?php echo _("Outbound Fax") ?></strong><span class="pull-right label label-<?php echo !empty($server_settings['fax'])?'success':'default'?> "><?php echo !empty($server_settings['fax']) ? _('Yes') : _('No') ?></span></li>
				  <li class="list-group-item"><strong><?php echo _("SMS Support") ?></strong><span class="pull-right label label-<?php echo !empty($server_settings['sms'])?'success':'default'?> "><?php echo !empty($server_settings['sms']) ? _('Yes') : _('No') ?></span></li>
				</ul>
			</div>
		</div>
	</div>
</div><!--End Row 1-->
