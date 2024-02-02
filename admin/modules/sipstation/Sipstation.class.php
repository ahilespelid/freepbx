<?php
// vim: set ai ts=4 sw=4 ft=php:
//	License for all code of this FreePBX module can be found in the license file inside the module directory
//	Copyright 2013 Schmooze Com Inc.
//
namespace FreePBX\modules;
use FreePBX\modules\Sipstation\sapi\Sipstation as SAPI;
use FreePBX\modules\Sipstation\sms\SipstationSMS;
include __DIR__.'/vendor/autoload.php';
class Sipstation extends \DB_Helper implements \BMO {

	private $tollfree = "/(^888)|(^877)|(^866)|(^855)|(^844)(^833)|(^800)/";
	private $ssconfig;
	private $pageAction;
	private $smsAdaptor;
	private static $oobeobj = false;
	private static $sapiObj = false;

	public function __construct($freepbx = null) {
		if ($freepbx == null) {
			throw new \Exception("Not given a FreePBX Object");
		}
		$this->freepbx = $freepbx;
		$this->db = $freepbx->Database;
	}

	//these are resource intensive, dont load them through construct, load them dynamically if requested
	public function __get($var) {
		switch($var) {
			case 'ss':
				$this->ss = new SAPI($this, $this->freepbx);
				return $this->ss;
			break;
			case 'key':
				//dont set the key internally
				return $this->ss->getKey();
			break;
		}
		return null;
	}

	public function getSSConfig($online = false) {
		if(empty($this->ssconfig) || $online) {
			$this->ssconfig = $this->ss->getAPIObject($online);
		}
		return $this->ssconfig;
	}

	public static function myConfigPageInits() { return array("did"); }
	public function doConfigPageInit($page) {
		switch($page) {
			case "sipstation":
				if($this->is_connected()){
					$this->pageAction = isset($_REQUEST['action'])?$_REQUEST['action']:'';
					$this->pageAction = isset($_POST['remove_key_del_trunks']) ? 'remove_key_del_trunks' : $this->pageAction;
					$this->pageAction = isset($_POST['cancel_freetrial']) ? 'cancel_freetrial' : $this->pageAction;
					switch($this->pageAction) {
						case 'remove_key_del_trunks':
						case 'cancel_freetrial':
							$this->ss->driver->deleteTrunks();

							//If we are cancelling a free trial account, cancel it before we remove the key
							if ($this->pageAction == "cancel_freetrial") {
								$cancel = $this->ss->cancelFreeTrial();
							}

							$this->ss->removeKey();
							needreload();
						break;
						case "edit":
							$key_status = $this->ss->getAPIStatus();
							$account_key = isset($_POST['account_key'])?$_POST['account_key']:'';
							$remove_key = isset($_POST['remove_key'])? true : false;
							if ($remove_key) {
								$this->ss->removeKey();
								$key_status = 'nokey';
							} elseif ($key_status == 'nokey') {
								// TOOD: provide feedback if they give blank blank key, maybe just js validation?
								$this->ss->setKey($account_key);
							}
							needreload();
						break;
					}
				}
				break;
			case "did":
				$did = isset($_REQUEST['extension'])?$_REQUEST['extension']:null;
				$users = isset($_REQUEST['smsusercheckbox'])?$_REQUEST['smsusercheckbox']:array();
				if($_REQUEST['display'] == 'did' && $this->smsEnabled() && isset($_REQUEST['smsusercheckbox']) && $this->freepbx->Modules->checkStatus('sms') && !empty($did)) {
					$this->freepbx->Sms->addDIDRouting($did,$users);
				}
			break;
		}
	}

	public function createOutboundRoutes($check_previous=true) {
		$this->ss->createOutboundRoutes($check_previous);
	}

	public function createTrunks() {
		return $this->ss->createTrunks();
	}

	public function createDIDs() {
		$this->ss->createInboundRoutes();
	}

	public function is_connected(){
		$connected 	= @fsockopen("www.sangoma.com", 80); 
		if ($connected){
			$status = true;
			fclose($connected);
		}else{
			$status = false;
		}
		return $status;
	}

