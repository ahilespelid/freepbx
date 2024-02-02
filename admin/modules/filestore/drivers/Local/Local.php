<?php
namespace FreePBX\modules\Filestore\drivers\Local;
use League\Flysystem\Filesystem;
use League\Flysystem\Adapter\Local as Loc;
use \FreePBX\modules\Filestore\drivers\FlysystemBase;
use League\Flysystem\Cached\CachedAdapter;
use League\Flysystem\Cached\Storage\Memory as MemoryStore;
class Local extends FlysystemBase {
	protected static $path = __DIR__;
	protected static $validKeys = [
		'name' => '',
		'desc' => '',
		'path' => '',
		'immortal' => '',
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

	//Local STUFF
	public function getHandler(){
		if(isset($this->handler)){
			return $this->handler;
		}
		$path = $this->translatePath($this->config['path']);
		$path = str_replace("'", "", $path);
		$adapter = new CachedAdapter(new Loc($path), new MemoryStore());
		$this->handler = new Filesystem($adapter);
		return $this->handler;
	}
}
