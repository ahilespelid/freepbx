<?php
namespace FreePBX\modules\Sipstation\sapi;
class Sipstation {
	public $versionMin = '1.0.1';
	public $versionMax = '1.0.3';

	public $apiObject;
	public $apiURL = 'https://push2.schmoozecom.com/sipstation';
	public $serverStatus = 200;

	public $api;

	public function __construct($sipstation, $freepbx, $driver = null, $apiObject = null){
		$this->freepbx = $freepbx;
		$this->database =	$this->freepbx->Database;
		$this->sipstation = $sipstation;
		$this->setAPIurl($this->freepbx->Config->get('SS_API_URL'));
		if (!empty($driver)) {
			$this->driver = $driver;
		}

		if (!empty($apiObject)) {
			$this->apiObject = $apiObject;
		}
	}

	public function __get($var) {
		switch($var) {
			case 'key':
				$this->key = $this->getKey();
				return $this->key;
			break;
			case 'driver':
				$class = "FreePBX\modules\Sipstation\sapi\drivers\\".ucfirst(strtolower($this->tech));
				return new $class($this->freepbx, $this);
			break;
			case 'apiStatus':
				$this->apiStatus = $this->checkKey();
				return $this->apiStatus;
			break;
			case 'tech':
				$this->tech = $this->freepbx->Config->get('ENABLE_SS_PJSIP') ? 'pjsip' : 'sip';
				$sipdriver = $this->freepbx->Config->get('ASTSIPDRIVER');
				if($sipdriver == 'chan_sip' && $this->tech = 'pjsip') {
					$this->setMessage(_('Chan_PJSIP is not supported when SIP Driver is forced to Chan_SIP'),'danger');
					$this->tech = 'sip';
					$this->freepbx->Config->update('ENABLE_SS_PJSIP',false);
				} else if(($this->tech == 'pjsip' && version_compare_freepbx(getVersion(),"14.0","lt")) || ($sipdriver == 'chan_pjsip' && version_compare_freepbx(getVersion(),"14.0","lt"))) {
					$this->setMessage(_('Chan_PJSIP is not supported on PBX 13.0 or lower'),'danger');
					$this->tech = 'sip';
					$this->freepbx->Config->update('ENABLE_SS_PJSIP',false);
				} else if($sipdriver == 'chan_pjsip' && version_compare_freepbx(getVersion(),"14.0","ge")) {
					$this->setMessage(_('Chan_PJSIP has been enabled because this system is in PJSIP only mode'),'info');
					$this->tech = 'pjsip';
					$this->freepbx->Config->update('ENABLE_SS_PJSIP',true);
				}
				return $this->tech;
			break;
		}
		return null;
	}

	public function __isset($var) {
		switch($var) {
			case 'key':
				$key = $this->getKey();
				return !empty($key);
			break;
		}
		return false;
	}

	public function getAPIStatus() {
		return $this->apiStatus;
	}

	private function setupAPI() {
		$this->api = new PestSipstation($this->freepbx,$this->apiURL);
	}

	public function removeE911($did) {
		//Can't make this call with no key
		if(!isset($this->key)){
			return array('status' => false, 'message' => _("Sipstation Key not set"));
		}
		$key = $this->key;
		try{
			return $this->ss->api->delete('/2/e911/'.$did.'/'.$key,$data);
		} catch (Exception $e) {
			$d = json_decode($e->getMessage(),true);
			$json['status'] = false;
			$json['status_message'] = _('Remote Server Error. Please try again in 10 minutes, If you continue to have problems please contact support and give them this error code') . ':(' . $d['message'] . ')';
			return $json;
		}
	}

