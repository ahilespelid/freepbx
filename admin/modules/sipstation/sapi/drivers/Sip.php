<?php
namespace FreePBX\modules\Sipstation\sapi\drivers;

class Sip extends Driver {
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
			'driver' => 'chan_sip',
			'port' => $port,
			'host' => $host
		);
	}

	public function getTech() {
		return 'sip';
	}

	/*
	Current format of 'sip show registry' with various possible states
	Host							Username	   Refresh State				Reg.Time
	trunk1.freepbx.com:5060			b04c1dsr		   585 Registered			Sat, 27 Jun 2009 00:33:47
	trunk2.freepbx.com:5060			b04c1dsr		   585 Registered			Sat, 27 Jun 2009 00:33:48
	phonebooth.bandwidth.com:5060	9192221234		   585 Timeout				Sat, 27 Jun 2009 00:33:47
	67.131.62.22:5060				myusername		   585 Auth.Sent.			Sat, 27 Jun 2009 00:33:47
	*/
	public function getRegistrationStatus() {
		$sip_user = $this->api->getUsername();
		$status_arr = array();
		$response = $this->freepbx->astman->send_request('Command',array('Command'=>"sip show registry"));
		$buf = explode("\n",$response['data']);
		$state_pos = false;
		foreach ($buf as $line) {
			if (trim($line) != '') {
				if ($state_pos===false) {
					// find the positions of the header columns so we can parse
					if ($state_pos = strpos($line,"State")) {
						$user_pos = strpos($line,"Username");
						$reg_pos = strpos($line,"Reg.Time");
						$host_pos = strpos($line,"Host");
					}
				} else {
					// get the username and if ours, trunk (host) and State of reg
					preg_match("/^([^\s]+)\s*/",substr($line,$user_pos),$matches);
					if (isset($matches[1]) && ($sip_user == $matches[1])) {
						$trunk = trim(substr($line,$host_pos,($user_pos-$host_pos)));
						$trunk = preg_match("/^([^\s:]+)[:]{0,1}[\d]{0,5}\s*/",$trunk,$matches) ?	 $matches[1] : $trunk;;
						$state = trim(substr($line,$state_pos,($reg_pos-$state_pos)));
						$status_arr[$trunk] = $state;
					}
				}
			}
		}
		/**
		 * [return description]
		 * OUT > Array
		 *(
		 *    [trunk1.freepbx.com] => Registered
		 *    [trunk2.freepbx.com] => Registered
		 *)
		 */
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
				'Command'=>"sip show peer {$peer}"
			)
		);
		$buf = explode("\n",$response['data']);
		foreach ($buf as $res) {
			if (preg_match("/$peer\s*not\s+found\.{0,1}\s*$/",$res)) {
				$sip_peer['sipstation_status'] = 'no_peer';
			} elseif (preg_match("/^\s*(.*?)\s*:\s*(.*)$/",$res,$match)) {
				$sip_peer[$match[1]] = $match[2];
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
			//Older versions of Asterisk (Less than 12)
			if (isset($peer_status['Codec Order']) && preg_match("/^\s*\((.*)\)\s*$/",$peer_status['Codec Order'],$match)) {
				$codecs = explode(',',$match[1]);
				return array_filter(array_map(array(&$this,'codecFilter'),$codecs));
			//Newer versions of Asterisk (12+)
			} elseif (isset($peer_status['Codecs']) && preg_match("/^\s*\((.*)\)\s*$/",$peer_status['Codecs'],$match)) {
				$codecs = explode(',',$match[1]);
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
		//	seriously wrong
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

		$peerdetails_base = "disallow=all\nallow=".implode('&',array_keys($ast_codec_hash))."\n";

		$json_array = $api->getArray();

		if ($this->api->isPremium()) {
			// Check current status of TLS:
			$data = $this->freepbx->Sipsettings->getChanSipSettings(false);
			if($data['tlsenable'] !== 'yes') {
				$this->sipstation->setMessage(sprintf(_("'Enable TLS' for 'Chan SIP' is currently set to '%s', this must be changed to '%s', change this %s and refresh this page"),$data['tlsenable'],('Yes'),'<a href="?display=sipsettings">'._('here').'</a>'),'danger');
				return $need_reload;
			}
			if($data['tlsclientmethod'] !== 'tlsv1') {
				$this->sipstation->setMessage(sprintf(_("'SSL Method' for 'Chan SIP' is currently set to '%s', this must be changed to '%s', change this %s and refresh this page"),$data['tlsclientmethod'],'tlsv1','<a href="?display=sipsettings">'._('here').'</a>'),'danger');
				return $need_reload;
			}
		}

		for ($i=1;$i<3;$i++) {
			$peerdetails = $peerdetails_base;
			$peer_array = array();

			$astset = isset($json_array['asterisk_settings']["peer_$i"]['settings'])?$json_array['asterisk_settings']["peer_$i"]['settings']:array();
			foreach ($astset as $param) {
				$peerdetails .= trim($param)."\n";
				$parts = explode('=',$param,2);
				$peer_array[$parts[0]] = $parts[1];
			}
			$newRegister = $json_array['asterisk_settings']["register_$i"];

			$gw = $json_array['gateways'][$i-1];
			$gidx = "gw$i";
			$channelid	 = $this->getTrunkName($i);
			$gw			 = $json_array['gateway_info'][$gw]['name'];

			$previousTrunkRoutes = array();
			if (isset($tlist["PJSIP/$channelid"])) {
				$trunk = $this->freepbx->Core->getTrunkByChannelID($channelid);

				$sql = "SELECT * FROM outbound_route_trunks WHERE trunk_id = :id";
				$sth = $this->freepbx->Database->prepare($sql);
				$sth->execute(array(
					":id" => $trunk['trunkid']
				));
				$previousTrunkRoutes = $sth->fetchAll(\PDO::FETCH_ASSOC);

				$this->freepbx->Core->deleteTrunk($trunk['trunkid'], 'pjsip');
				$need_reload = true;
				$need_restart = true;
			}

			if (isset($tlist["SIP/$channelid"])) {
				$globalvar = $tlist["SIP/$channelid"]['globalvar'];
				$trunknum	 = ltrim($globalvar,'OUT_');
				$trunk_details = $this->freepbx->Core->getTrunkByID($trunknum);
				//$json_array['trunk_name'][$gidx] = $trunk_details['name'];
				$oldPeer = trim($this->freepbx->Core->getTrunkPeerDetailsByID($trunknum));
				$updateTrunks = false;
				$newPeer = $peerdetails;

				$old_peer = array();
				foreach (explode("\n",$oldPeer) as $elem) {
					$temp = explode("=",$elem,2);
					if ($temp[0] == 'allow') {
						$old_peer[$temp[0]] = explode('&',$temp[1]);
					} elseif ($temp[0] != '') {
						$old_peer[$temp[0]] = $temp[1];
					}
				}

				if (isset($old_peer['allow'])) {
					unset($old_peer['allow']);
				}

				if (isset($old_peer['disallow'])) {
					unset($old_peer['disallow']);
				}

				unset($peer_array['qualify']);
				if (isset($old_peer['qualify'])) {
					unset($old_peer['qualify']);
				}
				unset($peer_array['qualify']);

				if (isset($old_peer['context'])) {
					unset($old_peer['context']);
				}
				unset($peer_array['context']);

				if (isset($old_peer['qualifyfreq'])) {
					unset($old_peer['qualifyfreq']);
				}

				if (isset($old_peer['dtmfmode'])) {
					switch($old_peer['dtmfmode']) {
						case 'inband':
						case 'rfc2833':
						case 'auto':
							unset($old_peer['dtmfmode']);
							unset($peer_array['dtmfmode']);
					break;
					}
				}

				$changed = '';
				foreach($peer_array as $key => $value) {
					if(!empty($old_peer[$key]) && $old_peer[$key] != $value) {
						$newPeer = preg_replace('/'.$key.'='.$old_peer[$key].'/i',$key.'='.$value,$newPeer);
						$updateTrunks = true;
						$changed .= ' '.$key.',';
					} elseif(empty($old_peer[$key]) && $key != 'username' && $key != 'password') {
						$changed .= ' '.$key.',';
						$updateTrunks = true;
					}
				}

				$oldRegister = trim($this->freepbx->Core->getTrunkRegisterStringByID($trunknum));
				if($oldRegister != trim($newRegister)) {
					$updateTrunks = true;
					$changed .= ' registration string,';
				}
				if($updateTrunks) {
					core_trunks_edit($trunknum,
						$trunk_details['channelid'],
						'',
						'',
						$trunk_details['outcid'],
						$newPeer,
						'',
						'',
						$newRegister,
						$trunk_details['keepcid'],
						$trunk_details['failscript'],
						$trunk_details['disabled'],
						$trunk_details['name'],
						$trunk_details['provider'],
						$trunk_details['continue'],
						$trunk_details['dialopts']);
					$this->sipstation->setMessage(sprintf(_('Remote trunk settings have been changed (%s). Please hit Apply Config to apply the new settings'),$changed));
					$need_reload = true;
				}
			} else {
				$trunknum = core_trunks_add($tech, $channelid, '', '', $default_did, $peerdetails, '', '', $newRegister, $keepcid, '', $disabletrunk);
				$globalvar = "OUT_".$trunknum;
				$need_reload = true;
				$this->sipstation->setMessage(_('Added New Trunks. Please hit Apply Config to apply the new settings'));
			}
			// We need these next and need them past back up
			$gv = "globalvar$i";
			$tn = "trunknum$i";
			$$gv = $globalvar;
			$$tn = $trunknum;

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

		$trunk_check = array($trunknum1, $trunknum2);
		$cnt = 1;
		foreach ($trunk_check as $tr) {
			$gw1 = $json_array['gateways'][$cnt-1];
			$json_array['trunk_id']["gw$cnt"] = $tr; // need to get this set for both anyhow
			$gw = $json_array['gateway_info'][$gw1]['name'];
			$peer_stuff = array();
			$tr_reg = $this->freepbx->Core->getTrunkRegisterStringByID($tr);
			foreach (explode("\n",$this->freepbx->Core->getTrunkPeerDetailsByID($trunknum)) as $elem) {
				$temp = explode("=",$elem,2);
				if ($temp[0] == 'allow') {
					$peer_stuff[$temp[0]] = explode('&',$temp[1]);
				} elseif ($temp[0] != '') {
					$peer_stuff[$temp[0]] = $temp[1];
				}
			}
			// Unset some settings that do not hurt to change and might help
			if (isset($peer_stuff['allow'])) {
				unset($peer_stuff['allow']);
			}

			if (isset($peer_stuff['disallow'])) {
				unset($peer_stuff['disallow']);
			}

			if (isset($peer_stuff['qualify'])) {
				unset($peer_stuff['qualify']);
			}
			unset($peer_array['qualify']);

			if (isset($peer_stuff['context'])) {
				unset($peer_stuff['context']);
			}
			unset($peer_array['context']);

			if (isset($peer_stuff['qualifyfreq'])) {
				unset($peer_stuff['qualifyfreq']);
			}

			if (isset($peer_stuff['dtmfmode'])) {
				switch($peer_stuff['dtmfmode']) {
					case 'inband':
					case 'rfc2833':
					case 'auto':
						unset($peer_stuff['dtmfmode']);
						unset($peer_array['dtmfmode']);
					break;
				}
			}

			if ($peer_array != $peer_stuff || $tr_reg != $newRegister) {
				$json_array['changed_trunks']["gw$cnt"] = $tr;
			}
			$cnt++;
		}

		// If no sip_general_additional settings then bail. Once we start using this we may have to
		// be smarter (in case there were and now we took them away, we'd have to do the below
		//
		if (!empty($json_array['asterisk_settings']['sip_general_additional']['settings'])) {
			// Check if our sip_general settings changed, first get saved settings
			//
			$bmo = FreePBX::Sipstation();
			$sip_additional_prior = $bmo->getAll("sip_general_additional");
			ksort($sip_additional_prior);

			// Now get the new settings
			//
			$sip_additional_array = array();
			if (!empty($json_array['asterisk_settings']['sip_general_additional']['settings'])) {
				foreach ($json_array['asterisk_settings']['sip_general_additional']['settings'] as $param) {
					$parts = explode('=',$param,2);
					$sip_additional_array[trim($parts[0])] = trim($parts[1]);
				}
			}
			ksort($sip_additional_array);

			// If they aren't the same because of change of first time then we need to save and set
			//
			if ($sip_additional_array != $sip_additional_prior) {
				$bmo->delById("sip_general_additional");
				$bmo->setMultiConfig($sip_additional_array, "sip_general_additional");
				$need_reload = true;
			}
		}

		return $need_reload;
	}
}
