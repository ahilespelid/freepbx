<?php 
namespace FreepPBX\sysadmin\utests;

require_once('../api/utests/ApiBaseTestCase.php');

use FreePBX\modules\versionupgrade;
use Exception;
use FreePBX\modules\Api\utests\ApiBaseTestCase;

class VersionupgradeGqlApiTest extends ApiBaseTestCase {
    protected static $versionupgrade;
        
    /**
     * setUpBeforeClass
     *
     * @return void
     */
    public static function setUpBeforeClass() {
      parent::setUpBeforeClass();
      self::$versionupgrade = self::$freepbx->versionupgrade;
    }
        
    /**
     * tearDownAfterClass
     *
     * @return void
     */
    public static function tearDownAfterClass() {
      parent::tearDownAfterClass();
    }
   
   /**
    * test_installSSLCertificate_all_good_should_return_true
    *
    * @return void
    */
   public function test_upgradepbx15to16_all_good_should_return_true(){

      $mockRunhook = $this->getMockBuilder(\FreePBX\modules\Api::class)
       ->disableOriginalConstructor()
       ->setMethods(array('runModuleSystemHook'))
       ->getMock();

      $mockRunhook->method('runModuleSystemHook')->willReturn(true); 

      self::$freepbx->sysadmin->setRunHook($mockRunhook);  

      $response = $this->request("mutation {
         upgradepbx15to16(input: {}) {
            message
            status
         }
      }");
               
      $json = (string)$response->getBody();
      $this->assertEquals('{"data":{"upgradepbx15to16":{"message":"Pbx 15 to 16 upgrade process is started. Kindly check the fetchApiStatus api with the transaction id.","status":true}}}',$json);
      
      $this->assertEquals(200, $response->getStatusCode());
   }

   public function test_upgradepbx15to16_when_hook_fails_should_return_false(){

      $mockRunhook = $this->getMockBuilder(\FreePBX\modules\Api::class)
       ->disableOriginalConstructor()
       ->setMethods(array('runModuleSystemHook'))
       ->getMock();

      $mockRunhook->method('runModuleSystemHook')->willReturn(false); 

      self::$freepbx->sysadmin->setRunHook($mockRunhook);  


      $response = $this->request("mutation {
         upgradepbx15to16(input: {}) {
            message
            status
            transaction_id
         }
      }");
      
      $json = (string)$response->getBody();
      $this->assertEquals('{"errors":[{"message":"Sorry unable to start 15 - 16 upgrade","status":false}]}',$json);
      
      $this->assertEquals(400, $response->getStatusCode());
   }
   
}