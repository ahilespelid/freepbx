<?php
$first = true;
$tabs = '';
$tabcontent = '';
foreach ($drivers as $driver) {
	$class = $first?"active":"";
	$tabs .= '<li role="presentation" class="'.$class.'"><a href="#'.$driver.'" data-toggle="tab">'.$driver.'</a></li>';
	$class = $first?"active":"";
	$tabcontent .= '<div id="'.$driver.'" class="tab-pane display '.$class.'">';
	$tabcontent .= $fs->getDisplay($driver);
	$tabcontent .= '</div>';
	$first = false;
}
?>
<div class="container-fluid">
	<div class="row">
		<div class="col-sm-12">
			<div class="fpbx-container">
				<div class="display no-border">
					<h1><?php echo _("File Store")?></h1>
					<div class="panel panel-info">
						<div class="panel-heading">
							<div class="panel-title">
								<a href="#" data-toggle="collapse" data-target="#moreinfo"><i class="glyphicon glyphicon-info-sign"></i></a>&nbsp;&nbsp;&nbsp;<?php echo _("What is File Store")?>
							</div>
						</div>
						<!--At some point we can probably kill this... Maybe make is a 1 time panel that may be dismissed-->
						<div class="panel-body collapse" id="moreinfo">
							<p><?php echo _('Filestore is a filesystem abstraction module for your PBX. You can use it to setup file system destinations that can be used in other modules')?></p>
						</div>
					</div>
					<ul class="nav nav-tabs">
						<?php echo $tabs ?>
					</ul>
					<div class="tab-content">
						<?php echo $tabcontent;?>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
