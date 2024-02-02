<div class="container-fluid">
	<div class="row hidden vu-check">
	  <div class="col-md-12">
			<div class="jumbotron">
				<h1><?php echo sprintf(_("Welcome to the %s %s updater"),$brand, $upgradeVersion);?></h1>
				<p><?php echo _("Prepare to experience a whole new way to accomplish Telephony and VoIP")?></p>
				<div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">
					<div class="panel panel-default">
						<div class="panel-heading" role="tab" id="headingOne">
							<h4 class="panel-title">
								<a role="button" data-toggle="collapse" data-parent="#accordion" href="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
									<?php echo sprintf(_("%s %s provides many exciting new features. Click here to learn more"),$brand, $upgradeVersion)?>
								</a>
							</h4>
						</div>
						<div id="collapseOne" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingOne">
							<div class="panel-body">
								<div class="panel-group feature" id="features" role="tablist" aria-multiselectable="true">
									<?php $i=0;foreach($features as $feature => $description) {?>
											<div class="panel panel-default">
												<div class="panel-heading" role="tab" id="heading<?php echo $i?>">
													<h4 class="panel-title">
														<a role="button" data-toggle="collapse" data-parent="#features" href="#collapse<?php echo $i?>" aria-expanded="true" aria-controls="collapse<?php echo $i?>">
															<?php echo $feature?>
														</a>
													</h4>
												</div>
												<div id="collapse<?php echo $i?>" class="panel-collapse collapse <?php echo $i == 0 ? "in" : ""?>" role="tabpanel" aria-labelledby="heading<?php echo $i?>">
													<div class="panel-body">
														<?php echo $description?>
													</div>
												</div>
											</div>
									<?php $i++;} ?>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12 text-center">
			<div class="hidden vu-check">
				<a href="?display=versionupgrade&amp;action=check" class="btn btn-primary"><?php echo _("Check the requirements!")?></a>
			</div>
			<div id="vu-apply-config">
				<strong><?php echo _("You can not proceeed until you have clicked Apply Config above and refreshed this page")?></strong>
			</div>
		</div>
	</div>
</div>
