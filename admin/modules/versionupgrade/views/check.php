<div class="page-header">
	<h1><?php echo sprintf(_("Upgrade to %s %s"),$brand, $upgradeVersion)?> <small><?php echo _("Checking for requirements")?></small></h1>
</div>
<div class="container-fluid">
	<div class="row">
		<div class="col-md-12">
			<div class="alert alert-info text-center" role="alert">
				<div class="row">
					<div class="col-xs-2 text-left"><i class="fa fa-exclamation-circle fa-4x"></i></div>
					<div class="col-xs-8"><?php echo ("It is your responsibility to make proper backups if you need to revert. This is a fully automated process, therefore once you start you can not go back")?></div>
					<div class="col-xs-2 text-right"><i class="fa fa-exclamation-circle fa-4x"></i></div>
				</div>
			</div>
			<?php if($commercialModules) {?>
				<div class="alert alert-warning text-center" role="alert">
					<div class="row">
						<div class="col-xs-2 text-left"><i class="fa fa-exclamation-circle fa-4x"></i></div>
						<div class="col-xs-8">
							<h3 style="margin-top: 0px;"><?php echo _('Warning!')?></h3>
							<p><?php echo sprintf(_('If you are currently using any commercial modules please ensure that they are <strong>eligible for upgrades</strong>. You can do this by looking in %s, in the "Activation" tab. If a module is not eligible for upgrades, it may stop functioning!'),'<a href="?display=sysadmin">'._('System Administration').'</a>')?></p>
							<p><?php echo sprintf(_('If you are not eligible for upgrades on any of these modules, you can continue, and the latest version suitable for the new %s version will attempt to download.  However, it is <strong>not recommended</strong> to upgrade %s versions without all commercial modules being in their subscription period, as it may <strong>completely break</strong> your system.  Please ensure you have a complete backup before proceeding, if this is the case!'),$brand,$brand)?></p>
						</div>
						<div class="col-xs-2 text-right"><i class="fa fa-exclamation-circle fa-4x"></i></div>
					</div>
				</div>
			<?php } ?>
			<?php if(false) {?>
				<div class="alert alert-success text-center" role="alert"><?php echo sprintf(_("This system has been detected as the %s distro system. This means you will need to run the upgrade script manually through the CLI to completely upgrade the system %s"),$brand,'<a href="https://wiki.freepbx.org/display/PPS/Upgrading+from+Distro+6" target="_blank">https://wiki.freepbx.org/display/PPS/Upgrading+from+Distro+6</a>')?></div>
			<?php } else { ?>
				<?php if($allowUpgrade) {?>
					<div class="alert alert-success text-center" role="alert"><?php echo _("All checks passed. You may now start the upgrade process.")?></div>
				<?php } else { ?>
					<div class="alert alert-danger text-center" role="alert"><?php echo _("Some checks failed. Please correct the problems in red and make note of the problems in red below before ugrading")?></div>
				<?php } ?>
				<div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">
					<?php foreach($checks as $key => $check) {?>
						<div class="panel panel-default">
							<div class="panel-heading" role="tab" id="heading<?php echo $key?>">
								<h4 class="panel-title">
									<a role="button" class="<?php echo $check['color']?>" data-toggle="collapse" data-parent="#accordion" href="#collapse<?php echo $key?>" aria-expanded="true" aria-controls="collapse<?php echo $key?>">
										<i class="fa fa-check-square-o"></i> <?php echo $check['title']?>
									</a>
								</h4>
							</div>
							<div id="collapse<?php echo $key?>" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingOne">
								<div class="panel-body">
									<?php echo $check['description']?>
								</div>
							</div>
						</div>
					<?php } ?>
				</div>
			<?php } ?>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12 text-center">
			<button type="button" class="btn btn-primary btn-lg <?php echo !$allowUpgrade ? "hidden" : ""?>" data-toggle="modal" data-target="#upgradeModal">
				<?php echo _("Proceed to the upgrade process")?>
			</button>
		</div>
	</div>
