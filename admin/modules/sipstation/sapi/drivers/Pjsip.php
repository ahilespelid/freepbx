<?php
namespace FreePBX\modules\Sipstation\sapi\drivers;

class Pjsip extends Driver {



	public function getTech() {
		return 'pjsip';
	}

	public function getInfo() {
		$api = $this->api;
		$port = _("Unknown");
		$host = _("Unknown");
		if(!empty($api['asterisk_settings'])) {
			foreach($api['asterisk_settings']['peer_1']['settings'] as $setting) {
				$parts = explode("=",$setting);
				if($parts[0] == "port") {
					$port = $parts[1];
				}
				if($parts[0] == "host") {
					$host = $parts[1];
				}
			}
			foreach($api['asterisk_settings']['peer_2']['settings'] as $setting) {
				$parts = explode("=",$setting);
				if($parts[0] == "host") {
					$host .= ' & '.$parts[1];
				}
			}
		}

		return array(
			'driver' => 'chan_pjsip',
			'port' => $port,
			'host' => $host
		);
	}

	public function getRegistrationStatus() {
		$sip_user = $this->api->getUsername();
		$status_arr = array();
		$response = $this->freepbx->astman->send_request('Command',array('Command'=>"pjsip show registrations"));
		$buf = explode("\n",$response['data']);
		$state_pos = false;
		foreach ($buf as $line) {
			$line = trim($line);
			if ($line != '') {
				if ($state_pos===false) {
					// find the positions of the header columns so we can parse
					if ($state_pos = strpos($line,"<Status")) {
						$user_pos = strpos($line,"<Auth");
						$host_pos = strpos($line,"<Registration");
					}
				} else {
					// get the username and if ours, trunk (host) and State of reg
					preg_match("/^fpbx-[1-2]-([^\s]+)\s*/",substr($line,$user_pos),$matches);
					if (isset($matches[1]) && ($sip_user == $matches[1])) {
						list($host, $auth, $status) = preg_split("/\s+/", $line);
						$trunk = trim(substr($line,$host_pos,($user_pos-$host_pos)));
						$trunk = preg_match("/^fpbx-[1-2]-[a-z0-9]+\/sip[:]([a-z0-9\.]*)[:]{0,1}[\d]{0,5}\s*/i",$trunk,$matches) ?	 $matches[1] : $trunk;
						$state = trim(substr($line,$state_pos));
						$status_arr[$trunk] = $status;
					}
				}
			}
		}
		return $status_arr;
	}

	public function codecFilter($codec) {
		$api = $this->api;

		$codec_split = explode(':',$codec,2);
		if (array_key_exists($codec_split[0],$api->getAsteriskCodecHash())) {
			return $codec_split[0];
		} else {
			return false;
		}
	}

	public function getPeerStatus($peer) {
		$sip_peer['sipstation_status'] = 'ok';
		$response = $this->freepbx->astman->send_request(
			'Command',
			array(
				'Command'=>"pjsip show endpoint {$peer}"
			)
		);
		$buf = explode("\n",$response['data']);
		foreach ($buf as $res) {
			if (preg_match("/Unable\s*to\s*find\s*object\s*$peer\.{0,1}\s*$/",$res)) {
				$sip_peer['sipstation_status'] = 'no_peer';
				break;
			} else {
				if(preg_match_all("/Contact:\s*(\w.*)/", $res, $matches)) {
					$line = $matches[1][0];
					list($host, $hash, $status, $ttl) = preg_split("/\s+/", $line);
					$sip_peer['Status'] = $status . " (".$ttl." ms)";
				}
				if(preg_match_all("/allow\s*:\s*(.*)/", $res, $matches)) {
					$line = $matches[1][0];
					$sip_peer['Codecs'] = $line;
				}
			}
		}
		return $sip_peer;
	}

	/*
	* Returns a filtered array of currently configured codecs, filtered
	* against the list of supported codecs
	*/
	public function getConfiguredCodecs($peer, $peer_status=false) {
		if (!is_array($peer_status) || empty($peer_status)) {
			$peer_status = $this->getPeerStatus($peer);
		}
		if ($peer_status['sipstation_status'] = 'ok') {
			if (isset($peer_status['Codecs']) && preg_match("/^\s*\((.*)\)\s*$/",$peer_status['Codecs'],$match)) {
				$codecs = explode('|',$match[1]);
				return array_filter(array_map(array(&$this,'codecFilter'),$codecs));
			}
		}
		return array();
	}