	public function updateE911($did,$name,$address1,$address2,$city,$state,$zip,$master=false) {
		//Can't make this call with no key
		if(!isset($this->key)){
			return array('status' => false, 'message' => _("Sipstation Key not set"));
		}
		$data = array(
				"address1" => $address1,
				"address2" => $address2,
				"state" => $state,
				"city" => $city,
				"zip" => $zip,
				"name" => $name
			);
		if($master){
			$data['master'] = '1';
		}
		$key = $this->key;
		try{
			return $this->api->post('/2/e911/'.$did.'/'.$key,$data);
		} catch (Exception $e) {
			$d = json_decode($e->getMessage(),true);
			$json['status'] = false;
			$json['status_message'] = _('Remote Server Error. Please try again in 10 minutes, If you continue to have problems please contact support and give them this error code') . ':(' . $d['message'] . ')';
			return $json;
		}
	}

	/**
	 * Updated the failover information with the SIPSTATION API
	 * @param  string  $did    Affected DID ommit for global_failover
	 * @param  string  $type   Failover type either num or dest
	 * @param  string  $value  what to set the value to
	 * @param  boolean $master is this the master failover default false.
	 * @return array   array((boolean)status, (string)Message )
	 */
	public function updateFailover($did='',$type,$value, $master = false) {
		//Can't make this call with no key
		if(!isset($this->key)){
			return array('status' => false, 'message' => _("Sipstation Key not set"));
		}
		$data = null;
		switch ($type) {
			case 'num':
				//numbers only
				$value = trim(preg_replace('/\D/', '', $value));
				$data = array(
					"num" => $value
				);
			break;
			case 'dest':
				switch (false) {
					case filter_var($value, FILTER_VALIDATE_URL):
					case filter_var($value, FILTER_VALIDATE_IP):
					case filter_var($value, FILTER_VALIDATE_INT):
					$data = array(
						"dest" => $value
					);
					break;
					default:
						return array('status'=> false, 'message' => _("Destination appears to be an invalid URI."));
					break;
				}
			break;
		}
		if($data === null){
			return array('status'=> false, 'message' => _("No valid data received"));
		}
		if(!empty($did)){
			$data['did'] = $did;
		}
		try{
			$res = $this->api->post('/2/failover/'.$this->key,$data);
			return $res;
		} catch (Exception $e) {
			$d = json_decode($e->getMessage(),true);
			$json['status'] = false;
			$json['status_message'] = _('Remote Server Error. Please try again in 10 minutes, If you continue to have problems please contact support and give them this error code') . ':(' . $d['message'] . ')';
			return $json;
		}
	}

	public function clearFailover($did=''){
		$data = empty($did)?array():array('did' => $did);
		try{
			$res = $this->api->delete('/2/failover/'.$this->key,$data);
			return $res;
		} catch (Exception $e) {
			$d = json_decode($e->getMessage(),true);
			$json['status'] = false;
			$json['status_message'] = _('Remote Server Error. Please try again in 10 minutes, If you continue to have problems please contact support and give them this error code') . ':(' . $d['message'] . ')';
			return $json;
		}
	}

	/**
	 * Set the API URL to use
	 * @param string $url The api url to use or blank for default.
	 */
	public function setAPIUrl($url){
		$this->apiURL = !empty($url) ? $url : 'https://push2.schmoozecom.com/sipstation';
		$this->setupAPI();
	}

	public function getTrunks() {
		return $this->driver->getTrunks();
	}

	public function createTrunks() {
		return $this->driver->createTrunks();
	}

	public function getRegistrationStatus() {
		return $this->driver->getRegistrationStatus();
	}

	public function getPeerStatus($peer) {
		return $this->driver->getPeerStatus($peer);
	}

	public function getTrunkSettings() {
		return $this->driver->getSettings();
	}

	public function getConfiguredCodecs($channelid,$trunk_status) {
		return $this->driver->getConfiguredCodecs($channelid,$trunk_status);
	}

	/**
	 * deleteTrunks
	 *
	 * @return void
	 */
	public function deleteTrunks() {
		return  $this->driver->deleteTrunks();
	}

	/**
	* Get the sipstation token from the database
	*/
	public function getKey() {
		$value = $this->sipstation->getConfig('key');
		if (!$value || trim($value) == "") {
			return false;
		} else {
			$this->key = trim($value);
			return $this->key;
		}
	}

