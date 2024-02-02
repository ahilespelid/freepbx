<?php
namespace FreePBX\modules\Sipstation\sapi;
class PestSipstation extends \PestJSON {
	private $freepbx;
	public function __construct($freepbx, $base_url) {
		$this->freepbx = $freepbx;
		return parent::__construct($base_url);
	}

	public function __get($var) {
		switch($var) {
			case 'modversion':
				$modinfo = $this->freepbx->Modules->getInfo('sipstation');
				$this->modversion = isset($modinfo['sipstation']['version'])?$modinfo['sipstation']['version']:'unknown';
				return $this->modversion;
			break;
		}
		return null;
	}

	protected function prepRequest($opts, $url) {
		$opts[CURLOPT_HTTPHEADER][] = 'CLIENT_TYPE: ssmodule-'.$this->modversion;
		$opts[CURLOPT_CONNECTTIMEOUT] = 20;
		$opts[CURLOPT_TIMEOUT] = 20;
		return parent::prepRequest($opts, $url);
	}
}
