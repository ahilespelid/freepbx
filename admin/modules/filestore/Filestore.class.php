<?php
namespace FreePBX\modules;

/*
 * Class stub for BMO Module class
 * In _Construct you may remove the database line if you don't use it
 * In getActionbar change extdisplay to align with whatever variable you use to decide if the page is in edit mode.
 *
 */
include __DIR__.'/vendor/autoload.php';
class Filestore extends \FreePBX_Helpers implements \BMO {
	public function __construct($freepbx = null) {
		if ($freepbx == null) {
			throw new Exception("Not given a FreePBX Object");
		}
		$this->classlist = [];
		$this->FreePBX = $freepbx;
		$this->db = $freepbx->Database;
		$this->hookdrivers = null;
		$this->drivers = $this->listDrivers();
		$this->driverCache = [];

	}

	public function listDrivers(){
		$drivers = array();
		foreach (new \DirectoryIterator(__DIR__.'/drivers/') as $dir) {
			if($dir->isDot() || !$dir->isDir()){
				continue;
			}
			$driver = $dir->getFilename();
			$drivers[] = $driver;
		}
		return $drivers;
	}

	public function install() {
		$keys = ['ftpservers' => 'FTP', 'sshservers' => 'SSH', 's3servers' => 'S3', 'localservers' => 'Local', 'emailservers' => 'Email', 'dropboxservers' => 'Dropbox'];
		$servers = $this->getConfig('servers');
		if(!empty($servers)){
			$servers = is_array($servers) ? $servers : [];
			foreach($keys as $oldkey => $newkey) {
				foreach($this->getAll($oldkey) as $id => $data) {
					$data['driver'] = $newkey;
					$this->setConfig('driver', $data['driver'], $id);
					$servers[$id] = $data;
				}
				$this->delById($oldkey);
			}
			$this->setConfig('servers',$servers);			
		}
		else{
			$data= [
				"id" 		=> Null,
				"driver" 	=> "Local",
				"name" 		=> "Local backup storage",
				"desc" 		=> "Default local directory for backup storage",
				"path" 		=> "__ASTSPOOLDIR__/backup/",
			];
			$this->addItem("Local",$data);
		}

		foreach ($this->drivers as $key) {
			$class = "\FreePBX\\modules\\Filestore\\drivers\\".$key.'\\'.$key;
			$class::install($this->FreePBX);
		}
	}
	public function uninstall() {
		foreach ($this->drivers as $key) {
			$class = "\FreePBX\\modules\\Filestore\\drivers\\".$key.'\\'.$key;
			$class::uninstall($this->FreePBX);
		}
	}
	public function getDisplay($driver){
		$class = "\FreePBX\\modules\\Filestore\\drivers\\".$driver.'\\'.$driver;
		$config = isset($_GET['id']) ? $this->getItemById($_GET['id']) : [];
		return $class::getDisplay($this->FreePBX, $config);
	}

	public function doConfigPageInit($page){
		$req = freepbxGetSanitizedRequest();
		$driver = $req['driver'];
		$action = isset($req['action'])?$req['action']:'';
		$id = isset($req['id'])?$req['id']:false;
		switch ($action) {
			case 'add':
				if(empty($req['name'])){
					return array('status' => false, 'message' => _("Invalid name"));
				}
				return $this->addItem($driver, $req);
			break;
			case 'edit':
				if($id){
					return $this->editItem($id, $req);
				}
				return array('status' => false, 'message' => _("No id supplied"));
			break;
			case 'delete':
				if($id){
					return $this->deleteItem($id);
				}
				return array('status' => false, 'message' => _("No id supplied"));
			break;
			default:
				return array('status' => false, 'message' => _("Unknown action provided"));
			break;
		}
	}

	public function getActionBar($request) {
		if(!isset($_REQUEST['driver'])){
			return array();
		}else{
			$driver = $_REQUEST['driver'];
			$class = "\FreePBX\\modules\\Filestore\\drivers\\".$driver.'\\'.$driver;
			return $class::getActionBar();
		}
	}
	public function showPage(){
		if(!isset($_GET['driver'])|| empty($_GET['driver'])){
			$vars['drivers'] = $this->validateDrivers($this->drivers);
			$vars['fs'] = $this;
			return load_view(__DIR__.'/views/main.php',$vars);
		}
		return $this->getDisplay($_GET['driver']);
	}
	public function ajaxRequest($req, &$setting) {
		switch($req) {
			case 'grid':
				return true;
			break;
		}
		return false;
	}
	public function ajaxHandler(){
		switch($_REQUEST['command']) {
			case 'grid':
				return $this->listItems($_GET['driver']);
			break;
		}
	}
	public function getRightNav($request) {
		if(!isset($_GET['driver']) || empty($_GET['driver'])){
			return '';
		}
		$ret = '<h2>'._("Filestore").'</h2>';
		$ret .= '<div class="list-group">';
		$drivers = $this->validateDrivers($this->drivers);

		foreach ($drivers as $driver) {
			$class = $driver == $_GET['driver'] ? "active" : "";
			$ret .= '<a href="?display=filestore&driver=' . $driver . '" class="'.$class.' list-group-item list-group-item-action">' . $driver . '</a>';
		}
		$ret .= '</div>';
		return $ret;
	}
	public function listLocations($permissions = 'all'){
		$locations = array(
			'filestoreTypes' => array(),
			'locations'	=> array(),
		);
		foreach ($this->drivers as $driver) {
			$class = "\FreePBX\\modules\\Filestore\\drivers\\".$driver.'\\'.$driver;
			$class = new $class($this->FreePBX);
			$locations['filestoreTypes'][] = $driver;
			$location['locations'][$driver] = isset($location['locations'][$driver])?$location['locations'][$driver]:array();
			foreach($this->listItems($driver) as $item){
				$name = isset($item['name'])?$item['name']:$driver.'-'.substr($item['id'], -5);
				$description = isset($item['description'])?$item['description']:'';
				$locations['locations'][$driver][] = array('id' => $item['id'], 'name' => $name, 'description' => $description);
			}
		}
		return $locations;
	}

