<?php
namespace FreePBX\modules\Sipstation\sapi\config;

class Config103 extends Config102 {
	protected $premium_trunks = 'NO';

	public function setCustomerInfo(Array $customerInfo) {
		parent::setCustomerInfo($customerInfo);
		$this->premium_trunks = $customerInfo['premium_trunks'];
	}

	public function setAsteriskSettings(Array $asteriskSettings) {
		$this->asterisk_settings = $asteriskSettings;
	}

	public function getArray() {
		$array = parent::getArray();
		$array['premium_trunks'] = $this->premium_trunks;
		return $array;
	}

	public function isPremium() {
		$array = $this->getArray();
		return (!empty($array['premium_trunks']) && strtoupper($array['premium_trunks']) == 'YES');
	}
}