	public function createTrunks() {
		$api = $this->api;

		$sip_user = $api->getUsername();
		$sip_pass = $api->getPassword();
		$e911 = $api->getE911Master();
		$default_did = isset($e911['number']) ? $e911['number'] : '';
		$need_reload = $this->renameTrunks();
		$need_restart = false;

		//If we don't have a e911 master did, grab the first did in the list
		//If we are still blank for the default did, after this, something is
		//seriously wrong
		$dids = $api->getDIDs();
		$default_did = (empty($default_did) && !empty($dids[0]['did'])) ? $dids[0]['did'] : $default_did;
		$this->freepbx->Modules->loadFunctionsInc('core');
		$tlist = core_trunks_list(true);
		$tech = 'sip';
		$keepcid = 'off';
		$disabletrunk = 'off';
		$ast_codec_hash = $api->getAsteriskCodecHash();
		foreach($ast_codec_hash as $key => $codec) {
			if(!in_array($codec, $api->getDefaultcodecs())) {
				unset($ast_codec_hash[$key]);
			}
		}

		$json_array = $api->getArray();

		$enabletls = false;
		if ($this->api->isPremium()) {
			$enabletls = true;
			$transports = $this->freepbx->Core->getDriver('pjsip')->getTransportConfigs();
			$foundtls = null;
			foreach($transports as $key => $trans) {
				if($trans['protocol'] == 'tls') {
					$foundtls = true;
				}
			}
			if(!$foundtls) {
				$this->sipstation->setMessage(sprintf(_("The TLS transport for Chan PJSIP is currently disabled, please enabled it under Chan PJSIP %s and refresh this page"),'<a href="?display=sipsettings">'._('Here').'</a>'),'danger');
				return $need_reload;
			}
		}

		for ($i=1;$i<3;$i++) {

			$peer_array = array(
				'disallow' => 'all',
				'allow' => implode('&',array_keys($ast_codec_hash))
			);

			$astset = isset($json_array['asterisk_settings']["peer_$i"]['settings'])?$json_array['asterisk_settings']["peer_$i"]['settings']:array();
			foreach ($astset as $param) {
				$parts = explode('=',$param,2);
				$peer_array[$parts[0]] = $parts[1];
			}
			$settings = $this->transformPeerSIPtoPJSIP($i,$peer_array);

			$channelid	 = $this->getTrunkName($i);
			$previousTrunkRoutes = array();
			$trunk = $this->freepbx->Core->getTrunkByChannelID($channelid);
			if (isset($tlist["SIP/$channelid"])) {
				$sql = "SELECT * FROM outbound_route_trunks WHERE trunk_id = :id";
				$sth = $this->freepbx->Database->prepare($sql);
				$sth->execute(array(
					":id" => $trunk['trunkid']
				));
				$previousTrunkRoutes = $sth->fetchAll(\PDO::FETCH_ASSOC);

				$this->freepbx->Core->deleteTrunk($trunk['trunkid'], 'sip');
				$need_reload = true;
				$need_restart = true;
			}
			$transports = $this->freepbx->Core->getDriver('pjsip')->getTransportConfigs();
			$transport = null;
			$tlsfound = false;
			$udpfound = false;
			foreach($transports as $key => $trans) {
				if($enabletls) {
					if($trans['protocol'] == 'tls'  && !$tlsfound) {
						$transport = $key;
						$tlsfound =true;
					}
				} else {
					if($trans['protocol'] == 'udp' && !$udpfound) {
						$transport = $key;
						$udpfound = true;
					}
				}
			}
			if(isset($trunk['trunkid'])){
				//get the transport confirgured for this trunk $trunk['trunkid']
				$sql = "SELECT data FROM pjsip WHERE id = :id and `keyword`='transport'";
				$sth = $this->freepbx->Database->prepare($sql);
				$sth->execute(array(
					":id" => $trunk['trunkid']
				));
				$trans = $sth->fetch(\PDO::FETCH_ASSOC);
				$transport = $trans['data'];
			}

			$pjsettings = array(
				"username" => $sip_user,
				"secret" => $sip_pass,
				"sip_server" => $settings['host'],
				"sip_server_port" => !empty($settings['port']) ? $settings['port'] : 5060,
				"context" => $settings['context'],
				"dtmfmode" => $settings['dtmf_mode'],
				"qualify_frequency" => $settings['qualify_frequency'],
				"match" => $settings['host'],
				"sendrpid" => $settings['send_rpid'],
				"codec" => array_flip(explode(",",$settings['allow'])),
				"channelid" => $channelid,
				"transport" => $transport,
				"trunk_name" => $channelid,
				"from_domain" => !empty($settings['from_domain']) ? $settings['from_domain'] : '',
				"media_encryption" => !empty($settings['media_encryption']) ? $settings['media_encryption'] : 'no',
				"registration" => "send",
				"authentication" => "outbound",
				"identify_by" => "ip",
				"auth_rejection_permanent" => "off",
				"forbidden_retry_interval" => "10",
				"fatal_retry_interval" => "0",
				"retry_interval" => "20",
				"max_retries" => "10000",
				"expiration" => "120",
				"rtp_symmetric" => "yes",
				"rewrite_contact" => "yes",
				"trust_id_outbound" => "yes",
				"trust_rpid" => "yes",
				"outcid" => $default_did,
				"message_context" => $settings['message_context']
			);
			if (!isset($tlist["PJSIP/$channelid"])) {
				$this->freepbx->Core->addTrunk($channelid, 'pjsip', $pjsettings);
				$need_reload = true;
				$this->sipstation->setMessage(_('Remote trunk settings have been changed. Please hit Apply Config to apply the new settings'));
			} else {
				$trunk = $this->freepbx->Core->getTrunkByChannelID($channelid);
				$details = $this->freepbx->Core->getTrunkDetails($trunk['trunkid']);

				$details['codec'] = array_flip(explode(",",$details['codecs']));
				unset($details['codecs']);
				$details['channelid'] = $channelid;
				$diff = false;
				foreach($pjsettings as $key => $value) {
					if($key == 'outcid') {
						continue;
					}
					if(!isset($details[$key]) || $details[$key] != $value) {
						$diff = true;
						break;
					}
				}
				if($diff) {
					$need_reload = true;
					$pjsettings['trunknum'] = $trunk['trunkid'];
					$this->freepbx->Core->deleteTrunk($trunk['trunkid'], 'pjsip', true);
					$this->freepbx->Core->addTrunk($channelid, 'pjsip', $pjsettings, true);
					$this->sipstation->setMessage(_('Remote trunk settings have been changed. Please hit Apply Config to apply the new settings'));
				}
			}

			if(!empty($previousTrunkRoutes)) {
				$trunk = $this->freepbx->Core->getTrunkByChannelID($channelid);
				$sql = "INSERT INTO outbound_route_trunks (`route_id`, `trunk_id`, `seq`) VALUES (:route_id, :trunk_id, :seq)";
				$sth = $this->freepbx->Database->prepare($sql);
				foreach($previousTrunkRoutes as $rt) {
					$sth->execute(array(
						":route_id" => $rt['route_id'],
						":trunk_id" => $trunk['trunkid'],
						":seq" => $rt['seq']
					));
				}
			}
		}
		return $need_reload;
	}

