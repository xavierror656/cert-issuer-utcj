<?php
require_once(__DIR__ . '/../../config.php');
require_login();

$id = required_param('id', PARAM_ALPHANUMEXT);
$type = optional_param('type', 'render', PARAM_ALPHA);

$apiurl = get_config('local_certsigner', 'api_base_url');
if (empty($apiurl)) {
    $apiurl = 'https://utcjmicro.javierflores.software';
}
$apiurl = rtrim($apiurl, '/');

if ($type === 'pdf') {
    redirect($apiurl . '/certificate/' . $id . '/pdf');
} else {
    redirect($apiurl . '/render/' . $id);
}
