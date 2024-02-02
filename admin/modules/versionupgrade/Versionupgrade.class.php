<?php
// vim: set ai ts=4 sw=4 ft=php:
namespace FreePBX\modules;
use Hhxsv5\SSE\SSE;
use Hhxsv5\SSE\Update;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

class Versionupgrade extends \FreePBX_Helpers implements \BMO {
	private $upgradeVer = 16;
	private $minAsteriskVer = 13;
	private $minPHPVer = '5.6';
	private $minPHPVerOtherDistro = '7.4';
	private $minNODEVer = '8.0.0';
	private $minSQLVer = '5.5.52';
	private $frameworkVer = '15.0.17.49';
	private $sysadminVer = '15.0.21.73';
	private $features = array();
	private $freepbx;
	private $brand;
	private $callback;
	private $upgradepid = '/var/run/asterisk/upgrade_running.lock';
	const BETA = true;
	/**
	 * The modules in this list are updated IN order
	 * SEPARATELY from upgradeALL!
	 * @var array
	 */
	private $upgradeModules = array(

	);
	/**
	 * The modules in this list are NEW modules to install IN order
	 * SEPARATELY from upgradeALL!
	 * @var array
	 */
	private $installModules = array(
		'pm2',
		'api',
	);
	/**
	 * The modules in this list are disabled until
	 * proper updates come out for them
	 * @var array
	 */
	private $disableModules = array(

	);

	/**
	 * The modules in this list are permanently disabled
	 * @var array
	 */
	private $permDisableModules = array(
		'sng_mcu'
	);

	public function __construct($freepbx = null) {
		$this->freepbx = $freepbx;
		$this->brand = $freepbx->Config->get("DASHBOARD_FREEPBX_BRAND");
		$this->features = array(
			_("PHP 7.4") => "<p>".sprintf(_("%s The most broadly impacting change for 16 is that the PBX project now officially supports PHP 7.4 for every supported module. This touches all areas of PBX from OSS modules, to Commercial Modules, to the PBX ISO, to security to performance."),$this->brand),
			_("GraphQL") => "<p>".sprintf(_("Overall Improvement to the API module has been a primary focus for 16. Over the last several months, new GraphQL API methods have been added almost weekly, such that now it is pretty much possible to provision many aspects of a new %s instance as a VM, perform an initial setup of the system, and create new extensions entirely using the API."), $this->brand).'</p><p><img src="assets/versionupgrade/images/FreePBX-16-1.png"></p>',
			_("UCP Template") => "<p>"._("A new UCP Template feature has been introduced to allow PBX administrators to create UCP templates that can be applied to existing UCP users, or automatically applied to new users when they are created. Once a template has been set up and added to a group, whenever a new user is created in that group, their UCP experience will match the template.  When the user logs in for the first time they see the default widget layout, which they are then free to modify, add and remove as they wish.").'</p><p><img src="assets/versionupgrade/images/FreePBX-16-2.png"></p>',
		);
	}

	/**
	 * Create Upgrade process id
	 */
	public function setUpgradeStart() {
		$fh = fopen($this->upgradepid, "w+");
		if ($fh === false) {
			throw new Exception("Failed to create upgrade process id file $$this->upgradepid");
		}
		fclose($fh);
	}

	/**
	 * Destroy Upgrade process id
	 */
	public function setUpgradeEnd() {
		if (file_exists($this->upgradepid)) {
			unlink($this->upgradepid);
		}
	}


	public function install() {
	}
	public function uninstall() {
	}
	public function backup() {
	}
	public function restore($backup) {
	}
	public function doConfigPageInit($page) {
	}

	public function __get($var) {

	}

	public function __set($var, $value) {

	}

	public function runHook($hookname, $params = false) {
		if(!$this->checkOfficalDistro()){
			return false;
		}
		// Runs a new style Syadmin hook
		if (!file_exists("/etc/incron.d/sysadmin")) {
			throw new \Exception("Sysadmin RPM not up to date");
		}

		$basedir = "/var/spool/asterisk/incron";
		if (!is_dir($basedir)) {
			throw new \Exception("$basedir is not a directory");
		}

		// Does our hook actually exist?
		if (!file_exists(__DIR__."/hooks/$hookname")) {
			throw new \Exception("Hook $hookname doesn't exist");
		}

		// Cool. So I want to run this hook..
		$filename = "$basedir/versionupgrade.$hookname";

		// Do I have any params?
		if ($params) {
			// Oh. I do. If it's an array, json encode and base64
			if (is_array($params)) {
				$b = base64_encode(gzcompress(json_encode($params)));
				// Note we derp the base64, changing / to _, because filepath.
				$filename .= ".".str_replace('/', '_', $b);
			} else {
				// Cast it to a string if it's anything else, and then make sure
				// it doesn't have any spaces.
				$filename .= ".".preg_replace("/[[:blank:]]+/", "", (string) $params);
			}
		}

		// Make sure it doesn't exist, if it was left hanging around
		// for some reason
		@unlink($filename);

		$fh = fopen($filename, "w+");
		if ($fh === false) {
			// WTF, unable to create file?
			return false;
		}

		// Now incron does its thing.
		fclose($fh);

		// Wait .5 of a second, make sure it's been deleted.
		usleep(500000);
		if (!file_exists($filename)) {
			return true;
		}
		// Odd. It should be gone. Something went wrong.
		throw new \Exception("Failed to run hook".$hookname);
		return false;
	}


	public function ajaxRequest($command, &$settings) {
		$settings['changesession'] = true;
		switch($command) {
			case "submit":
			case "upgrade":
			case "upgradephp":
				$this->runHook("upgrade-php"); 
				return true;
			break;
			default:
				return false;
			break;
		}
	}

