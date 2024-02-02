<?php 

namespace FreepPBX\sipstation\utests;

require_once('../api/utests/ApiBaseTestCase.php');

use FreePBX\modules\sipstation;
use Exception;
use FreePBX\modules\Api\utests\ApiBaseTestCase;

/**
 * SipstationGqlApiTest
 */
class SipstationGqlApiTest extends ApiBaseTestCase {
    protected static $sipstation;
        
    /**
     * setUpBeforeClass
     *
     * @return void
     */
    public static function setUpBeforeClass() {
      parent::setUpBeforeClass();
      self::$sipstation = self::$freepbx->sipstation;
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
     * testaddSipstationKeyWhenKeyValidShouldReturnTrue
     *
     * @return void
     */
    public function testaddSipstationKeyWhenKeyValidShouldReturnTrue(){

      $key = "1111111";

      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('setkey','createTrunks'))
      ->getMock();
      
	  	$mockSapi->method('setkey')
			->willReturn('valid');
      
      $mockSapi->method('createTrunks')
			->willReturn(true);
      
      self::$freepbx->sipstation->setSSObj($mockSapi);  

       //add new group using gql
       $response = $this->request("mutation {
        addSipStationKey(input: { 
          key:  \"$key\" 
        }) {
          status message 
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"data":{"addSipStationKey":{"status":true,"message":"SipStation key has been added successfully"}}}',$json);

      //status 200 success check
      $this->assertEquals(200, $response->getStatusCode());
   }
   
    
   /**
    * testaddSipstationKeyWhenKeyInValidShouldReturnFalse
    *
    * @return void
    */
   public function testaddSipstationKeyWhenKeyInValidShouldReturnFalse(){

      $key = "1111111";

      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('setkey'))
      ->getMock();
      
	  	$mockSapi->method('setkey')
			->willReturn('invalid');
      
      self::$freepbx->sipstation->setSSObj($mockSapi);  

       //add new group using gql
       $response = $this->request("mutation {
        addSipStationKey(input: { 
          key:  \"$key\" 
        }) {
          message status
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"errors":[{"message":"Please provide a valid key","status":false}]}',$json);

      //status 400 failure check
      $this->assertEquals(400, $response->getStatusCode());
   }
   
   /**
    * testaddSipstationKeyWhenFailureShouldReturnFalse
    *
    * @return void
    */
   public function testaddSipstationKeyWhenFailureShouldReturnFalse(){

      $key = "1111111";

      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('setkey'))
      ->getMock();
      
	  	$mockSapi->method('setkey')
			->willReturn('');
      
      self::$freepbx->sipstation->setSSObj($mockSapi);  

       //add new group using gql
       $response = $this->request("mutation {
        addSipStationKey(input: { 
          key:  \"$key\" 
        }) {
          message status
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"errors":[{"message":"Failed to configure Key","status":false}]}',$json);

      //status 400 failure check
      $this->assertEquals(400, $response->getStatusCode());
   }

   public function testremoveSipstationKeyWhenReturnTrueShouldReturnTrue(){
      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('removeKey'))
      ->getMock();
      
	  	$mockSapi->method('removeKey')
			->willReturn(true);
      
      self::$freepbx->sipstation->setSSObj($mockSapi);  

       //remove key using gql when mocked
       $response = $this->request("mutation {
        removeSipStationKey(input:{ }) {
          message status
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"data":{"removeSipStationKey":{"message":"Sipstation key has been removed","status":true}}}',$json);

      //status 200 check
      $this->assertEquals(200, $response->getStatusCode());
   }

   public function testremoveSipstationKeyWhenReturnFalseShouldReturnFalse(){
      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('removeKey'))
      ->getMock();
      
	  	$mockSapi->method('removeKey')
			->willReturn(false);
      
      self::$freepbx->sipstation->setSSObj($mockSapi);  

       //remove key using gql when mocked
       $response = $this->request("mutation {
        removeSipStationKey(input:{ }) {
          message status
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"errors":[{"message":"Failed!! Key is missing","status":false}]}',$json);

      //status 400 check
      $this->assertEquals(400, $response->getStatusCode());
   }

   public function testremoveSipstationKeyAndDeleteTrunkWhenReturnTrueShouldReturnTrue(){
      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('removeKey','deleteTrunks'))
      ->getMock();
      
      $mockSapi->method('removeKey','deleteTrunks')
			->willReturn(true);
      

      self::$freepbx->sipstation->setSSObj($mockSapi);  

       //remove key using gql when mocked
       $response = $this->request("mutation {
        removeSipStationKeyAndDeleteTrunk(input:{ }) {
          message status
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"data":{"removeSipStationKeyAndDeleteTrunk":{"message":"Sipstation key has been removed","status":true}}}',$json);

      //status 200 check
      $this->assertEquals(200, $response->getStatusCode());
   }

   public function testremoveSipstationKeyAndDeleteTrunkWhenReturnFalseShouldReturnFalse(){
      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('removeKey','deleteTrunks'))
      ->getMock();
      
      $mockSapi->method('removeKey','deleteTrunks')
			->willReturn(false);
      
      self::$freepbx->sipstation->setSSObj($mockSapi);  

       //remove key using gql when mocked
       $response = $this->request("mutation {
        removeSipStationKeyAndDeleteTrunk(input:{ }) {
          message status
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"errors":[{"message":"Failed!! Key is missing","status":false}]}',$json);

      //status 400 check
      $this->assertEquals(400, $response->getStatusCode());
   }

   public function testgetSipstationKeyWhenReturnTrueShouldReturnTrue(){
      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('getKey'))
      ->getMock();
      
      $mockSapi->method('getKey')
			->willReturn("123456789");
      
      self::$freepbx->sipstation->setSSObj($mockSapi);  

       $response = $this->request("query {
        fetchSipStationkey {
          key status message
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"data":{"fetchSipStationkey":{"key":"123456789","status":true,"message":"Sipstation key found"}}}',$json);

      //status 200 check
      $this->assertEquals(200, $response->getStatusCode());
   }

    public function testgetSipstationKeyWhenReturnEmptyShouldReturnFalse(){
      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('getKey'))
      ->getMock();
      
      $mockSapi->method('getKey')
			->willReturn("");
      
      self::$freepbx->sipstation->setSSObj($mockSapi);  

       $response = $this->request("query {
        fetchSipStationkey {
          key status message
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"errors":[{"message":"Sipstation key not found","status":false}]}',$json);

      //status 400 check
      $this->assertEquals(400, $response->getStatusCode());
   }

   public function testgetSipstationStatusWhenReturnTrueShouldReturnTrue(){
      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('getKey'))
      ->getMock();
      
      $mockSapi->method('getKey')
			->willReturn("123456789");
      
      self::$freepbx->sipstation->setSSObj($mockSapi);  

       $response = $this->request("query {
        fetchSipStationStatus {
           status message
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"data":{"fetchSipStationStatus":{"status":true,"message":"Sipstation status found"}}}',$json);

      //status 200 check
      $this->assertEquals(200, $response->getStatusCode());
   }

    public function testgetSipstationStatusWhenReturnEmptyShouldReturnFalse(){
      $mockSapi = $this->getMockBuilder(\FreePBX\modules\Sipstation\sapi\Sipstation::class)
			->disableOriginalConstructor()
			->disableOriginalClone()
			->setMethods(array('getKey'))
      ->getMock();
      
      $mockSapi->method('getKey')
			->willReturn("");
      
      self::$freepbx->sipstation->setSSObj($mockSapi);  

       $response = $this->request("query {
        fetchSipStationStatus {
          key status message
        }
      }");
      
      $json = (string)$response->getBody();

      $this->assertEquals('{"errors":[{"message":"Sipstation key not found","status":false}]}',$json);

      //status 400 check
      $this->assertEquals(400, $response->getStatusCode());
   }
}
?>