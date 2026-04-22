<?php
// api/migrate_v2.php - MIgração para campos de impostos e Reforma Tributária 2026
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

try {
    $sqls = [
        // 1. Campos de Base de Cálculo no Cabeçalho (vendas)
        "ALTER TABLE vendas ADD COLUMN vbc_icms DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas ADD COLUMN vbc_pis DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas ADD COLUMN vbc_cofins DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas ADD COLUMN vbc_ipi DECIMAL(15,2) DEFAULT 0.00",

        // 2. Detalhamento de Impostos nos Itens (vendas_itens)
        "ALTER TABLE vendas_itens ADD COLUMN vbc_icms DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas_itens ADD COLUMN aliq_icms DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas_itens ADD COLUMN valor_icms DECIMAL(15,2) DEFAULT 0.00",
        
        "ALTER TABLE vendas_itens ADD COLUMN vbc_pis DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas_itens ADD COLUMN aliq_pis DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas_itens ADD COLUMN valor_pis DECIMAL(15,2) DEFAULT 0.00",
        
        "ALTER TABLE vendas_itens ADD COLUMN vbc_cofins DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas_itens ADD COLUMN aliq_cofins DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas_itens ADD COLUMN valor_cofins DECIMAL(15,2) DEFAULT 0.00",
        
        "ALTER TABLE vendas_itens ADD COLUMN vbc_ipi DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas_itens ADD COLUMN aliq_ipi DECIMAL(15,2) DEFAULT 0.00",
        "ALTER TABLE vendas_itens ADD COLUMN valor_ipi DECIMAL(15,2) DEFAULT 0.00",

        // 3. Tabelas para Reforma Tributária 2026 (IBS, CBS, IS)
        "CREATE TABLE IF NOT EXISTS vendas_itens_ibs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            venda_item_id INT NOT NULL,
            base_calculo DECIMAL(15,2) DEFAULT 0.00,
            aliquota DECIMAL(15,4) DEFAULT 0.0000,
            valor DECIMAL(15,2) DEFAULT 0.00,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venda_item_id) REFERENCES vendas_itens(id) ON DELETE CASCADE
        ) ENGINE=InnoDB",

        "CREATE TABLE IF NOT EXISTS vendas_itens_cbs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            venda_item_id INT NOT NULL,
            base_calculo DECIMAL(15,2) DEFAULT 0.00,
            aliquota DECIMAL(15,4) DEFAULT 0.0000,
            valor DECIMAL(15,2) DEFAULT 0.00,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venda_item_id) REFERENCES vendas_itens(id) ON DELETE CASCADE
        ) ENGINE=InnoDB",

        "CREATE TABLE IF NOT EXISTS vendas_itens_is (
            id INT AUTO_INCREMENT PRIMARY KEY,
            venda_item_id INT NOT NULL,
            base_calculo DECIMAL(15,2) DEFAULT 0.00,
            aliquota DECIMAL(15,4) DEFAULT 0.0000,
            valor DECIMAL(15,2) DEFAULT 0.00,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venda_item_id) REFERENCES vendas_itens(id) ON DELETE CASCADE
        ) ENGINE=InnoDB"
    ];

    $results = [];
    foreach ($sqls as $sql) {
        try {
            $pdo->exec($sql);
            $results[] = "Sucesso: " . substr($sql, 0, 50) . "...";
        } catch (PDOException $e) {
            // Ignora se a coluna já existir (erro 42S21)
            if ($e->getCode() == '42S21') {
                $results[] = "Aviso: Coluna já existe (" . substr($sql, 0, 30) . ")";
            } else {
                throw $e;
            }
        }
    }

    echo json_encode(['success' => true, 'steps' => $results]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
