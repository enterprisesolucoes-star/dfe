<?php
switch ($action) {

    // ── Usuários ──────────────────────────────────────────────────────────────
    case 'login':
        // Migrações de colunas
        $pdo->exec("CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            empresa_id INT DEFAULT NULL,
            nome VARCHAR(100) NOT NULL,
            login VARCHAR(50) NOT NULL UNIQUE,
            senha_hash VARCHAR(255) NOT NULL,
            perfil ENUM('admin','operador') DEFAULT 'operador',
            ativo TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        try { $pdo->query("SELECT empresa_id FROM usuarios LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE usuarios ADD COLUMN empresa_id INT DEFAULT NULL AFTER id");
        }
        // Admin padrão de emergência (sem empresa_id — só para setup inicial)
        $cnt = (int)$pdo->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
        if ($cnt === 0) {
            $pdo->prepare("INSERT INTO usuarios (empresa_id, nome, login, senha_hash, perfil) VALUES (NULL, ?, ?, ?, 'admin')")
                ->execute(['Administrador', 'admin', password_hash('admin', PASSWORD_DEFAULT)]);
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $loginInput = trim($data['login'] ?? '');
        $senhaInput = $data['senha'] ?? '';
        $usr = $pdo->prepare("SELECT * FROM usuarios WHERE login = ? AND ativo = 1");
        $usr->execute([$loginInput]);
        $usr = $usr->fetch();

        if ($usr && password_verify($senhaInput, $usr['senha_hash'])) {
            // Inicia sessão PHP para isolamento multi-tenant
            $_SESSION['usuario_id'] = (int)$usr['id'];
            $_SESSION['empresa_id'] = (int)($usr['empresa_id'] ?? 0);
            $_SESSION['usuario_perfil'] = $usr['perfil'] ?? 'operador';

            $empresaData = null;
            if ($_SESSION['empresa_id']) {
                $emp = $pdo->prepare("SELECT razao_social, cnpj, status, usuario_dfe FROM empresas WHERE id=?");
                $emp->execute([$_SESSION['empresa_id']]);
                $empresaData = $emp->fetch();
                
                if ($empresaData) {
                    if ($empresaData['status'] === 'Inativo') {
                        echo json_encode(['success' => false, 'message' => 'Esta conta foi desativada.']);
                        exit;
                    }
                    if ($empresaData['status'] === 'Bloqueado') {
                        echo json_encode(['success' => false, 'message' => 'BLOQUEADO: Favor entrar em contato com Administrador!']);
                        exit;
                    }
                }
            }

            // Verifica se a empresa está configurada
            $empresaConfigurada = false;
            if ($empresaData) {
                $empresaConfigurada = !empty($empresaData['razao_social']) && !empty($empresaData['cnpj'])
                    && strlen(preg_replace('/\D/', '', $empresaData['cnpj'])) === 14;
            } else if (!$_SESSION['empresa_id']) {
                $empresaConfigurada = true;
            }

            echo json_encode([
                'success'             => true,
                'usuarioId'           => $usr['id'],
                'nome'                => $usr['nome'],
                'perfil'              => $usr['perfil'],
                'empresaId'           => (int)($usr['empresa_id'] ?? 0),
                'empresaConfigurada'  => $empresaConfigurada,
                'usuarioDfe'          => (int)($empresaData['usuario_dfe'] ?? 2)
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Login ou senha incorretos.']);
        }
        break;

    // ── Pré-cadastros ─────────────────────────────────────────────────────────
    case 'listar_pre_cadastros':
        try {
            $rows = $pdo->query("SELECT id, nome, email, cnpj, razao_social, telefone, login_desejado, status, created_at FROM pre_cadastros ORDER BY created_at DESC")->fetchAll();
            echo json_encode($rows);
        } catch (PDOException $e) { echo json_encode([]); }
        break;

    case 'aprovar_pre_cadastro':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID inválido']); break; }
        try {
            $pc = $pdo->prepare("SELECT * FROM pre_cadastros WHERE id=? AND status='aguardando'");
            $pc->execute([$id]);
            $pc = $pc->fetch();
            if (!$pc) { echo json_encode(['success' => false, 'message' => 'Pré-cadastro não encontrado ou já processado.']); break; }

            // Garante tabela usuarios
            $pdo->exec("CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                login VARCHAR(50) NOT NULL UNIQUE,
                senha_hash VARCHAR(255) NOT NULL,
                perfil ENUM('admin','operador') DEFAULT 'operador',
                ativo TINYINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            // Verifica duplicata de login
            $dup = $pdo->prepare("SELECT id FROM usuarios WHERE login=?");
            $dup->execute([$pc['login_desejado']]);
            if ($dup->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Login já existe na tabela de usuários.']); break;
            }

            // Cria usuário
            $pdo->prepare("INSERT INTO usuarios (nome, login, senha_hash, perfil, ativo) VALUES (?,?,?,?,1)")
                ->execute([$pc['nome'], $pc['login_desejado'], $pc['senha_hash'], 'operador']);

            // Marca como aprovado
            $pdo->prepare("UPDATE pre_cadastros SET status='aprovado' WHERE id=?")->execute([$id]);

            echo json_encode(['success' => true, 'login' => $pc['login_desejado']]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'reprovar_pre_cadastro':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID inválido']); break; }
        $pdo->prepare("UPDATE pre_cadastros SET status='reprovado' WHERE id=?")->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'listar_usuarios':
        if ($empresaId) {
            $stmt = $pdo->prepare("SELECT id, nome, login, perfil, ativo, created_at FROM usuarios WHERE empresa_id=? ORDER BY nome");
            $stmt->execute([$empresaId]);
        } else {
            $stmt = $pdo->query("SELECT id, nome, login, perfil, ativo, created_at FROM usuarios ORDER BY nome");
        }
        echo json_encode($stmt->fetchAll());
        break;

    case 'salvar_usuario':
        $data = json_decode(file_get_contents('php://input'), true);
        $nome  = trim($data['nome'] ?? '');
        $login = trim($data['login'] ?? '');
        $perfil = in_array($data['perfil'] ?? 'operador', ['admin','operador']) ? $data['perfil'] : 'operador';
        $ativo = isset($data['ativo']) ? (int)$data['ativo'] : 1;
        if (!$nome || !$login) { echo json_encode(['success' => false, 'message' => 'Nome e login são obrigatórios.']); break; }
        if (isset($data['id']) && $data['id'] > 0) {
            $sql = "UPDATE usuarios SET nome=?, login=?, perfil=?, ativo=?";
            $params = [$nome, $login, $perfil, $ativo];
            if (!empty($data['senha'])) { $sql .= ", senha_hash=?"; $params[] = password_hash($data['senha'], PASSWORD_DEFAULT); }
            $sql .= " WHERE id=?" . ($empresaId ? " AND empresa_id=?" : "");
            $params[] = $data['id'];
            if ($empresaId) $params[] = $empresaId;
            try {
                $pdo->prepare($sql)->execute($params);
            } catch (PDOException $e) {
                echo json_encode(['success' => false, 'message' => 'Este login já está sendo utilizado por outro usuário.']);
                break;
            }
        } else {
            if (empty($data['senha'])) { echo json_encode(['success' => false, 'message' => 'Senha obrigatória para novo usuário.']); break; }
            try {
                $pdo->prepare("INSERT INTO usuarios (empresa_id, nome, login, senha_hash, perfil, ativo) VALUES (?,?,?,?,?,?)")
                    ->execute([$empresaId ?: null, $nome, $login, password_hash($data['senha'], PASSWORD_DEFAULT), $perfil, $ativo]);
            } catch (PDOException $e) {
                echo json_encode(['success' => false, 'message' => 'Login já existe.']); break;
            }
        }
        echo json_encode(['success' => true]);
        break;

    case 'excluir_usuario':
        $id = (int)($_GET['id'] ?? 0);
        if ($empresaId) {
            $pdo->prepare("DELETE FROM usuarios WHERE id=? AND empresa_id=?")->execute([$id, $empresaId]);
        } else {
            $pdo->prepare("DELETE FROM usuarios WHERE id=?")->execute([$id]);
        }
        echo json_encode(['success' => true]);
        break;

    case 'logout':
        session_unset();
        session_destroy();
        echo json_encode(['success' => true]);
        break;

}
