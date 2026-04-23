<?php
require_once __DIR__ . '/config.php';

try {
    echo "Iniciando migracao forcada da tabela bandeiras...\n";
    
    $pdo->exec("DROP TABLE IF EXISTS bandeiras");
    $pdo->exec("CREATE TABLE IF NOT EXISTS bandeiras (
      id INT PRIMARY KEY AUTO_INCREMENT,
      tpag VARCHAR(2),
      tband_opc VARCHAR(50),
      cnpj_opc VARCHAR(20)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    
    $sqlBands = "INSERT INTO bandeiras (id, tpag, tband_opc, cnpj_opc) VALUES
        (1, '02', 'Mastercard', '05577343000137'),
        (2, '03', 'American Express', '60419645000195'),
        (3, '01', 'Visa', '31551765000143'),
        (4, '99', 'Policard', '00904951000195'),
        (5, '99', 'Sodexo', '69034668000156'),
        (6, '99', 'PagSeguro UOL', '08561701000101'),
        (7, '04', 'Sorocred', '04814563000174'),
        (8, '05', 'Diners Club', '33479023000180'),
        (9, '06', 'Elo', '09227084000175'),
        (10, '07', 'Hipercard', '03012230000169'),
        (11, '08', 'Aura', '22026991000114'),
        (12, '09', 'Cabal', '03766873000106'),
        (13, '99', 'Stone', '16501555000157'),
        (14, '99', 'Cielo', '01027058000191'),
        (15, '99', 'Rede', '01425787000104')
    ON DUPLICATE KEY UPDATE id=id";
    
    $pdo->exec($sqlBands);
    
    echo "Tabela bandeiras criada e populada com sucesso!\n";
    
    // Verifica se a tabela existe
    $res = $pdo->query("SHOW TABLES LIKE 'bandeiras'")->fetch();
    if ($res) {
        echo "Confirmado: A tabela 'bandeiras' existe no banco de dados.\n";
    } else {
        echo "ERRO: A tabela ainda nao foi encontrada.\n";
    }

} catch (Exception $e) {
    echo "ERRO DURANTE MIGRACAO: " . $e->getMessage() . "\n";
}