	/**
	 * Git list of items for driver
	 * @return array Array of items.
	 */
	public function listItems($driver) {
		$items = $this->FreePBX->Filestore->getConfig('servers');
		if(empty($items)) {
			return [];
		}
		return array_values(array_filter($items, function($item) use($driver){
			return ($item['driver'] === $driver);
		}));
	}

	/**
	 * Validates driver list
	 *
	 * @param array $drivers
	 * @return array validated drivers.
	 */
	public function validateDrivers($drivers = []){
		$final = [];
		foreach($drivers as $k => $v){
			if(!$this->getConfig('d'.$v)){
				$final[$k] = $v;
			}
		}
		return $final;
	}

	//CRUD actions
	/**
	 * Add a item for driver
	 * @param $data array of data for required
	 */
	public function addItem($driver,$data){
		$id = \Ramsey\Uuid\Uuid::uuid4()->toString();
		$data['driver'] = $driver;
		$fsdata = array_map(function($val){
			if(!is_array($val)) {
				return trim($val);
			}
			return $val;
		},$data);
		return $this->saveConfig($id,$fsdata);
	}

	/**
	 * Edit Item
	 * @param  string  $id   Id of item
	 * @param  array $data array of data required
	 * @return bool       success, failure
	 */
	public function editItem($id,$data){
		$fsdata = array_map(function($val){
			if(!is_array($val)) {
				return trim($val);
			}
			return $val;
		},$data);
		return $this->saveConfig($id,$fsdata);
	}

	/**
	 * Save the configuration for the server into the database
	 *
	 * @param string $id
	 * @param array $data
	 * @return void
	 */
	private function saveConfig($id,$data) {
		$driver = $data['driver'];
		$data['path'] = rtrim($data['path'], '/') . '/';
		$class = "\FreePBX\\modules\\Filestore\\drivers\\".$driver.'\\'.$driver;
		$data = $class::filterConfig($this->FreePBX, $data);
		$data['driver'] = $driver;
		$servers = $this->getConfig('servers');
		if(!is_array($servers)) {
			$servers = [];
		}
		$servers[$id] = [
			'id' => $id,
			'name' => $data['name'],
			'desc' => $data['desc'],
			'driver' => $data['driver']
		];
		$this->setConfig('servers', $servers);
		$this->delById($id);
		$this->setMultiConfig($data, $id);
		return $id;
	}

	/**
	 * Delete Item by id
	 * @param  string $id Id of item
	 * @return bool   success, failure
	 */
	public function deleteItem($id){
		$servers = $this->getConfig('servers');
		if(!is_array($servers) || !isset($servers[$id])) {
			return;
		}
		unset($servers[$id]);
		$this->setConfig('servers', $servers);
		$this->delById($id);
	}

	public function getItemById($id) {
		$config =  $this->FreePBX->Filestore->getAll($id);
		$config['id'] = $id;
		return $config;
	}

	public function getDriverObjectById($id) {
		if(isset($this->driverCache[$id])) {
			return $this->driverCache[$id];
		}
		$config = $this->getItemById($id);
		if(empty($config['driver'])) {
			throw new \Exception(_("The requested driver seems invalid"));
		}
		$class = "FreePBX\modules\Filestore\drivers\\".$config['driver'].'\\'.$config['driver'];
		if(!class_exists($class)){
			throw new \Exception(sprintf(_("The requested driver %s seems invalid"),$config['driver']),404);
		}
		$this->driverCache[$id] = new $class($this->FreePBX, $config);
		return $this->driverCache[$id];
	}

	//Filestore Actions
	/**
	 * Get file
	 * @param  int $id  filestore item id
	 * @param  string $path path of item to get
	 * @return        File object
	 */
	public function download($id,$remote,$local){
		return $this->getDriverObjectById($id)->download($remote, $local);
	}

	/**
	 * Put file
	 * @param  int $id  filestore item id
	 * @param  string $path path of item to put
	 * @param file $file to upload
	 * @return bool  object created
	 */
	public function upload($id,$local,$remote){
		return $this->getDriverObjectById($id)->upload($local, $remote);
	}

