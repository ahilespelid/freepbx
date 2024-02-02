<?php
namespace FreePBX\modules\Filestore\drivers\SSH;
use League\Flysystem\Sftp\SftpAdapter;
use League\Flysystem\Filesystem;
use FreePBX\modules\Filestore\drivers\FlysystemBase;
use League\Flysystem\Cached\CachedAdapter;
use League\Flysystem\Cached\Storage\Memory as MemoryStore;
class SSH extends FlysystemBase {
	protected static $path = __DIR__;
	protected static $validKeys = [
		'name' => '',
		'desc' => 'SSH Server',
		'host' => '',
		'port' => '22',
		'user' => '',
		'key' => '',
		'path' => '',
		'type' => 'ssh',
		'readonly' => array(),
		'immortal' => ''
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

	//SSH STUFF
	public function getHandler(){
		if(isset($this->handler)){
			return $this->handler;
		}
      	$home = posix_getpwuid(posix_getuid());
		$path = $this->translatePath($this->config['path']);
		$options = [
			'host' => $this->config['host'],
			'port' => $this->config['port'],
			'username' => $this->config['user'],
			'privateKey' => str_replace("~", $home["dir"], $this->config['key']),
			'root' => $this->config['path'],
			'timeout' => 10,
			'directoryPerm' => 0755
		];

		// Decorate the adapter
		$adapter = new CachedAdapter(new SftpAdapter($options), new MemoryStore());

		// And use that to create the file system
		$this->handler = new Filesystem($adapter);
		return $this->handler;
	}
}
