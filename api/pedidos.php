<?php
// api/pedidos.php — Pedido completo para empresa sem fiscal

$empresaId = (int)($_REQUEST['empresa_id'] ?? 0);
if ($empresaId <= 0) {
    echo json_encode(['success' => false, 'message' => 'empresa_id inválido']);
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
                    (venda_id, produto_id, descricao, unidade, quantidade,
                     valor_unitario, valor_desconto, valor_total)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$vendaId, $produtoId, $descricao, $unidade, $quantidade, $valorUnit, $desconto * $quantidade, $valorItemTotal]);

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