	public function showPage() {
		$status 		= "internet_down";
		if($this->is_connected()){
			$this->getSSConfig(true);
			$nokey = false;
			$status = ($this->pageAction == 'convert') ? 'convert' : $this->ss->checkKey(); // nokey, valid, invalid, noserver, tempnotavail
			$display_data = array(
				'PHP_SELF' => "",
				'status' => $status,
				'action' => $this->pageAction,
				'tabindex' => 1,
			);			
		}
		$url_status = "";
		if($this->getConfig("url_status") !== "ok"){
			$url_status .="<div class='alert alert-warning alert-dismissible'>";
			$url_status .="<a href='#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>";
			$url_status .="<strong>"._("Warning!")."</strong> "._("There was a problem when we tried to connect to our server. A local configuration is currently used.");
			$url_status .="</div>";
		}
		$display_data["url_status"] = $url_status;
		
		switch ($status) { // nokey, valid, invalid, noserver
			case 'internet_down':				 
				return load_view(__DIR__.'/views/no_internet.php');
			break;
			case 'convert': //converting a trial account
				$key = null;
				$status = $this->ss->checkKey(); // nokey, valid, invalid, noserver, tempnotavail
				$url = $this->freepbx->Config->get('SS_API_URL');
				switch($status) {
					case 'valid':
						$key = $this->key;
					break;
				}

				$data = $this->getSSConfig();

				$display_data['base_url'] = !empty($url) ? $url : 'https://push2.schmoozecom.com/sipstation';
				$display_data['key'] = $key;
				$display_data['account_type'] = $data['account_type'];

				$nokey = true;
				$nokeycontent = load_view(__DIR__.'/views/converttrial.php',$display_data);
			break;
			case 'nokey': // valid, invalid, noserver
				$nokey = true;
				$nokeycontent = load_view(__DIR__.'/views/nokey.php',$display_data);
			break;
			case 'invalid': // nokey
			case 'noserver':
			case 'tempnotavail':
				$content = load_view(__DIR__.'/views/invalidnoservertempnot.php');
			break;
			case 'valid':
				$key = $this->key;
				$data = $this->getSSConfig()->getArray();
				$content .= '<script>var Sipstation = '.json_encode($data).';Sipstation.key = "'.$key.'";Sipstation.status = "'.$display_data['status'].'";</script>';
				$needs_reload = $this->createTrunks();
				if($needs_reload) {
					needreload();
				}
				$system_dids = core_did_list();
				$insert = true;
				foreach ($system_dids as $key => $did) {
					// Check if Any/Any route present.
					// If inbound route is ANY/ANY then did['extension'] will be empty.
					if(empty($did['extension']) && empty($did['cidnum'])) {
						$insert = false;
						break;
					}
				}
				if($insert) {
					$this->createDIDs();
				}
				$this->createOutboundRoutes();
				//Determine if we need to show them how much longer they have on their free trial
				if(isset($data['expiration'])) {
					$tz = date_default_timezone_get();
					if (empty($tz)) {
						$tz = 'America/Chicago';
					}
					$tzObject = new \DateTimeZone($tz);

					$current = new \DateTime('now', $tzObject);
					$expiry = new \DateTime($data['expiration'],$tzObject);
					$daysleft = $expiry->diff($current)->format('%a');

					$level = 'default';
					switch(true) {
						case $daysleft <= 15 && $daysleft > 5:
							$level = 'warning';
							break;
						case $daysleft <= 5:
							$level = 'danger';
							break;
						default:
							break;
					}

					$display_data['expirynotice'] = '<div class="expiration">
						<time datetime="'. $data['expiration'] . '" class="icon alert-' . $level . '" >
							<strong>' . _('Expires in') . '</strong>
							<span>' . sprintf(_('%u'), $daysleft). '</span>
							<em>' . _('days') . '</em>
						</time>
					</div>';
				}
				$display_data['sipstation'] = $sipstation;
				$display_data['data'] = (array)$data;

				$display_data['account_type'] = $data['account_type'];

				switch($data['account_type']) {
					case 'TRIAL':
						$display_data['disabled'] = 'disabled';
						break;
					default:
						if ($data['verify_status'] != 'VERIFIED') {
							$display_data['verify_message'] = !empty($data['verify_message']) ? $data['verify_message'] : '';
						}
						break;
				}

				$gw1 = $data['gateways'][0];
				$gw2 = $data['gateways'][1];

				$display_data['ip_color'] = 'white';
				$display_data['sip_header'] = '';

				if($this->isPrivateIP($data['gateway_info'][$gw1]['contact_ip'])) {
					$display_data['ip_color1'] = 'yellow';
					$display_data['sip_header1'] = 'warning';
				} elseif(($data['gateway_info'][$gw1]['contact_ip'] != $data['gateway_info'][$gw1]['network_ip'])) {
					$display_data['ip_color1'] = 'red';
					$display_data['sip_header1'] = 'error';
				}
				if($this->isPrivateIP($data['gateway_info'][$gw2]['contact_ip'])) {
					$display_data['ip_color2'] = 'yellow';
					$display_data['sip_header2'] = 'warning';
				} elseif(($data['gateway_info'][$gw2]['contact_ip'] != $data['gateway_info'][$gw2]['network_ip'])) {
					$display_data['ip_color2'] = 'red';
					$display_data['sip_header2'] = 'error';
				}

				$display_data['gw1'] = $gw1;
				$display_data['gw2'] = $gw2;

				$rs = $this->ss->getRegistrationStatus();

				$display_data['gw1_reg'] = isset($rs[$gw1]) ? $rs[$gw1] : null;
				$display_data['gw2_reg'] = isset($rs[$gw2]) ? $rs[$gw2] : null;

				$display_data['gw1_contactip'] = $data['gateway_info'][$gw1]['contact_ip'];
				$display_data['gw2_contactip'] = $data['gateway_info'][$gw2]['contact_ip'];

				$display_data['gw1_networkip'] = $data['gateway_info'][$gw1]['network_ip'];
				$display_data['gw2_networkip'] = $data['gateway_info'][$gw2]['network_ip'];

				$display_data['server_settings'] = !empty($data['server_settings']) ? $data['server_settings'] : array("sms"=>false,"international"=>false,"fax"=>false);

				$display_data['sip_username'] = $data['sip']['username'];
				$display_data['sip_password'] = $data['sip']['password'];
				$display_data['email'] = $data['email'];

				$display_data['gw1_name'] = $data['gateway_info'][$gw1]['name'];
				$display_data['gw2_name'] = $data['gateway_info'][$gw2]['name'];

				$display_data['num_trunks'] = $data['num_trunks'];

				$display_data['global_failover_num'] = !empty($data['failover_num']) ? $data['failover_num'] : null;
				$display_data['global_failover_dest'] = !empty($data['failover_dest']) ? $data['failover_dest'] : null;

				$display_data['e911_master'] = isset($data['e911_master']) ? $data['e911_master'] : null;

				//sipstation_newroutes_check_and_create();
				$routes = $this->freepbx->Core->getAllRoutes();

				$ssroutes = $this->getSSRoutes();
				$display_data['show_reconfig'] = false;
				if(!empty($ssroutes)) {
					if(count($ssroutes['outbound_routes']) < 3) {
					$display_data['show_reconfig'] = true;
					} else {
						foreach($ssroutes['outbound_routes'] as $k => $id) {
							$o = $this->freepbx->Core->getRouteByID($id);
							if(empty($o)) {
								$display_data['show_reconfig'] = true;
						}
						}
					}
				} else {
					$display_data['show_reconfig'] = true;
				}
				$trunks = array();
				foreach($this->ss->driver->getTrunks() as $trunk) {
					$trunks[] = $trunk['name'];
				}
				$prepend_digits = array();
				$visual_routes = array();
				$i = 0;
				foreach($routes as $route) {
					$visual_routes[$i]['label'] = sprintf("%'03s: %s",$route['seq'],$route['name']);
					$visual_routes[$i]['name']  = $route['name'].$route['route_id'];
					$visual_routes[$i]['id']  = $route['route_id'];

					$routetrunks = $this->freepbx->Core->getRouteTrunksByID($route['route_id']);
					$patterns = $this->freepbx->Core->getRoutePatternsByID($route['route_id']);
					$gw1_checked = '';
					$gw2_checked = '';
					$sip_user = $data['sip_username'];

					$e911_checked = '';
					foreach($patterns as $pattern) {
						if($pattern['match_pattern_pass'] == '911') {
							$e911_checked = 'checked';
						}
					}

					foreach($routetrunks as $trunknum) {
						$det = $this->freepbx->Core->getTrunkByID($trunknum);
						$dialrules = $this->freepbx->Core->getTrunkDialRulesByID($trunknum);

						if(in_array($det['name'],$trunks)) {
							$visual_routes[$i]['gw1_checked'] = 'checked';
							if (is_array($dialrules) && count($dialrules)) {
								foreach ($dialrules as $rule) {
									if($rule['match_pattern_pass'] == 'NXXXXXX') {
										$prepend_digits[] = $rule['prepend_digits'];
									}
								}
							}
						} elseif($det['tech'] == 'sip' && $det['name'] == $this->ss->driver->getTrunkName(2)) {
							$visual_routes[$i]['gw2_checked'] = 'checked';
							if (is_array($dialrules) && count($dialrules)) {
								foreach ($dialrules as $rule) {
									if($rule['match_pattern_pass'] == 'NXXXXXX') {
										$prepend_digits[] = $rule['prepend_digits'];
									}
								}
							}
						}
					}
					$i++;
				}

				$display_data['prepend_digits'] = (isset($prepend_digits[0]) && isset($prepend_digits[1]) && ($prepend_digits[0] == $prepend_digits[1])) ? $prepend_digits[0] : '';
				$display_data['routes'] = $visual_routes;

				$display_data['dids'] = is_array($data['dids'])?$data['dids']:array();

				$display_data['e911_list'] = array();
				foreach($display_data['dids'] as $dids) {
					if(!empty($dids['e911']['name'])) {
						$display_data['e911_list'][] = array(
							"did" => $dids['did'],
							"master" => $dids['e911']['master']
						);
					}
				}

				// Get the rpt ports Asterisk is configured for, make sure we start on even port
				//
				$rtp_ports = !file_exists($this->freepbx->Config->get('ASTETCDIR')."/rtp_additional.conf") ? parse_ini_file($this->freepbx->Config->get('ASTETCDIR')."/rtp.conf") : parse_ini_file($this->freepbx->Config->get('ASTETCDIR')."/rtp_additional.conf",false,INI_SCANNER_RAW);

				$port_start = !empty($rtp_ports['rtpstart']) ? $rtp_ports['rtpstart'] : 10000;
				$port_start += ($port_start % 2); //make sure we have an even port
				$port_end = !empty($rtp_ports['rtpend']) ? $rtp_ports['rtpend'] : 20000;
				unset($rtp_ports);

				$info = $this->ss->driver->getInfo();
				$display_data['driver_info'] = array(
					'driver' => $info['driver'],
					'port' => $info['port'],
					'host' => $info['host'],
					'rtp_start' => $port_start,
					'rtp_end' => $port_end
				);

				$display_data['display_data'] = $display_data;
				$content .= load_view(__DIR__.'/views/newlook.php',$display_data);
				$sipSmsCampaignRegistryNotification = $this->sipSmsCampaignRegistryNotification();
				if (!empty($sipSmsCampaignRegistryNotification)) {
					$title = $sipSmsCampaignRegistryNotification['title'];
					$body = $sipSmsCampaignRegistryNotification['body'];
					$this->dashboardNotifyForSipstation('add', 'sipSmsCampaignRegistry', $title, $body, 'critical');
				}
			break;
			case 'outdated':
				$content .= load_view(dirname(__FILE__).'/views/outdated.php',$display_data);
			break;
		}
		$nt = \notifications::create();
		$rawname = "sipstation";
		$uid = "sschandriver";
		if($nt->exists($rawname, $uid)) {
			$nt->delete($rawname, $uid);
		}
		$message = $this->getConfig('message');
		if(!empty($message)){
			if(is_array($message)) {
				$sdalert .= '<div class="alert alert-'.$message['type'].'">'.$message['message'].'</div>';
			} else {
				$sdalert .= '<div class="alert alert-info">'.$message.'</div>';
			}

			$this->setConfig('message',false);
		}
		$header = load_view(__DIR__.'/views/header.php',$display_data);
		$footer = load_view(__DIR__.'/views/footer.php',$display_data);
		if($nokey){
			$fcontent = $nokeycontent;
		}else{
			$fcontent = load_view(dirname(__FILE__).'/views/maintabbed.php',array('display_data' => $display_data, 'newlook' => $content));
		}
		$script = '<script>var Sipstation = {"status": "'.$display_data['status'].'"}; var destinations = '.json_encode($this->freepbx->Modules->getDestinations()).'</script>';

		return $sdalert.$header.$script.$fcontent.$footer;
	}

