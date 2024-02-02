<?php
	$trialcontent = isset($trialcontent) ? $trialcontent : '';
?>
<div class="container-fluid">
	<h1><?php echo _('SIPstation')?></h1>
	<div class = "display full-border">
		<div class="row">
			<div class="col-sm-12">
				<div class="fpbx-container">
					<ul class="nav nav-tabs" role="tablist">
						<li role="presentation" data-name="newlook" class="active">
							<a href="#localset" aria-controls="newlook" role="tab" data-toggle="tab">
								<?php echo _("SIPstation Settings")?>
							</a>
						</li>
						<li role="presentation" data-name="ssstore" class="change-tab">
							<a href="#ssstore" aria-controls="ssstore" role="tab" data-toggle="tab">
								<?php echo _("SIPstation Store")?>
							</a>
						</li>
						<li role="presentation" data-name="sstrial" class="change-tab <?php echo empty($trialcontent)?'hidden':'' ?>">
							<a href="#" aria-controls="sstrial" role="tab" data-toggle="tab" onClick="sstrial_launch()">
								<?php echo _("SIPstation Free Trial")?>
							</a>
						</li>
					</ul>
					<div class="tab-content display">
						<div role="tabpanel" id="localset" class="tab-pane active">
							<?php echo $newlook ?>
						</div>
						<div role="tabpanel" id="sstrial" class="tab-pane <?php echo empty($trialcontent)?'hidden':'' ?>">
							<?php echo $trialcontent ?>
						</div>
						<div role="tabpanel" id="ssstore" class="tab-pane">
							<div class="ssstore">
								<a class="btn btn-primary" href="https://www.sipstation.com/" target="_blank">
									Open Sip Station Store
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