	private function sendData($data=array()) {
		$repo = $this->freepbx->Config->get("MODULE_REPO");
		if(isset($_POST['module_repo']) && $_POST['module_repo'] == 'reset') {
			$this->freepbx->Config->update("MODULE_REPO", "https://mirror.freepbx.org", true);
		}
		$awr = $this->freepbx->Config->get("AMPWEBROOT");
		if (!function_exists('sysadmin_get_license') && file_exists($awr ."/admin/modules/sysadmin/functions.inc.php")) {
			include $awr ."/admin/modules/sysadmin/functions.inc.php";
		}
		$pest = new \PestJSON('https://katanafpbx.schmoozecom.com');
		$mf = \module_functions::create();
		$installid = $mf->get_unique_id();
		$distro_hash = $mf->_distro_id();
		$distro = $distro_hash['pbx_type'];
		$version = $distro_hash['pbx_version'];
		$data['installid'] = $installid;
		$data['tos'] = ($_POST['tos'] == 'true') ? 1 : 0;
		$data['deploymentid'] = $mf->_deploymentid();
		$data['distro_name'] = $distro;
		$data['distro_version'] = $version;
		$data['user_distro_name'] = $_POST['pbx_type'];
		$data['user_distro_name_custom'] = $_POST['pbx_type_name'];
		$data['install_type'] = 'N/A';
		$data['brand'] = $mf->_brandid();
		$data['user_name'] = isset($_POST['name']) ? $_POST['name'] : '';
		$data['user_company'] = isset($_POST['company']) ? $_POST['company'] : '';
		$data['user_phone'] = isset($_POST['phone']) ? $_POST['phone'] : '';
		$data['user_email'] = isset($_POST['email']) ? $_POST['email'] : '';
		$data['repo_reset'] = (isset($_POST['module_repo']) && $_POST['module_repo'] == 'reset') ? 1 : 0;
		$data['repo'] = $repo;
		try{
			$ret = $pest->post('/versionupgrader/form',$data);
		} catch(\Exception $e) {
			return array(
				"status" => false,
				"continue" => false,
				"message" => sprintf(_("Error contacting server: %s"),$e->getMessage())
			);
		}
		return $ret;
	}

	public function ajaxHandler() {
		switch($_REQUEST['command']) {
			case "submit":
				$ret = $this->sendData();
				if(!$ret['status'] && isset($ret['action']) && $ret['action'] == 'regenerateid') {
					$mf = \module_functions::create();
					$mf->get_unique_id();
					$ret = $this->sendData(array("regenerated" => true));
				}
				return $ret;
			break;
			default:
				return false;
			break;
		}
	}

	public function showPage() {
		$action = !empty($_REQUEST['action']) ? $_REQUEST['action'] : array();
		$html = "";
		switch($action) {
			case "check":
				$officaldistro = $this->checkOfficalDistro();
				$checks = $this->runChecks();
				$out = $this->freepbx->Modules->getInfo("sysadmin");
				$deid = $data = \module_functions::create()->_deploymentid();
				$show_form = (empty($out['sysadmin']['status']) || $out['sysadmin']['status'] != MODULE_STATUS_ENABLED) || empty($deid);
				$did = \module_functions::create()->_distro_id();
				$repo = $this->freepbx->Config->get('MODULE_REPO');
				$repo_check = ($repo == "http://mirror1.freepbx.org,http://mirror2.freepbx.org");
				$distros = array(
					"freepbxdistro" => sprintf(_('%s Distro'),$this->brand),
					"trixbox" => "Trixbox",
					"asterisknow" => "AsteriskNow",
					"elastix" => "Elastix",
					"piaf" => "PBX in a Flash",
					"raspbx" => "RasPBX (Raspberry Pi)",
					"fonica" => "Fonica"
				);
				asort($distros);
				if($officaldistro){
					$html = load_view(__DIR__."/views/check.php",array("officaldistro" => $officaldistro, "distros" => $distros, "repo_check" => $repo_check, "did" => $did, "brand" => $this->brand, "show_form" => $show_form, "upgradeVersion" => $this->upgradeVer, "checks" => $checks['checks'], "allowUpgrade" => $checks['allowUpgrade'], "canReset" => $canReset, "commercialModules" => $checks['commercialModules']));
				}else{
					$html = load_view(__DIR__."/views/non-sng-distro.php",array("officaldistro" => $officaldistro, "distros" => $distros, "repo_check" => $repo_check, "did" => $did, "brand" => $this->brand, "show_form" => $show_form, "upgradeVersion" => $this->upgradeVer, "checks" => $checks['checks'], "allowUpgrade" => $checks['allowUpgrade'], "canReset" => $canReset, "commercialModules" => $checks['commercialModules']));
				}
			break;
			default:
				$deid = $data = \module_functions::create()->_deploymentid();
				$out = $this->freepbx->Modules->getInfo("sysadmin");
				if(!empty($out['sysadmin']['status']) && ($out['sysadmin']['status'] == MODULE_STATUS_ENABLED) && empty($deid)) {
					$this->freepbx->Sysadmin->O()->restartOobe('versionupgrade');
				}
				$html = load_view(__DIR__."/views/landing.php",array("brand" => $this->brand, "upgradeVersion" => $this->upgradeVer, "features" => $this->features));
			break;
		}
		return $html;
	}

	public function setEventCallBack($function) {
		$this->callback = $function;
	}

	/**
	 * Send event
	 * @param  string $type Event type
	 * @param  mixed $data Data elements
	 */
	private function sendEvent($type, $data) {
		call_user_func($this->callback, $type, $data);
	}

