<?php
/** @var PDO $pdo */
/** @var int $empresaId */
/** @var string $action */
/** @var string $usuarioPerfil */

// ── Cria tabelas na primeira execução ────────────────────────────────────────
$pdo->exec("CREATE TABLE IF NOT EXISTS ordens_servico (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id      INT NOT NULL,
    numero          INT NOT NULL,
    status          ENUM('Rascunho','Aberta','Em Andamento','Concluída','Cancelada') DEFAULT 'Rascunho',
    cliente_id      INT DEFAULT NULL,
    cliente_nome    VARCHAR(255) DEFAULT NULL,
    cliente_documento VARCHAR(20) DEFAULT NULL,
    cliente_telefone  VARCHAR(20) DEFAULT NULL,
    cliente_email     VARCHAR(100) DEFAULT NULL,
    valor_total     DECIMAL(10,2) NOT NULL DEFAULT 0,
    observacao      TEXT DEFAULT NULL,
    previsao        DATE DEFAULT NULL,
    data_criacao    DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_empresa (empresa_id),
    INDEX idx_numero  (empresa_id, numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE IF NOT EXISTS ordens_servico_itens (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    ordem_id      INT NOT NULL,
    tipo          ENUM('produto','servico') NOT NULL DEFAULT 'servico',
    produto_id    INT DEFAULT NULL,
    descricao     VARCHAR(300) NOT NULL,
    unidade       VARCHAR(10) DEFAULT 'UN',
    quantidade    DECIMAL(10,3) NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total   DECIMAL(10,2) NOT NULL,
    INDEX idx_ordem (ordem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if (!function_exists('gerarPdfOrdemServicoStr')) {
    function gerarPdfOrdemServicoStr($os, $itens, $emp) {
        if (!class_exists('\Fpdf\Fpdf') && !class_exists('FPDF')) {
            throw new Exception('Biblioteca FPDF não disponível.');
        }
        $pdf = class_exists('\Fpdf\Fpdf') ? new \Fpdf\Fpdf('P', 'mm', 'A4') : new FPDF('P', 'mm', 'A4');
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 15);
        $pdf->AddPage();

        $enc    = fn($s) => mb_convert_encoding((string)$s, 'ISO-8859-1', 'UTF-8');
        $fmtVal = fn($v) => 'R$ ' . number_format((float)$v, 2, ',', '.');
        $W      = 180;

        $logoOk = false;
        if (!empty($emp['logo_path'])) {
            $logoFile = __DIR__ . '/../' . $emp['logo_path'];
            if (file_exists($logoFile)) {
                $logoW = 45;
                $pdf->Image($logoFile, 15, 15, $logoW, 0, strtoupper(pathinfo($logoFile, PATHINFO_EXTENSION)));
                $logoOk = true;
            }
        }

        $startX = $logoOk ? (15 + 45 + 5) : 15;
        $infoW  = $W - ($startX - 15);
        $align  = $logoOk ? 'L' : 'C';

        $pdf->SetXY($startX, 15);
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell($infoW, 7, $enc(mb_strtoupper($emp['razao_social'] ?? '')), 0, 1, $align);
        
        $pdf->SetFont('Arial', '', 9);
        if (!empty($emp['cnpj'])) {
            $pdf->SetX($startX);
            $pdf->Cell($infoW, 5, $enc('CNPJ: '.$emp['cnpj']), 0, 1, $align);
        }
        if (!empty($emp['logradouro'])) {
            $end = trim(($emp['logradouro']??'').', '.($emp['numero']??'').' - '.($emp['bairro']??'').' - '.($emp['municipio']??'').'/'.($emp['uf']??''));
            $pdf->SetX($startX);
            $pdf->Cell($infoW, 5, $enc($end), 0, 1, $align);
        }
        if (!empty($emp['telefone'])) {
            $pdf->SetX($startX);
            $pdf->Cell($infoW, 5, $enc('Fone: '.$emp['telefone']), 0, 1, $align);
        }
        
        $pdf->SetY(max($pdf->GetY(), $logoOk ? 38 : 30));
        $pdf->Ln(2);

        $pdf->SetFillColor(30, 64, 175);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell($W, 8, $enc('ORDEM DE SERVICO N. '.str_pad($os['numero'], 4, '0', STR_PAD_LEFT)), 0, 1, 'C', true);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Ln(2);

        $pdf->SetFont('Arial', '', 9);
        $dataCriacao  = $os['data_criacao'] ? (new DateTime($os['data_criacao']))->format('d/m/Y') : '-';
        $dataPrevisao = !empty($os['previsao']) ? (new DateTime($os['previsao']))->format('d/m/Y') : 'Sem prazo';
        $pdf->Cell($W/2, 5, $enc('Data de abertura: '.$dataCriacao), 0, 0);
        $pdf->Cell($W/2, 5, $enc('Previsao: '.$dataPrevisao), 0, 1, 'R');
        $pdf->Cell($W,   5, $enc('Status: '.$os['status']), 0, 1);
        $pdf->Ln(3);

        if (!empty($os['cliente_nome'])) {
            $pdf->SetFillColor(243, 244, 246);
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->Cell($W, 6, $enc('CLIENTE'), 'B', 1, 'L', true);
            $pdf->SetFont('Arial', '', 9);
            $pdf->Cell($W/2, 5, $enc('Nome: '.$os['cliente_nome']), 0, 0);
            if (!empty($os['cliente_documento'])) $pdf->Cell($W/2, 5, $enc('CPF/CNPJ: '.$os['cliente_documento']), 0, 1, 'R');
            else $pdf->Ln();
            
            if (!empty($os['cliente_telefone'])) $pdf->Cell($W, 5, $enc('Telefone: '.$os['cliente_telefone']), 0, 1, 'L');
            if (!empty($os['cliente_email']))    $pdf->Cell($W, 5, $enc('E-mail: '.$os['cliente_email']), 0, 1, 'L');
            
            $pdf->Ln(3);
        }

        $produtos = array_values(array_filter($itens, fn($i) => $i['tipo'] !== 'servico'));
        $servicos = array_values(array_filter($itens, fn($i) => $i['tipo'] === 'servico'));

        $renderGrupo = function(array $grupo, string $titulo) use ($pdf, $enc, $W, $fmtVal) {
            if (empty($grupo)) return 0.0;

            $pdf->Ln(2);
            $pdf->SetFillColor(220, 234, 254);
            $pdf->SetTextColor(30, 64, 175);
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->Cell($W, 6, $enc($titulo), 0, 1, 'L', true);
            $pdf->SetTextColor(0, 0, 0);

            $pdf->SetFillColor(240, 244, 255);
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(95, 6, $enc('DESCRICAO'),  0, 0, 'L', true);
            $pdf->Cell(15, 6, $enc('UNID.'),      0, 0, 'C', true);
            $pdf->Cell(20, 6, $enc('QTDE'),       0, 0, 'R', true);
            $pdf->Cell(25, 6, $enc('VL. UNIT.'),  0, 0, 'R', true);
            $pdf->Cell(25, 6, $enc('TOTAL'),      0, 1, 'R', true);

            $subtotal = 0.0;
            $fillRow  = false;
            foreach ($grupo as $item) {
                $pdf->SetFillColor($fillRow ? 249 : 255, $fillRow ? 250 : 255, $fillRow ? 251 : 255);
                $pdf->SetFont('Arial', '', 8);
                $pdf->Cell(95, 6, $enc(mb_substr($item['descricao'], 0, 55)), 0, 0, 'L', true);
                $pdf->Cell(15, 6, $enc($item['unidade'] ?? 'UN'), 0, 0, 'C', true);
                $pdf->Cell(20, 6, number_format((float)$item['quantidade'], 2, ',', '.'), 0, 0, 'R', true);
                $pdf->Cell(25, 6, $enc('R$ '.number_format((float)$item['valor_unitario'], 2, ',', '.')), 0, 0, 'R', true);
                $pdf->Cell(25, 6, $enc('R$ '.number_format((float)$item['valor_total'],    2, ',', '.')), 0, 1, 'R', true);
                $subtotal += (float)$item['valor_total'];
                $fillRow = !$fillRow;
            }

            $pdf->SetFont('Arial', 'B', 9);
            $pdf->SetFillColor(230, 238, 255);
            $pdf->Cell($W - 50, 6, '', 0, 0, '', true);
            $pdf->Cell(50, 6, $enc('Subtotal: '.$fmtVal($subtotal)), 0, 1, 'R', true);

            return $subtotal;
        };

        $totalProd = $renderGrupo($produtos, 'PRODUTOS / PECAS');
        $totalServ = $renderGrupo($servicos, 'SERVICOS');

        $pdf->Ln(3);
        $pdf->SetFont('Arial', 'B', 11);
        $pdf->SetFillColor(30, 64, 175);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->Cell($W - 50, 9, '', 0, 0, '', true);
        $pdf->Cell(50, 9, $enc('TOTAL GERAL: '.$fmtVal($os['valor_total'])), 'T', 1, 'R', true);
        $pdf->SetTextColor(0, 0, 0);

        if (!empty($os['observacao'])) {
            $pdf->Ln(4);
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->Cell($W, 6, $enc('OBSERVACOES:'), 0, 1);
            $pdf->SetFont('Arial', '', 9);
            $pdf->MultiCell($W, 5, $enc($os['observacao']), 'T');
        }

        $pdf->Ln(6);
        $pdf->SetFont('Arial', 'I', 8);
        $pdf->SetTextColor(150, 150, 150);
        $dtImp = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('d/m/Y H:i:s');
        $pdf->Cell($W, 5, $enc('Emitido em '.$dtImp.' - '.($emp['razao_social'] ?? '')), 0, 1, 'C');

        return $pdf->Output('S');
    }
}

switch ($action) {

    // ── Listar ───────────────────────────────────────────────────────────────
    case 'listar_os':
        $di = $_GET['data_inicio'] ?? '';
        $df = $_GET['data_fim']    ?? '';
        $where  = [];
        $params = [];

        if ($empresaId) {
            $where[]  = "o.empresa_id = ?";
            $params[] = $empresaId;
        } elseif ($usuarioPerfil !== 'admin') {
            echo json_encode([]); break;
        }
        if ($di) { $where[] = "DATE(o.data_criacao) >= ?"; $params[] = $di; }
        if ($df) { $where[] = "DATE(o.data_criacao) <= ?"; $params[] = $df; }

        $whereStr = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        $stmt = $pdo->prepare("
            SELECT o.*,
                   (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                       'id', i.id, 'tipo', i.tipo, 'produto_id', i.produto_id,
                       'descricao', i.descricao, 'unidade', i.unidade,
                       'quantidade', i.quantidade+0, 'valor_unitario', i.valor_unitario+0,
                       'valor_total', i.valor_total+0
                   )) FROM ordens_servico_itens i WHERE i.ordem_id = o.id) AS itens
            FROM ordens_servico o
            {$whereStr}
            ORDER BY o.data_criacao DESC
            LIMIT 500
        ");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['itens'] = $r['itens'] ? json_decode($r['itens'], true) : [];
        }
        echo json_encode($rows);
        break;

    // ── Salvar (criar ou atualizar) ───────────────────────────────────────────
    case 'salvar_os':
        $data = json_decode(file_get_contents('php://input'), true);

        $clienteId        = !empty($data['cliente_id'])        ? (int)$data['cliente_id']  : null;
        $clienteNome      = $data['cliente_nome']      ?? null;
        $clienteDocumento = $data['cliente_documento'] ?? null;
        $clienteTelefone  = $data['cliente_telefone']  ?? null;
        $clienteEmail     = $data['cliente_email']     ?? null;
        $previsao         = !empty($data['previsao'])  ? $data['previsao'] : null;
        $observacao       = $data['observacao']        ?? null;
        $status           = $data['status']            ?? 'Rascunho';
        $itens            = $data['itens']             ?? [];

        $valorTotal = array_reduce($itens, fn($s, $i) => $s + (float)($i['valor_total'] ?? 0), 0);

        $pdo->beginTransaction();
        try {
            if (!empty($data['id'])) {
                $id = (int)$data['id'];
                $chk = $pdo->prepare("SELECT empresa_id FROM ordens_servico WHERE id=?");
                $chk->execute([$id]);
                $chkRow = $chk->fetch();
                if (!$chkRow || ($empresaId && $chkRow['empresa_id'] != $empresaId)) {
                    $pdo->rollBack();
                    echo json_encode(['success' => false, 'message' => 'Não autorizado.']); break;
                }
                // Busca status anterior para controle de estoque
                $stmtOld = $pdo->prepare("SELECT status FROM ordens_servico WHERE id=?");
                $stmtOld->execute([$id]);
                $statusAnterior = $stmtOld->fetchColumn();

                $pdo->prepare("UPDATE ordens_servico SET status=?, cliente_id=?, cliente_nome=?,
                    cliente_documento=?, cliente_telefone=?, cliente_email=?,
                    valor_total=?, observacao=?, previsao=? WHERE id=?")
                    ->execute([$status, $clienteId, $clienteNome, $clienteDocumento,
                               $clienteTelefone, $clienteEmail, $valorTotal, $observacao, $previsao, $id]);
                $pdo->prepare("DELETE FROM ordens_servico_itens WHERE ordem_id=?")->execute([$id]);
            } else {
                $stmt = $pdo->prepare("SELECT COALESCE(MAX(numero),0)+1 FROM ordens_servico WHERE empresa_id=?");
                $stmt->execute([$empresaId ?: 0]);
                $num = (int)$stmt->fetchColumn();

                $pdo->prepare("INSERT INTO ordens_servico
                    (empresa_id, numero, status, cliente_id, cliente_nome, cliente_documento,
                     cliente_telefone, cliente_email, valor_total, observacao, previsao)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)")
                    ->execute([$empresaId ?: 0, $num, $status, $clienteId, $clienteNome,
                               $clienteDocumento, $clienteTelefone, $clienteEmail,
                               $valorTotal, $observacao, $previsao]);
                $id = (int)$pdo->lastInsertId();
            }

            $stmtItem = $pdo->prepare("INSERT INTO ordens_servico_itens
                (ordem_id, tipo, produto_id, descricao, unidade, quantidade, valor_unitario, valor_total)
                VALUES (?,?,?,?,?,?,?,?)");
            foreach ($itens as $item) {
                $stmtItem->execute([
                    $id,
                    $item['tipo'] ?? 'servico',
                    !empty($item['produto_id']) ? (int)$item['produto_id'] : null,
                    $item['descricao'] ?? '',
                    $item['unidade']   ?? 'UN',
                    (float)($item['quantidade']     ?? 1),
                    (float)($item['valor_unitario'] ?? 0),
                    (float)($item['valor_total']    ?? 0),
                ]);
            }

            // Controle de estoque baseado na transição de status
            $itensParaEstoque = array_filter($itens, fn($i) => ($i['tipo'] ?? '') !== 'servico' && !empty($i['produto_id']));

            // Nova OS concluída diretamente (sem id anterior = criação)
            $eraConcluidaAntes = isset($statusAnterior) && $statusAnterior === 'Concluída';
            $ficouConcluida    = $status === 'Concluída';
            $ficouCancelada    = $status === 'Cancelada';

            if ($ficouConcluida && !$eraConcluidaAntes) {
                // Baixa estoque das peças
                foreach ($itensParaEstoque as $item) {
                    $pdo->prepare("UPDATE produtos SET estoque = GREATEST(0, estoque - ?) WHERE id = ?")
                        ->execute([(float)($item['quantidade'] ?? 1), (int)$item['produto_id']]);
                }
            } elseif ($ficouCancelada && $eraConcluidaAntes) {
                // Estorna estoque (era concluída e foi cancelada)
                foreach ($itensParaEstoque as $item) {
                    $pdo->prepare("UPDATE produtos SET estoque = estoque + ? WHERE id = ?")
                        ->execute([(float)($item['quantidade'] ?? 1), (int)$item['produto_id']]);
                }
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'id' => $id]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    // ── Excluir ──────────────────────────────────────────────────────────────
    case 'excluir_os':
        $id = (int)($_GET['id'] ?? 0);
        $chk = $pdo->prepare("SELECT empresa_id FROM ordens_servico WHERE id=?");
        $chk->execute([$id]);
        $row = $chk->fetch();
        if (!$row || ($empresaId && $row['empresa_id'] != $empresaId)) {
            echo json_encode(['success' => false, 'message' => 'Não encontrado.']); break;
        }
        $pdo->prepare("DELETE FROM ordens_servico_itens WHERE ordem_id=?")->execute([$id]);
        $pdo->prepare("DELETE FROM ordens_servico WHERE id=?")->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    // ── PDF ───────────────────────────────────────────────────────────────────
    case 'os_pdf':
        $id = (int)($_GET['id'] ?? 0);

        $stmt = $pdo->prepare("SELECT * FROM ordens_servico WHERE id=?");
        $stmt->execute([$id]);
        $os = $stmt->fetch();
        if (!$os || ($empresaId && $os['empresa_id'] != $empresaId)) {
            http_response_code(404); echo 'Ordem de Serviço não encontrada.'; exit;
        }

        $stmtI = $pdo->prepare("SELECT * FROM ordens_servico_itens WHERE ordem_id=? ORDER BY id");
        $stmtI->execute([$id]);
        $itens = $stmtI->fetchAll();

        $empStmt = $empresaId ? $pdo->prepare("SELECT * FROM empresas WHERE id=?") : $pdo->prepare("SELECT * FROM empresas ORDER BY id LIMIT 1");
        if ($empresaId) $empStmt->execute([$empresaId]); else $empStmt->execute([]);
        $emp = $empStmt->fetch();

        try {
            $pdfStr = gerarPdfOrdemServicoStr($os, $itens, $emp);
            header_remove('Content-Type');
            header('Content-Type: application/pdf');
            header('Content-Disposition: inline; filename="os_'.str_pad($os['numero'], 4, '0', STR_PAD_LEFT).'.pdf"');
            header('Cache-Control: no-cache');
            echo $pdfStr;
        } catch (Exception $e) {
            http_response_code(500); echo $e->getMessage();
        }
        exit;

    // ── Enviar e-mail ─────────────────────────────────────────────────────────
    case 'os_email':
        $data = json_decode(file_get_contents('php://input'), true);
        $osId      = (int)($data['id'] ?? 0);
        $destEmail = trim($data['email'] ?? '');

        if (!$osId || !filter_var($destEmail, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'ID ou e-mail inválido.']); break;
        }
        $stmt = $pdo->prepare("SELECT * FROM ordens_servico WHERE id=?");
        $stmt->execute([$osId]);
        $os = $stmt->fetch();
        if (!$os || ($empresaId && $os['empresa_id'] != $empresaId)) {
            echo json_encode(['success' => false, 'message' => 'Ordem de Serviço não encontrada.']); break;
        }

        $empS = $empresaId ? $pdo->prepare("SELECT * FROM empresas WHERE id=?") : $pdo->prepare("SELECT * FROM empresas LIMIT 1");
        if ($empresaId) $empS->execute([$empresaId]); else $empS->execute([]);
        $emp2 = $empS->fetch();

        $numFmt    = str_pad($os['numero'], 4, '0', '0');
        $valorFmt  = 'R$ '.number_format((float)$os['valor_total'], 2, ',', '.');
        $previsao  = !empty($os['previsao']) ? (new DateTime($os['previsao']))->format('d/m/Y') : 'Sem prazo';
        $empresaNome = $emp2['razao_social'] ?? 'Empresa';

        $subject = "Ordem de Serviço Nº {$numFmt} — {$empresaNome}";
        $body    = "Olá".(!empty($os['cliente_nome']) ? ", {$os['cliente_nome']}" : "").",<br><br>"
                 . "Segue a Ordem de Serviço Nº {$numFmt}.<br>"
                 . "Valor total: <b>{$valorFmt}</b><br>"
                 . "Previsão: {$previsao}<br>"
                 . (!empty($os['observacao']) ? "<br>Observações: ".nl2br($os['observacao'])."<br>" : "")
                 . "<br>Atenciosamente,<br>{$empresaNome}";

        try {
            $stmtI = $pdo->prepare("SELECT * FROM ordens_servico_itens WHERE ordem_id=? ORDER BY id");
            $stmtI->execute([$osId]);
            $itens = $stmtI->fetchAll();
            $pdfStr = gerarPdfOrdemServicoStr($os, $itens, $emp2);
            $pdfFilename = "os_{$numFmt}.pdf";

            if (empty($emp2['smtp_host']) || empty($emp2['smtp_user'])) {
                $headers  = "From: {$empresaNome} <".($emp2['email_contador'] ?: 'noreply@empresa.com').">\r\n";
                $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
                $sent = @mail($destEmail, $subject, $body, $headers);
                if (!$sent) throw new Exception("Falha no PHP mail(). Configure o SMTP da empresa.");
            } else {
                $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
                $mail->CharSet = 'UTF-8';
                $mail->isSMTP();
                $mail->Host       = $emp2['smtp_host'];
                $mail->SMTPAuth   = true;
                $mail->Username   = $emp2['smtp_user'];
                $mail->Password   = $emp2['smtp_pass'];
                $smtpSec = strtolower(trim($emp2['smtp_secure'] ?? ''));
                $mail->SMTPSecure = ($smtpSec === 'nenhum' || empty($smtpSec)) ? false : $smtpSec;
                $mail->Port       = (int)$emp2['smtp_port'] ?: 587;
                if ($mail->SMTPSecure === false) $mail->SMTPAutoTLS = false;

                $mail->setFrom($emp2['smtp_user'], $empresaNome);
                $mail->addAddress($destEmail);
                $mail->isHTML(true);
                $mail->Subject = $subject;
                $mail->Body    = $body;
                
                $mail->addStringAttachment($pdfStr, $pdfFilename, 'base64', 'application/pdf');

                $mail->send();
            }
            echo json_encode(['success' => true, 'message' => 'E-mail enviado com sucesso com anexo.']);
        } catch (Exception $e) {
            $err = isset($mail) ? $mail->ErrorInfo : $e->getMessage();
            echo json_encode(['success' => false, 'message' => 'Erro ao enviar e-mail: ' . $err]);
        }
        break;
}
