<?php
namespace FreePBX\modules\Sipstation\sapi\config;

abstract class ConfigBase implements \ArrayAccess {
	protected $customer_info = array();
	protected $freepbx;
	protected $version;
	protected $status;
	protected $defaultcodecs = array();
	protected $query_status;
	protected $query_status_message;
	protected $nat_troubleshooting;
	protected $message = array();
	protected $email;
	protected $cid_format;
	protected $sip_username;
	protected $sip_password;
	protected $gateway_info = array();
	protected $codecs = array();
	protected $gateways = array();
	protected $trunk_groups = array();
	protected $destination_is_trunkgroup;
	protected $account_type;
	protected $server_settings = array();
	protected $e911_master = array();
	protected $asterisk_settings = array(
		'peer_1' => array(
			'settings' => array()
		),
		'peer_2' => array(
			'settings' => array()
		),
		'register_1' => '',
		'register_2' => '',
		'sip_general_additional' => array()
	);
	protected $asteriskCodecHash = array(
		'ulaw'	 => 'G.711.U',
		'alaw'	 => 'G.711.A',
		'g729'	 => 'G.729.A'
	);
	protected $dids;

	public function __construct($freepbx) {
		$this->freepbx = $freepbx;
	}

	public function setDids(Array $dids) {
		foreach ($dids as $did_info) {
			$did = trim($did_info['number']);
			$lastcall_array = $this->getLastCall($did);
			$lastcall =  $lastcall_array['cnum'];
			$failover = $did_info['failover'];
			$e911 = $did_info['e911_address'];
			$e911Defaults = array(
				'street1',
				'street2',
				'city',
				'zip',
				'state',
				'name',
				'master' => 0
			);
			foreach($e911Defaults as $def) {
				$e911[$def] = isset($e911[$def]) ? $e911[$def] : '';
			}
			if(isset($did_info['e911_address']['master']) && $did_info['e911_address']['master']) {
				$this->e911_master = $did_info['e911_address'];
				$this->e911_master['number'] = $did;
			}
			$exten = $this->freepbx->Core->getDID($did);
			$key = 'dids';
			if (empty($exten)) {
				$this->dids[] = array(
					'did' => $did,
					'destination' => 'sipstation-welcome,${EXTEN},1',
					'description' => '',
					'failover' => $failover,
					'e911' => $e911,
					'cid' => '',
					'ecid' => '',
					'lastcall' => $lastcall
				);
			} else {
				$setcid = '';
				if(preg_match('/from-did-direct,(.*),/',$exten['destination'],$matches)) {
					$dvars = $this->freepbx->Core->getDevice($matches[1]);
					$uvars = $this->freepbx->Core->getUser($matches[1]);
					$cid = !empty($uvars['outboundcid']) ? $uvars['outboundcid'] : '';
					$ecid = !empty($dvars['emergency_cid']) ? $dvars['emergency_cid'] : '';
				}
				$this->dids[] = array(
					'did' => $did,
					'destination' => $exten['destination'],
					'description' => $exten['description'],
					'failover' => $failover,
					'e911' => $e911,
					'cid' => !empty($cid) ? $cid : "",
					'ecid' => !empty($ecid) ? $ecid : "",
					'lastcall' => $lastcall
				);
			}
		}
	}

	public function setCustomerInfo(Array $customerInfo) {
		$this->customer_info = $customerInfo;
		unset($this->customer_info['settings']);
		$this->server_settings = $customerInfo['settings'];
		$this->account_type = $customerInfo['account_type'];
		$this->email = $customerInfo['email'];
		$this->expiration = $customerInfo['expiration'];
		$this->failover_dest = $customerInfo['failover_dest'];
		$this->failover_num = $customerInfo['failover_num'];
		$this->num_trunks = $customerInfo['num_trunks'];
		$this->trunk_group_id = $customerInfo['trunk_group_id'];
		$this->verify_status = $customerInfo['verify_status'];
		$this->verify_message = $customerInfo['verify_message'];
		$this->destination_is_trunkgroup = $customerInfo['destination_is_trunkgroup'];
	}

	public function getDefaultcodecs() {
		return $this->defaultcodecs;
	}

	public function getDIDs() {
		return $this->dids;
	}

	public function setTrunkGroups(Array $trunkGroups) {
		foreach($trunkGroups as $groups) {
			foreach($groups as $group) {
				$this->trunk_groups[] = $group;
			}
		}
	}

	public function setDefaultcodecs(Array $defaultcodecs) {
		$this->defaultcodecs = $defaultcodecs;
	}

	public function getAsteriskCodecHash() {
		return $this->asteriskCodecHash;
	}

	public function setCodecs(Array $codecs) {
		$this->codecs = $codecs['codec'];
		$this->asteriskCodecHash = array_filter(
			array_map(
				function($codec) use ($codecs) {
					return in_array($codec,$codecs['codec']) ? $codec : false;
				},
				$this->asteriskCodecHash
			)
		);
	}

	public function getUsername() {
		return $this->sip_username;
	}

	public function getPassword() {
		return $this->sip_password;
	}

	public function getE911Master() {
		return $this->e911_master;
	}

	public function getQueryStatus() {
		return $this->query_status;
	}

	public function setCidFormat($cidFormat) {
		$this->cid_format = $cidFormat;
	}

