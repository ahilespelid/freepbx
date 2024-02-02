<?php
 namespace Informunity\Help; class helpObj { public $title; public $content; public function __construct($title) { $this->title = $title; } public static function Create($title) { return new helpObj($title); } public function addContentItem($ContentItem) { $this->content[] = $ContentItem; return $this; } }
