<?php

namespace FreePBX\modules\Sipstation\Api\Gql;

use GraphQLRelay\Relay;
use GraphQL\Type\Definition\Type;
use FreePBX\modules\Sipstation\sapi\Sipstation as SAPI;
use FreePBX\modules\Api\Gql\Base;

/**
 * Sipstation
 */
class Sipstation extends Base {
	protected $module = 'sipstation';
	
	/**
	 * queryCallback
	 *
	 * @return void
	 */
	public function queryCallback() {
		if($this->checkAllReadScope()) {
		return function(){
			return [
				'fetchSipStationkey' => [
					'type' => $this->typeContainer->get('sipstation')->getObject(),
					'resolve' => function($root, $args) {
					 $key = $this->freepbx->sipstation->ssObj()->getKey();
					 if($key !=""){
						return ['key' => $key, 'status' => true, 'message' => _('Sipstation key found')];
					 }else {
						return ['status' => false, 'message' => _('Sipstation key not found')];
					 }
				}],
				'fetchSipStationStatus' => [
					'type' => $this->typeContainer->get('sipstation')->getObject(),
					'resolve' => function($root, $args) {
						$key = $this->freepbx->sipstation->ssObj()->getKey();
						if($key !=""){
							$data = $this->freepbx->sipstation->getSSConfig(true)->getArray();
						}else {
							return ['status' => false, 'message' => _('Sipstation key not found')];
						}
						if($data !=""){
							return ['key' => $data, 'status' => true, 'message' => _('Sipstation status found')];
						}else {
							return ['status' => false, 'message' => _('Sipstation status not found')];
						}
			}]
		];
		};}
	}
	
	/**
	 * mutationCallback
	 *
	 * @return void
	 */
	public function mutationCallback() {
		if($this->checkAllWriteScope()) {
			return function() {
				return [
					'addSipStationKey' => Relay::mutationWithClientMutationId([
						'name' => 'addkey',
						'description' => _('Add Sipstation Key to sipstation module'),
						'inputFields' => $this->getInputFields(),
						'outputFields' => $this->getOutputFields(),
						'mutateAndGetPayload' => function($input){
							return $this->addSipStationkey($input);
						}
					]),
					'removeSipStationKey' => Relay::mutationWithClientMutationId([
						'name' => 'removekey',
						'description' => _('Remove the Sipstation Key from sipstation module'),
						'inputFields' => [],
						'outputFields' => $this->getOutputFields(),
						'mutateAndGetPayload' => function () {
							return $this->removeSipStationKey();
						}
					]),
					'removeSipStationKeyAndDeleteTrunk' => Relay::mutationWithClientMutationId([
						'name' => 'removeAndDeleteTrunk',
						'description' => _('Remove the Sipstation Key and delete trunk from sipstation module'),
						'inputFields' => [],
						'outputFields' => $this->getOutputFields(),
						'mutateAndGetPayload' => function () {
							return $this->removeSipAndDeleteTrunk();
						}
					]),
				];
			};
		}
	}
		
