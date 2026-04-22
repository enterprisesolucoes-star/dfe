<?php
// api/system_admin.php - Controle administrativo do Sistema (Super Admin) - VERSÃO ULTRA SEGURA

// 1. Migração e Verificação de Colunas
try {
    $cols = $pdo->query("DESCRIBE empresas")->fetchAll(PDO::FETCH_COLUMN);
    $required = [
        'status' => "ALTER TABLE empresas ADD COLUMN status VARCHAR(20) DEFAULT 'Ativo'",
        'usuario_dfe' => "ALTER TABLE empresas ADD COLUMN usuario_dfe INT DEFAULT 2",
        'nome_fantasia' => "ALTER TABLE empresas ADD COLUMN nome_fantasia VARCHAR(255)",
        'inscricao_estadual' => "ALTER TABLE empresas ADD COLUMN inscricao_estadual VARCHAR(50)",
        'inscricao_municipal' => "ALTER TABLE empresas ADD COLUMN inscricao_municipal VARCHAR(50)",
        'crt' => "ALTER TABLE empresas ADD COLUMN crt VARCHAR(1) DEFAULT '1'",
        'email' => "ALTER TABLE empresas ADD COLUMN email VARCHAR(100)",
        'telefone' => "ALTER TABLE empresas ADD COLUMN telefone VARCHAR(20)",
        'codigo_municipio' => "ALTER TABLE empresas ADD COLUMN codigo_municipio VARCHAR(10)"
    ];

    foreach ($required as $col => $sql) {
        if (!in_array($col, $cols)) {
            $pdo->exec($sql);
        }
    }
} catch (Exception $e) {}

switch ($action) {
    case 'login_admin':
        $data = json_decode(file_get_contents('php://input'), true);
        $user = trim($data['login'] ?? '');
        $pass = $data['senha'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM dfe_admins WHERE login = ?");
        $stmt->execute([$user]);
        $adm = $stmt->fetch();
        if ($adm && password_verify($pass, $adm['senha_hash'])) {
            $_SESSION['system_admin_id'] = $adm['id'];
            $_SESSION['system_admin_nome'] = $adm['nome'];
            echo json_encode(['success' => true, 'nome' => $adm['nome']]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Login administrativo inválido.']);
        }
        break;

    case 'listar_empresas_admin':
        if (!isset($_SESSION['system_admin_id'])) { exit; }
        try {
            $cols = $pdo->query("DESCRIBE empresas")->fetchAll(PDO::FETCH_COLUMN);
            $select_fields = ["id", "razao_social", "cnpj"];
            
            // Mapeamento de colunas para o frontend
            $map = [
                'nome_fantasia' => 'nome_fantasia',
                'inscricao_estadual' => 'ie',
                'inscricao_municipal' => 'im',
                'crt' => 'crt',
                'email' => 'email',
                'telefone' => 'telefone',
                'cep' => 'cep',
                'logradouro' => 'logradouro',
                'numero' => 'numero',
                'bairro' => 'bairro',
                'municipio' => 'municipio',
                'uf' => 'uf',
                'status' => 'status',
                'usuario_dfe' => 'usuario_dfe',
                'codigo_municipio' => 'codigo_municipio'
            ];

            foreach ($map as $db => $fr) {
                if (in_array($db, $cols)) {
                    $select_fields[] = "$db as $fr";
                }
            }

            $sql = "SELECT " . implode(', ', $select_fields) . " FROM empresas ORDER BY id DESC";
            $stmt = $pdo->query($sql);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Exception $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'salvar_empresa_admin':
        if (!isset($_SESSION['system_admin_id'])) { exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        
        $fields_map = [
            'razao_social', 'nome_fantasia', 'cnpj', 'crt', 'email', 'telefone', 'cep', 
            'logradouro', 'numero', 'bairro', 'municipio', 'uf', 'status', 'usuario_dfe', 'codigo_municipio'
        ];
        // Campos com nomes diferentes entre frontend e banco
        $special = [
            'ie' => 'inscricao_estadual',
            'im' => 'inscricao_municipal'
        ];
        
        $real_cols = $pdo->query("DESCRIBE empresas")->fetchAll(PDO::FETCH_COLUMN);
        $sets = [];
        $values = [];

        foreach ($fields_map as $f) {
            if (in_array($f, $real_cols)) {
                $sets[] = "$f = ?";
                $val = $data[$f] ?? null;
                if ($f === 'usuario_dfe') $val = (int)$val;
                $values[] = $val;
            }
        }
        foreach ($special as $fr => $db) {
            if (in_array($db, $real_cols)) {
                $sets[] = "$db = ?";
                $values[] = $data[$fr] ?? null;
            }
        }

        if (isset($data['id']) && $data['id'] > 0) {
            $sql = "UPDATE empresas SET " . implode(', ', $sets) . " WHERE id = ?";
            $values[] = $data['id'];
            $pdo->prepare($sql)->execute($values);
            echo json_encode(['success' => true]);
        } else {
            // Lógica de Insert simplificada para colunas existentes
            $cols_to_ins = [];
            $placeholders = [];
            $ins_vals = [];
            foreach ($fields_map as $f) {
                if (in_array($f, $real_cols)) {
                    $cols_to_ins[] = $f;
                    $placeholders[] = "?";
                    $ins_vals[] = $data[$f] ?? null;
                }
            }
            foreach ($special as $fr => $db) {
                if (in_array($db, $real_cols)) {
                    $cols_to_ins[] = $db;
                    $placeholders[] = "?";
                    $ins_vals[] = $data[$fr] ?? null;
                }
            }
            $sql = "INSERT INTO empresas (" . implode(',', $cols_to_ins) . ") VALUES (" . implode(',', $placeholders) . ")";
            $pdo->prepare($sql)->execute($ins_vals);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        }
        break;

    case 'excluir_empresa_admin':
        if (!isset($_SESSION['system_admin_id'])) { exit; }
        $id = (int)($_GET['id'] ?? 0);
        if ($id) {
            $pdo->prepare("UPDATE empresas SET status='Inativo' WHERE id=?")->execute([$id]);
            echo json_encode(['success' => true]);
        }
        break;

    case 'salvar_usuario_admin':
        if (!isset($_SESSION['system_admin_id'])) { exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $empresaId = (int)($data['empresa_id'] ?? 0);
        $login = trim($data['login'] ?? '');
        $senha = $data['senha'] ?? '';
        $hash  = password_hash($senha, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO usuarios (empresa_id, nome, login, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, 'admin', 1)");
        $success = $stmt->execute([$empresaId, $data['nome'] ?? 'Administrador', $login, $hash]);
        echo json_encode(['success' => $success]);
        break;
}