	/**
	 * Custom ajax handler
	 */
	public function ajaxCustomHandler() {
		set_time_limit(0);
		if(function_exists("apache_setenv")) {
			apache_setenv('no-gzip', '1');
		}
		switch($_REQUEST['command']) {
			case "upgrade":
				header('Content-Type: text/event-stream');
				header('Cache-Control: no-cache');
				header('Connection: keep-alive');
				header('X-Accel-Buffering: no');//Nginx: unbuffered responses suitable for Comet and HTTP streaming applications
				echo ":" . str_repeat(" ", 2048) . "\n"; // 2 kB padding for IE
				flush();
				$this->setEventCallBack(function($type, $data) {
					echo "event: ".$type."\n";
					echo 'data: '.json_encode($data);
					echo "\n\n";
					ob_flush();
					flush();
				});
				$this->upgrade($_REQUEST['stage']);
			case "upgradephp":
				return true;
			break;
		}
		return false;
	}

	public function upgrade($stage) {
		$mf = \module_functions::create();
		$bin = $this->freepbx->Config->get('AMPBIN');
		switch($stage) {
			case 1:
				$this->setConfig('modules',null);
				$this->sendEvent("message", array("message" => _("Running checks (checking filesystem, this might take awhile)..."), "newline" => false));
				// Do not check framework as framework already got updated via phpupdate shell script
				$checks = $this->runChecks(true, false);
				if(!$checks['allowUpgrade']) {
					foreach($checks['checks'] as $check) {
						if(!$check['status']) {
							$this->sendEvent("action", array("action" => "error", "message" => $check['description']));
						}
					}
					return true;
				} else {
					$this->sendEvent("message", array("message" => _("Passed")));
				}
				$this->sendEvent("message", array("message" => "<strong>".sprintf(_("Stage %s"),1)."</strong>"));

				//Bump Version to alpha of next release
				$this->sendEvent("message", array("message" => sprintf(_("Bumping %s to version %s..."),$this->brand, $this->upgradeVer), "newline" => false));
				$this->freepbx->Database->query("UPDATE admin SET value = '".$this->upgradeVer.".0.0alpha1' WHERE variable = 'version'");
				$sth = $this->freepbx->Database->prepare("SELECT value FROM admin WHERE variable = 'version'");
				$sth->execute();

				//Make sure version got properly bumped
				$data = $sth->fetch(\PDO::FETCH_ASSOC);
				if($data['value'] != $this->upgradeVer.'.0.0alpha1') {
					$this->sendEvent("action", array("action" => "error", "message" => _("Unable to set version")));
					return true;
				}
				$this->sendEvent("message", array("message" => _("Done")));

				//Create upgrade process id 
				$this->setUpgradeStart();

				//Turn off MODULEADMINWGET because we ignore it now
				$this->sendEvent("message", array("message" => "Turning off MODULEADMINWGET...", "newline" => false));
				$this->freepbx->Config->update('MODULEADMINWGET',0,true);
				$this->sendEvent("message", array("message" => _("Done")));

				//Turn off caching if enabled and mark it to be re-enabled later
				$sc = $this->freepbx->Config->get('MODULEADMIN_SKIP_CACHE');
				if(empty($sc)) {
					$this->setConfig('sc',false);
				} else {
					$this->setConfig('sc',true);
				}
				$this->freepbx->Config->update('MODULEADMIN_SKIP_CACHE',1,true);

				//Check online server to get all new modules
				$this->sendEvent("message", array("message" => _("Checking online servers..."), "newline" => false));
				$mf->getonlinexml();
				$this->sendEvent("message", array("message" => _("Done")));

				//Download framework
				#$this->sendEvent("message", array("message" => "Download and Install Framework"));
				#$this->runMACommand("download framework");
				#$this->runMACommand("install framework");

				//Store all modules that need upgrading in modules, along with total
				$this->setConfig('modules',$this->getUpgradable());
				$this->setConfig('totalModules',count($this->getConfig('modules')));
				$this->setConfig('modulesProcessed',1);

				//Set our total progress bar
				$this->sendEvent("total", array("percent" => floor(($this->getConfig('modulesProcessed')/$this->getConfig('totalModules')) * 100)));
				$this->setConfig('step',1);
				$this->freepbx->Config->update('MODULEADMIN_SKIP_CACHE',0,true);
				$this->sendEvent("action", array("action" => "step", "step" => "2"));
			break;
			case 2:
				//Next upgrade core AFTER framework (which is very important)
				$this->sendEvent("message", array("message" => "<strong>".sprintf(_("Stage %s"),2)."</strong>"));
				$this->sendEvent("message", array("message" => "Download and Install Core"));
				$this->runMACommand("download core");
				$this->runMACommand("install core");
				$modulesProcessed = $this->getConfig('modulesProcessed');
				$modulesProcessed++;
				$this->setConfig('modulesProcessed',$modulesProcessed);
				$modules = $this->getConfig('modules');
				$totalModules = $this->getConfig('totalModules');
				$key = array_search("core", $modules);
				if($key !== false) {
					unset($modules[$key]);
					$this->setConfig('modules',$modules);
				}
				$this->sendEvent("total", array("percent" => floor(($modulesProcessed/$totalModules) * 100)));
				$this->setConfig('step',2);
				$this->sendEvent("action", array("action" => "step", "step" => "3"));
			break;
			case 3:
				//Next upgrade sysadmin AFTER framework AFTER core (important!)
				$this->sendEvent("message", array("message" => "<strong>".sprintf(_("Stage %s"),3)."</strong>"));
				$out = $this->freepbx->Modules->getInfo("sysadmin");
				//only do this if they have sysadmin installed
				if(!empty($out['sysadmin']['status']) && ($out['sysadmin']['status'] == MODULE_STATUS_ENABLED || $out['sysadmin']['status'] == MODULE_STATUS_NEEDUPGRADE)) {
					$this->sendEvent("message", array("message" => "Download and Install Sysadmin"));
					$this->runMACommand("download sysadmin");
					$this->runMACommand("install sysadmin");
					$modulesProcessed = $this->getConfig('modulesProcessed');
					$modulesProcessed++;
					$this->setConfig('modulesProcessed',$modulesProcessed);
					$modules = $this->getConfig('modules');
					$totalModules = $this->getConfig('totalModules');
					$key = array_search("sysadmin", $modules);
					if($key!==false) {
						unset($modules[$key]);
						$this->setConfig('modules',$modules);
					}
					$this->sendEvent("total", array("percent" => floor(($modulesProcessed/$totalModules) * 100)));
				} else {
					$this->sendEvent("message", array("message" => "<strong>".sprintf(_("Stage %s not needed, skipping"),3)."</strong>"));
				}
				$this->setConfig('step',3);
				$this->sendEvent("action", array("action" => "step", "step" => "4"));
			break;
			case 4:
				//special case modules
				$this->sendEvent("message", array("message" => "<strong>".sprintf(_("Stage %s"),4)."</strong>"));
				if(empty($this->upgradeModules)) {
					$this->sendEvent("message", array("message" => "No Modules to pre-upgrade"));
				}
				foreach($this->upgradeModules as $mod) {
					$out = $this->freepbx->Modules->getInfo($mod);
					if(!empty($out[$mod]['status'])) {
						$disabled = false;
						if($out[$mod]['status'] == MODULE_STATUS_DISABLED) {
							$disabled = true;
						}
						if($out[$mod]['status'] == MODULE_STATUS_ENABLED) {
							$this->sendEvent("message", array("message" => "Disabling $mod"));
							$this->runMACommand("disable ".$mod);
						}
						$this->sendEvent("message", array("message" => "Download and Install $mod"));
						$this->runMACommand("download ".$mod);
						$this->sendEvent("message", array("message" => "Enabling $mod"));
						$this->runMACommand("enable ".$mod);
						$this->runMACommand("install ".$mod);
						if($disabled) {
							$this->sendEvent("message", array("message" => "Disabling $mod"));
							$this->runMACommand("disable ".$mod);
						}
						$modulesProcessed = $this->getConfig('modulesProcessed');
						$modulesProcessed++;
						$this->setConfig('modulesProcessed',$modulesProcessed);
						$modules = $this->getConfig('modules');
						$totalModules = $this->getConfig('totalModules');
						$key = array_search($mod, $modules);
						if($key!==false) {
							unset($modules[$key]);
							$this->setConfig('modules',$modules);
						}
						$this->sendEvent("total", array("percent" => floor(($modulesProcessed/$totalModules) * 100)));
					}
				}
				foreach($this->installModules as $mod) {
					$this->sendEvent("message", array("message" => "Download and Install $mod"));
					$this->runMACommand("download ".$mod);
					$this->sendEvent("message", array("message" => "Enabling $mod"));
					$this->runMACommand("enable ".$mod);
					$this->runMACommand("install ".$mod);
					$modulesProcessed = $this->getConfig('modulesProcessed');
					$modulesProcessed++;
					$this->setConfig('modulesProcessed',$modulesProcessed);
					$modules = $this->getConfig('modules');
					$totalModules = $this->getConfig('totalModules');
					$key = array_search($mod, $modules);
					if($key!==false) {
						unset($modules[$key]);
						$this->setConfig('modules',$modules);
					}
					$this->sendEvent("total", array("percent" => floor(($modulesProcessed/$totalModules) * 100)));
				}
				foreach($this->disableModules as $mod) {
					$out = $this->freepbx->Modules->getInfo($mod);
					if(!empty($out[$mod]['status'])) {
						if($out[$mod]['status'] == MODULE_STATUS_ENABLED) {
							$this->sendEvent("message", array("message" => "Disabling $mod"));
							$this->runMACommand("disable ".$mod);
						}
					}
				}
				foreach($this->permDisableModules as $mod) {
					$out = $this->freepbx->Modules->getInfo($mod);
					if(!empty($out[$mod]['status'])) {
						if($out[$mod]['status'] == MODULE_STATUS_ENABLED) {
							$this->sendEvent("message", array("message" => "Disabling $mod"));
							$this->runMACommand("disable ".$mod);
						}
					}
				}
				$this->setConfig('step',4);
				$this->sendEvent("action", array("action" => "step", "step" => "5"));
			break;
			case 5:
				if($this->getConfig('step') == 4) {
					$this->sendEvent("message", array("message" => "<strong>".sprintf(_("Stage %s"),5)."</strong>"));
					$this->setConfig('step',5);
				}
				//No modules left to upgrade, move on to the next step
				$modules = $this->getConfig('modules');
				if(empty($modules)) {
					$modules = array();
					$this->setConfig('modules',$modules);
					$this->sendEvent("message", array("message" => "No Modules left to upgrade."));
					$this->sendEvent("action", array("action" => "step", "step" => "6"));
				} else {
					//get next module
					$module = array_shift($modules);
					try {
						$this->sendEvent("message", array("message" => "Download and Install $module"));
						$this->runMACommand("download ".$module);
						$this->runMACommand("install ".$module);
					} catch(\Exception $e) {
						//TODO log for a redo at the end
					}
					$this->setConfig('modules',$modules);
					$modulesProcessed = $this->getConfig('modulesProcessed');
					$modulesProcessed++;
					$this->setConfig('modulesProcessed',$modulesProcessed);
					$totalModules = $this->getConfig('totalModules');
					$this->sendEvent("total", array("percent" => floor(($modulesProcessed/$totalModules) * 100)));
					$this->sendEvent("action", array("action" => "step", "step" => "5"));
				}
			break;
			case 6:
				$this->setConfig('step',6);
				foreach($this->disableModules as $mod) {
					$out = $this->freepbx->Modules->getInfo($mod);
					if(!empty($out[$mod]['status'])) {
						if($out[$mod]['status'] == MODULE_STATUS_DISABLED) {
							$this->sendEvent("message", array("message" => "Enabling $mod"));
							$this->runMACommand("enable ".$mod);
						}
					}
				}
				$sc = $this->getConfig('sc');
				if(empty($sc)) {
					$this->freepbx->Config->update('MODULEADMIN_SKIP_CACHE',0,true);
					$this->setConfig('sc',true);
				} else {
					$this->freepbx->Config->update('MODULEADMIN_SKIP_CACHE',1,true);
				}
				//End upgrade process id 
				$this->setUpgradeEnd();
				//force the bar to the end
				$totalModules = $this->getConfig('totalModules');
				$this->sendEvent("total", array("percent" => floor(($totalModules/$totalModules) * 100)));
				$this->setConfig('modules',array());
				$this->setConfig('totalModules',0);
				$this->setConfig('step',1);
				$this->sendEvent("action", array("action" => "finish"));
			break;
		}
		return true;
	}