	/**
	 * initializeTypes
	 *
	 * @return void
	 */
	public function initializeTypes() {
		$key = $this->typeContainer->create('sipstation');
		$key->setDescription(_('Sipstation Key'));

		$key->addInterfaceCallback(function() {
			return [$this->getNodeDefinition()['nodeInterface']];
		});

		$key->setGetNodeCallback(function() {
			$item = $this->getSipstationTrunks();
			return isset($item) ? $item : null;
		});

		$trunk = $this->typeContainer->create('trunk');
		$trunk->setDescription(_('Gets gateways trunk information'));

		$trunk->addInterfaceCallback(function() {
			return [$this->getNodeDefinition()['nodeInterface']];
		});

		$trunk->setGetNodeCallback(function($id) {
			return $this->getSingleData($id);
		});
		
	$trunk->addFieldCallback(function() {
		return [
			'id' => Relay::globalIdField('sipstation', function($row) {
				return isset($row['id']) ? $row['id'] : null;
			}),
			'name' => [
				'type' => Type::string(),
				'description' => _('Name of the trunk')
			],
			'registered' => [
				'type' => Type::string(),
				'description' => _('Check if registered')
			],
			'contactIp' => [
				'type' => Type::string(),
				'description' => _('Return the contact IP'),
				'resolve' => function($row) {
					if(isset($row['contact_ip'])){
						return  $row['contact_ip'];
					}
					return null;
					}
			],
			'networkIp' => [
				'type' => Type::string(),
				'description' => _('Return The network IP'),
				'resolve' => function($row) {
					if(isset($row['network_ip'])){
						return  $row['network_ip'];
					}
					return null;
					}
			],
			'userAgent' => [
				'type' => Type::string(),
				'description' => _('Return user agent'),
				'resolve' => function($row) {
					if(isset($row['user_agent'])){
						return  $row['user_agent'];
					}
					return null;
					}	
			],
			'ipsMatch' => [
				'type' => Type::string(),
				'description' => _('IS the Ips matched'),
				'resolve' => function($row) {
					if(isset($row['ips_match'])){
						return  $row['ips_match'];
					}
					return null;
					}
				]
			];
	});

	$serverinfo = $this->typeContainer->create('serverinfo');
	$serverinfo->setDescription(_('Gets server settings information'));

	$serverinfo->addInterfaceCallback(function() {
		return [$this->getNodeDefinition()['nodeInterface']];
	});

	$serverinfo->setGetNodeCallback(function($id) {
		return $this->getSingleData($id);
	});

	$serverinfo->addFieldCallback(function() {
		return [
			'id' => Relay::globalIdField('sipstation', function($row) {
				return isset($row['id']) ? $row['id'] : null;
			}),
			'sms' => [
				'type' => Type::boolean(),
				'description' => _('check if sms is enabled or not')
			],
			'fax' => [
				'type' => Type::boolean(),
				'description' => _('check if fax is enabled or not'),
			],
			'international' => [
				'type' => Type::boolean(),
				'description' => _('check if international is enabled or not'),
			]
		];
	});
		
	$e911 = $this->typeContainer->create('e911');
	$e911->setDescription(_('Gets E911 information'));

	$e911->addInterfaceCallback(function() {
		return [$this->getNodeDefinition()['nodeInterface']];
	});

	$e911->setGetNodeCallback(function($id) {
		return $this->getSingleData($id);
	});

	$e911->addFieldCallback(function() {
		return [
			'id' => Relay::globalIdField('sipstation', function($row) {
				return isset($row['id']) ? $row['id'] : null;
			}),
			'number' => [
				'type' => Type::string(),
				'description' => _('number of the E911')
			],
			'name' => [
				'type' => Type::string(),
				'description' => _('name of the E911')
			],
			'city' => [
				'type' => Type::string(),
				'description' => _('city of the E911')
			],
			'street1' => [
				'type' => Type::string(),
				'description' => _('street1 of the E911')
			],
			'zip' => [
				'type' => Type::string(),
				'description' => _('zip of the E911')
			],
			'street2' => [
				'type' => Type::string(),
				'description' => _('street2 of the E911')
			],
			'state' => [
				'type' => Type::string(),
				'description' =>  _('state of the E911 caller')
			],
		 ];
	});

	$key->addFieldCallback(function() {
			return [
				'id' => Relay::globalIdField('sipstation', function($row) {
					return isset($row['id']) ? $row['id'] : null;
				}),
				'key' => [
					'type' => Type::string(),
					'description' => _('SipStation Key')
				],	
				'status' => [
					'type' => Type::boolean(),
					'description' => _('API status')
				],	
				'message' => [
					'type' => Type::string(),
					'description' => _('API message')
				],	
				'numberOfTrunks' => [
					'type' => Type::string(),
					'description' => _('Gives the number of trunks'),
					'resolve' => function($row) {
						if(isset($row['key'])){
							return  $row['key']['num_trunks'];
						}
						return null;
					}
				],		
				'serverSettings' => [
					'type' => $this->typeContainer->get('serverinfo')->getObject(),
					'description' => _('gets the server setting information'),
					'resolve' => function($row) {
						if(isset($row['key']['server_settings'])){
							return  $row['key']['server_settings'];
						}
						return null;
					}
				],	
				'e911Info' => [
					'type' => $this->typeContainer->get('e911')->getObject(),
					'description' => _('Gives the E11 Information'),
					'resolve' => function($row) {
						if(isset($row['key']['e911_master'])){
							return  $row['key']['e911_master'];
						}
						return null;
					}
				],
				'primarySipServer' => [
					'type' => $this->typeContainer->get('trunk')->getObject(),
					'description' => _('Primary Server information'),
					'resolve' => function($row) {
						if(isset($row['key']['gateway_info']['trunk1.freepbx.com'])){
							return  $row['key']['gateway_info']['trunk1.freepbx.com'];
						}
						return null;
					}
				],	
				'secondarySipServer' => [
					'type' => $this->typeContainer->get('trunk')->getObject(),
					'description' => _('Secndary server information'),
					'resolve' => function($row) {
						if(isset($row['key']['gateway_info']['trunk2.freepbx.com'])){
							return  $row['key']['gateway_info']['trunk2.freepbx.com'];
						}
						return null;
					}
				],		
			];
		});
	}
	
