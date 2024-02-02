<div class="alert alert-info">
	<?php echo _("Your E911 Master Location is your primary E911 address. It must be a valid U.S. or Canadian address.<br/> You must provide an address in order to use the SIPStation service, except in Free Trial mode.<br/> You are responsible for the accuracy of this information and for confirming that E911 service is working.<br/><strong>DO NOT call 911 to test E911 service.</strong> To test the service, please be sure 933 is included in an emergency outbound route, and then dial 933. <br/>This reaches an E911 address verification service that will play back the information being transmitted. <br/> When calling outbound on an emergency route, the SIPStation trunk will send out a Caller ID (CID) matching your Master E911 DID as shown here, unless an extension/device has its own Emergency CID set. There is no fee for E911 service on your Master DID. If you have multiple DIDs, you can designate a different DID as the Master within your SIPStation account. You can also enable E911 service on additional DIDs for a small additional fee. This would allow the E911 operator to see different addresses and CIDs for different numbers.")?>
</div>

<div class="jumbotron">
  <h2><?php echo sprintf(_("E911 Information for %s"), $e911_master['number'])?></h2>
  <p id="e911jumboaddress">
  	<strong><?php echo $e911_master['name'] ?></strong><br/>
		<?php echo $e911_master['street1'] ?><br/>
		<?php echo $e911_master['street2'] ?><br/>
		<?php echo sprintf("%s, %s. %s",$e911_master['city'],$e911_master['state'],$e911_master['zip'])?>
  </p>
  <p><a class="btn btn-primary btn-lg" href="#" role="button" data-toggle="modal" data-target="#e911modal"><?php echo _("Edit E911 Information")?></a></p>
</div>

<div class="modal fade" tabindex="-1" role="dialog" id="e911modal">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title"><?php echo _("Edit E911 Information")?></h4>
      </div>
      <div class="modal-body">
				<!--E911 Caller ID-->
				<div class="element-container">
					<div class="row">
						<div class="col-md-12">
							<div class="row">
								<div class="form-group">
									<div class="col-md-3">
										<label class="control-label" for="noocidw"><?php echo _("E911 Caller ID") ?></label>
									</div>
									<div class="col-md-9">
										<input type="hidden" id="noocidw" value="<?php echo $e911_master['number']; ?>">
										<span id="default_did"><?php echo $e911_master['number']; ?></span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<!--END E911 Caller ID-->
				<!--Name-->
				<div class="element-container">
					<div class="row">
						<div class="col-md-12">
							<div class="row">
								<div class="form-group">
									<div class="col-md-3">
										<label class="control-label" for="name"><?php echo _("Name") ?></label>
									</div>
									<div class="col-md-9">
										<input type="text" class="form-control" id="name" name="name" value="<?php echo $e911_master['name'] ?>" placeholder="<?php echo $unavailintrial?>" <?php echo $disabled; ?>>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<!--END Name-->
				<!--Address 1-->
				<div class="element-container">
					<div class="row">
						<div class="col-md-12">
							<div class="row">
								<div class="form-group">
									<div class="col-md-3">
										<label class="control-label" for="address1"><?php echo _("Address 1") ?></label>
									</div>
									<div class="col-md-9">
										<input type="text" class="form-control" id="address1" name="address1" value="<?php echo $e911_master['street1'] ?>" placeholder="<?php echo $unavailintrial?>" <?php echo $disabled; ?>>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<!--END Address 1-->
				<!--Address 2-->
				<div class="element-container">
					<div class="row">
						<div class="col-md-12">
							<div class="row">
								<div class="form-group">
									<div class="col-md-3">
										<label class="control-label" for="address2"><?php echo _("Address 2") ?></label>
									</div>
									<div class="col-md-9">
										<input type="text" class="form-control" id="address2" name="address2" value="<?php echo $e911_master['street2'] ?>" placeholder="<?php echo $unavailintrial?>" <?php echo $disabled; ?>>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<!--END Address 2-->
				<!--City-->
				<div class="element-container">
					<div class="row">
						<div class="col-md-12">
							<div class="row">
								<div class="form-group">
									<div class="col-md-3">
										<label class="control-label" for="address2"><?php echo _("City") ?></label>
									</div>
									<div class="col-md-9">
										<input type="text" class="form-control" id="city" name="city" value="<?php echo $e911_master['city'] ?>" placeholder="<?php echo $unavailintrial?>" <?php echo $disabled; ?>>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<!--END City-->
				<!--State-->
				<div class="element-container">
					<div class="row">
						<div class="col-md-12">
							<div class="row">
								<div class="form-group">
									<div class="col-md-3">
										<label class="control-label" for="address2"><?php echo _("State") ?></label>
									</div>
									<div class="col-md-9">
										<input type="text" class="form-control" id="state" name="state" value="<?php echo $e911_master['state'] ?>" placeholder="<?php echo $unavailintrial?>" <?php echo $disabled; ?>>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<!--END State-->
				<!--Zip-->
				<div class="element-container">
					<div class="row">
						<div class="col-md-12">
							<div class="row">
								<div class="form-group">
									<div class="col-md-3">
										<label class="control-label" for="address2"><?php echo _("Zip") ?></label>
									</div>
									<div class="col-md-9">
										<input type="text" class="form-control" id="zip" name="zip" value="<?php echo $e911_master['zip'] ?>" placeholder="<?php echo $unavailintrial?>" <?php echo $disabled; ?>>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<!--END Zip-->
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal"><?php echo _("Close")?></button>
        <button type="button" id = "e911save" class="btn btn-primary"><?php echo _("Save changes")?></button>
      </div>
    </div>
  </div>
</div>

<script>
$(document).ready(function(){
	$("#e911save").on('click',function(){
		var did = $('#noocidw').val();
		var name = $('#name').val();
		var address1 = $('#address1').val();
		var address2 = $('#address2').val();
		var city = $('#city').val();
		var state = $('#state').val();
		var zip = $('#zip').val();
		updateE911(did,name,address1,address2,city,state,zip,true,function(data){
			var html = '<strong>'+name+'</strong><br/>';
			html += '<strong>'+address1+'</strong><br/>';
			html += '<strong>'+address2+'</strong><br/>';
			html += '<strong>'+city+', '+state+'. '+zip+'</strong><br/>';
			$('#e911jumboaddress').html(html);
			$('#e911modal').modal('hide');
		});
	});
});
</script>