	public function install() {
		$path = $this->freepbx->Config->get('AMPBIN',true);

		$crons = $this->freepbx->Cron()->getAll();
		foreach($crons as $c) {
			if(preg_match('/freepbx_sipstation_check/',$c,$matches)) {
				$this->freepbx->Cron()->remove($c);
			}
		}

		foreach($this->freepbx->Job()->getAll() as $job) {
			$str = "freepbx_sipstation_check";
			if(preg_match("/".$str."/i",$job['command'],$matches)) {
				$this->freepbx->Job()->remove($job['modulename'], $job['jobname']);
			}
		}

		$fullpath = $path.'/freepbx_sipstation_check';
		$this->freepbx->Job()->addCommand("sipstation", "check", "[ -x $fullpath ] && $fullpath 2>&1 > /dev/null", "@daily" );

		$migratable = array('sipstation_key','sipstation_session');
		foreach($migratable as $migrate) {
			$sql = "SELECT data FROM module_xml WHERE id = '{$migrate}'";
			$sth = $this->db->prepare($sql);
			$sth->execute();
			$value = $sth->fetch(\PDO::FETCH_ASSOC);
			if(empty($value['data'])) {
				continue;
			}

			$this->setConfig(str_replace("sipstation_","",$migrate),$value['data']);

			$sql = "DELETE FROM module_xml WHERE id = '{$migrate}'";
			$this->db->query($sql);
		}

		$migratableJSON = array('sipstation_config','ss_route');
		foreach($migratableJSON as $migrate) {
			$sql = "SELECT data FROM module_xml WHERE id = '{$migrate}'";
			$sth = $this->db->prepare($sql);
			$sth->execute();
			$value = $sth->fetch(\PDO::FETCH_ASSOC);
			if(empty($value['data'])) {
				continue;
			}

			$this->setConfig(str_replace(array("sipstation_","ss_"),"",$migrate),json_decode($value['data'],true));

			$sql = "DELETE FROM module_xml WHERE id = '{$migrate}'";
			$this->db->query($sql);
		}

		$this->setConfig('config',null);
		$sipSmsCampaignRegistryNotification = $this->sipSmsCampaignRegistryNotification();
		if (!empty($sipSmsCampaignRegistryNotification)) {
			$title = $sipSmsCampaignRegistryNotification['title'];
			$body = $sipSmsCampaignRegistryNotification['body'];
			$this->dashboardNotifyForSipstation('add', 'sipSmsCampaignRegistry', $title, $body, 'critical');
		}
	}
	public function uninstall() {
		$this->dashboardNotifyForSipstation('remove', 'sipSmsCampaignRegistry');
		$path = $this->freepbx->Config->get('AMPBIN',true);

		$crons = $this->freepbx->Cron()->getAll();
		foreach($crons as $c) {
			if(preg_match('/freepbx_sipstation_check/',$c,$matches)) {
				$this->freepbx->Cron()->remove($c);
			}
		}

		foreach($this->freepbx->Job()->getAll() as $job) {
			$str = "freepbx_sipstation_check";
			if(preg_match("/".$str."/i",$job['command'],$matches)) {
				$this->freepbx->Job()->remove($job['modulename'], $job['jobname']);
			}
		}
	}
	public function backup(){

	}
	public function restore($backup){

	}
	public function genConfig() {
	}
	public function getSSRoutes(){
		$ret = $this->getConfig('ss_route');
	 	return !empty($ret)?$ret:array();
	}

	public function getRoutes(){
		$return = array();
		$routes = $this->freepbx->Core->getAllRoutes();
		$i = 0;
		$ssconfig = $this->getSSConfig();
		foreach($routes as $route) {
			$return[$i]['label'] = sprintf("%'03s: %s",$route['seq'],$route['name']);
			$return[$i]['name']  = $route['name'];
			$return[$i]['id']  = $route['route_id'];
			$trunks = $this->freepbx->Core->getRouteTrunksByID($route['route_id']);
			$patterns = $this->freepbx->Core->getRoutePatternsByID($route['route_id']);
			$return[$i]['gw1_checked'] = false;
			$return[$i]['gw2_checked'] = false;
			$sip_user = $ssconfig['sip_username'];
			$e911_checked = '';
			$prepend_digits = array();
			foreach($patterns as $pattern) {
				if($pattern['match_pattern_pass'] == '911') {
					$e911_checked = 'checked';
				}
			}
			foreach($trunks as $trunknum) {
				$det = $this->freepbx->Core->getTrunkByID($trunknum);
				$dialrules = $this->freepbx->Core->getTrunkDialRulesByID($trunknum);

				if(in_array($det['tech'],array('sip','pjsip')) && $det['name'] == $this->ss->driver->getTrunkName(1)) {
					$return[$i]['gw1_checked'] = true;
					if (is_array($dialrules) && count($dialrules)) {
						foreach ($dialrules as $rule) {
							if($rule['match_pattern_pass'] == 'NXXXXXX') {
								$prepend_digits[] = $rule['prepend_digits'];
							}
						}
					}
				} elseif(in_array($det['tech'],array('sip','pjsip')) && $det['name'] == $this->ss->driver->getTrunkName(2)) {
					$return[$i]['gw2_checked'] = true;
					if (is_array($dialrules) && count($dialrules)) {
						foreach ($dialrules as $rule) {
							if($rule['match_pattern_pass'] == 'NXXXXXX') {
								$prepend_digits[] = $rule['prepend_digits'];
							}
						}
					}
				}
			}
			$return[$i]['prepend_digits'] = $prepend_digits;
			$i++;
		}
		return $return;
	}

