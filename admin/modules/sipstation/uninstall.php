<?php
/* $Id:$ */
if (!defined('FREEPBX_IS_AUTH')) { die('No direct script access allowed'); }

//	License for all code of this FreePBX module can be found in the license file inside the module directory
//	Copyright 2013 Schmooze Com Inc.
//
global $astman;
if (is_object($astman) && $astman->connected()) {
  outn(_("Removing AstDB Entries"));
  $astman->database_deltree("sipstation");
}else{
  outn(_("Unable to remove AstDB Entries, AstDB not availible."));
}
