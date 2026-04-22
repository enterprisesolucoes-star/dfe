<?php
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain');

try {
    echo "Checking ibpt_ncm table...\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'ibpt_ncm'");
    if ($stmt->rowCount() == 0) {
        echo "Table ibpt_ncm DOES NOT exist.\n";
    } else {
        echo "Table ibpt_ncm exists.\n";
        
        $count = $pdo->query("SELECT COUNT(*) FROM ibpt_ncm")->fetchColumn();
        echo "Total records: $count\n";
        
        if ($count > 0) {
            echo "\nSample records:\n";
            $samples = $pdo->query("SELECT * FROM ibpt_ncm LIMIT 5")->fetchAll();
            print_r($samples);
            
            echo "\nDistinct 'tabela' values:\n";
            $tabelas = $pdo->query("SELECT tabela, COUNT(*) as total FROM ibpt_ncm GROUP BY tabela")->fetchAll();
            print_r($tabelas);
            
            echo "\nDistinct 'uf' values:\n";
            $ufs = $pdo->query("SELECT uf, COUNT(*) as total FROM ibpt_ncm GROUP BY uf")->fetchAll();
            print_r($ufs);
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
