<?php
// api/comissoes.php — Geração e gestão de comissões

$empresaId = (int)($_REQUEST['empresa_id'] ?? 0);
if ($empresaId <= 0) {
    echo json_encode(['success' => false, 'message' => 'empresa_id inválido']);
    exit;
}

require_once __DIR__ . '/comissoes_helper.php';

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


// ─────────────────────────────────────────
// RELATÓRIO PDF — GERAL e RECIBO POR VENDEDOR
// ─────────────────────────────────────────

require_once __DIR__ . '/../lib/fpdf.php';

/**
 * Carrega comissões e dados da empresa para os relatórios.
 * Retorna [empresa, comissoes, totaisStatus, totaisTipo, totalGeral].
 */
function carregarDadosRelatorio(PDO $pdo, int $empresaId, array $filtros): array {
    // Empresa
    $stmt = $pdo->prepare("SELECT razao_social, nome_fantasia, cnpj, inscricao_estadual FROM empresas WHERE id = ?");
    $stmt->execute([$empresaId]);
    $empresa = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['razao_social' => '—', 'cnpj' => '', 'nome_fantasia' => '', 'inscricao_estadual' => ''];

    // Comissões
    $where  = ['c.empresa_id = ?'];
    $params = [$empresaId];

    if (!empty($filtros['vendedor_id']))  { $where[] = 'c.vendedor_id = ?';  $params[] = (int)$filtros['vendedor_id']; }
    if (!empty($filtros['status']))       { $where[] = 'c.status = ?';        $params[] = $filtros['status']; }
    if (!empty($filtros['competencia']))  { $where[] = 'DATE_FORMAT(c.competencia,"%Y-%m") = ?'; $params[] = $filtros['competencia']; }
    if (!empty($filtros['status_in']))    {
        $placeholders = implode(',', array_fill(0, count($filtros['status_in']), '?'));
        $where[] = "c.status IN ({$placeholders})";
        $params = array_merge($params, $filtros['status_in']);
    }

    $whereStr = implode(' AND ', $where);

    $stmt = $pdo->prepare("
        SELECT c.*, v.nome AS vendedor_nome
        FROM comissoes c
        LEFT JOIN vendedores v ON v.id = c.vendedor_id
        WHERE {$whereStr}
        ORDER BY v.nome, c.gerado_em DESC
    ");
    $stmt->execute($params);
    $comissoes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Totalizadores
    $totaisStatus = ['pendente' => ['qtd' => 0, 'val' => 0], 'aprovada' => ['qtd' => 0, 'val' => 0],
                     'paga'     => ['qtd' => 0, 'val' => 0], 'cancelada' => ['qtd' => 0, 'val' => 0]];
    $totaisTipo   = [];
    $totalGeral   = 0.0;

    foreach ($comissoes as $c) {
        $st = $c['status'];
        $tp = $c['documento_tipo'];
        $vc = (float)$c['valor_comissao'];

        if (isset($totaisStatus[$st])) {
            $totaisStatus[$st]['qtd']++;
            $totaisStatus[$st]['val'] += $vc;
        }
        if (!isset($totaisTipo[$tp])) $totaisTipo[$tp] = ['qtd' => 0, 'val' => 0];
        $totaisTipo[$tp]['qtd']++;
        $totaisTipo[$tp]['val'] += $vc;

        if ($st !== 'cancelada') $totalGeral += $vc;
    }

    return [
        'empresa'      => $empresa,
        'comissoes'    => $comissoes,
        'totaisStatus' => $totaisStatus,
        'totaisTipo'   => $totaisTipo,
        'totalGeral'   => $totalGeral,
    ];
}

function fmtBRL(float $v): string {
    return 'R$ ' . number_format($v, 2, ',', '.');
}

function tipoLabelPdf(string $t): string {
    $map = ['orcamento' => 'Orçamento', 'os' => 'OS', 'pedido' => 'Pedido', 'nfe' => 'NF-e', 'nfce' => 'NFC-e'];
    return $map[$t] ?? $t;
}

function statusLabelPdf(string $s): string {
    return ucfirst($s);
}

/**
 * Cabeçalho padrão dos relatórios.
 */
function cabecalhoRelatorio(FPDF $pdf, array $empresa, string $titulo, string $competencia, ?string $vendedorNome = null): void {
    $pdf->SetFont('Arial', 'B', 14);
    $pdf->Cell(0, 7, utf8_decode($empresa['razao_social']), 0, 1, 'L');
    $pdf->SetFont('Arial', '', 9);
    if (!empty($empresa['nome_fantasia'])) {
        $pdf->Cell(0, 5, utf8_decode($empresa['nome_fantasia']), 0, 1, 'L');
    }
    $linha = 'CNPJ: ' . $empresa['cnpj'];
    if (!empty($empresa['inscricao_estadual'])) $linha .= '   IE: ' . $empresa['inscricao_estadual'];
    $pdf->Cell(0, 5, utf8_decode($linha), 0, 1, 'L');
    $pdf->Ln(3);

    $pdf->SetDrawColor(180, 180, 180);
    $pdf->Line(10, $pdf->GetY(), 200, $pdf->GetY());
    $pdf->Ln(4);

    $pdf->SetFont('Arial', 'B', 13);
    $pdf->Cell(0, 7, utf8_decode($titulo), 0, 1, 'C');

    $pdf->SetFont('Arial', '', 9);
    $compTxt = 'Competência: ' . (empty($competencia) ? 'Todas' : DateTime::createFromFormat('Y-m', $competencia)->format('m/Y'));
    $pdf->Cell(0, 5, utf8_decode($compTxt), 0, 1, 'C');
    if ($vendedorNome) {
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 6, utf8_decode('Vendedor: ' . $vendedorNome), 0, 1, 'C');
    }
    $pdf->Ln(3);
}