	/**
	 * Check if a string is actually valid JSON
	 * @param  string  $string String to check
	 * @return boolean         True if is JSON
	 */
	public function isJson($string) {
		json_decode($string);
		return (json_last_error() === JSON_ERROR_NONE);
	}

	/**
	 * Run module admin command using fwconsole
	 * @param  string $command Command to run
	 */
	private function runMACommand($command) {
		$bin = $this->freepbx->Config->get('AMPBIN');
		if(!file_exists($bin."/fwconsole")) {
			throw new \Exception("Cant find fwconsole!");
		}
		$process = new \Symfony\Component\Process\Process($bin."/fwconsole ma ".$command." --format=json");
		//15 minute timeout
		$process->setTimeout(900);
		$process->run(function ($type, $buffer) {
				if (\Symfony\Component\Process\Process::ERR === $type) {
						\FreePBX::Versionupgrade()->sendEvent("action", array("type" => "error", "message" => $buffer));
				} else {
						$buffer = trim($buffer);
						if(\FreePBX::Versionupgrade()->isJson($buffer)) {
							$buffer = json_decode($buffer,true);
							\FreePBX::Versionupgrade()->sendEvent("array", $buffer);
						} else {
							$buffers = explode("\n",$buffer);
							foreach($buffers as $buffer) {
								$buffer = trim($buffer);
								if(\FreePBX::Versionupgrade()->isJson($buffer)) {
									$buffer = json_decode($buffer,true);
									\FreePBX::Versionupgrade()->sendEvent("array", $buffer);
								} else {
									\FreePBX::Versionupgrade()->sendEvent("message", array("message" => $buffer));
								}
							}
						}
				}
		});
	}