	/*
	 * Check if there is a valid key
	 * Returns: nokey, valid, invalid, noserver (if server can't be contacted)
	 */
	public function checkKey() {
		$value = $this->sipstation->getConfig('key');

		// if not set so this is a first time install
		// get a new hash to account for first time install
		//
		if (!$value || trim($value) == "") {
			return 'nokey';
		} else {
			return $this->confirmKey($value);
		}
	}

	/*
	* deleted saved configuration if confirmation determines it is stale
	*/
	public function confirmKey($key,$force = false, $removeKey = true) {
		$this->key = $key;
		$api = $this->getAPIObject($force);
		if($this->serverStatus != 200) { return 'noserver'; }
		if ($this->apiStatus == 'success') {
			switch ($api->getQueryStatus()) {
				case 'SUCCESS':
					return 'valid';
				case 'TEMPNOTAVAIL':
					return 'tempnotavail';
				case 'BADKEY':
					if($removeKey) {
						$this->removeKey();
					}
				default:
					return 'invalid';
			}
		} else {
			return $this->apiStatus;
		}
	}

	/*
	* Set sipstation token while also deleting the old token at the same time
	*/
	public function setKey($key) {
		$status = $this->confirmKey($key,true);
		if ($status == 'valid' || $status == 'tempnotavail') {
			$key = trim($key);
			$this->sipstation->setConfig('key',$key);
		}
		return $status;
	}

	/*
	* Remove Key
	*/
	public function removeKey() {
		$this->sipstation->setConfig('key',null);
		$this->key = null;
		return true;
	}

	/*
	* save the retrieved configuration information into the db to be used to configure trunks and what not
	*/
	public function saveConfig($json) {
		$dbh = $this->database;
		$this->sipstation->setConfig('config',$json);
		return true;
	}

	/*
	* Retrieve Saved configuration from database
	* TODO: move to kvstore
	*/
	public function getSavedConfig() {
		return $this->sipstation->getConfig('config');
	}

	private function getInstallID() {
		//TODO: lame
		$sql = "SELECT data FROM module_xml WHERE id = 'installid'";
		$uid = sql($sql, "getOne");
		$uid = ($uid) ? $uid : '';
		return $uid;
	}
	
	/**
	 * check_api_url
	 *
	 * @param  string $url
	 * @return array
	 */
	private function check_api_url($url){
		$options = array(
			CURLOPT_RETURNTRANSFER => true, 
			CURLOPT_HEADER         => false,
			CURLOPT_FOLLOWLOCATION => true,
			CURLOPT_ENCODING       => "",
			CURLOPT_USERAGENT      => "sangoma", 
			CURLOPT_AUTOREFERER    => true,     
			CURLOPT_CONNECTTIMEOUT => 10,      
			CURLOPT_TIMEOUT        => 10,      
			CURLOPT_MAXREDIRS      => 10,       
		);
	
		$ch      = curl_init($url);
		curl_setopt_array($ch, $options);
		$content = curl_exec($ch);
		$err     = curl_errno($ch);
		$errmsg  = curl_error($ch);
		$header  = curl_getinfo($ch);
		curl_close($ch);
	
		$result['errnum']  = $err;
		$result['errmsg']  = $errmsg;
		$result['content'] = json_decode($content, true);

		return $result;
	}
	
