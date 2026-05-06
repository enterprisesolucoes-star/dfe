<?php
// Carregar variáveis de ambiente do arquivo seguro (fora do webroot)
$_envFile = '/etc/dfe/.env';
if (file_exists($_envFile)) {
    $_lines = file($_envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($_lines as $_line) {
        if (strpos(trim($_line), '#') === 0) continue;
        if (strpos($_line, '=') !== false) {
            [$_k, $_v] = explode('=', $_line, 2);
            putenv(trim($_k) . '=' . trim($_v));
        }
    }
    unset($_lines, $_line, $_k, $_v);
}
unset($_envFile);

// Validar variáveis obrigatórias
foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'] as $_var) {
    if (!getenv($_var)) {
        error_log('[DFe CRÍTICO] Variável de ambiente ausente: ' . $_var);
        http_response_code(500);
        exit('Erro de configuração do servidor.');
    }
}
unset($_var);

define('SUPERTEF_TOKEN', getenv('SUPERTEF_TOKEN'));
define('IBPT_TOKEN',     getenv('IBPT_TOKEN'));
define('IBPT_CNPJ',      getenv('IBPT_CNPJ'));

define('DB_HOST', getenv('DB_HOST'));
define('DB_NAME', getenv('DB_NAME'));
define('DB_USER', getenv('DB_USER'));
define('DB_PASS', getenv('DB_PASS'));

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec("SET time_zone = '-03:00'");
} catch (PDOException $e) {
    error_log('[DFe] Erro de conexão: ' . $e->getMessage());
    http_response_code(500);
    exit('Erro de conexão com o banco de dados.');
}
