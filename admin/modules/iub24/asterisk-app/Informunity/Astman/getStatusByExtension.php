<?php
 namespace Informunity\Astman; class getStatusByExtension { public static function Run($extension) { global $astman; return $astman->database_get("\104\116\104", $extension); } }