	/**
	* Get Remote settings using a key/token
	*/
	private function getSettings($online=true) {
		$saved = $this->getSavedConfig();
		if (empty($saved) || $online) {
			$uid = $this->getInstallID();
			$url_api = $this->check_api_url($this->freepbx->Config->get('SS_API_URL')."/2/full/");
			if($url_api["errnum"] != 0 && $url_api["errmsg"] != ""){
				$this->sipstation->setConfig("url_status", "failed");
				return $this->getSavedConfig();
			}
			else{
				$this->sipstation->setConfig("url_status", "ok");
			}
			try{
				if(empty($uid)) {
					$json_data = $this->api->get('/2/full/'.$this->key);
				} else {
					$json_data = $this->api->get('/2/full/'.$this->key.'/'.$uid);
				}
			} catch (Exception $e) {
				$this->serverStatus = $e->getCode();
				return $this->getSavedConfig();
			}

			if(json_last_error() == JSON_ERROR_NONE) {
				$this->saveConfig($json_data); // cache the latest
			} else {
				$this->serverStatus = 500;
				return $saved;
			}

			return $json_data;
		} else {
			return $saved;
		}
	}

	public function createInboundRoutes() {
		$need_reload = false;

		$api = $this->getAPIObject();

		$dids = $api->getDIDs();

		//Get a list of our existing inbound routes
		$system_dids = core_did_list();

		if(!empty($dids)) {
			$ss_did_config = array();
			foreach($dids as $did) {
				$dids_to_configure[$did['did']] = $did['did'];
			}
		}

		//Diff our inbound routes and keep what we don't have
		foreach ($system_dids as $key => $did) {
			if (is_array($did) && $did['cidnum'] == '' && in_array($did['extension'], $dids_to_configure)) {
				unset($dids_to_configure[$did['extension']]);
			}
		}

		//What is leftover? Configure them?
		if(!empty($dids_to_configure)) {
			$nt = \notifications::create();
			$need_reload = true;
			foreach ($dids_to_configure as $key => $did) {
				$did_vars = array(
					'extension' => $did,
					'cidnum' => '',
					'destination' => 'sipstation-welcome,${EXTEN},1',
					'description' => '',
				);
				$rawname = 'sipstationdid';
				if(!$nt->exists($rawname, 'ss'.$did)) {
					$nt->add_notice($rawname, 'ss'.$did, _("SIPSTATION DID routed"),sprintf(_("Your SIPSTATION DID %s, has been routed to a test destination"),$did), "?display=did&view=form&extdisplay=".$did."%2F",false,true);
				}
				$did_result = core_did_create_update($did_vars);
			}
		}
		return $need_reload;
	}

