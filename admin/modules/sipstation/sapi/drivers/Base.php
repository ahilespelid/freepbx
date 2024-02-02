<?php
namespace FreePBX\modules\Sipstation\sapi\drivers;

interface Base {
	public function getTrunks();
	public function getRegistrationStatus();
	public function codecFilter($codec);
	public function getPeerStatus($peer);
	public function getConfiguredCodecs($peer, $peer_status=false);
	public function createTrunks();
	public function getTech();
	public function getInfo();
}
