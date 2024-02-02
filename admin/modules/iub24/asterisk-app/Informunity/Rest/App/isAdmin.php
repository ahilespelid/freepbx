<?php
 namespace Informunity\Rest\App; use Informunity\Interfaces\RestAPI; use Informunity\Rest\Custom; use Informunity\Rest\Rest; class isAdmin extends Rest implements RestAPI { public static function load($config, $data = array()) { return Custom::GetCustomData($config, $data, __CLASS__); } public function Run() { return array("\162\x65\163\x75\x6c\164" => true); } }
