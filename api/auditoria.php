<?php
/**
 * Módulo de Auditoria
 * Registra todas as ações importantes feitas no sistema.
 * Função utilitária registrarAuditoria() é usada pelos outros módulos.
 */

// Cria a tabela se não existir (executa só uma vez por request)
if (!isset($GLOBALS['_audit_table_checked'])) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS auditoria_log (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        emitente_id INT DEFAULT NULL,
        usuario_id INT DEFAULT NULL,
        usuario_nome VARCHAR(100) DEFAULT NULL,
        acao VARCHAR(60) NOT NULL,
        entidade VARCHAR(50) DEFAULT NULL,
        entidade_id VARCHAR(60) DEFAULT NULL,
        descricao VARCHAR(255) DEFAULT NULL,
        dados_antes JSON DEFAULT NULL,
        dados_depois JSON DEFAULT NULL,
        ip VARCHAR(45) DEFAULT NULL,
        user_agent VARCHAR(255) DEFAULT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_emitente_data (emitente_id, criado_em),
        INDEX idx_usuario_data (usuario_id, criado_em),
        INDEX idx_acao (acao),
        INDEX idx_entidade (entidade, entidade_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $GLOBALS['_audit_table_checked'] = true;
}

switch ($action) {
    case 'auditoria_listar':
        $filtroEmitente = $_GET['emitente_id'] ?? $empresaId;
        $filtroUsuario  = $_GET['usuario_id'] ?? '';
        $filtroAcao     = $_GET['acao'] ?? '';
        $filtroEntidade = $_GET['entidade'] ?? '';
        $dataInicio     = $_GET['data_inicio'] ?? date('Y-m-01');
        $dataFim        = $_GET['data_fim'] ?? date('Y-m-d');
        $limite         = min((int)($_GET['limite'] ?? 200), 1000);

        $where = ["criado_em BETWEEN ? AND ?"];
        $params = [$dataInicio . ' 00:00:00', $dataFim . ' 23:59:59'];

        if (!empty($filtroEmitente)) { $where[] = "emitente_id = ?"; $params[] = $filtroEmitente; }
        if (!empty($filtroUsuario))  { $where[] = "usuario_id = ?";  $params[] = $filtroUsuario; }
        if (!empty($filtroAcao))     { $where[] = "acao = ?";        $params[] = $filtroAcao; }
        if (!empty($filtroEntidade)) { $where[] = "entidade = ?";    $params[] = $filtroEntidade; }

        $sql = "SELECT * FROM auditoria_log WHERE " . implode(' AND ', $where) . " ORDER BY criado_em DESC LIMIT " . (int)$limite;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
        break;

    case 'auditoria_acoes':
        // Lista distinct de ações para filtro
        $stmt = $pdo->query("SELECT DISTINCT acao FROM auditoria_log ORDER BY acao");
        echo json_encode($stmt->fetchAll(PDO::FETCH_COLUMN));
        break;

    case 'auditoria_detalhe':
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'ID inválido']); break; }
        $stmt = $pdo->prepare("SELECT * FROM auditoria_log WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) { echo json_encode(['success' => false, 'message' => 'Registro não encontrado']); break; }
        echo json_encode(['success' => true, 'log' => $row]);
        break;
}

/**
 * Função utilitária global para registrar auditoria.
 * Uso: registrarAuditoria($pdo, $empresaId, $usuarioId, $usuarioNome, $acao, $entidade, $entidadeId, $descricao, $dadosAntes, $dadosDepois)
 */
if (!function_exists('registrarAuditoria')) {
    function registrarAuditoria($pdo, $emitenteId, $usuarioId, $usuarioNome, $acao, $entidade = null, $entidadeId = null, $descricao = null, $dadosAntes = null, $dadosDepois = null) {
        try {
            // Filtra campos sensíveis
            $camposSensiveis = ['senha', 'senha_hash', 'password', 'certificado_pfx', 'certificado_senha', 'csc_token'];
            $filtrar = function($dados) use ($camposSensiveis) {
                if (!is_array($dados)) return $dados;
                foreach ($camposSensiveis as $campo) {
                    if (isset($dados[$campo])) $dados[$campo] = '***FILTRADO***';
                }
                return $dados;
            };
            $dadosAntes  = $dadosAntes  !== null ? json_encode($filtrar($dadosAntes),  JSON_UNESCAPED_UNICODE) : null;
            $dadosDepois = $dadosDepois !== null ? json_encode($filtrar($dadosDepois), JSON_UNESCAPED_UNICODE) : null;

            // IP (considera proxy)
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
            if ($ip && strpos($ip, ',') !== false) $ip = trim(explode(',', $ip)[0]);
            $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

            $stmt = $pdo->prepare("INSERT INTO auditoria_log
                (emitente_id, usuario_id, usuario_nome, acao, entidade, entidade_id, descricao, dados_antes, dados_depois, ip, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$emitenteId, $usuarioId, $usuarioNome, $acao, $entidade, $entidadeId, $descricao, $dadosAntes, $dadosDepois, $ip, $ua]);
            return true;
        } catch (Throwable $e) {
            // Auditoria não pode quebrar a operação principal
            @file_put_contents(__DIR__ . '/../auditoria_erro.log', "[" . date('Y-m-d H:i:s') . "] " . $e->getMessage() . "\n", FILE_APPEND);
            return false;
        }
    }
}