	public function setGatewayInfo(Array $gatewayInfo) {
		$this->gateway_info = array();
		foreach($gatewayInfo as $gw => $gateway) {
			$this->gateway_info[$gw] = array(
				'registered' => false,
				'name' => $gateway['name'],
				'contact_ip' => null,
				'network_ip' => null
			);
			if($gateway['client_status']['registered']) {
				$this->gateway_info[$gw]['name'] = $gateway['name'];
				foreach($gateway['client_status'] as $key4 => $value4) {
					$this->gateway_info[$gw][$key4] = $value4 ? trim($value4) : '';
				}
				if (isset($gateway['client_status']['contact_ip']) && isset($gateway['client_status']['network_ip']) && ($gateway['client_status']['contact_ip'] == $gateway['client_status']['network_ip'])) {
					$this->gateway_info[$gw]['ips_match'] = 'yes';
				} else {
					$this->gateway_info[$gw]['ips_match'] = $this->isPrivateIP($gateway['client_status']['contact_ip']) ? 'private' : 'no';
				}
			}
		}
	}

	public function getGateways() {
		return $this->gateways;
	}

	public function setGateways(Array $gateways) {
		$this->gateways = array_values($gateways);
	}

	public function setSipInfo(Array $sipInfo) {
		$this->sip_username = $sipInfo['sip_username'];
		$this->sip_password = $sipInfo['sip_password'];
	}

	public function setMessage(Array $message) {
		$this->message = $message;
	}

	public function setNatTroubleshooting($natTroubleshooting) {
		$this->nat_troubleshooting = $natTroubleshooting;
	}

	public function setQueryStatusMessage($queryStatusMessage) {
		$this->query_status_message = $queryStatusMessage;
	}

	public function setVersion($version) {
		$this->version = $version;
	}

	public function setQueryStatus($queryStatus) {
		$this->query_status = $queryStatus;
		$this->status = strtolower($queryStatus);
	}

	/**
	 * Legacy Data Calls
	 * @method getArray
	 * @return [type]   [description]
	 */
	 /**
	 * Legacy Data Calls
	 * @method getArray
	 * @return [type]   [description]
	 */
	public function getArray() {
		return array(
			"sip" => array(
				"username" => $this->sip_username,
				"password" => $this->sip_password
			),
			"account_type" => $this->account_type,
			"asterisk_settings" => $this->asterisk_settings,
			"cid_format" => $this->cid_format,
			"defaultcodecs" => $this->defaultcodecs,
			"dids" => $this->dids,
			"e911_master" => $this->e911_master,
			"email" => $this->email,
			"expiration" => $this->expiration,
			"failover_dest" => $this->failover_dest,
			"failover_num" => $this->failover_num,
			"gateway_info" => $this->gateway_info,
			"gateways" => $this->gateways,
			"message" => $this->message,
			"nat_troubleshooting" => $this->nat_troubleshooting,
			"num_trunks" => $this->num_trunks,
			"query_status" => $this->query_status,
			"query_status_message" => $this->query_status_message,
			"server_settings" => $this->server_settings,
			"status" => $this->status,
			"trunk_group_id" => $this->trunk_group_id,
			"trunk_groups" => $this->trunk_groups,
			"verify_message" => $this->verify_message,
			"verify_status" => $this->verify_status,
			"version" => $this->version
		);
	}

	public function offsetSet($offset, $value) {
		//not allowed, generally
		throw new \Exception("Not allowed to set property values");
	}

	public function offsetExists($offset) {
		return property_exists($this,$offset);
	}

	public function offsetUnset($offset) {
		//not allowed
		throw new \Exception("Not allowed to unset property values");
	}

	public function offsetGet($offset) {
		if(property_exists($this,$offset)) {
			return $this->{$offset};
		} else {
			return null;
		}
	}

	protected function isPrivateIP($address) {
		if (preg_match('/^(192|172|10)\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/',$address,$match)) {
			switch($match[1]) {
				case '10':
					return true;
				break;
				case '192':
					if ($match[2] == '168') {
						return true;
					} else {
						return false;
					}
				break;
				case '172':
					if ($match[2] >= 16 && $match[2] <= 31) {
						return true;
					} else {
						return false;
					}
				break;
			}
		} else {
			return false;
		}
	}

	protected function getLastCall($did){
		if(!$this->freepbx->astman->connected()){
			$unavail = _('Unavailable');
			return array('cnum' => $unavail, 'cnam' => $unavail, 'time' => 0);
		}
		if(empty($this->lastCall)) {
			$this->lastCall = $this->freepbx->astman->database_show('sipstation');
		}

		if(isset($this->lastCall['/sipstation/'.$did.'/lastcall/cnum'])){
			$return['cnum'] = $this->lastCall['/sipstation/'.$did.'/lastcall/cnum'];
			$return['cnam'] = isset($this->lastCall['/sipstation/'.$did.'/lastcall/cnam']) ? $this->lastCall['/sipstation/'.$did.'/lastcall/cnam'] :  _("N/A");
			$return['time'] = isset($this->lastCall['/sipstation/'.$did.'/lastcall/time']) ? $this->lastCall['/sipstation/'.$did.'/lastcall/time'] : 0;
		}else{
			$return['cnum'] = _("N/A");
			$return['cnam'] = _("N/A");
			$return['time'] = 0;
		}
		return $return;
	}

	/*
	* callback to filter out codecs not supported
	*/
	public function getFilteredCodecs($codec) {
		$codec_split = explode(':',$codec,2);
		if (array_key_exists($codec_split[0],$this->asteriskCodecHash)) {
			return $codec_split[0];
		} else {
			return false;
		}
	}

	public function isPremium() {
		return false;
	}
}
