<?php
namespace FreePBX\modules\Sipstation;
use FreePBX\modules\Backup as Base;
class Backup Extends Base\BackupBase{
	public function runBackup($id,$transaction){
		$this->addConfigs([
			'kvstore' => $this->dumpKVStore(),
			'settings' => $this->dumpAdvancedSettings()
		]);
		$this->addDependency('framework');
		$this->addDependency('core');
		$this->addDependency('sipsettings');
		$this->addDependency('userman');
		$this->addDependency('certman');
	}
}