/**
 * Tabela de comissões (usada em ambos os relatórios).
 */
function tabelaComissoes(FPDF $pdf, array $comissoes, bool $mostrarVendedor = true): void {
    $pdf->SetFont('Arial', 'B', 8);
    $pdf->SetFillColor(230, 230, 230);

    if ($mostrarVendedor) {
        $pdf->Cell(45, 6, 'Vendedor',     1, 0, 'L', true);
        $pdf->Cell(20, 6, 'Tipo',         1, 0, 'L', true);
        $pdf->Cell(15, 6, 'Doc#',         1, 0, 'L', true);
        $pdf->Cell(25, 6, 'Vl. Doc',      1, 0, 'R', true);
        $pdf->Cell(15, 6, '%',            1, 0, 'R', true);
        $pdf->Cell(25, 6, 'Comissão',     1, 0, 'R', true);
        $pdf->Cell(20, 6, 'Status',       1, 0, 'C', true);
        $pdf->Cell(25, 6, 'Data',         1, 1, 'C', true);
    } else {
        $pdf->Cell(30, 6, 'Tipo',         1, 0, 'L', true);
        $pdf->Cell(20, 6, 'Doc#',         1, 0, 'L', true);
        $pdf->Cell(35, 6, 'Vl. Doc',      1, 0, 'R', true);
        $pdf->Cell(20, 6, '%',            1, 0, 'R', true);
        $pdf->Cell(35, 6, 'Comissão',     1, 0, 'R', true);
        $pdf->Cell(25, 6, 'Status',       1, 0, 'C', true);
        $pdf->Cell(25, 6, 'Data',         1, 1, 'C', true);
    }

    $pdf->SetFont('Arial', '', 8);

    foreach ($comissoes as $c) {
        $data = $c['gerado_em'] ? date('d/m/Y', strtotime($c['gerado_em'])) : '';
        if ($mostrarVendedor) {
            $pdf->Cell(45, 5, utf8_decode(substr($c['vendedor_nome'] ?? '—', 0, 28)), 1, 0, 'L');
            $pdf->Cell(20, 5, utf8_decode(tipoLabelPdf($c['documento_tipo'])), 1, 0, 'L');
            $pdf->Cell(15, 5, '#' . $c['documento_id'], 1, 0, 'L');
            $pdf->Cell(25, 5, fmtBRL((float)$c['valor_documento']), 1, 0, 'R');
            $pdf->Cell(15, 5, number_format((float)$c['percentual'], 2, ',', '.') . '%', 1, 0, 'R');
            $pdf->Cell(25, 5, fmtBRL((float)$c['valor_comissao']), 1, 0, 'R');
            $pdf->Cell(20, 5, utf8_decode(statusLabelPdf($c['status'])), 1, 0, 'C');
            $pdf->Cell(25, 5, $data, 1, 1, 'C');
        } else {
            $pdf->Cell(30, 5, utf8_decode(tipoLabelPdf($c['documento_tipo'])), 1, 0, 'L');
            $pdf->Cell(20, 5, '#' . $c['documento_id'], 1, 0, 'L');
            $pdf->Cell(35, 5, fmtBRL((float)$c['valor_documento']), 1, 0, 'R');
            $pdf->Cell(20, 5, number_format((float)$c['percentual'], 2, ',', '.') . '%', 1, 0, 'R');
            $pdf->Cell(35, 5, fmtBRL((float)$c['valor_comissao']), 1, 0, 'R');
            $pdf->Cell(25, 5, utf8_decode(statusLabelPdf($c['status'])), 1, 0, 'C');
            $pdf->Cell(25, 5, $data, 1, 1, 'C');
        }
    }
}

