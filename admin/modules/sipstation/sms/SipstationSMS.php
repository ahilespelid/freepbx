<?php
namespace FreePBX\modules\Sipstation\sms;
use FreePBX\modules\Sipstation\sms\Smsapi as API;
use FreePBX\modules\Sms\AdaptorBase as smsAdaptorBase;
class SipstationSMS extends smsAdaptorBase {
	private $sipstation;
	private $objSmsplus = null;
	public function __construct($sipstation) {
		parent::__construct();
		$this->sipstation = $sipstation;
		$this->freepbx = \FreePBX::create();
		$this->db = $this->freepbx->Database;
		if ($this->freepbx->Modules->checkStatus('smsplus')) {
			$this->objSmsplus = $this->freepbx->Smsplus->getObject();
		}
	}

	//these are resource intensive, dont load them through construct, load them dynamically if requested
	public function __get($var) {
		switch($var) {
			case 'ss':
				$this->ss = $this->sipstation->ss;
				return $this->ss;
			break;
			case 'key':
				//dont set the key internally
				return $this->ss->getKey();
			break;
			case 'api':
				$this->api = new API($this->key);
				return $this->api;
			break;
			case 'sms_server':
				$gws = $this->ss->getAPIObject()->getGateways();
				return $gws[0];
			break;
		}
		return null;
	}

	public function showDID($id, $did) {
		return \FreePBX::Ucp()->getCombinedSettingByID($id,'Sipstation','sms_enable');
	}

	public function getReceivedMessagesSinceID($id) {
		return $this->api->getMessagesSinceID($id);
	}

	public function getReceivedMessagesSince($did,$time) {
		return $this->api->getReceivedMessagesSince($did,$time);
	}

	public function getSentMessagesSince($did,$time) {
		return $this->api->getSentMessagesSince($did,$time);
	}

	public function getMessageByID($id) {
		$message = $this->api->getMessageByID($id);
		$m = $message['message'];
		$m['from'] = str_replace("+","",$m['from']);
		$m['to'] = str_replace("+","",$m['to']);
		$msgid = parent::updateMessageByEMID($m['id'],$m['text'],'Sipstation',$m['time']);
		if($m['type'] == 'mms' && !empty($m['media'])) {
			$sql = "DELETE FROM sms_media WHERE mid = :id";
			$sth = \FreePBX::Database()->prepare($sql);
			$sth->execute(array(":id" => $msgid));
			foreach($m['media'] as $media) {
				$name = basename($media);
				$data = file_get_contents($media);
				$this->addMedia($msgid, $name, $data);
			}
		}
	}

	public function sendMedia($to,$from,$cnam,$message=null,$files=array(),$time=null,$adaptor=null,$emid=null,$chatId='') {
		$did = $this->api->getDid($from);
		if($did['status']) {
			//supports proper unicode
			$message = $this->emoji->shortnameToUnicode($message);
			$fmedia = array();
			foreach($files as $file) {
				$fmedia[] = array(
					"data" => base64_encode(file_get_contents($file)),
					"ext" => pathinfo ($file, PATHINFO_EXTENSION)
				);
			}
			$res = $this->api->sendMessage($from,$to,$message,$fmedia);
			if($res['status']) {
				$id = parent::sendMedia($to,$from,null,$message,$files,null,'Sipstation',$res['id'],$chatId);
				return array("status" => true, "id" => $id, "emid" => $res['id']);
			} else {
				return array("status" => false, "message" => $res['message']);
			}
		} else {
			return array("status" => false, "message" => $did['message']);
		}
	}

	public function sendMessage($to,$from,$cnam,$message,$time=null,$adaptor=null,$emid=null,$chatId='') {
		$did = $this->api->getDid($from);
		if($did['status']) {
			//supports proper unicode
			$message = $this->emoji->shortnameToUnicode($message);
			$res = $this->api->sendMessage($from,$to,$message);
			if($res['status']) {
				$id = parent::sendMessage($to,$from,null,$message,null,'Sipstation',$res['id'],$chatId);
				return array("status" => true, "id" => $id, "emid" => $res['id']);
			} else {
				return array("status" => false, "message" => $res['message']);
			}
		} else {
			return array("status" => false, "message" => $did['message']);
		}
	}

