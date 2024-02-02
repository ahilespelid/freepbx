<?php
namespace FreePBX\modules\Sipstation\sapi\drivers;

abstract class Driver implements Base {
	protected $sipstation;
	protected $freepbx;

	public function __construct($freepbx, $sipstation) {
		$this->sipstation = $sipstation;
		$this->freepbx = $freepbx;
	}

	public function __get($var) {
		switch($var) {
			case 'api':
				$this->api = $this->sipstation->getAPIObject();
				return $this->api;
			break;
		}
	}

	public function getTech() {
		throw new \Exception("Tech must be defined!");
	}

	public function getTrunkName($i,$forcePremium=null) {
		$premium = !is_null($forcePremium) ? $forcePremium : $this->api->isPremium();
		$prefix = ($premium) ? 'prem-' : '';
		return 'fpbx-'.$i.'-'.$prefix.$this->api->getUsername();
	}

	public function deleteTrunks() {
		foreach($this->getTrunks() as $trunk) {
			$this->freepbx->Core->deleteTrunk($trunk['trunkid'], $trunk['tech']);
		}
	}

	public function getTrunks($forcePremium=null) {
		$sstrunks = array();
		$alltrunks = $this->freepbx->core->listTrunks();
		$premium = !is_null($forcePremium) ? $forcePremium : $this->api->isPremium();
		$t1 = $this->getTrunkName(1,$premium);
		$t2 = $this->getTrunkName(2,$premium);
		foreach ($alltrunks as $trunk) {
			if($trunk['channelid'] == $t1){
				$sstrunks['gw1'] = $trunk;
			}
			if($trunk['channelid'] == $t2){
				$sstrunks['gw2'] = $trunk;
			}
			if(isset($sstrunks['gw1']) && isset($sstrunks['gw2'])){
				break;
			}
		}
		return $sstrunks;
	}

	public function renameTrunks() {
		if($this->api->isPremium()) {
			$trunks = $this->getTrunks(false);
		} else {
			$trunks = $this->getTrunks(true);
		}

		$need_reload = false;
		if(!empty($trunks)) {
			$need_reload = true;
			foreach($trunks as $trunk) {
				$parts = explode("-",$trunk['channelid']);
				$id = $parts[1];
				$newtrunk = $this->getTrunkName($id,$this->api->isPremium());
				switch($trunk['tech']) {
					case 'sip':
						$sql = "UPDATE sip SET data = :newtrunk WHERE `keyword` = 'account' AND id = :peer";
						$sth = $this->freepbx->Database->prepare($sql);
						$sth->execute(array(
							":newtrunk" => $newtrunk,
							":peer" => 'tr-peer-'.$trunk['trunkid']
						));
						//nobreak on purpose!
					case 'pjsip':
						$sql = "UPDATE trunks SET channelid = :newtrunk, name = :newtrunk WHERE channelid = :channelid";
						$sth = $this->freepbx->Database->prepare($sql);
						$sth->execute(array(
							":newtrunk" => $newtrunk,
							":channelid" => $trunk['channelid']
						));
					break;
				}
			}
		}
		return $need_reload;
	}
}