	/**
	 * set email options
	 * @param array $mailOptions 
	 */
	public function setEmailOptions($id,$mailOptions=false){
		return $this->getDriverObjectById($id)->setEmailOptions($mailOptions);
	}


	/**
	 * List files/directories in path
	 * @param  int $id  filestore item id
	 * @param  string $path  path to list
	 * @param  type file/dir Default both.
	 * @return        File object
	 */
	public function ls($id,$path='',$recursive=false){
		return $this->getDriverObjectById($id)->listContents($path, $recursive);
	}

	/**
	 * Delete object by path
	 * @param  int  $id        filestore item id
	 * @param  [type]  $path   path to delete
	 * @return boolean            Did it delete?
	 */
	public function delete($id,$path){
		return $this->getDriverObjectById($id)->delete($path);
	}

	/**
	 * Rename file or directory
	 * @param  int $id      filestore item id
	 * @param  string $oldpath file to rename
	 * @param  string $newpath What to rename it to
	 * @return bool  was the operation successful
	 */
	public function move($id,$oldpath,$newpath){
		return $this->getDriverObjectById($id)->rename($oldpath,$newpath);
	}

	/**
	* check if file exists
	* @param  int $id       filestore item $id
	* @param  string $path name of file to find
	* @return mixed $path  path of found item or false
	*/
	public function fileExists($id,$path){
		return $this->getDriverObjectById($id)->fileExists($path);
	}

	/**
	* create directory
	* @param  int $id       filestore item $id
	* @param  string $filename name of file to find
	* @return mixed $path  path of found item or false
	*/
	public function makeDirectory($id,$path){
		return $this->getDriverObjectById($id)->createDir($path);
	}

	public function runHook($hookname,$params = false){
		if (!file_exists("/etc/incron.d/sysadmin")) {
			throw new \Exception("Sysadmin RPM not up to date, or not a known OS.");
		}
		$spooldir = $this->FreePBX->Config->get('ASTSPOOLDIR');
		$basedir = $spooldir."/incron";
		if (!is_dir($basedir)) {
			throw new \Exception("$basedir is not a directory");
		}
		// Does our hook actually exist?
		if (!file_exists(__DIR__."/hooks/$hookname")) {
			throw new \Exception("Hook $hookname doesn't exist");
		}
		$filename = $basedir.'/filestore'.$hookname;

		// Do I have any params?
		if ($params) {
			// Oh. I do. If it's an array, json encode and base64
			if (is_array($params)) {
				$b = base64_encode(gzcompress(json_encode($params)));
				// Note we derp the base64, changing / to _, because filepath.
				$filename .= ".".str_replace('/', '_', $b);
			} elseif (is_object($params)) {
				throw new \Exception("Can't pass objects to hooks");
			} else {
				// Cast it to a string if it's anything else, and then make sure
				// it doesn't have any spaces.
				$filename .= ".".preg_replace("/[[:blank:]]+/", (string) $params);
			}
		}

		$fh = fopen($filename, "w+");
		if ($fh === false) {
			// WTF, unable to create file?
			throw new \Exception("Unable to create hook trigger '$filename'");
		}

		// As soon as we close it, incron does its thing.
		fclose($fh);

		// Wait for up to 5 seconds and make sure it's been deleted.
		$maxloops = 10;
		$deleted = false;
		while ($maxloops--) {
			if (!file_exists($filename)) {
				$deleted = true;
				break;
			}
			usleep(500000);
		}

		if (!$deleted) {
			throw new \Exception("Hook file '$filename' was not picked up by Incron after 5 seconds. Is it not running?");
		}
		return true;
	}

	public function listAllFiles(){
		$final = [];
		$locations = $this->listLocations('all');
		foreach($locations['locations'] as $driver => $instances){
			foreach($instances as $instance){
				$final[$driver][$instance['id']] = $instance;				
				if($driver == 'FTP'){
					$path = "";
					$dir_files = $files = [];

					try{
						$presult = $this->ls($instance['id']);
					}catch(\Exception $e){
						continue;
					}

					foreach($presult as $result){						
						if($result["type"] === "dir"){
							$path = $result["path"];

							try{
								$dir_files_new = $this->ls($instance['id'], $path);
							}catch(\Exception $e){
								continue;
							}
							$dir_files = array_merge($dir_files, $dir_files_new);
						}

						if($result["type"] == "file"){
							try{
								$files_new = $this->ls($instance['id']);
							}catch(\Exception $e){
								continue;
							}
							$files = array_merge($files, $files_new);
						}

						$final[$driver][$instance['id']]['results'] = array_merge($dir_files, $files);
					}
				}
				else{
					try{
						$final[$driver][$instance['id']]['results'] = $this->ls($instance['id']);
					}catch(\Exception $e){
						continue;
					}					
				}
			}
		}
		return $final;
	}
	
	public function checkTableExists($tableName)
	{
		$sql = 'SELECT * from INFORMATION_SCHEMA.tables WHERE TABLE_NAME = :tableName ';
		$stmt = $this->db->prepare($sql);
		$stmt->bindParam(':tableName', $tableName);
		$stmt->execute();
		$res = $stmt->fetch(\PDO::FETCH_ASSOC);
		return $res;
	}
}
