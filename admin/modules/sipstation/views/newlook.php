<ul class="nav nav-tabs" role="tablist">
  <li data-name="status" role="presentation" class="active"><a data-toggle="tab" role="tab" href="#status"><?php echo _("System Status")?></a></li>
  <li data-name="accountsettings" role="presentation" class="change-tab"><a data-toggle="tab" role="tab" href="#accountsettings"><?php echo _("Account Information")?></a></li>
  <li data-name="locationsettings" role="presentation" class="change-tab"><a data-toggle="tab" role="tab" href="#locationsettings"><?php echo _("Location Information")?></a></li>
  <li data-name="e911" role="presentation" class="change-tab"><a data-toggle="tab" role="tab" href="#e911"><?php echo _("E911 Information")?></a></li>
  <li data-name="routing" role="presentation" class="change-tab"><a data-toggle="tab" role="tab" href="#routing"><?php echo _("Routing Information")?></a></li>
</ul>
<div class="tab-content">
  <div role="tabpanel" id="status" class="tab-pane active">
    <?php echo load_view(__DIR__.'/status.php',$display_data)?>
  </div>
  <div role="tabpanel" id="accountsettings" class="tab-pane">
    <?php echo load_view(__DIR__.'/account.php',$display_data)?>
    <?php echo load_view(__DIR__.'/failover.php',$display_data)?>
  </div>
  <div role="tabpanel" id="locationsettings" class="tab-pane">
    <?php echo load_view(__DIR__.'/location.php',$display_data);?>
  </div>
  <div id="e911" class="tab-pane">
    <?php echo load_view(__DIR__.'/e911.php',$display_data)?>
  </div>
  <div role="tabpanel" id="routing" class="tab-pane">
    <?php echo load_view(__DIR__.'/routing.php',$display_data)?>
  </div>
</div>