	public function usermanShowPage() {
		if(isset($_REQUEST['action'])) {
			$html = array();
			if($this->smsEnabled() && $this->freepbx->Modules->checkStatus('sms')) {
				$dids = $this->getDIDs();
				if(!empty($dids)) {
					switch($_REQUEST['action']) {
						case 'addgroup':
						case 'showgroup':
							return $html;
						break;
						case 'adduser':
						case 'showuser':
							if(isset($_REQUEST['user'])) {
								$assigned = $this->freepbx->Sms->getAssignedDIDs($_REQUEST['user']);
							} else {
								$assigned = array();
							}
							return array(
								array(
									"title" => _("SIPStation SMS"),
									"rawname" => "sipstationsms",
									"content" => load_view(dirname(__FILE__)."/views/userman_config.php",array("mode" => "user", "dids" => $dids, "assigned" => $assigned))
								)
							);
						break;
					}
				}
			}
			return $html;
		}
	}

	public function usermanDelGroup($id,$display,$data) {

	}

	public function usermanAddGroup($id, $display, $data) {
	}

	public function usermanUpdateGroup($id,$display,$data) {

	}

	/**
	 * Hook functionality from userman when a user is deleted
	 * @param {int} $id      The userman user id
	 * @param {string} $display The display page name where this was executed
	 * @param {array} $data    Array of data to be able to use
	 */
	public function usermanDelUser($id, $display, $data) {
	}

	/**
	 * Hook functionality from userman when a user is added
	 * @param {int} $id      The userman user id
	 * @param {string} $display The display page name where this was executed
	 * @param {array} $data    Array of data to be able to use
	 */
	public function usermanAddUser($id, $display, $data) {
		$this->usermanUpdateUser($id, $display, $data);
	}

	/**
	 * Hook functionality from userman when a user is updated
	 * @param {int} $id      The userman user id
	 * @param {string} $display The display page name where this was executed
	 * @param {array} $data    Array of data to be able to use
	 */
	public function usermanUpdateUser($id, $display, $data) {
		if($display == 'userman' && isset($_POST['type']) && $_POST['type'] == 'user') {
			if(!empty($_REQUEST['sipstation-sms-did']) && $this->smsEnabled() && $this->freepbx->Modules->checkStatus('sms')) {
				$this->freepbx->Sms->addUserRouting($id,$_REQUEST['sipstation-sms-did']);
			} elseif($this->freepbx->Modules->checkStatus('sms')) {
				$this->freepbx->Sms->addUserRouting($id,array());
			}
		}
	}

	public function ucpDelGroup($id,$display,$data) {
	}

	public function ucpAddGroup($id, $display, $data) {
		$this->ucpUpdateGroup($id,$display,$data);
	}

	public function ucpUpdateGroup($id,$display,$data) {
		if($display == 'userman' && isset($_POST['type']) && $_POST['type'] == 'group') {
			if(!empty($_REQUEST['sms_enable']) && $_REQUEST['sms_enable'] == "yes") {
				$this->freepbx->Ucp->setSettingByGID($id,'Sipstation','sms_enable',true);
			} elseif(!empty($_REQUEST['sms_enable']) && $_REQUEST['sms_enable'] == "no") {
				$this->freepbx->Ucp->setSettingByGID($id,'Sipstation','sms_enable',false);
			}
		}
	}

	/**
	* Hook functionality from userman when a user is deleted
	* @param {int} $id      The userman user id
	* @param {string} $display The display page name where this was executed
	* @param {array} $data    Array of data to be able to use
	*/
	public function ucpDelUser($id, $display, $ucpStatus, $data) {

	}

	/**
	* Hook functionality from userman when a user is added
	* @param {int} $id      The userman user id
	* @param {string} $display The display page name where this was executed
	* @param {array} $data    Array of data to be able to use
	*/
	public function ucpAddUser($id, $display, $ucpStatus, $data) {
		$this->ucpUpdateUser($id, $display, $ucpStatus, $data);
	}

	/**
	* Hook functionality from userman when a user is updated
	* @param {int} $id      The userman user id
	* @param {string} $display The display page name where this was executed
	* @param {array} $data    Array of data to be able to use
	*/
	public function ucpUpdateUser($id, $display, $ucpStatus, $data) {
		if($display == 'userman' && isset($_POST['type']) && $_POST['type'] == 'user') {
			if(!empty($_REQUEST['sms_enable']) && $_REQUEST['sms_enable'] == "yes") {
				$this->freepbx->Ucp->setSettingByID($id,'Sipstation','sms_enable',true);
			} elseif(!empty($_REQUEST['sms_enable']) && $_REQUEST['sms_enable'] == "no") {
				$this->freepbx->Ucp->setSettingByID($id,'Sipstation','sms_enable',false);
			} elseif(!empty($_REQUEST['sms_enable']) && $_REQUEST['sms_enable'] == "inherit") {
				$this->freepbx->Ucp->setSettingByID($id,'Sipstation','sms_enable',null);
			}
		}
	}

	public function ucpConfigPage($mode, $user, $action) {
		$html = array();
		if($this->smsEnabled() && $this->freepbx->Modules->checkStatus('sms')) {
			$dids = $this->getDIDs();
			if(!empty($dids)) {
				if($mode == "group") {
					if(empty($user)) {
						$enable = true;
					} else {
						$enabled = $this->freepbx->Ucp->getSettingByGID($user['id'],'Sipstation','sms_enable');
					}
					$html[0] = array(
						"title" => _("SIPStation SMS"),
						"rawname" => "sipstationsms",
						"content" => load_view(dirname(__FILE__)."/views/ucp_config.php",array("mode" => "group", "enable" => $enabled))
					);
				} else {
					if(empty($user)) {
						$enable = null;
					} else {
						$enabled = $this->freepbx->Ucp->getSettingByID($user['id'],'Sipstation','sms_enable');
					}
					$html[0] = array(
						"title" => _("SIPStation SMS"),
						"rawname" => "sipstationsms",
						"content" => load_view(dirname(__FILE__)."/views/ucp_config.php",array("mode" => "user", "enable" => $enabled))
					);
				}
			}
		}
		return $html;
	}

	public function coreDIDHook($page){
		if($page == 'did' && $this->smsEnabled() && $this->freepbx->Modules->checkStatus('sms')){
			$extdisplay=isset($_REQUEST['extdisplay'])?$_REQUEST['extdisplay']:'';

			$d = explode("/",$extdisplay);
			$vdid = isset($d[0]) ? $d[0] : '';
			if(empty($vdid)) {
				return '';
			}
			$users = $this->freepbx->Userman->getAllUsers();
			if(empty($users)) {
				return '';
			}

			$html='';
			foreach($this->getDIDs(true) as $did) {
				if($vdid == $did['did']) {
					$good = true;
					break;
				}
			}
			$html = '';
			if($good) {
				$routing = $this->freepbx->Sms->getAssignedUsers($vdid);
			} else {
				return '';
			}
			$html = load_view(__DIR__."/views/hook_core.php", array("users" => $users, "routing" => (!empty($routing) ? $routing : array())));
			$ret = array();
			$ret[] = array(
				'title' => _("SIPStation SMS"),
				'rawname' => 'sipstationsms',
				'content' => $html,
			);
			return $ret;
		}
	}