	public function log($message) {
		$temp = sys_get_temp_dir();
		$temp = !empty($temp) ? $temp : array();
	}

	/**
	 * Get all upgradable modules
	 * @return array Array of modules using rawname
	 */
	private function getUpgradable() {
		$mf = \module_functions::create();
		set_time_limit(0);
		/* 15 to 16 upgrade time modules will automatically gets disabled due to php / freepbx rpm update
		 * hence fetching disabled module list */
		$modules_local = $mf->getinfo(false, MODULE_STATUS_ENABLED);
		$modules_online = $mf->getonlinexml();
			
		$modules_upgradable = array();
		$this->second = array();
		foreach (array_keys($modules_local) as $name) {
			if (isset($modules_online[$name])) {
				//we don't want to upgrade versionupgrade module from 14 to 15
				if ((version_compare_freepbx($modules_local[$name]['version'], $modules_online[$name]['version']) < 0) && $name != "versionupgrade") {
					$modules_upgradable[] = $name;
				}
			}
		}
		return $modules_upgradable;
	}

	public function checkOfficalDistro() {
		if (file_exists('/etc/schmooze/freepbxdistro-version') ||
				file_exists('/etc/asterisk/freepbxdistro-version') ||
				file_exists('/etc/schmooze/pbx-version') ||
				file_exists('/etc/asterisk/pbx-version')
			) {
			return true;
		}
		return false;
	}

