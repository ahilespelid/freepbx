<div class="element-container">
	<div class="row">
		<div class="col-md-12">
			<div class="row">
				<div class="form-group">
					<div class="col-md-3">
						<label class="control-label" for="sms_enable"><?php echo _("Allow SMS")?></label>
						<i class="fa fa-question-circle fpbx-help-icon" data-for="sms_enable"></i>
					</div>
					<div class="col-md-9">
						<span class="radioset">
							<input type="radio" name="sms_enable" id="sms_enable_yes" value="yes" <?php echo ($enable) ? 'checked' : ''?>>
							<label for="sms_enable_yes"><?php echo _('Yes')?></label>
							<input type="radio" name="sms_enable" id="sms_enable_no" value="no" <?php echo (!is_null($enable) && !$enable) ? 'checked' : ''?>>
							<label for="sms_enable_no"><?php echo _('No')?></label>
							<?php if($mode == "user") {?>
								<input type="radio" id="sms_enable_inherit" name="sms_enable" value='inherit' <?php echo is_null($enable) ? 'checked' : ''?>>
								<label for="sms_enable_inherit"><?php echo _('Inherit')?></label>
							<?php } ?>
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="row">
		<div class="col-md-12">
			<span id="sms_enable-help" class="help-block fpbx-help-block"><?php echo _("Enable SMS in UCP for this user")?></span>
		</div>
	</div>
</div>
