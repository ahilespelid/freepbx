<?php
 namespace Informunity\Rest\App; use Informunity\Interfaces\RestAPI; use Informunity\Rest\Custom; use Informunity\Rest\Rest; class CheckRegistration extends Rest implements RestAPI { public static function load($config, $data = array()) { return Custom::GetCustomData($config, $data, __CLASS__); } public function Run() { return (bool) $this->query("\x73\x63\x6f\160\x65"); } }