// ─────────────────────────────────────────
// ACTION: Relatório Geral
// ─────────────────────────────────────────
if ($action === 'relatorio_comissoes_geral') {
    $filtros = [
        'vendedor_id' => $_GET['vendedor_id'] ?? null,
        'status'      => $_GET['status'] ?? null,
        'competencia' => $_GET['competencia'] ?? null,
    ];

    $dados = carregarDadosRelatorio($pdo, $empresaId, $filtros);

    $pdf = class_exists('\Fpdf\Fpdf') ? new \Fpdf\Fpdf('P', 'mm', 'A4') : new FPDF('P', 'mm', 'A4');
    $pdf->AliasNbPages();
    $pdf->AddPage();
    $pdf->SetMargins(10, 10, 10);

    cabecalhoRelatorio($pdf, $dados['empresa'], 'Relatório de Comissões', $filtros['competencia'] ?? '');

    // Resumo por Status
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(0, 6, utf8_decode('Resumo por Status'), 0, 1, 'L');
    $pdf->SetFont('Arial', '', 9);
    foreach ($dados['totaisStatus'] as $st => $val) {
        $pdf->Cell(95, 5, utf8_decode(' • ' . statusLabelPdf($st) . ' (' . $val['qtd'] . ')'), 0, 0, 'L');
        $pdf->Cell(0, 5, fmtBRL($val['val']), 0, 1, 'R');
    }
    $pdf->Ln(2);

    // Resumo por Tipo
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(0, 6, utf8_decode('Resumo por Tipo de Documento'), 0, 1, 'L');
    $pdf->SetFont('Arial', '', 9);
    foreach ($dados['totaisTipo'] as $tp => $val) {
        $pdf->Cell(95, 5, utf8_decode(' • ' . tipoLabelPdf($tp) . ' (' . $val['qtd'] . ')'), 0, 0, 'L');
        $pdf->Cell(0, 5, fmtBRL($val['val']), 0, 1, 'R');
    }
    $pdf->Ln(2);

    $pdf->SetFont('Arial', 'B', 11);
    $pdf->SetFillColor(220, 230, 245);
    $pdf->Cell(95, 7, utf8_decode(' Total Geral (sem canceladas)'), 1, 0, 'L', true);
    $pdf->Cell(0, 7, fmtBRL($dados['totalGeral']), 1, 1, 'R', true);
    $pdf->Ln(4);

    // Detalhamento
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(0, 6, utf8_decode('Detalhamento'), 0, 1, 'L');

    if (empty($dados['comissoes'])) {
        $pdf->SetFont('Arial', 'I', 9);
        $pdf->Cell(0, 6, utf8_decode('Nenhuma comissão encontrada para os filtros aplicados.'), 0, 1, 'C');
    } else {
        tabelaComissoes($pdf, $dados['comissoes'], true);
    }

    // Rodapé
    $pdf->Ln(4);
    $pdf->SetFont('Arial', 'I', 7);
    $pdf->Cell(0, 4, utf8_decode('Emitido em ' . date('d/m/Y H:i') . '   |   Sistema DFE'), 0, 1, 'C');

    $filename = 'comissoes_geral_' . ($filtros['competencia'] ?? 'todas') . '.pdf';
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    $pdf->Output('D', $filename);
    exit;
}

