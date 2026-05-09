<?php
switch ($action) {

    case 'clientes':
        try { $pdo->query("SELECT ativo FROM clientes LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE clientes ADD COLUMN ativo TINYINT DEFAULT 1");
        }
        try { $pdo->query("SELECT empresa_id FROM clientes LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE clientes ADD COLUMN empresa_id INT DEFAULT NULL, ADD INDEX idx_empresa (empresa_id)");
        }
        try { $pdo->query("SELECT regime_tributario FROM clientes LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE clientes ADD COLUMN regime_tributario CHAR(1) DEFAULT '1'");
        }
        try { $pdo->query("SELECT entidade_governamental FROM clientes LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE clientes ADD COLUMN entidade_governamental CHAR(1) DEFAULT '0'");
        }
        try { $pdo->query("SELECT ie FROM clientes LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE clientes ADD COLUMN ie VARCHAR(20) DEFAULT NULL");
        }
        try { $pdo->query("SELECT indIEDest FROM clientes LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE clientes ADD COLUMN indIEDest CHAR(1) DEFAULT '9'");
        }
        
        $empRef = $empresaId ?: (int)($pdo->query("SELECT id FROM empresas ORDER BY id LIMIT 1")->fetchColumn() ?: 0);
        if ($empRef) {
            $pdo->prepare("UPDATE clientes SET empresa_id=? WHERE empresa_id IS NULL")->execute([$empRef]);
        }
        if ($empresaId) {
            $stmt = $pdo->prepare("SELECT * FROM clientes WHERE ativo=1 AND empresa_id=? ORDER BY nome ASC");
            $stmt->execute([$empresaId]);
        } else {
            echo json_encode([]); exit; // empresa_id obrigatório
        }
        echo json_encode($stmt->fetchAll());
        break;

    case 'check_duplicado_cliente':
        $doc = preg_replace('/\D/', '', $_GET['documento'] ?? '');
        if (!$doc || !$empresaId) { echo json_encode(['found' => false]); break; }
        $excId = (int)($_GET['excluir_id'] ?? 0);
        $q = 'SELECT * FROM clientes WHERE ativo=1 AND empresa_id=? AND REPLACE(REPLACE(REPLACE(REPLACE(documento,".",""),"-",""),"/","")," ","") = ?' . ($excId ? ' AND id != ?' : '');
        $pq = $excId ? [$empresaId, $doc, $excId] : [$empresaId, $doc];
        $rs = $pdo->prepare($q); $rs->execute($pq); $row = $rs->fetch();
        echo json_encode($row ? ['found' => true, 'cliente' => $row] : ['found' => false]);
        break;

    case 'salvar_cliente':
        $data = json_decode(file_get_contents('php://input'), true);
        $end = $data['endereco'] ?? [];
        if (isset($data['id']) && $data['id'] > 0) {
            $stmt = $pdo->prepare("UPDATE clientes SET nome=?, documento=?, email=?, telefone=?, logradouro=?, numero=?, complemento=?, bairro=?, municipio=?, codigo_municipio=?, uf=?, cep=?, regime_tributario=?, entidade_governamental=?, ie=?, indIEDest=? WHERE id=?" . ($empresaId ? " AND empresa_id=?" : ""));
            $docLimpo = preg_replace('/\D/', '', $data['document'] ?? $data['documento'] ?? '');
            $telLimpo = preg_replace('/\D/', '', $data['telefone'] ?? '');
            $cepLimpo = preg_replace('/\D/', '', $end['cep'] ?? '');
            $ieLimpo  = preg_replace('/[.\-\/\s]/', '', $data['ie'] ?? '');
            $params = [$data['nome'], $docLimpo, $data['email'] ?? '', $telLimpo, $end['logradouro'] ?? '', $end['numero'] ?? '', $end['complemento'] ?? '', $end['bairro'] ?? '', $end['municipio'] ?? '', $end['codigoMunicipio'] ?? '', $end['uf'] ?? '', $cepLimpo, $data['regimeTributario'] ?? '1', $data['entidadeGovernamental'] ?? '0', $ieLimpo ?: null, $data['indIEDest'] ?? '9', $data['id']];
            if ($empresaId) $params[] = $empresaId;
            $stmt->execute($params);
        } else {
            $stmt = $pdo->prepare("INSERT INTO clientes (empresa_id, nome, documento, email, telefone, logradouro, numero, complemento, bairro, municipio, codigo_municipio, uf, cep, regime_tributario, entidade_governamental, ie, indIEDest, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
            $docLimpo2 = preg_replace('/\D/', '', $data['documento'] ?? '');
            $telLimpo2 = preg_replace('/\D/', '', $data['telefone'] ?? '');
            $cepLimpo2 = preg_replace('/\D/', '', $end['cep'] ?? '');
            $ieLimpo2  = preg_replace('/[.\-\/\s]/', '', $data['ie'] ?? '');
            $stmt->execute([$empresaId ?: null, $data['nome'], $docLimpo2, $data['email'] ?? '', $telLimpo2, $end['logradouro'] ?? '', $end['numero'] ?? '', $end['complemento'] ?? '', $end['bairro'] ?? '', $end['municipio'] ?? '', $end['codigoMunicipio'] ?? '', $end['uf'] ?? '', $cepLimpo2, $data['regimeTributario'] ?? '1', $data['entidadeGovernamental'] ?? '0', $ieLimpo2 ?: null, $data['indIEDest'] ?? '9']);
        }
        echo json_encode(['success' => true]);
        break;

    case 'excluir_cliente':
        $id = (int)($_GET['id'] ?? 0);
        if ($empresaId) {
            $pdo->prepare("UPDATE clientes SET ativo=0 WHERE id=? AND empresa_id=?")->execute([$id, $empresaId]);
        } else {
            $pdo->prepare("UPDATE clientes SET ativo=0 WHERE id=?")->execute([$id]);
        }
        echo json_encode(['success' => true]);
        break;

}
