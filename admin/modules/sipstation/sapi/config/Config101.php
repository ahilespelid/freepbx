<?php
namespace FreePBX\modules\Sipstation\sapi\config;

class Config101 extends ConfigBase {
	public function setAsteriskSettings(Array $asteriskSettings) {
		$asteriskSettings['peer']['settings'][] = 'username='.$this->sip_username;
		$asteriskSettings['peer']['settings'][] = 'secret='.$this->sip_password;
		$this->asterisk_settings['peer_1'] = $asteriskSettings['peer'];
		$this->asterisk_settings['peer_2'] = $asteriskSettings['peer'];
		$gw1 = $this->gateways[0];
		$this->asterisk_settings['peer_1']['settings'][] = 'host='.$gw1;
		$gw2 = $this->gateways[1];
		$this->asterisk_settings['peer_2']['settings'][] = 'host='.$gw2;
		$this->asterisk_settings['register_1'] = "{$this->sip_username}:{$this->sip_password}@$gw1";
		$this->asterisk_settings['register_2'] = "{$this->sip_username}:{$this->sip_password}@$gw2";
	}
}
