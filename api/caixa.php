<?php
switch ($action) {

    // ── Caixa ─────────────────────────────────────────────────────────────────
    case 'abrir_caixa':
        $pdo->exec("CREATE TABLE IF NOT EXISTS caixas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL, nome_usuario VARCHAR(100),
            data_abertura DATETIME NOT NULL, data_fechamento DATETIME,
            troco_inicial DECIMAL(10,2) DEFAULT 0,
            total_vendas DECIMAL(10,2) DEFAULT 0,
            status ENUM('aberto','fechado') DEFAULT 'aberto',
            INDEX idx_usuario (usuario_id), INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        // Migração: adiciona colunas de usuário/caixa em vendas
        try { $pdo->query("SELECT usuario_id FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN usuario_id INT DEFAULT NULL, ADD COLUMN caixa_id INT DEFAULT NULL");
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $usuarioId = (int)($data['usuarioId'] ?? 0);
        $nomeUsr = $data['nomeUsuario'] ?? '';
        $trocoInicial = (float)($data['trocoInicial'] ?? 0);
        // Verifica se já tem caixa aberto para este usuário
        $cxAberto = $pdo->prepare("SELECT id FROM caixas WHERE usuario_id = ? AND status = 'aberto'");
        $cxAberto->execute([$usuarioId]);
        if ($cx = $cxAberto->fetch()) {
            echo json_encode(['success' => true, 'caixaId' => $cx['id'], 'message' => 'Caixa já aberto.']);
            break;
        }
        $dtBr = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
        $pdo->prepare("INSERT INTO caixas (usuario_id, nome_usuario, data_abertura, troco_inicial, status) VALUES (?,?,?,?,'aberto')")
            ->execute([$usuarioId, $nomeUsr, $dtBr->format('Y-m-d H:i:s'), $trocoInicial]);
        echo json_encode(['success' => true, 'caixaId' => (int)$pdo->lastInsertId()]);
        break;

    case 'fechar_caixa':
        $data = json_decode(file_get_contents('php://input'), true);
        $caixaId = (int)($data['caixaId'] ?? 0);
        $dtBr = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
        // Calcula total de vendas autorizadas deste caixa
        $tot = $pdo->prepare("SELECT COALESCE(SUM(valor_total),0) FROM vendas WHERE caixa_id = ? AND status IN ('Autorizada','Contingencia')");
        $tot->execute([$caixaId]);
        $totalVendas = (float)$tot->fetchColumn();
        $pdo->prepare("UPDATE caixas SET status='fechado', data_fechamento=?, total_vendas=? WHERE id=?")
            ->execute([$dtBr->format('Y-m-d H:i:s'), $totalVendas, $caixaId]);
        echo json_encode(['success' => true, 'totalVendas' => $totalVendas]);
        break;

    case 'caixa_atual':
        $usuarioId = (int)($_GET['usuarioId'] ?? 0);
        $cx = $pdo->prepare("SELECT * FROM caixas WHERE usuario_id = ? AND status = 'aberto' ORDER BY id DESC LIMIT 1");
        $cx->execute([$usuarioId]);
        $cx = $cx->fetch();
        echo json_encode($cx ?: null);
        break;

    case 'relatorio_caixa':
        $caixaId = (int)($_GET['caixaId'] ?? 0);
        $cx = $pdo->prepare("SELECT * FROM caixas WHERE id = ?"); $cx->execute([$caixaId]); $cx = $cx->fetch();
        // Vendas do caixa
        $vendas = $pdo->prepare("SELECT v.numero, v.valor_total, v.status, v.data_emissao FROM vendas v WHERE v.caixa_id = ? ORDER BY v.data_emissao"); $vendas->execute([$caixaId]);
        // Pagamentos por forma
        $pags = $pdo->prepare("SELECT vp.forma_pagamento, SUM(vp.valor_pagamento) as total FROM vendas_pagamentos vp JOIN vendas v ON v.id = vp.venda_id WHERE v.caixa_id = ? AND v.status IN ('Autorizada','Contingencia') GROUP BY vp.forma_pagamento"); $pags->execute([$caixaId]);
        echo json_encode(['caixa' => $cx, 'vendas' => $vendas->fetchAll(), 'pagamentos' => $pags->fetchAll()]);
        break;

    case 'relatorio_caixa_pdf':
        $caixaId = (int)($_GET['caixaId'] ?? 0);
        if (!$caixaId) { http_response_code(400); echo 'caixaId invalido'; exit; }

        $cxS = $pdo->prepare("SELECT * FROM caixas WHERE id = ?"); $cxS->execute([$caixaId]); $caixa = $cxS->fetch();
        if (!$caixa) { http_response_code(404); echo 'Caixa nao encontrado'; exit; }
        $emp = $pdo->query("SELECT * FROM empresas LIMIT 1")->fetch();
        $vendasS = $pdo->prepare("SELECT numero, valor_total, status, data_emissao FROM vendas WHERE caixa_id = ? ORDER BY data_emissao"); $vendasS->execute([$caixaId]); $vendas = $vendasS->fetchAll();
        $pagsS = $pdo->prepare("SELECT vp.forma_pagamento, SUM(vp.valor_pagamento) as total FROM vendas_pagamentos vp JOIN vendas v ON v.id = vp.venda_id WHERE v.caixa_id = ? AND v.status IN ('Autorizada','Contingencia') GROUP BY vp.forma_pagamento ORDER BY total DESC"); $pagsS->execute([$caixaId]); $pagamentos = $pagsS->fetchAll();

        $formaLabel = ['01'=>'Dinheiro','02'=>'Cheque','03'=>'Credito','04'=>'Debito','05'=>'Cred. Loja','10'=>'Vale Alim.','11'=>'Vale Ref.','12'=>'Vale Pres.','13'=>'Vale Comb.','15'=>'Boleto','17'=>'PIX','90'=>'Sem Pgto','99'=>'Outros'];
        $totalAutorizadas = array_sum(array_map(fn($v) => in_array($v['status'], ['Autorizada','Contingencia']) ? (float)$v['valor_total'] : 0, $vendas));
        $qtdAutorizadas   = count(array_filter($vendas, fn($v) => in_array($v['status'], ['Autorizada','Contingencia'])));
        $qtdCanceladas    = count(array_filter($vendas, fn($v) => $v['status'] === 'Cancelada'));
        $dinheiro = 0;
        foreach ($pagamentos as $pg) { if ($pg['forma_pagamento'] === '01') $dinheiro = (float)$pg['total']; }
        $trocoFinal = $dinheiro + (float)$caixa['troco_inicial'];

        $fmtDt  = fn($d) => $d ? (new DateTime($d))->format('d/m/Y H:i') : '-';
        $fmtVal = fn($v) => 'R$ ' . number_format((float)$v, 2, ',', '.');
        $enc    = fn($s) => mb_convert_encoding((string)$s, 'ISO-8859-1', 'UTF-8');

        if (class_exists('\Fpdf\Fpdf')) {
            $pdf = new \Fpdf\Fpdf('P', 'mm', [80, 400]);
        } elseif (class_exists('FPDF')) {
            $pdf = new FPDF('P', 'mm', [80, 400]);
        } else {
            http_response_code(500); echo 'Biblioteca FPDF nao disponivel no servidor.'; exit;
        }

        $pdf->SetMargins(4, 4, 4);
        $pdf->SetAutoPageBreak(false);
        $pdf->AddPage();
        $W = 72;

        $lr = function($l, $r) use ($pdf, $W, $enc) {
            $pdf->Cell($W * 0.55, 3.5, $enc($l), 0, 0, 'L');
            $pdf->Cell($W * 0.45, 3.5, $enc($r), 0, 1, 'R');
        };

        // Cabeçalho — logo se disponível
        if (!empty($emp['logo_path'])) {
            $logoFile = __DIR__ . '/../' . $emp['logo_path'];
            if (file_exists($logoFile)) {
                $logoW = 50;
                $logoX = ($W - $logoW) / 2 + 4;
                $pdf->Image($logoFile, $logoX, $pdf->GetY(), $logoW, 0, strtoupper(pathinfo($logoFile, PATHINFO_EXTENSION)));
                $pdf->Ln(16);
            }
        }
        $pdf->SetFont('Courier', 'B', 8);
        $pdf->Cell($W, 4, $enc(mb_strtoupper($emp['razao_social'] ?? 'EMPRESA')), 0, 1, 'C');
        $pdf->SetFont('Courier', '', 8);
        if (!empty($emp['cnpj'])) $pdf->Cell($W, 4, $enc('CNPJ: '.$emp['cnpj']), 0, 1, 'C');
        $pdf->Ln(1);
        $pdf->SetFont('Courier', 'B', 8);
        $pdf->Cell($W, 4, 'RELATORIO DE FECHAMENTO DE CAIXA', 0, 1, 'C');
        $pdf->SetFont('Courier', '', 7);
        $pdf->Cell($W, 3, str_repeat('=', 44), 0, 1, 'C');
        $lr('Caixa No:', '#'.$caixaId);
        $lr('Operador:', $enc(mb_strtoupper($caixa['nome_usuario'] ?? '')));
        $lr('Abertura:', $fmtDt($caixa['data_abertura']));
        $lr('Fechamento:', $fmtDt($caixa['data_fechamento']));
        $lr('Troco Inicial:', $fmtVal($caixa['troco_inicial']));
        $pdf->Cell($W, 3, str_repeat('-', 44), 0, 1, 'C');

        // Vendas
        $pdf->Ln(1); $pdf->SetFont('Courier', 'B', 8); $pdf->Cell($W, 4, 'VENDAS', 0, 1, 'C'); $pdf->SetFont('Courier', '', 7);
        $pdf->Cell($W, 3, str_repeat('-', 44), 0, 1, 'C');
        if (empty($vendas)) {
            $pdf->Cell($W, 4, 'Nenhuma venda neste caixa', 0, 1, 'C');
        } else {
            foreach ($vendas as $v) {
                $st  = $v['status'] === 'Autorizada' ? 'OK ' : ($v['status'] === 'Contingencia' ? 'CON' : ($v['status'] === 'Cancelada' ? 'CAN' : '???'));
                $num = '#'.str_pad($v['numero'], 4);
                $dt  = substr($v['data_emissao'] ?? '', 11, 5);
                $val = $fmtVal($v['valor_total']);
                $pdf->Cell($W*0.12,3.5,$st,0,0,'L');
                $pdf->Cell($W*0.22,3.5,$enc($num),0,0,'L');
                $pdf->Cell($W*0.18,3.5,$dt,0,0,'L');
                $pdf->Cell($W*0.48,3.5,$enc($val),0,1,'R');
            }
        }
        $pdf->Cell($W, 3, str_repeat('-', 44), 0, 1, 'C');

        // Resumo
        $pdf->Ln(1); $pdf->SetFont('Courier', 'B', 8); $pdf->Cell($W, 4, 'RESUMO', 0, 1, 'C'); $pdf->SetFont('Courier', '', 7);
        $pdf->Cell($W, 3, str_repeat('-', 44), 0, 1, 'C');
        $lr('Vendas autorizadas:', (string)$qtdAutorizadas);
        if ($qtdCanceladas > 0) $lr('Vendas canceladas:', (string)$qtdCanceladas);
        $pdf->Cell($W, 3, str_repeat('-', 44), 0, 1, 'C');

        // Pagamentos
        $pdf->Ln(1); $pdf->SetFont('Courier', 'B', 8); $pdf->Cell($W, 4, 'FORMAS DE PAGAMENTO', 0, 1, 'C'); $pdf->SetFont('Courier', '', 7);
        $pdf->Cell($W, 3, str_repeat('-', 44), 0, 1, 'C');
        foreach ($pagamentos as $pg) {
            $label = $formaLabel[$pg['forma_pagamento']] ?? ('Forma '.$pg['forma_pagamento']);
            $lr($enc($label).':',  $fmtVal($pg['total']));
        }
        $pdf->Cell($W, 3, str_repeat('=', 44), 0, 1, 'C');
        $pdf->SetFont('Courier', 'B', 8); $lr('TOTAL VENDAS:', $fmtVal($totalAutorizadas));
        $pdf->SetFont('Courier', '', 7); $pdf->Cell($W, 3, str_repeat('=', 44), 0, 1, 'C');

        // Caixa
        $pdf->Ln(1);
        $lr('Troco Inicial:', $fmtVal($caixa['troco_inicial']));
        $lr('Dinheiro Recebido:', $fmtVal($dinheiro));
        $lr('Total em Caixa:', $fmtVal($trocoFinal));
        $pdf->Cell($W, 3, str_repeat('-', 44), 0, 1, 'C');

        // Rodapé
        $pdf->Ln(1);
        $dtImp = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('d/m/Y H:i:s');
        $pdf->Cell($W, 4, $enc('Impresso em '.$dtImp), 0, 1, 'C');
        $pdf->Cell($W, 4, 'NFC-e Pro', 0, 1, 'C');

        header_remove('Content-Type');
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="relatorio_caixa_'.$caixaId.'.pdf"');
        header('Cache-Control: no-cache');
        echo $pdf->Output('R', 'S');
        exit;

}
