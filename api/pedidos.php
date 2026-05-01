<?php
// api/pedidos.php — Pedido completo para empresa sem fiscal

$empresaId = (int)($_REQUEST['empresa_id'] ?? 0);
if ($empresaId <= 0) {
    echo json_encode(['success' => false, 'message' => 'empresa_id inválido']);
    exit;
}

if ($action === 'listar_pedidos') {
    $stmt = $pdo->prepare("
        SELECT v.id, v.numero, v.data_emissao, v.status, v.valor_total,
               v.cliente_nome, vd.nome AS vendedor_nome
        FROM vendas v
        LEFT JOIN vendedores vd ON vd.id = v.vendedor_id AND vd.empresa_id = v.empresa_id
        WHERE v.empresa_id = ? AND v.status = 'Pedido'
        AND DATE(v.data_emissao) BETWEEN ? AND ?
        ORDER BY v.data_emissao DESC
        LIMIT 500
    ");
    $dtInicio = $_GET['dt_inicio'] ?? date('Y-01-01');
    $dtFim = $_GET['dt_fim'] ?? date('Y-m-d');
    $stmt->execute([$empresaId, $dtInicio, $dtFim]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($action === 'salvar_pedido_completo') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    $vendedorId   = !empty($data['vendedor_id'])  ? (int)$data['vendedor_id']  : null;
    $natureza     = trim($data['natureza_operacao'] ?? 'VENDA');
    $observacao   = trim($data['observacao'] ?? '');
    $valorFrete   = (float)($data['valor_frete']   ?? 0);
    $valorSeguro  = (float)($data['valor_seguro']  ?? 0);
    $valorOutras  = (float)($data['valor_outras']  ?? 0);
    $valorTotal   = (float)($data['valor_total']   ?? 0);
    $usuarioId    = !empty($data['usuario_id'])    ? (int)$data['usuario_id']  : null;
    $caixaId      = !empty($data['caixa_id'])      ? (int)$data['caixa_id']   : null;
    $itens        = $data['itens']      ?? [];
    $pagamentos   = $data['pagamentos'] ?? [];
    $cliente      = $data['cliente']    ?? null;

    if (empty($itens)) {
        echo json_encode(['success' => false, 'message' => 'Nenhum item informado']);
        exit;
    }
    if (empty($pagamentos)) {
        echo json_encode(['success' => false, 'message' => 'Nenhuma forma de pagamento informada']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        // Próximo número
        $stmt = $pdo->prepare("SELECT COALESCE(MAX(numero),0)+1 FROM vendas WHERE empresa_id = ? AND status = 'Pedido'");
        $stmt->execute([$empresaId]);
        $numero = (int)$stmt->fetchColumn();

        // Cliente
        $clienteId   = null;
        $clienteNome = null;
        $clienteDoc  = null;
        if ($cliente) {
            $clienteId   = !empty($cliente['id'])        ? (int)$cliente['id'] : null;
            $clienteNome = trim($cliente['nome'] ?? '');
            $clienteDoc  = trim($cliente['documento'] ?? '');
        }

        // Inserir venda
        $stmt = $pdo->prepare("
            INSERT INTO vendas
                (empresa_id, numero, serie, modelo, status, natureza_operacao,
                 valor_total, valor_desconto, valor_frete, valor_seguro, valor_outras,
                 usuario_id, caixa_id, cliente_id, cliente_nome, cliente_documento,
                 vendedor_id, observacao, data_emissao)
            VALUES (?, ?, '001', 65, 'Pedido', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $empresaId, $numero, $natureza,
            $valorTotal, $valorFrete, $valorSeguro, $valorOutras,
            $usuarioId, $caixaId,
            $clienteId, $clienteNome, $clienteDoc,
            $vendedorId, $observacao
        ]);
        $vendaId = (int)$pdo->lastInsertId();

        // Itens + baixa de estoque
        foreach ($itens as $it) {
            $produtoId    = (int)($it['produto_id']    ?? 0);
            $descricao    = trim($it['descricao']      ?? '');
            $unidade      = trim($it['unidade']        ?? 'UN');
            $quantidade   = (float)($it['quantidade']  ?? 0);
            $valorUnit    = (float)($it['valor_unitario'] ?? 0);
            $desconto     = (float)($it['desconto']    ?? 0);
            $valorItemTotal = (float)($it['valor_total'] ?? 0);

            $stmt = $pdo->prepare("
                INSERT INTO vendas_itens
                    (venda_id, produto_id, unidade, quantidade,
                     valor_unitario, valor_total)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$vendaId, $produtoId, $unidade, $quantidade, $valorUnit, $valorItemTotal]);

            // Baixa de estoque
            if ($produtoId > 0 && $quantidade > 0) {
                $pdo->prepare("UPDATE produtos SET estoque = GREATEST(0, estoque - ?) WHERE id = ? AND empresa_id = ?")
                    ->execute([$quantidade, $produtoId, $empresaId]);
            }
        }

        // Pagamentos
        $formasCaixa   = ['01', '03', '04', '17', '10', '11'];
        $formasReceber = ['02', '05', '15', '99'];

        foreach ($pagamentos as $pag) {
            $forma  = $pag['forma_pagamento'] ?? '01';
            $valor  = (float)($pag['valor'] ?? 0);
            $band   = $pag['bandeira']    ?? '';
            $aut    = $pag['autorizacao'] ?? '';
            $vencimentos = $pag['vencimentos'] ?? [];

            // Salvar pagamento
            $stmt = $pdo->prepare("
                INSERT INTO vendas_pagamentos
                    (venda_id, forma_pagamento, valor_pagamento, tp_integra, t_band, c_aut)
                VALUES (?, ?, ?, '2', ?, ?)
            ");
            $stmt->execute([$vendaId, $forma, $valor, $band ?: '99', $aut]);

            // Caixa (formas à vista)
            if (in_array($forma, $formasCaixa) && $caixaId) {
                $formaLabel = [
                    '01' => 'Dinheiro', '03' => 'Cartão Crédito', '04' => 'Cartão Débito',
                    '17' => 'PIX', '10' => 'Vale Alimentação', '11' => 'Vale Refeição'
                ][$forma] ?? 'Outros';
                $pdo->prepare("
                    INSERT INTO caixa_movimentos
                        (empresa_id, venda_id, conta_id, tipo, valor, forma_pagamento, historico, usuario_id)
                    VALUES (?, ?, ?, 'C', ?, ?, ?, ?)
                ")->execute([
                    $empresaId, $vendaId, $caixaId, $valor,
                    $forma, "Pedido #{$numero} - {$formaLabel}", $usuarioId
                ]);
            }

            // Financeiro (formas a prazo)
            if (in_array($forma, $formasReceber)) {
                if (!empty($vencimentos)) {
                    foreach ($vencimentos as $v) {
                        $pdo->prepare("
                            INSERT INTO financeiro
                                (empresa_id, venda_id, tipo, status, valor_total, vencimento,
                                 parcela_numero, parcela_total, forma_pagamento_prevista,
                                 entidade_id, categoria)
                            VALUES (?, ?, 'R', 'Pendente', ?, ?, ?, ?, ?, ?, 'Pedido')
                        ")->execute([
                            $empresaId, $vendaId,
                            (float)$v['valor'],
                            $v['vencimento'],
                            (int)$v['numero'],
                            count($vencimentos),
                            $forma,
                            $clienteId
                        ]);
                    }
                } else {
                    // Sem parcelamento: vencimento em 30 dias
                    $venc = date('Y-m-d', strtotime('+30 days'));
                    $pdo->prepare("
                        INSERT INTO financeiro
                            (empresa_id, venda_id, tipo, status, valor_total, vencimento,
                             parcela_numero, parcela_total, forma_pagamento_prevista,
                             entidade_id, categoria)
                        VALUES (?, ?, 'R', 'Pendente', ?, ?, 1, 1, ?, ?, 'Pedido')
                    ")->execute([$empresaId, $vendaId, $valor, $venc, $forma, $clienteId]);
                }
            }
        }

        // Comissão automática
        require_once __DIR__ . '/comissoes.php';
        gerarComissao($pdo, 'venda', $vendaId, $empresaId, $usuarioId ?? 0);

        // Auditoria
        $pdo->prepare("
            INSERT INTO auditoria_log
                (emitente_id, usuario_id, acao, entidade, entidade_id, descricao, criado_em)
            VALUES (?, ?, 'criar_pedido', 'pedido', ?, ?, NOW())
        ")->execute([
            $empresaId, $usuarioId,
            $vendaId,
            "Pedido #{$numero} criado — Total: R$ " . number_format($valorTotal, 2, ',', '.')
        ]);

        $pdo->commit();
        echo json_encode(['success' => true, 'id' => $vendaId, 'numero' => $numero]);

    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Erro ao salvar pedido: ' . $e->getMessage()]);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Ação inválida']);

// ── Buscar pedido completo para edição ────────────────────────────────────────
if ($action === 'buscar_pedido') {
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $pdo->prepare("
        SELECT v.*, vd.nome AS vendedor_nome
        FROM vendas v
        LEFT JOIN vendedores vd ON vd.id = v.vendedor_id
        WHERE v.id = ? AND v.empresa_id = ? AND v.status = 'Pedido'
    ");
    $stmt->execute([$id, $empresaId]);
    $venda = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$venda) { echo json_encode(['success' => false, 'message' => 'Pedido não encontrado']); exit; }

    $itens = $pdo->prepare("SELECT vi.*, p.descricao, p.unidade_comercial FROM vendas_itens vi LEFT JOIN produtos p ON p.id = vi.produto_id WHERE vi.venda_id = ?");
    $itens->execute([$id]);

    $pags = $pdo->prepare("SELECT * FROM vendas_pagamentos WHERE venda_id = ?");
    $pags->execute([$id]);

    $fin = $pdo->prepare("SELECT * FROM financeiro WHERE venda_id = ? AND tipo = 'R'");
    $fin->execute([$id]);

    echo json_encode([
        'success'    => true,
        'venda'      => $venda,
        'itens'      => $itens->fetchAll(PDO::FETCH_ASSOC),
        'pagamentos' => $pags->fetchAll(PDO::FETCH_ASSOC),
        'financeiro' => $fin->fetchAll(PDO::FETCH_ASSOC),
    ]);
    exit;
}

// ── Excluir pedido (rollback completo) ────────────────────────────────────────
if ($action === 'excluir_pedido') {
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT * FROM vendas WHERE id = ? AND empresa_id = ? AND status = 'Pedido'");
    $stmt->execute([$id, $empresaId]);
    $venda = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$venda) { echo json_encode(['success' => false, 'message' => 'Pedido não encontrado']); exit; }

    $pdo->beginTransaction();
    try {
        // Devolver estoque
        $itens = $pdo->prepare("SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = ?");
        $itens->execute([$id]);
        foreach ($itens->fetchAll(PDO::FETCH_ASSOC) as $it) {
            if ($it['produto_id'] && $it['quantidade'] > 0) {
                $pdo->prepare("UPDATE produtos SET estoque = estoque + ? WHERE id = ? AND empresa_id = ?")
                    ->execute([$it['quantidade'], $it['produto_id'], $empresaId]);
            }
        }
        // Apagar financeiro pendente
        $pdo->prepare("DELETE FROM financeiro WHERE venda_id = ? AND status = 'Pendente'")->execute([$id]);
        // Apagar caixa
        $pdo->prepare("DELETE FROM caixa_movimentos WHERE venda_id = ?")->execute([$id]);
        // Cancelar comissão
        require_once __DIR__ . '/comissoes.php';
        cancelarComissao($pdo, 'venda', $id, $empresaId, 'Pedido excluído');
        // Apagar itens e pagamentos
        $pdo->prepare("DELETE FROM vendas_itens WHERE venda_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM vendas_pagamentos WHERE venda_id = ?")->execute([$id]);
        // Apagar venda
        $pdo->prepare("DELETE FROM vendas WHERE id = ? AND empresa_id = ?")->execute([$id, $empresaId]);
        // Auditoria
        $pdo->prepare("INSERT INTO auditoria_log (emitente_id, usuario_id, acao, entidade, entidade_id, descricao, criado_em) VALUES (?,?,'excluir_pedido','pedido',?,?,NOW())")
            ->execute([$empresaId, null, $id, "Pedido #{$venda['numero']} excluído"]);
        $pdo->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// ── Atualizar pedido ──────────────────────────────────────────────────────────
if ($action === 'atualizar_pedido') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = (int)($data['id'] ?? 0);
    $acao_financeiro = $data['acao_financeiro'] ?? 'manter'; // manter | recriar | ignorar

    $stmt = $pdo->prepare("SELECT * FROM vendas WHERE id = ? AND empresa_id = ? AND status = 'Pedido'");
    $stmt->execute([$id, $empresaId]);
    $vendaAtual = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$vendaAtual) { echo json_encode(['success' => false, 'message' => 'Pedido não encontrado']); exit; }

    $vendedorId  = !empty($data['vendedor_id'])  ? (int)$data['vendedor_id']  : null;
    $natureza    = trim($data['natureza_operacao'] ?? 'VENDA');
    $observacao  = trim($data['observacao'] ?? '');
    $valorFrete  = (float)($data['valor_frete']  ?? 0);
    $valorSeguro = (float)($data['valor_seguro'] ?? 0);
    $valorOutras = (float)($data['valor_outras'] ?? 0);
    $valorTotal  = (float)($data['valor_total']  ?? 0);
    $usuarioId   = !empty($data['usuario_id'])   ? (int)$data['usuario_id']  : null;
    $itens       = $data['itens']      ?? [];
    $pagamentos  = $data['pagamentos'] ?? [];
    $cliente     = $data['cliente']    ?? null;

    $clienteId   = $cliente ? ((int)($cliente['id'] ?? 0) ?: null) : null;
    $clienteNome = $cliente ? trim($cliente['nome'] ?? '') : null;
    $clienteDoc  = $cliente ? trim($cliente['documento'] ?? '') : null;

    $pdo->beginTransaction();
    try {
        // Devolver estoque dos itens antigos
        $itensAntigos = $pdo->prepare("SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = ?");
        $itensAntigos->execute([$id]);
        foreach ($itensAntigos->fetchAll(PDO::FETCH_ASSOC) as $it) {
            if ($it['produto_id'] && $it['quantidade'] > 0)
                $pdo->prepare("UPDATE produtos SET estoque = estoque + ? WHERE id = ? AND empresa_id = ?")
                    ->execute([$it['quantidade'], $it['produto_id'], $empresaId]);
        }

        // Atualizar venda
        $pdo->prepare("UPDATE vendas SET natureza_operacao=?, valor_total=?, valor_frete=?, valor_seguro=?, valor_outras=?, cliente_id=?, cliente_nome=?, cliente_documento=?, vendedor_id=?, observacao=? WHERE id=? AND empresa_id=?")
            ->execute([$natureza, $valorTotal, $valorFrete, $valorSeguro, $valorOutras, $clienteId, $clienteNome, $clienteDoc, $vendedorId, $observacao, $id, $empresaId]);

        // Recriar itens
        $pdo->prepare("DELETE FROM vendas_itens WHERE venda_id = ?")->execute([$id]);
        foreach ($itens as $it) {
            $produtoId = (int)($it['produto_id'] ?? 0);
            $quantidade = (float)($it['quantidade'] ?? 0);
            $pdo->prepare("INSERT INTO vendas_itens (venda_id, produto_id, unidade, quantidade, valor_unitario, valor_total) VALUES (?,?,?,?,?,?)")
                ->execute([$id, $produtoId, $it['unidade'] ?? 'UN', $quantidade, (float)($it['valor_unitario'] ?? 0), (float)($it['valor_total'] ?? 0)]);
            if ($produtoId > 0 && $quantidade > 0)
                $pdo->prepare("UPDATE produtos SET estoque = GREATEST(0, estoque - ?) WHERE id = ? AND empresa_id = ?")
                    ->execute([$quantidade, $produtoId, $empresaId]);
        }

        // Financeiro
        if ($acao_financeiro === 'recriar') {
            $pdo->prepare("DELETE FROM financeiro WHERE venda_id = ? AND status = 'Pendente'")->execute([$id]);
            $pdo->prepare("DELETE FROM caixa_movimentos WHERE venda_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM vendas_pagamentos WHERE venda_id = ?")->execute([$id]);
            $formasCaixa   = ['01','03','04','17','10','11'];
            $formasReceber = ['02','05','15','99'];
            foreach ($pagamentos as $pag) {
                $forma = $pag['forma_pagamento'] ?? '01';
                $valor = (float)($pag['valor'] ?? 0);
                $pdo->prepare("INSERT INTO vendas_pagamentos (venda_id, forma_pagamento, valor_pagamento, tp_integra, t_band, c_aut) VALUES (?,?,?,'2',?,?)")
                    ->execute([$id, $forma, $valor, $pag['bandeira'] ?? '99', $pag['autorizacao'] ?? '']);
                if (in_array($forma, $formasCaixa) && !empty($data['caixa_id'])) {
                    $pdo->prepare("INSERT INTO caixa_movimentos (empresa_id, venda_id, conta_id, tipo, valor, forma_pagamento, historico, usuario_id) VALUES (?,?,?,'C',?,?,?,?)")
                        ->execute([$empresaId, $id, $data['caixa_id'], $valor, $forma, "Pedido #{$vendaAtual['numero']} - Editado", $usuarioId]);
                }
                if (in_array($forma, $formasReceber)) {
                    $vencimentos = $pag['vencimentos'] ?? [];
                    if (!empty($vencimentos)) {
                        foreach ($vencimentos as $v) {
                            $pdo->prepare("INSERT INTO financeiro (empresa_id, venda_id, tipo, status, valor_total, vencimento, parcela_numero, parcela_total, forma_pagamento_prevista, entidade_id, categoria) VALUES (?,?,'R','Pendente',?,?,?,?,?,?,'Pedido')")
                                ->execute([$empresaId, $id, (float)$v['valor'], $v['vencimento'], (int)$v['numero'], count($vencimentos), $forma, $clienteId]);
                        }
                    } else {
                        $pdo->prepare("INSERT INTO financeiro (empresa_id, venda_id, tipo, status, valor_total, vencimento, parcela_numero, parcela_total, forma_pagamento_prevista, entidade_id, categoria) VALUES (?,?,'R','Pendente',?,?,1,1,?,?,'Pedido')")
                            ->execute([$empresaId, $id, $valor, date('Y-m-d', strtotime('+30 days')), $forma, $clienteId]);
                    }
                }
            }
        }

        // Atualizar comissão
        require_once __DIR__ . '/comissoes.php';
        cancelarComissao($pdo, 'venda', $id, $empresaId, 'Pedido editado - reprocessando');
        gerarComissao($pdo, 'venda', $id, $empresaId, $usuarioId ?? 0);

        $pdo->commit();
        echo json_encode(['success' => true, 'id' => $id, 'numero' => $vendaAtual['numero']]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// ── Email pedido ──────────────────────────────────────────────────────────────
if ($action === 'pedido_email') {
    $id    = (int)($_GET['id'] ?? 0);
    $email = trim($_GET['email'] ?? '');
    if (!$id || !$email) { echo json_encode(['success' => false, 'message' => 'Parâmetros inválidos']); exit; }

    $stmt = $pdo->prepare("SELECT v.*, vd.nome AS vendedor_nome FROM vendas v LEFT JOIN vendedores vd ON vd.id = v.vendedor_id WHERE v.id = ? AND v.empresa_id = ?");
    $stmt->execute([$id, $empresaId]);
    $venda = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$venda) { echo json_encode(['success' => false, 'message' => 'Pedido não encontrado']); exit; }

    $itens = $pdo->prepare("SELECT vi.*, p.descricao FROM vendas_itens vi LEFT JOIN produtos p ON p.id = vi.produto_id WHERE vi.venda_id = ?");
    $itens->execute([$id]);
    $itensList = $itens->fetchAll(PDO::FETCH_ASSOC);

    $empresa = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
    $empresa->execute([$empresaId]);
    $emp = $empresa->fetch(PDO::FETCH_ASSOC);

    $numero = str_pad($venda['numero'], 6, '0', STR_PAD_LEFT);
    $itensHtml = '';
    foreach ($itensList as $it) {
        $itensHtml .= "<tr><td style='padding:6px;border:1px solid #eee'>{$it['descricao']}</td><td style='padding:6px;border:1px solid #eee;text-align:center'>{$it['quantidade']}</td><td style='padding:6px;border:1px solid #eee;text-align:right'>R$ " . number_format($it['valor_unitario'],2,',','.') . "</td><td style='padding:6px;border:1px solid #eee;text-align:right'>R$ " . number_format($it['valor_total'],2,',','.') . "</td></tr>";
    }

    $body = "
    <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>
      <div style='background:#1a56db;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0'>
        <h2 style='margin:0'>{$emp['razao_social']}</h2>
        <p style='margin:4px 0;opacity:.8'>CNPJ: {$emp['cnpj']}</p>
      </div>
      <div style='padding:20px;background:#f9fafb;border:1px solid #e5e7eb'>
        <div style='background:#fff3cd;border:1px solid #ffc107;padding:8px;border-radius:4px;text-align:center;margin-bottom:16px'>
          <strong>⚠ DOCUMENTO SEM VALOR FISCAL</strong>
        </div>
        <h3 style='color:#1a56db'>PEDIDO Nº {$numero}</h3>
        <p>Data: " . date('d/m/Y H:i', strtotime($venda['data_emissao'])) . "</p>
        " . ($venda['cliente_nome'] ? "<p>Cliente: <strong>{$venda['cliente_nome']}</strong></p>" : '') . "
        " . ($venda['vendedor_nome'] ? "<p>Vendedor: {$venda['vendedor_nome']}</p>" : '') . "
        <table style='width:100%;border-collapse:collapse;margin:16px 0'>
          <thead><tr style='background:#f1f5f9'>
            <th style='padding:8px;border:1px solid #ddd;text-align:left'>Produto</th>
            <th style='padding:8px;border:1px solid #ddd;text-align:center'>Qtd</th>
            <th style='padding:8px;border:1px solid #ddd;text-align:right'>Unit</th>
            <th style='padding:8px;border:1px solid #ddd;text-align:right'>Total</th>
          </tr></thead>
          <tbody>{$itensHtml}</tbody>
        </table>
        <div style='text-align:right;background:#1a56db;color:white;padding:12px;border-radius:4px'>
          <strong style='font-size:18px'>TOTAL: R$ " . number_format($venda['valor_total'],2,',','.') . "</strong>
        </div>
        <p style='text-align:center;color:#888;margin-top:16px;font-size:12px'>⚠ Este documento não tem valor fiscal</p>
      </div>
    </div>";

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = $emp['smtp_host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $emp['smtp_user'];
        $mail->Password   = $emp['smtp_pass'];
        $mail->SMTPSecure = $emp['smtp_secure'] ?? 'tls';
        $mail->Port       = $emp['smtp_port'] ?? 587;
        $mail->CharSet    = 'UTF-8';
        $mail->setFrom($emp['smtp_user'], $emp['razao_social']);
        $mail->addAddress($email);
        $mail->isHTML(true);
        $mail->Subject = "Pedido #{$numero} - {$emp['razao_social']}";
        $mail->Body    = $body;
        $mail->send();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Erro ao enviar e-mail: ' . $e->getMessage()]);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Ação inválida']);
