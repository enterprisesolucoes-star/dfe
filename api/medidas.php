<?php
switch ($action) {

    case 'medidas':
        $pdo->exec("CREATE TABLE IF NOT EXISTS medidas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            empresa_id INT DEFAULT NULL,
            codigo VARCHAR(10) NOT NULL,
            descricao VARCHAR(100) NOT NULL,
            fator DECIMAL(10,3) DEFAULT 1.000,
            pesavel TINYINT DEFAULT 0,
            ativo TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_empresa (empresa_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        try { $pdo->query("SELECT empresa_id FROM medidas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE medidas ADD COLUMN empresa_id INT DEFAULT NULL, ADD INDEX idx_empresa (empresa_id)");
        }
        $empRef = $empresaId ?: (int)($pdo->query("SELECT id FROM empresas ORDER BY id LIMIT 1")->fetchColumn() ?: 0);
        if ($empRef) {
            $pdo->prepare("UPDATE medidas SET empresa_id=? WHERE empresa_id IS NULL")->execute([$empRef]);
        }
        if ($empresaId) {
            $stmt = $pdo->prepare("SELECT * FROM medidas WHERE ativo=1 AND empresa_id=? ORDER BY codigo ASC");
            $stmt->execute([$empresaId]);
        } else {
            $stmt = $pdo->query("SELECT * FROM medidas WHERE ativo=1 ORDER BY codigo ASC");
        }
        echo json_encode($stmt->fetchAll());
        break;

    case 'salvar_medida':
        try { $pdo->query("SELECT empresa_id FROM medidas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE medidas ADD COLUMN empresa_id INT DEFAULT NULL");
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['id']) && $data['id'] > 0) {
            $sql = "UPDATE medidas SET codigo=?, descricao=?, fator=?, pesavel=? WHERE id=?" . ($empresaId ? " AND empresa_id=?" : "");
            $params = [$data['codigo'], $data['descricao'], $data['fator'] ?? 1, $data['pesavel'] ? 1 : 0, $data['id']];
            if ($empresaId) $params[] = $empresaId;
            $pdo->prepare($sql)->execute($params);
        } else {
            $pdo->prepare("INSERT INTO medidas (empresa_id, codigo, descricao, fator, pesavel, ativo) VALUES (?, ?, ?, ?, ?, 1)")
                ->execute([$empresaId ?: null, $data['codigo'], $data['descricao'], $data['fator'] ?? 1, $data['pesavel'] ? 1 : 0]);
        }
        echo json_encode(['success' => true]);
        break;

    case 'excluir_medida':
        $id = (int)($_GET['id'] ?? 0);
        if ($empresaId) {
            $pdo->prepare("UPDATE medidas SET ativo=0 WHERE id=? AND empresa_id=?")->execute([$id, $empresaId]);
        } else {
            $pdo->prepare("UPDATE medidas SET ativo=0 WHERE id=?")->execute([$id]);
        }
        echo json_encode(['success' => true]);
        break;

}