	public function ajaxRequest($req, &$setting) {
		switch ($req) {
			case 'setupKeyCode':
			case 'updateE911':
			case 'updateAreaCode':
			case 'updateDest':
			case 'updateCID':
			case 'updateFailover':
			case 'getroutes':
			case 'getdids':
			case 'updateroute':
			case 'clearFailover':
			case 'updatesession':
			case 'freetrial':
			case 'addroutes':
			case 'edittrunk':
			case 'getextinfo':
			case 'testFirewall':
			case 'getAccountInfo':
				return true;
		}
		return false; // Returning false, or anything APART from (bool) true will abort the request
	}


	public function ajaxHandler() {
		$req = $_REQUEST;
		switch ($req['command']) {
			case 'getAccountInfo':
				$key = $this->ss->getKey();
				$data = $this->getSSConfig(true)->getArray();

				$sip_username = $data['sip']['username'];

				// Get the Asterisk Registration Status
				$trunk_status = $this->ss->getRegistrationStatus();
				$gateways = $data['gateways'];
				foreach ($gateways as $gw => $trunk) {
					if (isset($trunk_status[$trunk])) {
						$data['asterisk_registry'][$gw] = $trunk_status[$trunk];
					} else {
						$data['asterisk_registry'][$gw] = _("Not Registered");
					}
				}

				for ($i=1;$i<3;$i++) {
					$channelid   = $this->ss->driver->getTrunkName($i);
					$trunk_status = $this->ss->getPeerStatus($channelid);
					if ($trunk_status['sipstation_status'] == 'ok') {
						$data['trunk_qualify']["gw$i"] = $trunk_status['Status'];
						$data['trunk_codecs']["gw$i"] = implode(' | ',$this->ss->getConfiguredCodecs($channelid,$trunk_status));
					}
				}
				return $data;
			break;
			case 'testFirewall':
				$output         = array();
				$used_udp_hash  = array();
				$listen_address = '0.0.0.0';

				// Get the rpt ports Asterisk is configured for, make sure we start on even port
				//
				$rtp_ports = !file_exists($this->freepbx->Config->get('ASTETCDIR')."/rtp_additional.conf") ? parse_ini_file($this->freepbx->Config->get('ASTETCDIR')."/rtp.conf") : parse_ini_file($this->freepbx->Config->get('ASTETCDIR')."/rtp_additional.conf",false,INI_SCANNER_RAW);

				$port_start = !empty($rtp_ports['rtpstart']) ? $rtp_ports['rtpstart'] : 10000;
				$port_start += ($port_start % 2); //make sure we have an even port
				$port_end = !empty($rtp_ports['rtpend']) ? $rtp_ports['rtpend'] : 20000;
				unset($rtp_ports);

				// Get all the ports currently being used now
				$netstat = exec('which netstat');
				$netstat = !empty($netstat) ? $netstat : 'netstat';
				exec($netstat.' -aunl',$output,$res);
				foreach ($output as $line) {
					$res = preg_match('/^\s*udp\s*\d\s*\d\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})\s*.*$/',$line,$matches);
					if ($res) {
						$used_udp_hash[$matches[2]] = $matches[1];
					}
				}

				while (isset($used_udp_hash[$port_start]) && $port_start < $port_end) {
					$port_start += 2;
				}

				$json_array['status'] = 'success';
				if ($port_start > $port_end) {
					$json_array['status'] = 'no_ports';
					$json_array['status_message'] = _("No Free Ports in Asterisk RTP Port Range available for testing, you can try later");
				} else {
					// Setup the receive end before ping the server to get started
					$listen_port = (int)$port_start;
					$listen_sock = socket_create(AF_INET, SOCK_DGRAM, 0);

					if (@socket_bind($listen_sock, $listen_address, $listen_port) === false) {
						$json_array['status'] = 'socket_bind_listen_failed';
						$json_array['status_message'] = socket_strerror(socket_last_error($listen_sock)).". Could not bind to intended listen port ($listen_address:$listen_port) to receive test tocken.";
					} else {
						socket_set_nonblock($listen_sock);
						// OK, now we are listening so lets tell the server to send us something
						$send_port = (string)$port_start;
						$token = md5($send_port*rand());
						$fn = "http://myip.freepbx.org/whatismyip.php?";
						$fn .= "port=$send_port&token=".urlencode($token);

						// Now build the token we will get back, to look like a g711u payload I hope
						// this gets around any potential firewall issues though it is a stray packet
						$header = "\x80\x80\x5a\x1d\xac\xe1\x37\xab\x3b\xb7\x59\xc8";
						$token   = $header.$token.$token.$token.$token.$token;

						$ip_xml = file_get_contents_url($fn);
						//TODO: check for === false and deal with detected error

						preg_match('|^<xml><ipaddress>(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})</ipaddress></xml>$|',$ip_xml,$matches);
						if (isset($matches[1])) {
							$json_array['externip'] = $matches[1];
						}

						// OK, now we fired off our request and it returned, which means it should have fired off our
						// packet which should be buffered and waiting for us to read
						//
						$res = false;
						$count = 5;
						$string = $string2 = "";
						while ($res === false && $count > 0) {
							$res = @socket_recv($listen_sock, $string, 1024, 0);
							if ($res === false) {
								sleep(1);
							}
							$count--;
						}
						sleep(1);
						$res = @socket_recv($listen_sock, $string2, 1024, 0);
						socket_close($listen_sock);
						if ($res) {
							$string += $string2;
						}
					}
				}
				if ($json_array['status'] != 'success') {
					// Already filled in
				} elseif ($count <= 0 && $string != $token) {
					$json_array['status'] = 'timeout';
					$json_array['status_message'] = _("The test timed out which means your firewall is probably configured wrong. If subsequent tests fail, check your port forwarding on the firewall.");
				} elseif ($string != $token) {
					$json_array['status'] = 'bad_token';
					$json_array['status_message'] = _("An unexpected token was returned, try the test again");
				}
				return $json_array;
			break;
			case "editdid":
				$form = array();
				foreach(json_decode($_POST['form'],true) as $elements) {
					$k = $elements['name'];
					$v = $elements['value'];

					if(preg_match('/\[\]$/',$k)) {
						$k = str_replace('[]','',$k);
						$form[$k][] = $v;
					} else {
						$form[$k] = $v;
					}
				}
				continue;
				$didarray = isset($form['dids'])?$form['dids']:array();
				foreach($didarray as $dids) {
					$did_list[$dids] = array(
						'did' => $dids,
						'description' => $form['description_'.$dids],
						'failover' => $form['failover_'.$dids],
						'failover_old' => $form['failover_old_'.$dids],
						'destination' => !empty($form['goto'.$dids]) ? $form[$form['goto'.$dids].$dids] : '',
						'setcid' => !empty($form['setcid_'.$dids]) ? $form['setcid_'.$dids] : '',
						'selectecid' => !empty($form['setcid_'.$dids]) && !empty($form['selectecid_'.$dids]) ? $form['selectecid_'.$dids] : '',
					);
				}

				$did_cnt = 0;
				$dids_validation_fail = array();
				$did_failover = array();
				$did_list = isset($did_list)?$did_list:array();
				foreach($did_list as $did) {
					//Quickly check the Set CID Values
					if(preg_match('/from-did-direct,(.*),/',$did['destination'],$matches)){
						$ext = $matches[1];
						$uvars = $this->freepbx->Core->getUser($ext);
						//If set cid is checked then lets go through and attempt to set the emergency CID and the outbound CID.
						if(($did['setcid'] != 'unchanged') && ($did['setcid'] != 'none')) {
							if($uvars['outboundcid'] != $did['setcid']) {
								$this->ss->setOutboundCID($ext,$did['setcid'],'cid');
								needreload();
							}
						//If set cid is NOT checked then lets go through and attempt to unset the outbound CID.
						} elseif($did['setcid'] == 'none') {
							$this->ss->setOutboundCID($ext,'','cid');
							needreload();
						}

						//Go Through and Set the ECIDs
						if(($did['selectecid'] != 'unchanged') && ($did['selectecid'] != 'none')) {
							$devices = sql("SELECT `id`, `emergency_cid` FROM `devices` WHERE `user` = '$ext'", 'getAll', DB_FETCHMODE_ASSOC);
							foreach($devices as $d) {
								if($d['emergency_cid'] != $did['selectecid']) {
									$this->ss->setOutboundCID($d['id'],$did['selectecid'],'ecid');
									needreload();
								}
							}
						} elseif($did['selectecid'] == 'none') {
							//unset the ECID here
							$devices = sql("SELECT `id`, `emergency_cid` FROM `devices` WHERE `user` = '$ext'", 'getAll', DB_FETCHMODE_ASSOC);
							foreach($devices as $d) {
								$this->ss->setOutboundCID($d['id'],'','ecid');
								needreload();
							}
						}
					}

					if(!empty($did['destination'])) {
						$did_vars = array(
							'extension' => $did['did'],
							'cidnum' => '',
							'destination' => $did['destination'],
							'description' => $did['description']
						);
						$this->freepbx->Core->createUpdateDID($did_vars);
						$did_cnt++;
					} elseif($this->freepbx->Core->getDID($did['did'])) {
						$this->freepbx->Core->delDID($did['did'],'');
					}

					if(!empty($did['failover']) && $did['failover'] != $did['failover_old']) {
						$data1 = array(
							"num" => $did['failover']
						);
						$j = $this->ss->updateFailover($did['did'],'num',$did['failover']);
						if(!$j['status']) {
							$dids_validation_fail[] = $did['did'];
						}
						$did_failover++;
					} elseif(empty($did['failover']) && ($did['failover'] != $did['failover_old'])) {
						$key = $_POST['key'];
						$j = $this->ss->clearFailover($did['did']);
						if(!$j['status']) {
							$dids_validation_fail[] = $did['did'];
						}
						$did_failover++;
					}
				}

				$json['status'] = true;

				if (empty($dids_validation_fail) && $did_cnt) {
					$json['update_count'] = $did_cnt;
					$json['status_message'] = sprintf(_("Successfully updated or created %s inbound routes for your DIDs"),$did_cnt);
					} elseif (!$did_cnt && $did_failover) {
						$json['update_count'] = $did_cnt;
						$json['status_message'] = sprintf(_("Successfully updated or set failover for your %s DIDs"),$did_failover);
				} elseif(!empty($dids_validation_fail)) {
					$json['status'] = false;
					$json['update_count'] = 0;
					$json['validation_failures'] = $dids_validation_fail;
					$json['status_message'] = sprintf(_("There were %s validation failures on the requested DIDs, no updates performed"),$validation_failures);
				} else {
					$json['status'] = false;
						$json['status_message'] = _("Nothing was changed");
				}

				/*
					if we made changes then we have to set the needsreload status and send back the reload bar to be inserted
				*/
				if ($did_cnt) {
					needreload();
					$json['show_reload'] = 'yes';
				} else {
					$json['show_reload'] = 'no';
				}
				return $json;
			break;
			case "getextinfo":
				$ext = $_POST['ext'];
				$uvars = $this->freepbx->Core->getUser($ext);
				$devices = sql("SELECT `id`, `emergency_cid` FROM `devices` WHERE `user` = '$ext'", 'getAll', DB_FETCHMODE_ASSOC);
				if(count($devices) > 1) {
					$json['emergency_cid'] = '';
				} else {
					$json['emergency_cid'] = $devices[0]['emergency_cid'];
				}
				$json['outboundcid'] = $uvars['outboundcid'];
				$json['status'] = true;
				return $json;
			break;
			case "addroutes":
				$cnt = 0;
				$sip_user = $_POST['sip_username'];
				$cnt = $this->createOutboundRoutes(false);

				if(!$cnt === FALSE) {
					needreload();
					$json['show_reload'] = 'yes';
					$json['status'] = true;
					$json['status_message'] = _('Added Routes');
				} else {
					$json['status'] = true;
					$json['status_message'] = _('Nothing Changed');
				}
				return $json;
			break;
			case 'freetrial':
				$ft = $this->ss->setupFreeTrial($_POST['session']);

				return array(
					"status_message" => ($ft !== false) ? $ft : '',
					"status" => ($ft !== false)
				);
			break;
			case 'updatesession':
				$this->ss->saveFreeTrialSession($_POST['session']);
				return array(
					"status_message" => "Nothing",
					"status" => false
				);
			break;
			case 'setupKeyCode':
				$ret = array("status" => false, "message" => "");
				$account_key = $req["account_key"];
				if (empty($account_key)) {
					$ret["message"] = _("Invalid Account Key Code provided");
					return $ret;
				}
				$this->ss->setKey($account_key);
				$data = $this->getSSConfig();
				$ret["status"] = true;
				return $ret;
			break;
			case 'updateE911':
				if(!isset($req['did'])){
					return array('status' => false, 'message' => _("DID not provided"));
				}
				$did = $req['did'];
				$name = isset($req['name'])?$req['name']:'';
				$address1 = isset($req['address1'])?$req['address1']:'';
				$address2 = isset($req['address2'])?$req['address2']:'';
				$city = isset($req['city'])?$req['city']:'';
				$state = isset($req['state'])?$req['state']:'';
				$zip = isset($req['zip'])?$req['zip']:'';
				$master = isset($req['master'])?$req['master']:false;
				return $this->updateE911($did,$name, $address1,$address2,$city,$state,$zip,$master);
			break;
			case "updateAreaCode":
				if(!isset($req['areacode'])){
					return array('status' => false, 'message' => _("No areacode provided"));
				}
				return $this->updateAreaCode($req['areacode']);
			break;
			case "clearFailover":
				$did = isset($req['did'])?$req['did']:'';
				$ret = $this->clearFailover($did);
				return $ret;
			case "updateFailover":
				$num = array('status' => true);
				$dest = array('status' => true);
				$master = isset($req['did'])?false:true;
				$did = isset($req['did'])?$req['did']:'';
				if(isset($req['num'])){
					$num = $this->updateFailover($did,'num',$req['num'], $master);
					$num = is_array($num)?$num:json_decode($num,true);
				}
				if(isset($req['dest'])){
					$dest = $this->updateFailover($did,'dest',$req['dest'], $master);
					$dest = is_array($dest)?$dest:json_decode($dest,true);
				}
				if(($num['status'] === true && $dest['status'] === true)){
					return array('status' => true, 'message' => _("Failover Updated"));
				}elseif ($num['status'] === true) {
					return array('status' => true, 'message' => _("Failover Number Updated, Destination Was not Updated"));
				}elseif ($dest['status'] === true) {
					return array('status' => true, 'message' => _("Failover Destination Updated, Number Was not Updated"));
				}else{
					return array('status' => false, 'message' => _("Failover Update Failed"));
				}
			break;
			case 'getroutes':
				return $this->getRoutes();
			break;
			case 'updateroute':
				$route_id = $req['route'];
				$include = $req['action'];
				$ret = $this->updateRoute($route_id,$include);
				return array('status' => (bool) array_product($ret));
			break;
			case 'getdids':
				return $this->getDIDs();
			break;
			case 'updateCID':
				$did = isset($req['did'])?$req['did']:'';
				$cid = isset($req['cid'])?$req['cid']:'';
				$ecid = isset($req['ecid'])?$req['ecid']:'';
				return $this->updateCID($did,$cid,$ecid);
			break;
			case 'updateDest':
				$did = isset($req['did'])?$req['did']:'';
				$dest = isset($req['dest'])?$req['dest']:'';
				if(empty($did) || empty($dest)){
					return array('status'=> false, 'message'=>_("Data Missing from request"));
				}
				return $this->updateDest($did, $dest);
			break;
		}
		return false;
	}
	public function updateCID($did,$cid,$ecid){
		$dids = $this->getDids();
		$found = false;
		foreach($dids as $current){
			if(isset($current['did']) && $current['did'] == $did){
				$found = $current;
				break;
			}
		}
		if($found === false){
			return array('status'=> false, 'message'=>_("DID not found"));
		}
		if(preg_match('/from-did-direct,(.*),/',$found['destination'],$matches)){
			$ext = $matches[1];
			$device = $this->freepbx->Core->getDevice($ext);
			$this->freepbx->astman->database_put("DEVICE",$device['id']."/emergency_cid",$ecid);
			$sql = 'UPDATE devices SET `emergency_cid` = ? WHERE id = ?';
			$stmt = $this->db->prepare($sql);
			$stmt->execute(array($ecid,$ext));

			$sql = 'UPDATE users SET outboundcid = ? WHERE extension = ?';
			$stmt = $this->db->prepare($sql);
			$stmt->execute(array($cid,$ext));
			return array('status' => true);
		}
		return array('status' => true, 'message' => _("No devices to update"));
	}
	public function updateDest($did,$dest){
		$alldids = $this->freepbx->Core->getAllDIDs();
		$rets = array();
		$updated = 0;
		foreach($alldids as $thisdid){
			if($thisdid['extension'] == $did){
				$thisdid['destination'] = trim($dest);
				$rets[] = $this->freepbx->core->editDIDProperties($thisdid);
				$updated++;
			}
		}
		return array('status' => true, 'message' => sprintf(_("%s Route(s) updated"),$updated), 'returns'=> $rets);
	}
	public function updateRoute($route_id,$include){
		$trunks = $this->freepbx->Core->getRouteTrunksByID($route_id);
		$sstrunks = $this->ss->getTrunks();
		$gw1trunk = isset($sstrunks['gw1']['trunkid'])?$sstrunks['gw1']['trunkid']:'';
		$gw2trunk = isset($sstrunks['gw2']['trunkid'])?$sstrunks['gw2']['trunkid']:'';
		switch ($include) {
			case 'setgw1':
				$trunks = array_unique(array_merge($trunks,array($gw1trunk)));
			break;
			case 'setgw2':
				$trunks = array_unique(array_merge($trunks,array($gw2trunk)));
			break;
			case 'unsetgw1':
				foreach ($trunks as $key => $value) {
					if($value === $gw1trunk){
						unset($trunks[$key]);
					}
				}
			break;
			case 'unsetgw2':
				foreach ($trunks as $key => $value) {
					if($value === $gw2trunk){
						unset($trunks[$key]);
					}
				}
			break;
			case true:
				$trunks = array_unique(array_merge($trunks,array($gw1trunk,$gw2trunk)));
			break;
			case false:
				foreach ($trunks as $key => $value) {
					if(in_array($value, array($gw1trunk, $gw2trunk))){
						unset($trunks[$key]);
					}
				}
				break;
		}

		return $this->freepbx->Core->updateRouteTrunks($route_id, $trunks, true);
	}
	/**
	 * Get all Active DIDs for this Account
	 * @param {bool} $online       = true  Whether to force an online check
	 * @param {bool} $skiptollfree = false Whether to skip tollfree numbers
	 */
	public function getDIDs($skiptollfree = false) {
		$key = $this->ss->getKey();
		if(!empty($key)) {
			$c = $this->getSSConfig();
			if(!empty($c['dids'])) {
				if($skiptollfree) {
					$final = array();
					foreach($c['dids'] as $did) {
						if(!preg_match($this->tollfree,$did['did'])) {
							$final[] = $did;
						}
					}
				} else {
					$final = $c['dids'];
				}
				return $final;
			}
		}
		return array();
	}
	public static function myDialplanHooks() {
		return 900;
	}

