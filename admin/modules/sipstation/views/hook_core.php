<div class="element-container">
		<div class="row">
				<div class="col-md-12">
						<div class="row">
								<div class="form-group">
										<div class="col-md-3">
												<label class="control-label" for="element1"><?php echo _("SMS/User Assignment")?></label>
												<i class="fa fa-question-circle fpbx-help-icon" data-for="element1"></i>
										</div>
										<div class="col-md-9">
											<select id="smsuserassignment" class="bsmultiselect" name="smsusercheckbox[]" multiple="multiple">
												<?php foreach($users as $user) { ?>
													<option value="<?php echo $user['id']?>" <?php echo in_array($user['id'],$routing) ? 'selected' : '' ?>><?php echo $user['username']?></option>
												<?php } ?>
											</select>
										</div>
								</div>
						</div>
				</div>
		</div>
		<div class="row">
				<div class="col-md-12">
						<span id="element1-help" class="help-block fpbx-help-block"><?php echo _("Assign which users will get SMSes routed through this inbound route")?></span>
				</div>
		</div>
</div>
