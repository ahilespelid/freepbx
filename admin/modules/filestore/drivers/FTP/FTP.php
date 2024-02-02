<?php

namespace FreePBX\modules\Filestore\drivers\FTP;

use League\Flysystem\Adapter\Ftp as FTPAdaptor;
use League\Flysystem\Filesystem;
use FreePBX\modules\Filestore\drivers\FlysystemBase;
use League\Flysystem\Cached\CachedAdapter;
use League\Flysystem\Cached\Storage\Memory as MemoryStore;

class FTP extends FlysystemBase
{
	protected static $path = __DIR__;
	protected static $validKeys = [
		"id" => '',
		"name" => '',
		"desc" => '',
		"host" => '',
		"port" => 21,
		"usetls" => 'no',
		"user" => 'anonymous',
		"password" => 'anonymous',
		"timeout" => 30,
		"path" => '/',
		"transfer" => 'passive',
		"fstype" => "auto",
		'immortal' => '',
	];

	/**
	 * Weather an implintation is supported in this driver
	 * @param  string $method the method "all,backup,readonly,writeonly"
	 * @return bool method is/not supported
	 */
	public function methodSupported($method)
	{
		$permissions = array(
			'all',
			'read',
			'write',
			'backup',
			'general'
		);
		return in_array($method, $permissions);
	}

	public function getHandler()
	{
		if (isset($this->handler)) {
			return $this->handler;
		}

		$options = [
			'host' => $this->config['host'],
			'username' => $this->config['user'],
			'password' => $this->config['password'],

			/** optional config settings */
			'port' => $this->config['port'],
			'root' => $this->config['path'],
			'passive' => ($this->config['transfer'] === 'passive'),
			'timeout' => (isset($this->config['timeout']) && !empty($this->config['timeout'])) ? $this->config['timeout'] : 30,
			'ssl' => isset($this->config['usetls']) && $this->config['usetls'] === 'yes',
		];

		if ($this->config['fstype'] !== 'auto') {
			$options['systemType'] = $this->config['fstype'];
		}

		// Decorate the adapter
		$adapter = new CachedAdapter(new FTPAdaptor($options), new MemoryStore());

		// And use that to create the file system
		$this->handler = new Filesystem($adapter);
		return $this->handler;
	}
}