	public function doDialplanHook(&$ext, $engine, $priority) {
		global $core_conf;

		$ssapp = 'sipstation-welcome';
		$ext->add($ssapp, '_.', '', new \ext_set('ISNUM','${REGEX("[0-9]" ${CALLERID(number)})}'));
		$ext->add($ssapp, '_.', '', new \ext_db_put('sipstation/${EXTEN}/lastcall', 'cnum','${CALLERID(number)}'));
		$ext->add($ssapp, '_.', '', new \ext_db_put('sipstation/${EXTEN}/lastcall', 'cnam','${CALLERID(name)}'));
		$ext->add($ssapp, '_.', '', new \ext_db_put('sipstation/${EXTEN}/lastcall', 'time','${EPOCH}'));
		$ext->add($ssapp, '_.', '', new \ext_answer(''));
		$ext->add($ssapp, '_.', '', new \ext_wait(1));
		$ext->add($ssapp, '_.', '', new \ext_playback('you-have-reached-a-test-number&silence/1'));
		$ext->add($ssapp, '_.', '', new \ext_saydigits('${EXTEN}'));
		$ext->add($ssapp, '_.', '', new \ext_playback('your&calling&from&silence/1'));
		$ext->add($ssapp, '_.', '', new \ext_gotoif('$["${ISNUM}" = "1"]','valid','notvalid'));
		$ext->add($ssapp, '_.', 'valid', new \ext_saydigits('${CALLERID(number)}'));
		$ext->add($ssapp, '_.', '', new \ext_hangup());
		$ext->add($ssapp, '_.', 'notvalid', new \ext_playback('unavailable&number'));
		$ext->add($ssapp, '_.', '', new \ext_hangup());


		// Now check if htere are any sip_general_additinal.conf settings that are needed
		//
		$sip_additional_array = $this->getAll("sip_general_additional");
		if (!empty($sip_additional_array) && is_array($sip_additional_array)) {
			ksort($sip_additional_array);
			foreach ($sip_additional_array as $key => $val) {
				$core_conf->addSipGeneral($key, $val);
			}
		}
	}

