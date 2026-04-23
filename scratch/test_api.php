<?php
require_once __DIR__ . '/../api.php';
$action = 'nfe_listar';
try {
    include __DIR__ . '/../api/nfe.php';
} catch (Throwable $e) {
    echo "ERRO: " . $e->getMessage() . " em " . $e->getFile() . ":" . $e->getLine();
}
