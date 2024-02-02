<?php
namespace FreePBX\modules\Filestore\drivers\Dropbox;
use League\Flysystem\Filesystem;
use FreePBX\modules\Filestore\drivers\FlysystemBase;
use League\Flysystem\Cached\CachedAdapter;
use League\Flysystem\Cached\Storage\Memory as MemoryStore;
use Srmklive\Dropbox\Client\DropboxClient;
use Srmklive\Dropbox\Adapter\DropboxAdapter;
class Dropbox extends FlysystemBase {
	protected static $path = __DIR__;
	protected static $validKeys = [
		'name' => '',
		'desc' => '',
		'token' => '',
		'immortal' => '',
		'path' => ''
	];


	/**
	 * Weather an implintation is supported in this driver
	 * @param  string $method the method "all,backup,readonly,writeonly"
	 * @return bool method is/not supported
	 */
	public function methodSupported($method){
		$permissions = array(
			'all',
			'read',
			'write',
			'backup',
			'general'
		);
		return in_array($method, $permissions);
	}

	public function getHandler(){
		if(isset($this->handler)){
			return $this->handler;
		}
		$client = new DropboxClient($this->config['token']);

		$adapter = new CachedAdapter(new DropboxAdapter($client, $this->config['path']), new MemoryStore());

		$this->handler = new Filesystem($adapter, ['case_sensitive' => false]);
		return $this->handler;
	}
}