	/**
	 * Send the adaptor if needed
	 */
	public function smsAdaptor() {
		if(!empty($this->smsAdaptor)) {
			return $this->smsAdaptor;
		}
		$this->smsAdaptor = new SipstationSMS($this);
		return $this->smsAdaptor;
	}

	/**
	 * Check if SMS is enabled on the SIPStation Servers
	 */
	private function smsEnabled() {
		$key = $this->ss->getKey();
		if(!empty($key)) {
			$c = $this->getSSConfig();
			if(!empty($c['server_settings']['sms'])) {
				return true;
			}
		}
		return false;
	}

	public function O() {
		if (!self::$oobeobj) {
			if (!class_exists('FreePBX\\modules\\Sipstation\\Oobe')) {
				include __DIR__."/Oobe.class.php";
			}
			self::$oobeobj  = new \FreePBX\modules\Sipstation\Oobe();
		}
		return self::$oobeobj;
	}
	
	/**
	 * sapi
	 *
	 * @return void
	 */
	public function ssObj() {
		if (!self::$sapiObj) {
			if (!class_exists('FreePBX\\modules\\Sipstation\\sapi\\Sipstaion')) {
				include __DIR__."/sapi/Sipstation.php";
			}
			self::$sapiObj  = new \FreePBX\modules\Sipstation\sapi\Sipstation($this, $this->freepbx);
		}
		return self::$sapiObj;
	}
	
