<?php
// Configurações de Banco de Dados (Hostinger)
// Substitua pelos dados reais do seu painel Hostinger

define('SUPERTEF_TOKEN', '2491b4ac5ff2de78029368bda9327049b86bdc07d653874871770266e9b9e977');
define('IBPT_TOKEN', 'SKiPF85FG6K_5OetPRjij4LpjG7K1TLHeuAWSppzWmpzW-lz6ohCSGALOidfdWtFE');
define('IBPT_CNPJ', '00952147000181'); // CNPJ registrado no portal IBPT (diferente do CNPJ da empresa)



define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'dfe_db'); // Substitua pelo nome do banco criado na Hostinger
define('DB_USER', 'dfe_user'); // Substitua pelo usuário do banco
define('DB_PASS', 'NQ45piif213NybUJJ3SsA'); // Substitua pela senha do banco

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    // Força horário oficial do Brasil (UTC-3) em todas as queries da sessão
    $pdo->exec("SET time_zone = '-03:00'");
}
catch (PDOException $e) {
    die("Erro de conexão: " . $e->getMessage());
}
