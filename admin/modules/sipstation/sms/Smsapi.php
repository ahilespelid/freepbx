<?php
namespace FreePBX\modules\Sipstation\sms;
class Smsapi {
	protected $sms_api = 'https://sipstation-sms-api.sangoma.com/sms/1';
	private $pest;
	private $key;
	private $cache;

	public function __construct($key) {
		$this->key = $key;
		$this->pest = new \PestJSON($this->sms_api);
	}

	public function getMessagesSinceID($id) {
		$url = 'message/'.$this->key.'/since/'.$id;
		$messages = $this->pest->get($url);
		return $messages;
	}

	public function getMessageByID($id) {
		$url = 'message/'.$this->key.'/'.$id;
		$messages = $this->pest->get($url);
		return $messages;
	}

	public function getReceivedMessagesSince($did,$time) {
		$url = 'received/'.$this->key.'/'.$did.'/'.$time;
		$messages = $this->pest->get($url);
		return $messages;
	}

	public function getSentMessagesSince($did,$time) {
		$url = 'sent/'.$this->key.'/'.$did.'/'.$time;
		$messages = $this->pest->get($url);
		return $messages;
	}

	public function sendMessage($did,$to,$message=null,$media=array()) {
		$info = $this->getDid($did);
		if(!$info['status'] && !empty($info['message'])) {
			return array(
				"status" => false,
				"message" => _("Invalid DID")
			);
		}
		if(!$info['status']) {
			return array(
				"status" => false,
				"message" => _("Invalid DID")
			);
		}
		if(!$info['data']['sms']) {
			return array(
				"status" => false,
				"message" => _("SMS is not setup for this DID")
			);
		}
		if(!empty($media) && !$info['data']['mms']) {
			return array(
				"status" => false,
				"message" => _("MMS is not setup for this DID")
			);
		}
		$url = 'send/'.$this->key.'/'.$did.'/'.$to;
		$messages = $this->pest->post($url,array(
			"text" => !is_null($message) ? $message : "",
			"media" => $media
		));
		return $messages;
	}

	public function getDid($did) {
		if(isset($this->cache['did'][$did])) {
			return $this->cache['did'][$did];
		}
		$url = 'did/'.$this->key.'/'.$did;
		$info = $this->pest->get($url);
		if(!$info['status']) {
			return array(
				"status" => false,
				"message" => $info['message']
			);
		}
		$this->cache['did'][$did] = $info;
		return array(
			"status" => true,
			"data" => $this->cache['did'][$did]
		);
	}
}