	public function getMessage($to,$from,$cnam,$message,$time=null,$adaptor=null,$emid=null) {

		if ($this->objSmsplus) {
			$where = " WHERE `to` = :to AND `direction` = 'in' AND `adaptor` = 'Sipstation'";
			$sql = "(SELECT emid, timestamp FROM `sms_messages` " . $where . ") UNION (SELECT emid, timestamp FROM `sms_blocklisted_messages` " . $where . ") ORDER BY `timestamp` DESC";
			$sth = $this->db->prepare($sql);
			$sth->execute(array(
				":to" => $to,
				":to" => $to
			));
		} else {
			$sql = "SELECT emid, timestamp FROM sms_messages WHERE `to` = :to AND direction = 'in' AND adaptor = 'Sipstation' ORDER BY `timestamp` DESC";
			$sth = $this->db->prepare($sql);
			$sth->execute(array(
				":to" => $to
			));
		}
		$messages = $sth->fetchAll(\PDO::FETCH_ASSOC);
		if(empty($messages)) {
			$data = $this->getReceivedMessagesSince($to,time()-5);
		} elseif(!empty($messages[0]['timestamp']) && empty($messages[0]['emid'])) {
			$data = $this->getReceivedMessagesSince($to,$messages[0]['timestamp']);
		} else {
			$data = $this->getReceivedMessagesSinceID($messages[0]['emid']);
		}
		$emids = array_map(function($arr) {
			return $arr['emid'];
		},$messages);
		if($data['status'] && !empty($data['messages'])) {
			foreach($data['messages'] as $m) {
				if(in_array($m['id'],$emids)) {
					continue;
				}
				$m['from'] = str_replace("+","",$m['from']);
				$m['to'] = str_replace("+","",$m['to']);
				$time = null; //Could use $m['time'] but it's not the time we received the message, we got it NOW
				$medias = array();
				if($m['type'] == 'mms' && !empty($m['media'])) {
					foreach($m['media'] as $media) {
						$name = basename($media);
						$medias[$name] = file_get_contents($media);
					}
				}
				$msgid = parent::getMessage($m['to'],$m['from'],null,$m['text'],$time,'Sipstation',$m['id']);
				foreach($medias as $name => $data) {
					$this->addMedia($msgid, $name, $data);
				}
				if (empty($this->objSmsplus) || ($this->objSmsplus && !$this->objSmsplus->getDBTableSmsBlock($m['from'])['status'])) {
					$this->emitSmsInboundUserEvt($msgid, $m['to'], $m['from'], '', $m['text'], null, 'Sipstation', $m['id']);
				}
			}
			return true;
		} else {
			$msgid = parent::getMessage($to,$from,$cnam,$message,null,'Sipstation',$emid);
			if (empty($this->objSmsplus) || ($this->objSmsplus && !$this->objSmsplus->getDBTableSmsBlock($from)['status'])) {
				$this->emitSmsInboundUserEvt($msgid, $to, $from, '', $message, null, 'Sipstation', $emid);
			}
			return true;
		}
	}

	public function addReceivedMessagePassthru($m) {
		$medias = array();
		if($m['type'] == 'mms' && !empty($m['media'])) {
			foreach($m['media'] as $media) {
				$name = basename($media);
				$medias[$name] = file_get_contents($media);
			}
		}

		$msgid = parent::getMessage($m['to'],$m['from'],null,$m['text'],$m['time'],'Sipstation',$m['id']);
		foreach($medias as $name => $data) {
			$this->addMedia($msgid, $name, $data);
		}

		$this->emitSmsInboundUserEvt($msgid, $m['to'], $m['from'], '', $m['text'], $m['time'], 'Sipstation', $m['id']);

		return $msgid;
	}

	public function addSentMessagePassthru($m) {
		return parent::sendMessage($m['to'],$m['from'],null,$m['text'],$m['time'],'Sipstation',$m['id']);
	}

	public function dialPlanHooks(&$ext, $engine, $priority) {
		$tech = $this->ss->driver->getTech();
		switch($tech) {
			case 'sip':
			case 'pjsip':
				$c = 'sms-incoming';
				$ext->add($c, '_.', '', new \ext_noop('SMS came in with DID: ${EXTEN}'));
				$ext->add($c, '_.', '', new \ext_goto('1', 's'));
				$ext->add($c, 's', '', new \ext_agi('sipstation_sms.php, RECEIVE'));
				$ext->add($c, 's', '', new \ext_hangup());
				if($tech == 'sip') {
					global $core_conf;
					$core_conf->addSipGeneral('accept_outofcall_message','yes');
				}
			break;
		}

	}
}
