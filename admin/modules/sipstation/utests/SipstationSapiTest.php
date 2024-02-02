<?php
/*
 * Test sipstation 
 */

namespace FreePBX\modules\Sipstation\utests;

use PDO;


class SipstationSapiTest extends \PHPUnit_Framework_TestCase
{
	protected static $freepbx;
	protected static $faker;	
	protected static $app;
	protected static $database;

	public static function setUpBeforeClass()
	{
		self::$freepbx = \FreePBX::create();

		self::$faker = \Faker\Factory::create();
		self::$app = self::$freepbx->Sipstation;
	}

	public function setUP() {
		$this->Database = self::$freepbx->Database;
	}

	public function testSipstationSapi_createOutboundRoutes_whenPJSipIsDisabled_shouldSetupSipEndpointsInCorrectOrder() {
		$routing = new \FreePBX\modules\Core\Components\Outboundrouting();

		$allRoutes = $routing->listAll();

		$this->cleanUpSipsationOutboundRoutes($routing);

		$mockSipDriver = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\drivers\Sip::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->disableArgumentCloning()
			->disallowMockingUnknownTypes()
			->setMethods(array('getTrunks'))
			->getMock();
		$mockSipDriver->method('getTrunks')
			->willReturn(array(
				'gw1' => array('trunkid' => 1101101),
				'gw2' => array('trunkid' => 1101102)
			));

		$mockApiObject = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\config\ConfigBase::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->disableArgumentCloning()
			->disallowMockingUnknownTypes()
			->setMethods(array('getUsername'))
			->getMock();
		$mockApiObject->method('getUsername')
			->willReturn('testssusername');		

		$mockSipstationModule = $this->getMockBuilder(\FreePBX\modules\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->disableArgumentCloning()
			->disallowMockingUnknownTypes()
			->setMethods(array('getConfig'))
			->getMock();
		$mockSipstationModule->method('getConfig')
			->willReturn('testSipstationToken');

		$sipstationSapi = new \FreePBX\modules\Sipstation\sapi\Sipstation(
			$mockSipstationModule, self::$freepbx, $mockSipDriver, $mockApiObject);

		$results = $sipstationSapi->createOutboundRoutes();
		$allRoutes = $routing->listAll();

		$route911Id = array_search('E911-Leave-First', array_column($allRoutes, 'name'));
		$routeOutId = array_search('SIPStation-Out', array_column($allRoutes, 'name'));
		$routeIntId = array_search('SIPStation-INT', array_column($allRoutes, 'name'));

		$this->assertEquals('E911-Leave-First', $allRoutes[$route911Id]['name']);
		$this->assertEquals('YES', $allRoutes[$route911Id]['emergency_route']);
		$this->assertEquals(0, $allRoutes[$route911Id]['seq']);

		$this->assertEquals(0, $allRoutes[$route911Id]['seq']);

		$this->assertEquals('SIPStation-Out', $allRoutes[$routeOutId]['name']);
		$this->assertEquals('', $allRoutes[$routeOutId]['emergency_route']);
		$this->assertEquals(1, $allRoutes[$routeOutId]['seq']);

		$this->assertEquals('SIPStation-INT', $allRoutes[$routeIntId]['name']);
		$this->assertEquals('', $allRoutes[$routeIntId]['emergency_route']);
		$this->assertGreaterThan($allRoutes[$route911Id]['seq'], $allRoutes[$routeIntId]['seq']);
		$this->assertGreaterThan($allRoutes[$routeOutId]['seq'], $allRoutes[$routeIntId]['seq']);

		$this->assertEquals(3, count($allRoutes));
	}

	public function testSipstationSapi_createOutboundRoutes_whenPJSipIsEnabled_shouldSetupPJSipEndpointsInCorrectOrder() {
		$routing = new \FreePBX\modules\Core\Components\Outboundrouting();

		$allRoutes = $routing->listAll();

		$this->cleanUpSipsationOutboundRoutes($routing);

		$mockSipDriver = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\drivers\Pjsip::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->disableArgumentCloning()
			->disallowMockingUnknownTypes()
			->setMethods(array('getTrunks'))
			->getMock();
		$mockSipDriver->method('getTrunks')
			->willReturn(array(
				'gw1' => array('trunkid' => 1101101),
				'gw2' => array('trunkid' => 1101102)
			));

		$mockApiObject = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\config\ConfigBase::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->disableArgumentCloning()
			->disallowMockingUnknownTypes()
			->setMethods(array('getUsername'))
			->getMock();
		$mockApiObject->method('getUsername')
			->willReturn('testssusername');		

		$mockSipstationModule = $this->getMockBuilder(\FreePBX\modules\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->disableArgumentCloning()
			->disallowMockingUnknownTypes()
			->setMethods(array('getConfig'))
			->getMock();
		$mockSipstationModule->method('getConfig')
			->willReturn('testSipstationToken');

		$sipstationSapi = new \FreePBX\modules\Sipstation\sapi\Sipstation(
			$mockSipstationModule, self::$freepbx, $mockSipDriver, $mockApiObject);

		$results = $sipstationSapi->createOutboundRoutes();
		$allRoutes = $routing->listAll();

		$route911Id = array_search('E911-Leave-First', array_column($allRoutes, 'name'));
		$routeOutId = array_search('SIPStation-Out', array_column($allRoutes, 'name'));
		$routeIntId = array_search('SIPStation-INT', array_column($allRoutes, 'name'));

		$this->assertEquals('E911-Leave-First', $allRoutes[$route911Id]['name']);
		$this->assertEquals('YES', $allRoutes[$route911Id]['emergency_route']);
		$this->assertEquals(0, $allRoutes[$route911Id]['seq']);

		$this->assertEquals(0, $allRoutes[$route911Id]['seq']);

		$this->assertEquals('SIPStation-Out', $allRoutes[$routeOutId]['name']);
		$this->assertEquals('', $allRoutes[$routeOutId]['emergency_route']);
		$this->assertEquals(1, $allRoutes[$routeOutId]['seq']);

		$this->assertEquals('SIPStation-INT', $allRoutes[$routeIntId]['name']);
		$this->assertEquals('', $allRoutes[$routeIntId]['emergency_route']);
		$this->assertGreaterThan($allRoutes[$route911Id]['seq'], $allRoutes[$routeIntId]['seq']);
		$this->assertGreaterThan($allRoutes[$routeOutId]['seq'], $allRoutes[$routeIntId]['seq']);

		$this->assertEquals(3, count($allRoutes));
	}

	function cleanUpSipsationOutboundRoutes($outboundRouting) {
		$sql = "SELECT * FROM outbound_routes WHERE NAME in
			('E911-Leave-First', 'SIPStation-INT', 'SIPStation-Out')";
		$sth = $this->Database->prepare($sql);
		$sth->execute();

		$routes = $sth->fetchAll(PDO::FETCH_ASSOC);

		foreach($routes as $route) {
			$outboundRouting->deleteById($route['route_id']);
		}
	}
}