	private function transformPeerSIPtoPJSIP($i,$array) {
		$final = array();
		foreach($array as $key => $value) {
			$ret = $this->transformSIPtoPJSIP($key,$value);
			if(!empty($ret)) {
				$final = array_merge($final,$ret);
			}
		}
		return $final;
	}

	private function transformSIPtoPJSIP($key,$value) {
		$ret = array();
		switch($key) {
			case 'sendrpid':
				$ret['send_rpid'] = version_compare_freepbx(getVersion(),"14.0",'ge') ? 'both' : 'yes';
			break;
			case 'dtmfmode':
				$ret['dtmf_mode'] = 'rfc4733';
			break;
			case 'host':
			case 'port':
			case 'disallow':
			case 'allow':
			case 'context':
			case 'username':
			case 'password':
				$ret[$key] = $value;
			break;
			case 'fromdomain':
				$ret['from_domain'] = $value;
			break;
			case 'qualify':
				$ret['qualify_frequency'] = ($value != 'yes') ? $value : '60';
			break;
			case 'trustrpid':
				$ret['trust_id_inbound'] = $value;
			break;
			case 'outofcall_message_context':
				$ret['message_context'] = $value;
			break;
			case 'encryption':
				$ret['media_encryption'] = 'sdes';
			break;
			case 'secret':
			case 'insecure':
			case 'type':
			case 'transport':
			break;
			default:
				throw new \Exception("Dont know how to transform '$key' with value '$value' to PJSIP");
			break;
		}
		return $ret;
	}
}
