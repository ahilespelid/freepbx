<?php
namespace FreePBX\modules\Sipstation;
use FreePBX\modules\Backup as Base;
class Restore Extends Base\RestoreBase{
	public function runRestore(){
		$settings = $this->getConfigs();
		$this->importKVStore($settings['kvstore']);
		$this->importAdvancedSettings($settings['settings']);
	}

	public function processLegacy($pdo, $data, $tables, $unknownTables){
		$this->restoreLegacyAll($pdo);
	}
}