	/**
	 * Run through all of our inital checks
	 * @param boolean $checkPermissions Whether to check if files under ampweb root are owned by root. This is a boolean option because it can take a while to scan a system so it is not run on page load.
	 * @return array Array of status returns
	 */
	public function runChecks($checkPermissions=false, $checkFreePBX=true) {
		$astversion = $this->freepbx->Config->get("ASTVERSION");
		$allowUpgrade = true;
		$checks = array();

		/*
		if($this->checkOfficalDistro()) {

			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => sprintf(_("%s Distro System Detected"),$this->brand),
				"description" => sprintf(_("This system has been detected as the %s distro system. This means you will need to run the upgrade script manually through the CLI to completely upgrade the system %s"),$this->brand,'<a href="https://wiki.freepbx.org/display/PPS/Upgrading+from+Distro+6" target="_blank">https://wiki.freepbx.org/display/PPS/Upgrading+from+Distro+6</a>'),
			);
			$allowUpgrade = false;
		}
		*/

		$awr = $this->freepbx->Config->get("AMPWEBROOT");
		if($checkPermissions) {
			$process = new Process('find '.$awr.' -type d ! -user root -exec find {} -maxdepth 1 ! -type l -user root \;');
			$process->setTimeout(null);
			try {
				$process->mustRun();

				$output = $process->getOutput();
				if(!empty($output)) {
					$checks[] = array(
						"status" => false,
						"color" => "red",
						"title" => _("Files are owned by the root user"),
						"description" => sprintf(_("There are files owned by the root user under %s. %s will not be able to upgrade until this is resolved. Please run: '%s' on the cli to fix this issue. Additionally you can run '%s' on the CLI to verify this is fixed"),$awr,$this->brand,'fwconsole chown','fwconsole versionupgrade --check'),
					);
					$allowUpgrade = false;
				} else {
					$checks[] = array(
						"status" => true,
						"color" => "green",
						"title" => _("Files ownership"),
						"description" => sprintf(_("Files under %s appear to be owned by the correct user"),$awr),
					);
				}
			} catch (ProcessFailedException $exception) {
				$checks[] = array(
					"status" => false,
					"color" => "red",
					"title" => _("Files are owned by the root user"),
					"description" => sprintf(_("There are files owned by the root user under %s. %s will not be able to upgrade until this is resolved. Please run: '%s' on the cli to fix this issue. Additionally you can run '%s' on the CLI to verify this is fixed"),$awr,$this->brand,'fwconsole chown','fwconsole versionupgrade --check'),
				);
				$allowUpgrade = false;
			}
		} else {
			$checks[] = array(
				"status" => true,
				"color" => "orange",
				"title" => _("File ownership"),
				"description" => sprintf(_("File ownership of %s will not be verified until right before the upgrade process starts. If this is an issue the upgrade will not be allowed to proceed. You can run '%s' on the CLI instead to check if this is an issue"),$awr,'fwconsole versionupgrade --check')
			);
		}

		if (function_exists("checkFreeSpace")) {
			$diskFreeSpace = checkFreeSpace(2); //2GB
			if (!empty($diskFreeSpace) && !$diskFreeSpace['status']) {
				$checks[] = array(
						"status" => false,
						"color" => "red",
						"title" => _("Check the Disk Space"),
						"description" => sprintf(_("Your system has insufficient disk space i.e %s GB. Upgrade to PBX 16 requires at least 2GB or more of disk space. Kindly free up the disk space and try again."),$diskFreeSpace['available_space']),
						);
				$allowUpgrade = false;
			}
		}

		try {
			$this->freepbx->Curl->addOption('timeout', 30);
			$requests = $this->freepbx->Curl->requests('https://mirror.freepbx.org');
			$response = $requests->get('/all-16.0.xml');
			if(empty($response->body)) {
				$checks[] = array(
					"status" => false,
					"color" => "red",
					"title" => _("Unable to connect to remote mirror servers"),
					"description" => _("The system is unable to connect to either of the remote mirror servers to upgrade"),
				);
				$allowUpgrade = false;
			}
		} catch(\Exception $e) {
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => _("Unable to connect to remote mirror servers"),
				"description" => sprintf(_("The system is unable to connect to either of the remote mirror servers to upgrade. Reason: %s"),$e->getMessage()),
			);
			$allowUpgrade = false;
		}
	if($this->checkOfficalDistro()){
		$out = $this->freepbx->Modules->getInfo("sysadmin");
		if(!empty($out['sysadmin']['status']) && ($out['sysadmin']['status'] == MODULE_STATUS_ENABLED)) {
				$data = \module_functions::create()->_deploymentid();
				if(empty($data)) {
					$checks[] = array(
						"status" => true,
						"color" => "orange",
						"title" => _("System is not registered"),
						"description" => _("By registering your system, you will be able to keep up with the latest software releases, bug fixes and security notifications. You'll also be able to take advantage of free software offers, have access to add-ons, support and the latest product news from the development team. Additionally the free features of Sysadmin will be disabled until the system is registered.").' <a href="?display=sysadmin&view=activation">'._("Register Here").'</a>',
					);
				} else {
					$checks[] = array(
						"status" => true,
						"color" => "green",
						"title" => _("System is registered"),
						"description" => sprintf(_("Your system has a valid deployement"), $astversion),
					);
				}
		}
		// chck sysadmin has sa deactivate option 
		if(!version_compare_freepbx($out['sysadmin']['version'],$this->sysadminVer,"ge")) {
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => sprintf(_("Sysadmin is less than %s"),$this->sysadminVer),
				"description" => sprintf(_("Your Sysadmin module version is NOT supported for version upgrade. You must update to at least version %s ."), $this->sysadminVer),
			);
			$allowUpgrade = false;
		}
	}
		$out = $this->freepbx->Modules->getInfo("framework");
		if(!version_compare_freepbx($out['framework']['version'],$this->frameworkVer,"ge")) {
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => sprintf(_("Framework is less than %s"),$this->frameworkVer),
				"description" => sprintf(_("Your version of Framework is NOT supported. You must upgrade to at least version %s"), $this->frameworkVer),
			);
			$allowUpgrade = false;
		}
		$mf = \module_functions::create();
		$localmodules = $mf->getinfo();
		$onlinemodules = $mf->getonlinexml();
		$commercialModules = false;
		if(!empty($onlinemodules)) {
			$needupgrades = array();
			$commercialupgrades = array();
			foreach($onlinemodules as $rawname => $data) {
				if(isset($localmodules[$rawname]) && ($localmodules[$rawname]['status'] == MODULE_STATUS_ENABLED || $localmodules[$rawname]['status'] == MODULE_STATUS_NEEDUPGRADE) && version_compare_freepbx($localmodules[$rawname]['version'], $data['version'], "<")) {
					if(strtolower($localmodules[$rawname]['license']) == "commercial" && !in_array($rawname, array("sipstation","ucpnode","sysadmin"))) {
						$commercialupgrades[] = $data['name'];
					} elseif(!in_array($rawname, array("framework"))) {
						$needupgrades[] = $data['name'];
					}
				}
			}
			foreach($localmodules as $rawname => $data) {
				if(strtolower($localmodules[$rawname]['license']) == "commercial" && !in_array($rawname, array("sipstation","ucpnode","sysadmin"))) {
					$commercialModules = true;
					break;
				}
			}
			if(!empty($needupgrades)) {
				$checks[] = array(
					"status" => false,
					"color" => "red",
					"title" => _("Local modules require upgrades"),
					"description" => sprintf(_("These local modules (%s) need to be upgraded or disabled or uninstalled before continuing with the %s upgrader"), "<strong><i>".implode(", ",$needupgrades)."</i></strong>", $this->brand),
				);
				$allowUpgrade = false;
			}
			if(!empty($commercialupgrades)) {
				$checks[] = array(
					"status" => false,
					"color" => "orange",
					"title" => _("Commercial modules require upgrades"),
					"description" => sprintf(_("These local commercial modules (%s) should be upgraded or disabled or uninstalled before continuing with the %s upgrader. Note that if any of these commercial modules are in a renewal state you will not be able to upgrade these modules until you renew them. You can continue to run these modules on the next version however they might break or cease to function"), "<strong><i>".implode(", ",$commercialupgrades)."</i></strong>", $this->brand)."</br></br>"._("If you are currently using these modules, please ensure that they are <strong>eligible for upgrades</strong>. You can do this by looking in System Administration, in the 'Activation' tab. If a module is not eligible for upgrades, it may stop functioning!")."</br></br>"._("If you are not elegible for upgrades on any of these modules, you can continue, and the latest version suitable for the new FreePBX version will attempt to download.  However, it is <strong>not recommended</strong> to upgrade FreePBX versions without all commercial modules being in their subscription period, as it may <strong>totally break</strong> your system.  Please ensure you have a complete backup before proceeding, if this is the case!"),
				);
			}
		} else {
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => _("Unable to connect to the remote mirror servers"),
				"description" => sprintf(_("%s is not able to connect to the remote mirror servers. An upgrade can not happen without being able to talk to these servers"), $this->brand),
			);
			$allowUpgrade = false;
		}
		
		if($this->checkOfficalDistro()){
			require '/usr/lib/sysadmin/includes.php';
			$g = new \Sysadmin\GPG();
			$response = $this->freepbx->Framework->getInstalledModulesList();
			$moduleslist = array();
			if ($response['result'] == 0) {
				if (count($response['output']) > 0) {
				$moduleList = json_decode($response['output'][2], true);
					foreach($moduleList['data'] as $key => $module){
						$modulename = trim($module[0]);
						if(file_exists(\Sysadmin\FreePBX::Config()->get('AMPWEBROOT')."/admin/modules/" . $modulename . "/module.sig")){
							$sigfile = \Sysadmin\FreePBX::Config()->get('AMPWEBROOT')."/admin/modules/" . $modulename . "/module.sig";
							$sig = $g->checkSig($sigfile);
							if(!in_array($sig['config']['signedwith'], array('B53D215A755231A3','86CE877469D2EAD9'))){
								array_push($moduleslist,$modulename);
							}
						}
					}
				}
			}
		}

		if($this->checkOfficalDistro()){
			//if we are not supporting any modules for 16, we should keep add them in notSupportedModules array 
			$notSupportedModules = array(
						'freepbx_ha',
						'endpointman',
						'queuemetrics',
						'dundicheck',
						'restapi',
						'campon',
						'motif',
						'rmsadmin',
						'contactimage',
						'pbdirectory',
						'speeddial',
						'missedcall');
			foreach ($notSupportedModules as $module) {
				if(\FreePBX::Modules()->checkStatus($module)){
					$checks[] = array(
					"status" => false,
					"color" => "red",
					"title" => sprintf(_("Found 16+ deprecated %s module"),$module),
					"description" => sprintf(_("%s is deprecated/not supported in PBX 16+ systems. Please remove %s module before continuing with the PBX upgrade."),$module,$module)
					);
					$allowUpgrade = false;
				}
			}

			if(\FreePBX::Modules()->checkStatus('vega')){
					$checks[] = array(
						"status" => false,
						"color" => "red",
						"title" => sprintf(_("Found 16+ incompatible vega module")),
						"description" => sprintf(_("We have discovered that you have Vega gateway management module(vega) installed in your system. Vega management module is not compatible with PBX 16 as of now, hence blocking the upgrade.
If not using this module then please remove this module and restart the upgrade process."))
						);
					$allowUpgrade = false;
			}
		}

		if(!empty($moduleslist)){
			$str = '<h4>We have detected the following modules which are either unsigned, or not signed by Sangoma Technologies.Please confirm all of them are supported on PBX 16 and PHP 7.4 before proceeding.</h4> </br>';
			foreach($moduleslist as $list){
				$str .= $list . "</br>";
			}
			$checks[] = array(
			"status" => false,
			"color" => "orange",
			"title" => sprintf(_("Detected modules that are not supported by Sangoma")),
			"description" => sprintf(_($str)),
			);
		}
		if(version_compare($this->minAsteriskVer,$astversion,"<=")) {
			$checks[] = array(
				"status" => true,
				"color" => "green",
				"title" => sprintf(_("Asterisk %s or higher"),$this->minAsteriskVer),
				"description" => sprintf(_("Your Asterisk version of %s is supported"), $astversion),
			);
		} else {
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => sprintf(_("Asterisk %s or higher"),$this->minAsteriskVer),
				"description" => sprintf(_("Your Asterisk version of %s is NOT supported. You must have a version higher than or equal to %s"), $astversion, $this->minAsteriskVer),
			);
			$allowUpgrade = false;
		}

		$version = exec(fpbx_which("node")." --version", $out, $ret);
		if($ret == 0) {
			$version = preg_replace("/[^\.\d]/", "", $version);
			if(version_compare($this->minNODEVer,$version,"<=")) {
				$checks[] = array(
					"status" => true,
					"color" => "green",
					"title" => sprintf(_("NodeJS %s or higher"),$this->minNODEVer),
					"description" => sprintf(_("Your NodeJS Version of %s is supported"), $version),
				);
			} else {
				$checks[] = array(
					"status" => false,
					"color" => "red",
					"title" => sprintf(_("NodeJS %s or higher"),$this->minNODEVer),
					"description" => sprintf(_("Your NodeJS version of %s is NOT supported. You must have a version higher than or equal to %s"), $version, $this->minNODEVer),
				);
				$allowUpgrade = false;
			}
		} else {
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => sprintf(_("NodeJS %s or higher"),$this->minNODEVer),
				"description" => _("You do not have NodeJS installed"),
			);
			$allowUpgrade = false;
		}

		if(preg_match('/((?:\d)*\.?)*/', \FreePBX::Database()->getAttribute(\PDO::ATTR_SERVER_VERSION), $fmatches)) {
			$sth = \FreePBX::Database()->query("SHOW VARIABLES WHERE Variable_name = 'version'");
			$data = $sth->fetch(\PDO::FETCH_ASSOC);
			if(preg_match("/\d+(?:\.\d+)+/",$data['Value'],$smatches)) {
				$version = $smatches[0];
			} else {
				$version = $fmatches[0];
			}

			if(version_compare($this->minSQLVer,$version,"<=")) {
				$checks[] = array(
					"status" => true,
					"color" => "green",
					"title" => sprintf(_("SQL %s or higher"),$this->minSQLVer),
					"description" => sprintf(_("Your SQL Version of %s is supported"), $version),
				);
			} else {
				$checks[] = array(
					"status" => false,
					"color" => "red",
					"title" => sprintf(_("SQL %s or higher"),$this->minSQLVer),
					"description" => sprintf(_("Your SQL version of %s is NOT supported. You must have a version higher than or equal to %s"), $version, $this->minSQLVer),
				);
				$allowUpgrade = false;
			}
		} else {
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => _("Unable to determine SQL Version"),
				"description" => _("The upgrader was unable to determine the SQL version. Can't continue"),
			);
			$allowUpgrade = false;
		}

	if($this->checkOfficalDistro()){
		if(version_compare($this->minPHPVer,PHP_VERSION,"<=")) {
			$checks[] = array(
				"status" => true,
				"color" => "green",
				"title" => sprintf(_("PHP %s or higher"),$this->minPHPVer),
				"description" => sprintf(_("Your PHP Version of %s is supported"), PHP_VERSION),
			);
		} else {
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => sprintf(_("PHP %s or higher"),$this->minPHPVer),
				"description" => sprintf(_("Your PHP version of %s is NOT supported. You must have a version higher than or equal to %s"), PHP_VERSION, $this->minPHPVer),
			);
			$allowUpgrade = false;
		}
		//Adding check for digium_phone_module.	
		if(check_digium_phone_module()){
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => _("Found 16+ deprecated 'Digiumaddoninstaller/Digium_phone_module' modules"),
				"description" => ("Digiumaddoninstaller/Digium_phone_module are deprecated / not supported in PBX 16+ systems. Please uninstall these modules before continuing with the PBX upgrader."),
			);
			$allowUpgrade = false;
		}
	}else{
		if(version_compare($this->minPHPVerOtherDistro,PHP_VERSION,"<=")) {
			$checks[] = array(
				"status" => true,
				"color" => "green",
				"title" => sprintf(_("PHP %s or higher"),$this->minPHPVerOtherDistro),
				"description" => sprintf(_("Your PHP Version of %s is supported"), PHP_VERSION),
			);
		} else {
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => sprintf(_("PHP %s or higher"),$this->minPHPVerOtherDistro),
				"description" => sprintf(_("Your PHP version of %s is NOT supported. You must have a version higher than or equal to %s"), PHP_VERSION, $this->minPHPVerOtherDistro),
			);
			$allowUpgrade = false;
		}
	}
		$fpbxv = getVersion();
		if(!$checkFreePBX || (version_compare_freepbx(($this->upgradeVer - 1),$fpbxv,"<=") && 
					version_compare_freepbx($this->upgradeVer,$fpbxv,">"))) {
			$checks[] = array(
				"status" => true,
				"color" => "green",
				"title" => sprintf(_("%s %s"),$this->brand, $this->upgradeVer - 1),
				"description" => sprintf(_("Your %s Version of %s is supported"), $this->brand, $fpbxv),
			);
		} else {
			$checks[] = array(
				"status" => false,
				"color" => "red",
				"title" => sprintf(_("%s %s"),$this->brand, $this->upgradeVer - 1),
				"description" => sprintf(_("Your %s version of %s is NOT supported. You must have version %s"), $this->brand, $fpbxv, $this->upgradeVer - 1),
			);
			$allowUpgrade = false;
		}
		return array(
			"allowUpgrade" => $allowUpgrade,
			"checks" => $checks,
			"commercialModules" => $commercialModules
		);
	}
}

/**
 * External callback for processing of modules
 * @param  string $type The type of response
 * @param  mixed $data information
 */
function vumfcallback($type, $data) {
	$vu = \FreePBX::create()->Versionupgrade;
	switch($type) {
		case "downloading":
			if(empty($data['read'])) {
				$vu->sendEvent("download", array("progress" => "start", "read" => $data['read'], "total" => $data['total']));
			}
			if($data['read'] < $data['total']) {
				$vu->sendEvent("download", array("progress" => "processing", "read" => $data['read'], "total" => $data['total']));
			}
			if($data['read'] == $data['total']) {
				$vu->sendEvent("download", array("progress" => "finished", "read" => $data['read'], "total" => $data['total']));
			}
		break;
	}
}

function check_digium_phone_module(){
	if(\FreePBX::Modules()->checkStatus('digium_phones') || \FreePBX::Modules()->checkStatus('digiumaddoninstaller')) {
		return true;
	}
	return false;
}
