<?php
if (!defined('FREEPBX_IS_AUTH')) { die('No direct script access allowed'); }
//	License for all code of this FreePBX module can be found in the license file inside the module directory
//	Copyright 2013 Schmooze Com Inc.
//

function sipstation_getdest($exten) {
	return array("sipstation-welcome,$exten,1");
}

function sipstation_destinations(){
	$extens = array();

	$extens[] = array(
		'destination' => 'sipstation-welcome,${EXTEN},1',
		'description' => _("DID Verification"),
		'category' => _('Sipstation'),
	);
	return $extens;
}


function sipstation_getdestinfo($dest) {
	if (substr(trim($dest),0,18) == 'sipstation-welcome') {
		return array(
			'description' => _("SIPStation DID Verification"),
			'edit_url' => 'config.php?display=sipstation',
			'data' => [
				'gqltype' => 'sipstationwelcome',
				'id' => 'sipstation-welcome,'.explode(",",$dest)[1].',1',
				'description' => "DID Verification for ".explode(",",$dest)[1]
			]
		);
	} else {
		return false;
	}
}
