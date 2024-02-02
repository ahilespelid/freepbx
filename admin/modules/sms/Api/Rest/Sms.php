<?php

namespace FreePBX\modules\Sms\Api\Rest;

use FreePBX\modules\Api\Rest\Base;

class Sms extends Base
{
    protected $module = 'sms';
    
    public function setupRoutes($app)
    {
        /**
         * @verb GET
         * @returns - a sms media resource
         * @uri /sms/media/:id
         */
        $app->get('/media/{id}', function ($request, $response, $args) {
            $data = $this->freepbx->Sms->getMediaByMediaID($args['id']);
            if (!empty($data)) {
                $finfo = new \finfo(FILEINFO_MIME);
                $newResponse =  $response->withHeader('Content-Type', $finfo->buffer($data['raw']));
                echo $data['raw'];
                return $newResponse;
            } else {
                return $response->withStatus(404)->withJson(array('message' => "File not found"));
            }
        })->add($this->checkAllReadScopeMiddleware());
    }
}