	/**
	 * setSSObj
	 *
	 * @param  mixed $ssObj
	 * @return void
	 */
	public function setSSObj($ssObj){
		return self::$sapiObj = $ssObj; 
	}
	
	public function oobeHook() {
		try {
			return $this->O()->showOobe();
		} catch (\Exception $e) {
			// Woah. It broke. Mark it as broken, so it gets reset later.
			$o = \FreePBX::OOBE()->getConfig('crashed');
			if (!is_array($o)) {
				$o = array("sipstation" => array("time" => time()));
			} else {
				$o['sipstation'] = array("time" => time());
			}
			\FreePBX::OOBE()->setConfig('crashed', $o);
			return true;
		}
	}
	public function drawTrunkGroupFailover($id, $value=''){
		$ssconfig = $this->getSSConfig();
		if($ssconfig['account_type'] == "TRIAL"){
			return '<input type="text" value="'._("Not Availible for Trial Accounts").'" class="form-control" readonly>';
		}
		if(isset($ssconfig['trunk_groups'])&& count($ssconfig['trunk_groups']) > 0 ){
			$input = "<select name='".$id."' id='".$id."' class='form-control'>";
			$input .= '<option value="">'._("Not Set").'</option>';
			foreach ($ssconfig['trunk_groups'] as $tg) {
				$disabled = ((int)$ssconfig['trunk_group_id'] === (int)$tg['id'] && is_numeric($ssconfig['trunk_group_id']))?'DISABLED':'';
				$selected = ((int)$tg['id'] === (int)$value && is_numeric($value))?'SELECTED':'';
				$input .= sprintf('<option value="%s" %s %s>%s</option>',$tg['id'],$selected,$disabled,$tg['title']);
			}
			$input .="</select>";
		}else{
			$input = '<input type="text" name="'.$id.'" id="'.$id.'" class="form-control" value="'._("No Trunk Groups Defined").'" disabled>';
		}
		return $input;
	}
	//API Calls//

	public function updateAreaCode($areacode){
		$areacode = filter_var($areacode, \FILTER_SANITIZE_NUMBER_INT);
		if (strlen($areacode) == 3) {
			foreach($this->ss->getTrunks() as $trunk) {
				$dialrules = $this->freepbx->Core->getTrunkDialRulesByID($trunk['trunkid']);
				if (is_array($dialrules) && count($dialrules)) {
					foreach ($dialrules as $rule) {
						$match   = $rule['match_pattern_pass'];
						$prefix  = $rule['match_pattern_prefix'];
						$prepend = $rule['prepend_digits'];
						$dialrules_tmp[] = array('match_pattern_prefix' => $prefix, 'match_pattern_pass' => $match, 'prepend_digits' => $prepend);
						if ($match != 'NXXXXXX' || $prepend != $areacode || $prefix != '') {
							$dialrules_2[] = array('match_pattern_prefix' => $prefix, 'match_pattern_pass' => $match, 'prepend_digits' => $prepend);
						} else {
							$dialrules_2 = array();
						}
					}
				} else {
					$dialrules_2 = array();
					$dialrules_tmp = array();
				}
				array_unshift($dialrules_2, array('match_pattern_prefix' => '', 'match_pattern_pass' => 'NXXXXXX', 'prepend_digits' => $areacode));
				if ($dialrules_2 != $dialrules_tmp) {
					$this->freepbx->Core->updateTrunkDialRules($trunk['trunkid'], $dialrules_2, true);
					$need_reload = true;
				}
				unset($dialrules_2);
				unset($dialrules_tmp);
				unset($dialrules);
			}
			return array('status' => true, 'message' => _("All route areacodes updated"));
		} else {
			return array('status' => false, 'message' => sprintf(_("The prefix you entered, %s, is not a proper prefix or the wrong length. It should be a 3 digit prefix."),$areacode));
		}
	}

	public function clearFailover($did=''){
		return $this->ss->clearFailover($did);
	}
	public function updateFailover($did='',$type,$value, $master = false){
		return $this->ss->updateFailover($did,$type,$value,$master);
	}
	public function updateE911($did,$name, $address1,$address2,$city,$state,$zip,$master=false){
		return $this->ss->updateE911($did,$name, $address1,$address2,$city,$state,$zip,$master);
	}

	private function isPrivateIP($address) {
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

	public function isSSEnabled() {
		$key = $this->ss->getKey();
		if(!empty($key)) {
			return true;
		}
		return false;
	}

	public function removeKeyAndTrunks() {
		if($this->isSSEnabled()) {
			$this->ss->driver->deleteTrunks();
			$this->ss->removeKey();
			needreload();
			return true;
		}
		return false;
	}

	public function dashboardNotifyForSipstation($type=null, $key=null, $title=null, $body=null, $dashNotifyType=null) {
		if (!empty($type) && !empty($key)) {
			$nt = \notifications::create();
			if ($type == 'add') {
				switch ($dashNotifyType) {
					case 'critical':
						$nt->add_critical("sipstation", $key, $title, $body, '', true, true);
					break;
					default:
					break;
				}
			}
			if ($type == 'remove') {
				$nt->delete("sipstation", $key);
			}
		}
	}

	public function sipSmsCampaignRegistryNotification() {
		if (!$this->smsEnabled()) {
			return false;
		}
		$sipSmsCampaignRegistryFlag = $this->getConfig("sipSmsCampaignRegistryFlag");
		if($sipSmsCampaignRegistryFlag) {
			return false;
		} else {
			$this->setConfig("sipSmsCampaignRegistryFlag", true);
		}
		$custName = 'SIP Station';
		$this->freepbx->Modules->loadFunctionsInc('sysadmin');
		if (function_exists('sysadmin_get_license')) {
			$lic = sysadmin_get_license();
			$custName = (isset($lic['deploy_type']) && $lic['deploy_type'] == 'PBXact UCC') ? 'PBXact Cloud' : 'SIP Station';
		}
		$title = _("Register for SMS campaigns before March 31, 2023");
		$link = "<b><a href = 'https://smscampaigns.sangoma.com' style='color: blue;' target='_blank'>https://smscampaigns.sangoma.com</a></b>";
		$body = _("It's CRITICALLY IMPORTANT that ") . $custName . _(" customers using SMS/MMS immediately review the information at the Sangoma TCR Portal at ") . $link . _(" and register DIDs for campaigns where necessary. Failure to do so may result in SMS/MMS delivery failure after March 31, 2023.");
		$result = array('title'=> $title, 'body'=> $body);
		return $result;
	}


}