</div>
<!-- Button trigger modal -->
<!-- Modal -->
<div class="modal fade" id="upgradeModal" tabindex="-1" role="dialog" data-keyboard="false" data-backdrop="static" aria-labelledby="myModalLabel">
	<div class="modal-dialog" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<button id="close-button" type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
				<h4 class="modal-title" id="myModalLabel"><?php echo sprintf(_("%s %s Upgrade"),$brand, $upgradeVersion)?><span id="do-not" class="hidden"> - <?php echo _('Do Not refresh your browser!')?></span></h4>
				<h5 class="note"><?php echo _("Please note that, this upgrade process may take minimum 30 min to 1 hour depends on system/internet connectivity. </br> To view the system updates process from linux terminal please refer to '/var/log/pbx/freepbx16-upgrade.log' log file.") ?></h5>
			</div>
			<div class="modal-body swMain" id="wizard" >
				<ul>
					<li>
						<a href="#step-1">
							<?php $step = 1;?>
							<label class="stepNumber"><?php echo $step;?></label>
							<span class="stepDesc">
								<?php echo sprintf(_('Step %d'),$step)?><br />
								<small><?php echo _('Verify System Information')?></small>
							</span>
						</a>
					</li>
					<?php if($show_form) {?>
						<?php $step++;?>
						<li>
							<a href="#step-2">
								<label class="stepNumber"><?php echo $step;?></label>
								<span class="stepDesc">
									<?php echo sprintf(_('Step %d'),$step)?><br />
									<small><?php echo _('Additional Information')?></small>
								</span>
							</a>
						</li>
					<?php } ?>
					<?php $step++;?>
					<li>
						<a href="#step-3">
							<label class="stepNumber"><?php echo $step;?></label>
							<span class="stepDesc">
								<?php echo sprintf(_('Step %d'),$step)?><br />
								<small><?php echo _('Upgrade PHP ')?></small>
							</span>
						</a>
					</li>
					<?php $step++;?>
					<!-- <li>
						<a href="#step-4">
							<label class="stepNumber"><?php //echo $step;?></label>
							<span class="stepDesc">
								<?php //echo sprintf(_('Step %d'),$step)?><br />
								<small><?php //echo _('Upgrade System')?></small>
							</span>
						</a>
					</li> -->
			</ul>
			<div id="step-1">
				<h2 class="StepTitle"><?php echo _('Verify System Information')?></h2>
				<div class="panel panel-default">
					<div class="panel-body"><?php echo sprintf(_('To help us learn more about who is using %s please verify the information below'),$brand)?></div>
				</div>
				<?php if(!$repo_check) { ?>
					<div class="form-group">
						<label for="module_repo"><?php echo _('Non-standard Repository Servers')?></label>
						<select id="module_repo" name="module_repo" class="form-control" aria-describedby="helpBlock-pbx_type">
							<option value="reset"><?php echo _('Reset the repos to the defaults')?></option>
							<option value="continue"><?php echo _('I understand the risks and do not want to change them')?></option>
						</select>
						<span id="helpBlock-module_repo" class="help-block"><?php echo sprintf(_('You are not using the standard %s repository servers. By not using these servers you will miss out on important security notifications, beta releases and add-ons.'),$brand)?></span>
					</div>
				<?php } ?>
				<div class="form-group">
					<label for="pbx_type"><?php echo _('Distribution')?></label>
					<select id="pbx_type" name="pbx_type" class="form-control" aria-describedby="helpBlock-pbx_type" disabled>
						<?php foreach($distros as $key => $value) {?>
							<option value="<?php echo $key?>" <?php echo ($did['pbx_type'] == $key) ? 'selected' : ''?>><?php echo $value?> <?php echo ($did['pbx_type'] == $key) ? '('._('Default').')' : ''?></option>
						<?php } ?>
						<option value="unknown" <?php echo preg_match('/^unknown/',$did['pbx_type']) ? 'selected' : ''?>>Other</option>
					</select>
					<span id="helpBlock-pbx_type" class="help-block"><?php echo sprintf(_('The distribution of this system. This is defaulted to what %s has determined the system to be. Please change it if it is wrong.'),$brand)?></span>
				</div>
				<div id="distro-name" class="form-group <?php echo preg_match('/^unknown/',$did['pbx_type']) ? '' : 'hidden'?>">
					<label for="pbx_type_name"><?php echo _('Distribution Name')?></label>
					<input class="form-control" id="pbx_type_name" name="pbx_type_name" aria-describedby="helpBlock-pbx_type_name">
					<span id="helpBlock-pbx_type_name" class="help-block"><?php echo _('Since you have selected "Other". Please provide the name of this distribution')?></span>
				</div>
				<div class="form-group hidden">
					<div class="checkbox">
						<label>
							<input id="tos" type="checkbox"> <?php echo _('I agree to the contest rules')?>
						</label>
					</div>
					<a href="https://www.freepbx.org/about-us/website-privacy-policy/" target="_blank"><?php echo _("Privacy Policy")?></a>
				</div>
			</div>
			<?php if($show_form) {?>
				<div id="step-2">
					<h2 class="StepTitle"><?php echo _('Additional Information')?></h2>
					<div id="additional-information">
						<div class="panel panel-default">
							<div class="panel-body"><?php echo sprintf(_('To help us learn more about who is using %s please tell us a little bit about yourself.'),$brand)?></br><i><?php echo _('Note: You can skip this by installing sysadmin and registering your deployment.')?></i></div>
						</div>
						<div class="form-group">
							<label for="name"><?php echo _('Your Name')?></label>
							<input class="form-control" id="name" name="name" aria-describedby="helpBlock-name" placeholder="<?php echo _('Please provide your name')?>">
						</div>
						<div class="form-group">
							<label for="company"><?php echo _('Your Company')?></label>
							<input class="form-control" id="company" name="company" aria-describedby="helpBlock-company" placeholder="<?php echo _('Please provide your company')?>">
						</div>
						<div class="form-group">
							<label for="phone"><?php echo _('Your Phone Number')?></label>
							<input class="form-control" id="phone" name="phone" aria-describedby="helpBlock-phone" placeholder="<?php echo _('Please provide your phone number')?>">
						</div>
						<div class="form-group">
							<label for="email"><?php echo _('Your Email')?></label>
							<input class="form-control" id="email" aria-describedby="helpBlock-email" placeholder="<?php echo _('Please provide your email')?>">
						</div>
					</div>
				</div>
			<?php } ?>
			<div id="step-3">
				<div id="upgradephp">
					<h2 class="StepTitle"><?php echo _('Additional Information')?></h2>
					<h4 class="note note-detail"> <?php echo _('Do not worry about ajax error in between which might occur due to NodeJS service restart as a part of system update, wizard will automatically reload to fetch the update progress status.') ?> </h4>
					<div id="listlog"> </div>
				</div>
			</div>
			<?php  ?>

			<!-- <div id="step-4">
				 <h2 class="StepTitle"><?php //echo _('Upgrade System')?></h2>
				<div id="upgrader">
					 <div>
						<strong><?php //echo _('Total')?>:</strong>
					</div>
					<div id="total" class="progress">
						<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">
							<span class="sr-only">0% Complete</span>
						</div>
					</div>
					<div id="module">
						<div class="message"><strong><?php //echo _('Downloading')?>:</strong></div>
						<div class="progress">
							<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">
								<span class="sr-only">0% Complete</span>
							</div>
						</div>
					</div>
					<pre class="body"></pre>
					<div id="post-message" class="hidden"><?php //echo _("The upgrade process has finished. Click Refresh below to continue")?></div> 
				</div>
			</div> -->
		</div> 
		<div class="modal-footer">
			<div id="post-message" class="hidden"><?php echo _("The upgrade process has finished. Click Refresh below to continue") ?></div>
			<button id="previousBtn" type="button" class="btn btn-default"><?php echo _("Previous")?></button>
			<button id="skipBtn" type="button" class="btn btn-default hidden"><?php echo _("Skip")?></button>
			<button id="nextBtn" type="button" class="btn btn-default"><?php echo _("Next")?></button>
			<button id="closeBtn" type="button" class="btn btn-default hidden" data-dismiss="modal"><?php echo _("Close")?></button>
			<button id="refreshBtn" type="button" class="btn btn-default hidden"><?php echo _("Refresh")?></button>
		</div>
	</div>
</div>
</div>
