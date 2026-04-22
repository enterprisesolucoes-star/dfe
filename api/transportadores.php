<?php
switch ($action) {

    case 'transportadores':
        $pdo->exec("CREATE TABLE IF NOT EXISTS transportadores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            empresa_id INT DEFAULT NULL,
            nome VARCHAR(150) NOT NULL,
            documento VARCHAR(20) DEFAULT '',
            ie VARCHAR(30) DEFAULT '',
            email VARCHAR(100) DEFAULT '',
            telefone VARCHAR(20) DEFAULT '',
            logradouro VARCHAR(255) DEFAULT '',
            numero VARCHAR(20) DEFAULT '',
            complemento VARCHAR(100) DEFAULT '',
            bairro VARCHAR(100) DEFAULT '',
            municipio VARCHAR(100) DEFAULT '',
            codigo_municipio VARCHAR(10) DEFAULT '',
            uf CHAR(2) DEFAULT '',
            cep VARCHAR(10) DEFAULT '',
            ativo TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_empresa (empresa_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        try { $pdo->query("SELECT empresa_id FROM transportadores LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE transportadores ADD COLUMN empresa_id INT DEFAULT NULL, ADD INDEX idx_empresa (empresa_id)");
        }
        $empRef = $empresaId ?: (int)($pdo->query("SELECT id FROM empresas ORDER BY id LIMIT 1")->fetchColumn() ?: 0);
        if ($empRef) {
            $pdo->prepare("UPDATE transportadores SET empresa_id=? WHERE empresa_id IS NULL")->execute([$empRef]);
        }
        if ($empresaId) {
            $stmt = $pdo->prepare("SELECT * FROM transportadores WHERE ativo=1 AND empresa_id=? ORDER BY nome ASC");
            $stmt->execute([$empresaId]);
        } else {
            $stmt = $pdo->query("SELECT * FROM transportadores WHERE ativo=1 ORDER BY nome ASC");
        }
        echo json_encode($stmt->fetchAll());
        break;

    case 'salvar_transportador':
        try { $pdo->query("SELECT empresa_id FROM transportadores LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE transportadores ADD COLUMN empresa_id INT DEFAULT NULL");
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $end  = $data['endereco'] ?? [];
        if (isset($data['id']) && $data['id'] > 0) {
            $sql = "UPDATE transportadores SET nome=?, documento=?, ie=?, email=?, telefone=?, logradouro=?, numero=?, complemento=?, bairro=?, municipio=?, codigo_municipio=?, uf=?, cep=? WHERE id=?" . ($empresaId ? " AND empresa_id=?" : "");
            $params = [$data['nome'], $data['documento'] ?? '', $data['ie'] ?? '', $data['email'] ?? '', $data['telefone'] ?? '', $end['logradouro'] ?? '', $end['numero'] ?? '', $end['complemento'] ?? '', $end['bairro'] ?? '', $end['municipio'] ?? '', $end['codigoMunicipio'] ?? '', $end['uf'] ?? '', $end['cep'] ?? '', $data['id']];
            if ($empresaId) $params[] = $empresaId;
            $pdo->prepare($sql)->execute($params);
        } else {
            $pdo->prepare("INSERT INTO transportadores (empresa_id, nome, documento, ie, email, telefone, logradouro, numero, complemento, bairro, municipio, codigo_municipio, uf, cep, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
                ->execute([$empresaId ?: null, $data['nome'], $data['documento'] ?? '', $data['ie'] ?? '', $data['email'] ?? '', $data['telefone'] ?? '', $end['logradouro'] ?? '', $end['numero'] ?? '', $end['complemento'] ?? '', $end['bairro'] ?? '', $end['municipio'] ?? '', $end['codigoMunicipio'] ?? '', $end['uf'] ?? '', $end['cep'] ?? '']);
        }
        echo json_encode(['success' => true]);
        break;

    case 'excluir_transportador':
        $id = (int)($_GET['id'] ?? 0);
        if ($empresaId) {
            $pdo->prepare("UPDATE transportadores SET ativo=0 WHERE id=? AND empresa_id=?")->execute([$id, $empresaId]);
        } else {
            $pdo->prepare("UPDATE transportadores SET ativo=0 WHERE id=?")->execute([$id]);
        }
        echo json_encode(['success' => true]);
        break;

}
