<div class="container-fluid">
	<h1><?php echo _('SIPStation')?></h1>
	<div class = "display full-border">
		<div class="row">
			<div class="col-sm-12">
				<div class="fpbx-container">
					<div class="display full-border">
						<div class="alert alert-info">
							<?php echo sprintf(_("This module requires %s trunking service available at %s or use the window below.
										Once you have SIPStation service and have entered a valid E911 address, your account key will be available in the %s. Enter it below to use this module.
										The key is very long, use \"Copy\" &amp; \"Paste\" to copy it here. The key will be stored securely and can be removed at any time to stop access.
										If the key is compromised, you can contact us at our %s and have a new one re-generated."),
										'<a href="https://store.sipstation.com" target="_sipstation" title="FreePBX SIP Store and Portal">SIPStation</a>',
										'<a href="https://store.sipstation.com" target="_sipstation" title="FreePBX SIP Store and Portal">https://store.sipstation.com</a>',
										'<a href="https://store.sipstation.com" target="_sipstation" title="FreePBX SIP Store and Portal">SIPStation store</a>',
										'<a href="https://support.sangoma.com" target="_sipstationsupport" title="Sangoma Support">Support Center</a>')?>
							<br/>
							<br/>
							<!--Account Key-->
							<div class="element-container">
								<div class="row">
									<div class="col-md-12">
										<div class="row">
											<div class="form-group">
												<div class="col-md-3">
													<label class="control-label" for="account_key"><?php echo _("Account Key") ?></label>
													<i class="fa fa-question-circle fpbx-help-icon" data-for="account_key"></i>
												</div>
												<div class="col-md-9">
													<div class = "input-group">
														<input type="text" class="form-control" id="account_key" name="account_key" value="<?php echo isset($account_key)?$account_key:''?>">
														<span class="input-group-btn">
															<input type="submit" name="add_key" id="add_key" value="<?php echo _("Add Key")?>" class="btn-sm">
														</span>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div class="row">
									<div class="col-md-12">
										<span id="account_key-help" class="help-block fpbx-help-block"><?php echo _("Please enter your Account key, this can be obtained from the SIPStation portal.")?></span>
									</div>
								</div>
							</div>
							<!--END Account Key-->
						</div>
						<ul class="nav nav-tabs" role="tablist">
							<li data-name="ssstore" class="change-tab active"><a href="#ssstore" aria-controls="ssstore" role="tab" data-toggle="tab"><?php echo _("SIPSTATION Store")?></a></li>
							<li data-name="sstrial" class="change-tab sstrialtab"><a href="#sstrial" aria-controls="sstrial" role="tab" data-toggle="tab"><?php echo _("SIPSTATION Free Trial")?></a></li>
						</ul>
						<div class="tab-content display">
							<div role="tabpanel" id="ssstore" class="tab-pane active">
								<div class="ssstore">
									<a class="btn btn-primary" href="https://store.sipstation.com" target="_blank">
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
</div>
