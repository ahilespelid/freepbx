<?php
$unavailintrial = '';
if ($account_type == 'TRIAL') {
	$unavailintrial = _("This item is not available in trial mode");
}
$disabled = isset($disabled) ? $disabled : '';
