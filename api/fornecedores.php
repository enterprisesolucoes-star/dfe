<?php
switch ($action) {

    case 'fornecedores':
        $pdo->exec("CREATE TABLE IF NOT EXISTS fornecedores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            empresa_id INT DEFAULT NULL,
            nome VARCHAR(150) NOT NULL,
            documento VARCHAR(20) DEFAULT '',
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
        try { $pdo->query("SELECT empresa_id FROM fornecedores LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE fornecedores ADD COLUMN empresa_id INT DEFAULT NULL, ADD INDEX idx_empresa (empresa_id)");
        }
        try { $pdo->query("SELECT ie FROM fornecedores LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE fornecedores ADD COLUMN ie VARCHAR(30) DEFAULT NULL");
        }
        $empRef = $empresaId ?: (int)($pdo->query("SELECT id FROM empresas ORDER BY id LIMIT 1")->fetchColumn() ?: 0);
        if ($empRef) {
            $pdo->prepare("UPDATE fornecedores SET empresa_id=? WHERE empresa_id IS NULL")->execute([$empRef]);
        }
        if ($empresaId) {
            $busca  = trim($_GET['busca'] ?? '');
            $limit  = min(200, max(20, (int)($_GET['limit'] ?? 50)));
            $where  = "ativo=1 AND empresa_id=?";
            $params = [$empresaId];
            if ($busca !== '') {
                $where .= " AND (nome LIKE ? OR documento LIKE ?)";
                $params[] = "%$busca%"; $params[] = "%$busca%";
            }
            $stmt = $pdo->prepare("SELECT * FROM fornecedores WHERE $where ORDER BY nome ASC LIMIT $limit");
            $stmt->execute($params);
            $stmt->execute([$empresaId]);
        } else {
            echo json_encode([]); exit; // empresa_id obrigatório
        }
        echo json_encode($stmt->fetchAll());
        break;

    case 'check_duplicado_fornecedor':
        $doc = preg_replace('/\D/', '', $_GET['documento'] ?? '');
        if (!$doc || !$empresaId) { echo json_encode(['found' => false]); break; }
        $excId = (int)($_GET['excluir_id'] ?? 0);
        $q = 'SELECT * FROM fornecedores WHERE ativo=1 AND empresa_id=? AND REPLACE(REPLACE(REPLACE(REPLACE(documento,".",""),"-",""),"/","")," ","") = ?' . ($excId ? ' AND id != ?' : '');
        $pq = $excId ? [$empresaId, $doc, $excId] : [$empresaId, $doc];
        $rs = $pdo->prepare($q); $rs->execute($pq); $row = $rs->fetch();
        echo json_encode($row ? ['found' => true, 'fornecedor' => $row] : ['found' => false]);
        break;

    case 'salvar_fornecedor':
        try { $pdo->query("SELECT empresa_id FROM fornecedores LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE fornecedores ADD COLUMN empresa_id INT DEFAULT NULL");
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $end  = $data['endereco'] ?? [];
        if (isset($data['id']) && $data['id'] > 0) {
            $docF = preg_replace('/\D/', '', $data['documento'] ?? '');
            $telF = preg_replace('/\D/', '', $data['telefone'] ?? '');
            $cepF = preg_replace('/\D/', '', $end['cep'] ?? '');
            $ieF  = preg_replace('/[.\-\/\s]/', '', $data['ie'] ?? '');
            $sql = "UPDATE fornecedores SET nome=?, documento=?, email=?, telefone=?, logradouro=?, numero=?, complemento=?, bairro=?, municipio=?, codigo_municipio=?, uf=?, cep=?, ie=? WHERE id=?" . ($empresaId ? " AND empresa_id=?" : "");
            $params = [$data['nome'], $docF, $data['email'] ?? '', $telF, $end['logradouro'] ?? '', $end['numero'] ?? '', $end['complemento'] ?? '', $end['bairro'] ?? '', $end['municipio'] ?? '', $end['codigoMunicipio'] ?? '', $end['uf'] ?? '', $cepF, $ieF ?: null, $data['id']];
            if ($empresaId) $params[] = $empresaId;
            $pdo->prepare($sql)->execute($params);
        } else {
            $docF2 = preg_replace('/\D/', '', $data['documento'] ?? '');
            $telF2 = preg_replace('/\D/', '', $data['telefone'] ?? '');
            $cepF2 = preg_replace('/\D/', '', $end['cep'] ?? '');
            $ieF2  = preg_replace('/[.\-\/\s]/', '', $data['ie'] ?? '');
            $pdo->prepare("INSERT INTO fornecedores (empresa_id, nome, documento, email, telefone, logradouro, numero, complemento, bairro, municipio, codigo_municipio, uf, cep, ie, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
                ->execute([$empresaId ?: null, $data['nome'], $docF2, $data['email'] ?? '', $telF2, $end['logradouro'] ?? '', $end['numero'] ?? '', $end['complemento'] ?? '', $end['bairro'] ?? '', $end['municipio'] ?? '', $end['codigoMunicipio'] ?? '', $end['uf'] ?? '', $cepF2, $ieF2 ?: null]);
        }
        echo json_encode(['success' => true]);
        break;

    case 'excluir_fornecedor':
        $id = (int)($_GET['id'] ?? 0);
        if ($empresaId) {
            $pdo->prepare("UPDATE fornecedores SET ativo=0 WHERE id=? AND empresa_id=?")->execute([$id, $empresaId]);
        } else {
            $pdo->prepare("UPDATE fornecedores SET ativo=0 WHERE id=?")->execute([$id]);
        }
        echo json_encode(['success' => true]);
        break;

}
