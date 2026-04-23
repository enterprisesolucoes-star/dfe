<?php
header('Content-Type: application/json');
echo json_encode([
    'php_time' => date('Y-m-d H:i:s'),
    'timezone' => date_default_timezone_get(),
    'server_timestamp' => time()
]);
