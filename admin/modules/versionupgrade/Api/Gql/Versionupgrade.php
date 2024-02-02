<?php

namespace FreePBX\modules\Versionupgrade\Api\Gql;

use GraphQLRelay\Relay;
use GraphQL\Type\Definition\Type;
use FreePBX\modules\Api\Gql\Base;
use GraphQL\Type\Definition\ObjectType;
use GraphQL\Type\Definition\EnumType;

class Versionupgrade extends Base {
	protected $module = 'versionupgrade';

	public function mutationCallback() {
		if($this->checkAllWriteScope()) {
			return function() {
				return [
					'upgradepbx15to16' => Relay::mutationWithClientMutationId([
						'name' => _('upgradepbx15to16'),
						'description' => _('Upgrade PBX 15 to 16'),
						'inputFields' =>  [],
						'outputFields' => $this->getOutputFields(),
						'mutateAndGetPayload' => function () {
	
							if (!$this->freepbx->Modules->checkStatus('sysadmin')) {
								return ['message' => _('Sorry unable to start 15 - 16 upgrade. Sysadmin module is required.'),'status' => false];
							}

							$txnId = $this->freepbx->api->addTransaction("Processing","Versionupgrade","15to16upgrade");
							$response = $this->freepbx->Sysadmin->ApiHooks()->runModuleSystemHook('versionupgrade','upgrade-php',$txnId);
							if($response !== false){
								return ['message' => _('Pbx 15 to 16 upgrade process is started. Kindly check the fetchApiStatus api with the transaction id.'),'transaction_id' => $txnId,'status' => true];
							}else{
								return ['message' => _('Sorry unable to start 15 - 16 upgrade'),'status' => false];
							}
						}
					]),
				];
			};
		}
	}
	
	/**
	 * getOutputFields
	 *
	 * @return void
	 */
	private function getOutputFields(){
	   return[
		'status' => [
			'type' => Type::boolean(),
			'description' => _('Status of the request')
		],
		'message' => [
			'type' => Type::string(),
			'description' => _('Message for the request')
		],
		'transaction_id' => [
			'type' => Type::string(),
			'description' => _('Transaction ID')
		]];
	}

}
