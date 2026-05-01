<?php
// api/comissoes.php — Geração e gestão de comissões

$empresaId = (int)($_REQUEST['empresa_id'] ?? 0);
if ($empresaId <= 0) {
    echo json_encode(['success' => false, 'message' => 'empresa_id inválido']);
    exit;
}

// ─────────────────────────────────────────
// FUNÇÃO CENTRAL — Gerar comissão
// ─────────────────────────────────────────
function gerarComissao(PDO $pdo, string $tipo, int $docId, int $empresaId, int $usuarioId = 0): array {

    // 1) Buscar documento e vendedor
    $tabelas = [
        'orcamento' => ['tabela' => 'orcamentos',    'status_gatilho' => 'Aprovado'],
        'os'        => ['tabela' => 'ordens_servico', 'status_gatilho' => 'Concluída'],
        'venda'     => ['tabela' => 'vendas',         'status_gatilho' => 'Autorizada'],
    ];

    if (!isset($tabelas[$tipo])) {
        return ['success' => false, 'message' => 'Tipo de documento inválido'];
    }

    $tabela  = $tabelas[$tipo]['tabela'];
    $gatilho = $tabelas[$tipo]['status_gatilho'];

    $stmt = $pdo->prepare("SELECT id, empresa_id, vendedor_id, valor_total, status FROM {$tabela} WHERE id = ? AND empresa_id = ?");
    $stmt->execute([$docId, $empresaId]);
    $doc = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$doc) {
        return ['success' => false, 'message' => 'Documento não encontrado'];
    }
    if ($doc['status'] !== $gatilho) {
        return ['success' => false, 'message' => "Status do documento não é '{$gatilho}'"];
    }
    if (empty($doc['vendedor_id'])) {
        return ['success' => false, 'message' => 'Documento sem vendedor vinculado'];
    }

    // 2) Verificar se já existe comissão para este documento
    $stmt = $pdo->prepare("SELECT id FROM comissoes WHERE documento_tipo = ? AND documento_id = ?");
    $stmt->execute([$tipo, $docId]);
    if ($stmt->fetch()) {
        return ['success' => false, 'message' => 'Comissão já gerada para este documento'];
    }

    // 3) Buscar percentual do vendedor
    $stmt = $pdo->prepare("SELECT id, nome, percentual_comissao, ativo FROM vendedores WHERE id = ? AND empresa_id = ?");
    $stmt->execute([$doc['vendedor_id'], $empresaId]);
    $vendedor = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$vendedor) {
        return ['success' => false, 'message' => 'Vendedor não encontrado'];
    }
    if (!$vendedor['ativo']) {
        return ['success' => false, 'message' => 'Vendedor inativo'];
    }
    if ($vendedor['percentual_comissao'] <= 0) {
        return ['success' => false, 'message' => 'Vendedor sem percentual de comissão configurado'];
    }

    // 4) Calcular comissão
    $valorDoc    = (float)$doc['valor_total'];
    $percentual  = (float)$vendedor['percentual_comissao'];
    $valorComiss = round($valorDoc * $percentual / 100, 2);
    $competencia = date('Y-m-01'); // primeiro dia do mês atual

    // 5) Inserir comissão
    $stmt = $pdo->prepare("
        INSERT INTO comissoes
            (empresa_id, vendedor_id, documento_tipo, documento_id, valor_documento,
             percentual, valor_comissao, competencia, status, gerado_em, gerado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', NOW(), ?)
    ");
    $stmt->execute([
        $empresaId,
        $doc['vendedor_id'],
        $tipo,
        $docId,
        $valorDoc,
        $percentual,
        $valorComiss,
        $competencia,
        $usuarioId ?: null,
    ]);

    return [
        'success'        => true,
        'comissao_id'    => (int)$pdo->lastInsertId(),
        'vendedor'       => $vendedor['nome'],
        'valor_comissao' => $valorComiss,
    ];
}

// ─────────────────────────────────────────
// FUNÇÃO — Cancelar comissão
// ─────────────────────────────────────────
function cancelarComissao(PDO $pdo, string $tipo, int $docId, int $empresaId, string $motivo = ''): array {
    $stmt = $pdo->prepare("
        UPDATE comissoes
        SET status = 'cancelada', cancelado_em = NOW(), cancelado_motivo = ?
        WHERE documento_tipo = ? AND documento_id = ? AND empresa_id = ?
        AND status IN ('pendente', 'aprovada')
    ");
    $stmt->execute([$motivo ?: 'Documento cancelado', $tipo, $docId, $empresaId]);

    if ($stmt->rowCount() === 0) {
        return ['success' => false, 'message' => 'Nenhuma comissão ativa encontrada para cancelar'];
    }
    return ['success' => true, 'message' => 'Comissão cancelada'];
}

// ─────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────

// Gerar comissão manualmente
if ($action === 'gerar_comissao') {
    $data      = json_decode(file_get_contents('php://input'), true) ?? [];
    $tipo      = $data['documento_tipo'] ?? '';
    $docId     = (int)($data['documento_id'] ?? 0);
    $usuarioId = (int)($data['usuario_id'] ?? 0);

    if (!$tipo || $docId <= 0) {
        echo json_encode(['success' => false, 'message' => 'documento_tipo e documento_id são obrigatórios']);
        exit;
    }
    echo json_encode(gerarComissao($pdo, $tipo, $docId, $empresaId, $usuarioId));
    exit;
}

// Cancelar comissão
if ($action === 'cancelar_comissao') {
    $data   = json_decode(file_get_contents('php://input'), true) ?? [];
    $tipo   = $data['documento_tipo'] ?? '';
    $docId  = (int)($data['documento_id'] ?? 0);
    $motivo = $data['motivo'] ?? '';

    if (!$tipo || $docId <= 0) {
        echo json_encode(['success' => false, 'message' => 'documento_tipo e documento_id são obrigatórios']);
        exit;
    }
    echo json_encode(cancelarComissao($pdo, $tipo, $docId, $empresaId, $motivo));
    exit;
}

// Marcar como paga
if ($action === 'pagar_comissao') {
    $data      = json_decode(file_get_contents('php://input'), true) ?? [];
    $ids       = array_filter(array_map('intval', $data['ids'] ?? []));
    $usuarioId = (int)($data['usuario_id'] ?? 0);

    if (empty($ids)) {
        echo json_encode(['success' => false, 'message' => 'Nenhum ID informado']);
        exit;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $params = array_merge($ids, [$usuarioId ?: null, $empresaId]);

    $stmt = $pdo->prepare("
        UPDATE comissoes
        SET status = 'paga', pago_em = NOW(), pago_por = ?
        WHERE id IN ({$placeholders}) AND empresa_id = ?
        AND status = 'aprovada'
    ");
    // reordenar params: ids primeiro, depois usuario e empresa
    $params = array_merge(array_values($ids), [$usuarioId ?: null, $empresaId]);
    $stmt->execute($params);

    echo json_encode(['success' => true, 'atualizadas' => $stmt->rowCount()]);
    exit;
}

// Aprovar comissão
if ($action === 'aprovar_comissao') {
    $data      = json_decode(file_get_contents('php://input'), true) ?? [];
    $ids       = array_filter(array_map('intval', $data['ids'] ?? []));
    $usuarioId = (int)($data['usuario_id'] ?? 0);

    if (empty($ids)) {
        echo json_encode(['success' => false, 'message' => 'Nenhum ID informado']);
        exit;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $params = array_merge(array_values($ids), [$usuarioId ?: null, $empresaId]);

    $stmt = $pdo->prepare("
        UPDATE comissoes
        SET status = 'aprovada', aprovado_por = ?
        WHERE id IN ({$placeholders}) AND empresa_id = ?
        AND status = 'pendente'
    ");
    $stmt->execute($params);

    echo json_encode(['success' => true, 'atualizadas' => $stmt->rowCount()]);
    exit;
}

// Listar comissões
if ($action === 'listar_comissoes') {
    $vendedorId  = (int)($_GET['vendedor_id'] ?? 0);
    $status      = $_GET['status'] ?? '';
    $competencia = $_GET['competencia'] ?? ''; // formato: YYYY-MM
    $dtInicio    = $_GET['dt_inicio'] ?? '';
    $dtFim       = $_GET['dt_fim'] ?? '';

    $where  = ['c.empresa_id = ?'];
    $params = [$empresaId];

    if ($vendedorId > 0) { $where[] = 'c.vendedor_id = ?';   $params[] = $vendedorId; }
    if ($status)         { $where[] = 'c.status = ?';         $params[] = $status; }
    if ($competencia)    { $where[] = 'DATE_FORMAT(c.competencia,"%Y-%m") = ?'; $params[] = $competencia; }
    if ($dtInicio)       { $where[] = 'DATE(c.gerado_em) >= ?'; $params[] = $dtInicio; }
    if ($dtFim)          { $where[] = 'DATE(c.gerado_em) <= ?'; $params[] = $dtFim; }

    $whereStr = implode(' AND ', $where);

    $stmt = $pdo->prepare("
        SELECT
            c.*,
            v.nome AS vendedor_nome,
            u1.nome AS gerado_por_nome,
            u2.nome AS aprovado_por_nome,
            u3.nome AS pago_por_nome
        FROM comissoes c
        LEFT JOIN vendedores v  ON v.id = c.vendedor_id
        LEFT JOIN usuarios u1   ON u1.id = c.gerado_por
        LEFT JOIN usuarios u2   ON u2.id = c.aprovado_por
        LEFT JOIN usuarios u3   ON u3.id = c.pago_por
        WHERE {$whereStr}
        ORDER BY c.gerado_em DESC
    ");
    $stmt->execute($params);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Totalizadores
    $totais = ['pendente' => 0, 'aprovada' => 0, 'paga' => 0, 'cancelada' => 0, 'geral' => 0];
    foreach ($rows as $r) {
        $totais[$r['status']]  = ($totais[$r['status']] ?? 0) + (float)$r['valor_comissao'];
        $totais['geral']      += (float)$r['valor_comissao'];
    }

    echo json_encode(['success' => true, 'data' => $rows, 'totais' => $totais]);
    exit;
}

// Resumo por vendedor
if ($action === 'resumo_vendedores') {
    $competencia = $_GET['competencia'] ?? date('Y-m');

    $stmt = $pdo->prepare("
        SELECT
            v.id, v.nome,
            COUNT(c.id)                                         AS total_documentos,
            SUM(c.valor_documento)                              AS total_vendas,
            SUM(c.valor_comissao)                               AS total_comissao,
            SUM(IF(c.status='pendente',  c.valor_comissao, 0)) AS pendente,
            SUM(IF(c.status='aprovada',  c.valor_comissao, 0)) AS aprovada,
            SUM(IF(c.status='paga',      c.valor_comissao, 0)) AS paga
        FROM vendedores v
        LEFT JOIN comissoes c ON c.vendedor_id = v.id
            AND c.empresa_id = ?
            AND DATE_FORMAT(c.competencia,'%Y-%m') = ?
            AND c.status != 'cancelada'
        WHERE v.empresa_id = ? AND v.ativo = 1
        GROUP BY v.id, v.nome
        ORDER BY total_comissao DESC
    ");
    $stmt->execute([$empresaId, $competencia, $empresaId]);

    echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