// ─────────────────────────────────────────
// ACTION: Recibo por Vendedor (1 página por vendedor com comissões aprovadas)
// ─────────────────────────────────────────
if ($action === 'relatorio_comissoes_recibo') {
    $filtros = [
        'vendedor_id' => $_GET['vendedor_id'] ?? null,
        'competencia' => $_GET['competencia'] ?? null,
        'status_in'   => ['aprovada'], // somente comissões a pagar
    ];

    $dados = carregarDadosRelatorio($pdo, $empresaId, $filtros);

    if (empty($dados['comissoes'])) {
        // Gera PDF mínimo informando que não há nada
        $pdf = class_exists('\Fpdf\Fpdf') ? new \Fpdf\Fpdf('P', 'mm', 'A4') : new FPDF('P', 'mm', 'A4');
        $pdf->AddPage();
        $pdf->SetMargins(10, 10, 10);
        cabecalhoRelatorio($pdf, $dados['empresa'], 'Recibo de Comissões', $filtros['competencia'] ?? '');
        $pdf->SetFont('Arial', 'I', 11);
        $pdf->Ln(10);
        $pdf->Cell(0, 8, utf8_decode('Não há comissões aprovadas a pagar para o período.'), 0, 1, 'C');

        $filename = 'recibo_comissoes_' . ($filtros['competencia'] ?? 'todas') . '.pdf';
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        $pdf->Output('D', $filename);
        exit;
    }

    // Agrupar comissões por vendedor
    $porVendedor = [];
    foreach ($dados['comissoes'] as $c) {
        $vid = $c['vendedor_id'];
        if (!isset($porVendedor[$vid])) {
            $porVendedor[$vid] = ['nome' => $c['vendedor_nome'] ?? '—', 'lista' => [], 'total' => 0];
        }
        $porVendedor[$vid]['lista'][] = $c;
        $porVendedor[$vid]['total']  += (float)$c['valor_comissao'];
    }

    $pdf = class_exists('\Fpdf\Fpdf') ? new \Fpdf\Fpdf('P', 'mm', 'A4') : new FPDF('P', 'mm', 'A4');

    foreach ($porVendedor as $vid => $info) {
        $pdf->AddPage();
        $pdf->SetMargins(10, 10, 10);

        cabecalhoRelatorio($pdf, $dados['empresa'], 'Recibo de Comissões', $filtros['competencia'] ?? '', $info['nome']);

        // Tabela das comissões aprovadas do vendedor
        tabelaComissoes($pdf, $info['lista'], false);

        // Total a pagar
        $pdf->Ln(3);
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->SetFillColor(220, 245, 230);
        $pdf->Cell(135, 8, utf8_decode(' Total a Pagar'), 1, 0, 'L', true);
        $pdf->Cell(0,   8, fmtBRL($info['total']), 1, 1, 'R', true);

        // Texto do recibo
        $pdf->Ln(8);
        $pdf->SetFont('Arial', '', 10);
        $texto = 'Recebi de ' . ($dados['empresa']['razao_social'] ?? '—')
               . ' a importância de ' . fmtBRL($info['total'])
               . ' referente às comissões aprovadas relacionadas neste recibo, dando plena, geral e irrevogável quitação.';
        $pdf->MultiCell(0, 5, utf8_decode($texto), 0, 'J');

        // Linhas de assinatura
        $pdf->Ln(20);
        $pdf->Cell(0, 5, utf8_decode('_____________________ , _____ de _____________________ de _______'), 0, 1, 'C');
        $pdf->Ln(15);
        $pdf->Cell(0, 0, '____________________________________________', 0, 1, 'C');
        $pdf->Cell(0, 5, utf8_decode($info['nome']), 0, 1, 'C');

        // Rodapé
        $pdf->SetY(-15);
        $pdf->SetFont('Arial', 'I', 7);
        $pdf->Cell(0, 4, utf8_decode('Emitido em ' . date('d/m/Y H:i') . '   |   Sistema DFE'), 0, 1, 'C');
    }

    $filename = 'recibo_comissoes_' . ($filtros['competencia'] ?? 'todas') . '.pdf';
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    $pdf->Output('D', $filename);
    exit;
}