	/**
	 * getInputFields
	 *
	 * @return void
	 */
	private function getInputFields(){
		return [
			'key' => [
				'type' => Type::nonNull(Type::string()),
				'description' => _('Sipstation key')
			]
		];
	}
		
	/**
	 * getOutputFields
	 *
	 * @return void
	 */
	private function getOutputFields(){
		return [
			'status' => [
				'type' => Type::boolean(),
				'description' => _('API status')
			],	
			'message' => [
				'type' => Type::string(),
				'description' => _('API message')
			]		
		];
	}
	
	/**
	 * addSipStationKey
	 *
	 * @param  mixed $input
	 * @return void
	 */
	private function addSipStationKey($input){
		$res = $this->freepbx->sipstation->ssObj()->setKey($input['key']);
		if($res == "valid"){
			$this->freepbx->sipstation->ssObj()->createTrunks();
			$system_dids = core_did_list();
			$insert = true;
			foreach ($system_dids as $key => $did) {
				// Check if Any/Any route present.
				// If inbound route is ANY/ANY then did['extension'] will be empty.
				if(empty($did['extension']) && empty($did['cidnum'])) {
					$insert = false;
					break;
				}
			}
			if($insert) {
				$this->freepbx->sipstation->createDIDs();
			}
			$this->freepbx->sipstation->createOutboundRoutes();
			return ['status'=> true, 'message'=> _('SipStation key has been added successfully')];
		} elseif($res == "invalid"){
			return ['status'=> false, 'message'=> _('Please provide a valid key')];
		}else{
			return ['status'=> false, 'message'=> _('Failed to configure Key')];
		}
	}
	
	/**
	 * removeSipStationKey
	 *
	 * @return void
	 */
	private function removeSipStationKey(){
		$res = $this->freepbx->sipstation->ssObj()->removeKey();
		if($res){
			return ['status'=> true,'message'=> _('Sipstation key has been removed')];
		} else{
			return ['status'=> false,'message'=> _('Failed!! Key is missing')];
		}
	}
	
	/**
	 * removeSipAndDeleteTrunk
	 *
	 * @return void
	 */
	private function removeSipAndDeleteTrunk(){
	   $this->freepbx->sipstation->ssObj()->deleteTrunks();
		$res = $this->freepbx->sipstation->ssObj()->removeKey();
		if($res){
			return ['status'=> true,'message'=> _('Sipstation key has been removed')];
		} else{
			return ['status'=> false,'message'=> _('Failed!! Key is missing')];
		}
	}
	
	/**
	 * updateConfig
	 *
	 * @return void
	 */
	private function updateConfig(){
		if($this->updateConfiguration()){
			return ['status'=> true, 'message'=> _('SipStation Configuration updated')];
		} else{
			return ['status'=> false, 'message'=>_('Failed!! Key is missing')];
		}
	}	
}