	public function createOutboundRoutes($check_previous=true) {
		$sip_user = $this->getAPIObject()->getUsername();
		$dat = $this->sipstation->getSSRoutes();
		$routing = new \FreePBX\modules\Core\Components\Outboundrouting();

		if($check_previous && count($this->freepbx->Core->getAllRoutes())) {
			return false;
		}

		$fpbx_gw1 = '';
		$fpbx_gw2 = '';

		$trunks = $this->driver->getTrunks();

		if (isset($trunks['gw1']) && isset($trunks['gw2'])) {
			$fpbx_gw1  = $trunks['gw1']['trunkid'];
			$fpbx_gw2  = $trunks['gw2']['trunkid'];
		}

		// Setup Common Parameters
		//
		$outcid = '';
		$outcid_mode = '';
		$routepass = '';
		$intracompany = '';
		$mohsilence = 'default';
		$time_group_id = '';
		$trunkpriority = array($fpbx_gw1, $fpbx_gw2);
		$dest = '';

		//E911 Setup Start
		$e911_route = array(
			'routename' => 'E911-Leave-First',
			'emergency' => 'YES'
		);

		$e911_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => '911',
			'match_cid' => ''
		);
		$e911_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '1',
			'match_pattern_pass' => '911',
			'match_cid' => ''
		);
		$e911_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '91',
			'match_pattern_pass' => '911',
			'match_cid' => ''
		);
		$e911_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '9',
			'match_pattern_pass' => '911',
			'match_cid' => ''
		);
		$e911_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => '933',
			'match_cid' => ''
		);
		$e911_route['seq'] = '0';
		//E911 Setup End

		//Outbound Setup Start
		$out_route = array(
			'routename' => 'SIPStation-Out',
			'emergency' => ''
		);

		$out_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => 'NXXXXXX',
			'match_cid' => ''
		);
		$out_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => 'NXXNXXXXXX',
			'match_cid' => ''
		);
		$out_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => '1800NXXXXXX',
			'match_cid' => ''
		);
		$out_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => '1888NXXXXXX',
			'match_cid' => ''
		);
		$out_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => '1877NXXXXXX',
			'match_cid' => ''
		);
		$out_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => '1866NXXXXXX',
			'match_cid' => ''
		);
		$out_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => '1855NXXXXXX',
			'match_cid' => ''
		);
		$out_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => '1844NXXXXXX',
			'match_cid' => ''
		);
		$out_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => '1NXXNXXXXXX',
			'match_cid' => ''
		);
		$out_route['seq'] = '1';
		//outbound Setup End

		//International Setup Start
		$int_route = array(
			'routename' => 'SIPStation-INT',
			'emergency' => ''
		);
		$int_route['patterns'][] = array(
			'prepend_digits' => '+',
			'match_pattern_prefix' => '011',
			'match_pattern_pass' => 'NXX.',
			'match_cid' => ''
		);
		$int_route['patterns'][] = array(
			'prepend_digits' => '',
			'match_pattern_prefix' => '',
			'match_pattern_pass' => '+NXX.',
			'match_cid' => ''
		);
		$int_route['seq'] = 'bottom';
		//Internation Setup End

		$cnt = 0;

		if(!empty($dat)) {
			$info = json_decode($dat,TRUE);
			$routes = $this->freepbx->Core->getAllRoutes();
			$e911_id = isset($info['outbound_routes']['e911']) ? $info['outbound_routes']['e911'] : '';
			$int_id = isset($info['outbound_routes']['international']) ? $info['outbound_routes']['international'] : '';
			$out_id = isset($info['outbound_routes']['outbound']) ? $info['outbound_routes']['outbound'] : '';
			$allowed_routes = array(); //for extension routing module

			//Add E911 Routes
			$e911_info = $this->freepbx->Core->getRouteByID($e911_id);
			if(empty($e911_info)) {
				$cnt++;
				$e911_id = $routing->add($e911_route['routename'], $outcid, $outcid_mode, $routepass, $e911_route['emergency'], $intracompany, $mohsilence, $time_group_id, $e911_route['patterns'], $trunkpriority, $e911_route['seq'], $dest);
				$allowed_routes[] = $e911_id; //for extension routing module
			} else {
				//Check if there are trunks defined and fix if we need to do so
				$tks = $routing->getRouteTrunksByID($e911_id);
				if(empty($tks[0]) || empty($tks[1])) {
					$routing->updateTrunks($e911_id, $trunkpriority, true);
				}
			}

			//Add International Routes
			$int_info = $this->freepbx->Core->getRouteByID($int_id);
			if(empty($int_info)) {
				$cnt++;
				$int_id = $routing->add($int_route['routename'], $outcid, $outcid_mode, $routepass, $int_route['emergency'], $intracompany, $mohsilence, $time_group_id, $int_route['patterns'], $trunkpriority, $int_route['seq'], $dest);
				$allowed_routes[] = $int_id; //for extension routing module
			} else {
				//Check if there are trunks defined and fix if we need to do so
				$tks = $routing->getRouteTrunksByID($int_id);
				if(empty($tks[0]) || empty($tks[1])) {
					$routing->updateTrunks($int_id, $trunkpriority, true);
				}
			}

			//Add Outbound Routes
			$out_info = $this->freepbx->Core->getRouteByID($out_id);
			if(empty($out_info)) {
				$cnt++;
				$out_id = $routing->add($out_route['routename'], $outcid, $outcid_mode, $routepass, $out_route['emergency'], $intracompany, $mohsilence, $time_group_id, $out_route['patterns'], $trunkpriority, $out_route['seq'], $dest);
				$allowed_routes[] = $out_id; //for extension routing module
			} else {
				//Check if there are trunks defined and fix if we need to do so
				$tks = $routing->getRouteTrunksByID($out_id);
				if(empty($tks[0]) || empty($tks[1])) {
					$routing->updateTrunks($out_id, $trunkpriority, true);
				}
			}

			//for extension routing module
			if(function_exists('extensionroutes_edit_user') && !empty($allowed_routes)) {
				$exts = core_users_list(true);
				foreach($exts as $ext) {
					$routes = extensionroutes_get_routes($ext[0]);
					$final_routes = array_merge($allowed_routes,$routes);
					extensionroutes_edit_user($ext[0], $final_routes);
				}
			}
		} else {
			$cnt + 3;
			//Add All of the routes
			$e911_id = $routing->add($e911_route['routename'], $outcid, $outcid_mode, $routepass, $e911_route['emergency'], $intracompany, $mohsilence, $time_group_id, $e911_route['patterns'], $trunkpriority, $e911_route['seq'], $dest);
			$int_id = $routing->add($int_route['routename'], $outcid, $outcid_mode, $routepass, $int_route['emergency'], $intracompany, $mohsilence, $time_group_id, $int_route['patterns'], $trunkpriority, $int_route['seq'], $dest);
			$out_id = $routing->add($out_route['routename'], $outcid, $outcid_mode, $routepass, $out_route['emergency'], $intracompany, $mohsilence, $time_group_id, $out_route['patterns'], $trunkpriority, $out_route['seq'], $dest);

			//for extension routing module
			$allowed_routes = array($e911_id,$int_id,$out_id);
			if(function_exists('extensionroutes_edit_user')) {
				$exts = core_users_list(true);
				foreach($exts as $ext) {
					$routes = extensionroutes_get_routes($ext[0]);
					$final_routes = array_merge($allowed_routes,$routes);
					extensionroutes_edit_user($ext[0], $final_routes);
				}
			}
		}

		$save = array(
			"outbound_routes" => array(
				"e911" => $e911_id,
				"international"	=>	$int_id,
				"outbound"	=>	$out_id
			)
		);

		$j = json_encode($save);

		$sql = "REPLACE INTO module_xml (id, data) VALUES ('ss_route', '".$j."')";
		sql($sql);

		return array(
			$e911_id => $routing->getRouteTrunksByID($e911_id),
			$int_id => $routing->getRouteTrunksByID($int_id),
			$out_id => $routing->getRouteTrunksByID($out_id)
		);
	}

	public function setOutboundCID($user, $cid, $type) {
		$device_updates = array();
		if($type == 'ecid') {
			/*Start set device Emergency CID */
			$sth = $this->database->prepare("SELECT `id`, `emergency_cid` FROM `devices` WHERE `user` = ?");
			$sth->execute(array($user));
			$devices = $sth->fetchAll(\PDO::FETCH_ASSOC);
			foreach ($devices as $d) {
				$this->freepbx->astman->database_put("DEVICE",$d['id']."/emergency_cid","$cid");
				$this->database->prepare("UPDATE `devices` SET `emergency_cid` = ? WHERE `id` = ?");
				$sth->execute(array($cid, $d['id']));
				$device_updates[] = $d['id'];
			}
			/*End set device Emergency CID */
		} elseif($type == 'cid') {
			/*Start set user CID */
			$uvars = core_users_get($user);
			$uvars['outboundcid'] = $cid;
			core_users_edit($user, $uvars);
			/*End set user CID */
		}

		return $device_updates;
	}

	/*
	* Parse remote configuration parameters. We prevent multiple calls to this function and our remote API with the local storage of remote_configuration
	*/
	public function getAPIObject($force = false) {
		if(!empty($this->apiObject) && !$force) {
			return $this->apiObject;
		}
		$account_key = $this->key;
		if (!empty($account_key)) {
			$json_data = $this->getSettings($force);
			$mapper = new \JsonMapper();
			$mapper->bEnforceMapType = false;

			$mapper->undefinedPropertyHandler = function($object, $propName, $jsonValue) {
				throw new \Exception("Undefined {$propName}");
			};
			if(isset($json_data['version']) && version_compare($json_data['version'], $this->versionMin, '>=')  && version_compare($json_data['version'], $this->versionMax, '<=')) {
				if (!empty($json_data)) foreach ($json_data as $key => $value) {
					$ver = basename(preg_replace("/\W/", "", $json_data['version']));
					$class = '\FreePBX\modules\Sipstation\sapi\config\Config'.$ver;
					$this->apiObject = $mapper->map($json_data, new $class($this->freepbx));
					$this->apiStatus = 'success';
					return $this->apiObject;
				} else {
					$this->apiStatus = 'noserver';
				}
			} else {
				$this->apiStatus = 'outdated';
			}
		} else {
			$this->apiStatus = 'nokey';
		}
		return null;
	}

	public function saveFreeTrialSession($sessionId) {
		$this->sipstation->setConfig('session',$sessionId);
	}

	/**
	* Get the session
	*/
	public function getFreeTrialSession() {
		$value = $this->sipstation->getConfig('session');
		if (!$value || trim($value) == "") {
			return sprintf('%04X%04X-%04X-%04X-%04X-%04X%04X%04X', mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
		} else {
			return trim($value);
		}
	}

	public function cancelFreeTrial() {
		$postvars = array(
			'keycode' => $this->key,
			'session' => $this->getFreeTrialSession(),
		);

		$cancel = $this->api->post('/store/ajax/kt_user/cancelFreeTrial', $postvars);

		if (!empty($cancel['status']) && $cancel['status']) {
			return true;
		}
		return false;
	}

	public function setupFreeTrial($session = null) {
		$pest = new \Pest($this->apiURL);
		$pest->curl_opts[CURLOPT_CONNECTTIMEOUT] = 10;
		$pest->curl_opts[CURLOPT_TIMEOUT] = 10;

		try {
			$guid = $session;
			if (empty($session)) {
				//%04X%04X-%04X-%04X-%04X-%04X%04X%04X
				$guid = sprintf('%04X%04X-%04X-%04X-%04X-%04X%04X%04X', mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(16384, 20479), mt_rand(32768, 49151), mt_rand(0, 65535), mt_rand(0, 65535), mt_rand(0, 65535));
			}
			$modulef = \module_functions::create();
			$deployment_id = $modulef->_deploymentid();
			$uniqueid = $this->getInstallID();

			$postvars = array(
				'session' => $guid,
				'deployment_name' => !empty($deployment_id) && is_string($deployment_id) ? $deployment_id : '',
				'unique_id' => !empty($uniqueid) && is_string($uniqueid) ? $uniqueid : '',
				'freepbx_version' => get_framework_version(),
			);

			$trial = $pest->post('/store/index', $postvars);

			//Had trouble with PestJSON so doing this instead
			$trial = json_decode($trial);

			$html = null;
			if (isset($trial->status) && $trial->status) {

				$html = '<script src="/admin/assets/sipstation/js/math-session.js"></script>';
				//Override our guid so that it's not picked up by the js version and we save state
				$html .= '<script>
					var ssSession = new Session("ss_session_id");
					var guid = ssSession.get();
					if (guid === "") {
						guid = ssSession.override("' . $guid . '");
					}

					$.post("ajax.php?module=sipstation&command=updatesession",
						{
							session: guid
						},
						function(data){
							if(data.status) {
								console.log("Session saved");
							}
						}
					);

				</script>';
				$html .= '<div id="ssfreetrial">';
				$html .= $trial->message;
				$html .= '</div>';

				return $html;
			}
		} catch (\Exception $e) {
			echo $e->getMessage();
			return false;
		}

		return false;
	}

	public function setMessage($message,$type='info'){
		$this->freepbx->Sipstation->setConfig('message', array(
			'type' => $type,
			'message' => $message
		));
	}
}
