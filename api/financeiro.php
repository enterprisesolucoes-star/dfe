<?php
/**
 * Módulo Financeiro - Banco de Dados e API
 */

function migrarTabelasFinanceiras(PDO $pdo): void {
    // 1. Contas Financeiras (Bancos, Caixa Físico, Carteiras)
    $pdo->exec("CREATE TABLE IF NOT EXISTS contas_financeiras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        nome VARCHAR(100) NOT NULL,
        saldo_inicial DECIMAL(15,2) DEFAULT 0,
        tipo ENUM('Caixa', 'Banco', 'Digital') DEFAULT 'Caixa',
        status TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_empresa (empresa_id)
    )");

    // 2. Financeiro (Contas a Pagar e Receber)
    // Armazena as provisões/títulos.
    $pdo->exec("CREATE TABLE IF NOT EXISTS financeiro (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        venda_id INT DEFAULT NULL,
        compra_id INT DEFAULT NULL,
        tipo ENUM('R', 'P') NOT NULL COMMENT 'R=Receber, P=Pagar',
        status ENUM('Pendente', 'Pago', 'Parcial', 'Cancelado') DEFAULT 'Pendente',
        entidade_id INT DEFAULT NULL COMMENT 'ID do Cliente ou Fornecedor',
        valor_total DECIMAL(15,2) NOT NULL,
        valor_pago DECIMAL(15,2) DEFAULT 0,
        vencimento DATE NOT NULL,
        data_baixa DATE DEFAULT NULL,
        parcela_numero INT DEFAULT 1,
        parcela_total INT DEFAULT 1,
        forma_pagamento_prevista VARCHAR(2) DEFAULT '01',
        categoria VARCHAR(100) DEFAULT 'Geral' COMMENT 'Plano de Contas',
        nosso_numero VARCHAR(50) DEFAULT NULL,
        documento_id VARCHAR(100) DEFAULT NULL COMMENT 'Chave NFe ou Número DOC',
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_empresa_venc (empresa_id, vencimento),
        INDEX idx_status (status),
        INDEX idx_tipo (tipo)
    )");

    // 3. Caixa Movimentos (O Extrato Real / Fluxo de Caixa)
    // Registra toda entrada e saída de dinheiro efetiva.
    $pdo->exec("CREATE TABLE IF NOT EXISTS caixa_movimentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        financeiro_id INT DEFAULT NULL COMMENT 'Link com título que foi baixado',
        venda_id INT DEFAULT NULL COMMENT 'Link direto com venda à vista',
        compra_id INT DEFAULT NULL COMMENT 'Link direto com compra',
        conta_id INT NOT NULL COMMENT 'ID da conta_financeira',
        tipo ENUM('C', 'D') NOT NULL COMMENT 'C=Crédito(Entrada), D=Débito(Saída)',
        valor DECIMAL(15,2) NOT NULL,
        data_movimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        forma_pagamento VARCHAR(2) DEFAULT '01',
        historico VARCHAR(255),
        usuario_id INT DEFAULT NULL,
        INDEX idx_empresa_data (empresa_id, data_movimento),
        INDEX idx_conta (conta_id)
    )");
    // Garante coluna compra_id em tabelas existentes
    try { $pdo->query("SELECT compra_id FROM caixa_movimentos LIMIT 1"); } catch (\Exception $e) {
        $pdo->exec("ALTER TABLE caixa_movimentos ADD COLUMN compra_id INT DEFAULT NULL AFTER venda_id");
    }

    try { $pdo->query("SELECT data_baixa FROM financeiro LIMIT 1"); } catch (\Exception $e) {
        $pdo->exec("ALTER TABLE financeiro ADD COLUMN data_baixa DATE DEFAULT NULL AFTER vencimento");
    }

    // Inserir conta padrão se não existir para a empresa
    // (Isso será feito dinamicamente na primeira carga da API)
}

switch ($action) {
    case 'fin_listar_contas':
        migrarTabelasFinanceiras($pdo);
        $s = $pdo->prepare("SELECT * FROM contas_financeiras WHERE empresa_id = ? AND status = 1");
        $s->execute([$empresaId]);
        $contas = $s->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($contas)) {
            $pdo->prepare("INSERT INTO contas_financeiras (empresa_id, nome, tipo) VALUES (?, 'CAIXA GERAL', 'Caixa')")->execute([$empresaId]);
            $s = $pdo->prepare("SELECT * FROM contas_financeiras WHERE empresa_id = ? AND status = 1");
            $s->execute([$empresaId]);
            $contas = $s->fetchAll(PDO::FETCH_ASSOC);
        }
        echo json_encode($contas);
        break;

    case 'fin_listar_titulos':
        try {
            migrarTabelasFinanceiras($pdo);
            $tipo   = $_GET['tipo'] ?? 'R';
            $status = $_GET['status'] ?? '';
            $di     = $_GET['di'] ?? null;
            $df     = $_GET['df'] ?? null;
            $busca  = trim($_GET['busca'] ?? '');

            $where  = ["f.empresa_id = ?", "f.tipo = ?"];
            $params = [$empresaId, $tipo];

            if ($status) { $where[] = "f.status = ?"; $params[] = $status; }
            if ($di)     { $where[] = "f.vencimento >= ?"; $params[] = $di; }
            if ($df)     { $where[] = "f.vencimento <= ?"; $params[] = $df; }
            if ($busca !== '') {
                $where[] = "(f.categoria LIKE ? OR COALESCE(c.nome, fo.nome, '') LIKE ?)";
                $params[] = "%$busca%";
                $params[] = "%$busca%";
            }

            $sqlW  = implode(" AND ", $where);
            $query = "SELECT f.*,
                        COALESCE(c.nome, fo.nome, c2.nome, '') as nome_entidade
                      FROM financeiro f
                      LEFT JOIN clientes c      ON f.entidade_id = c.id
                      LEFT JOIN fornecedores fo ON f.entidade_id = fo.id
                      LEFT JOIN vendas v        ON f.venda_id = v.id
                      LEFT JOIN clientes c2     ON v.cliente_id = c2.id
                      WHERE $sqlW ORDER BY f.vencimento ASC";

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $titulos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $totalPendente = 0;
            $totalPago     = 0;
            foreach ($titulos as $t) {
                if (in_array($t['status'], ['Pendente','Parcial'])) $totalPendente += ($t['valor_total'] - $t['valor_pago']);
                if (in_array($t['status'], ['Pago','Parcial']))     $totalPago     += $t['valor_pago'];
            }

            echo json_encode(['titulos' => $titulos, 'total_pendente' => $totalPendente, 'total_pago' => $totalPago]);
        } catch (\Exception $e) {
            echo json_encode(['error' => true, 'message' => $e->getMessage(), 'titulos' => [], 'total_pendente' => 0, 'total_pago' => 0]);
        }
        break;

    case 'fin_lancar_parcelado':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) { echo json_encode(['success' => false, 'message' => 'Dados inválidos']); break; }

        $tipo            = ($data['tipo'] ?? 'R') === 'P' ? 'P' : 'R';
        $descricao       = trim($data['descricao'] ?? $data['categoria'] ?? '');
        $categoria       = trim($data['categoria'] ?? 'Geral');
        $valorTotal      = (float)($data['valor_total'] ?? 0);
        $numParcelas     = max(1, (int)($data['num_parcelas'] ?? 1));
        $primeiroVenc    = $data['primeiro_vencimento'] ?? date('Y-m-d');
        $intervaloDias   = max(1, (int)($data['intervalo_dias'] ?? 30));
        $entidadeId      = !empty($data['entidade_id']) ? (int)$data['entidade_id'] : null;
        $observacoes     = $data['observacoes'] ?? null;
        $formaPgto       = $data['forma_pagamento'] ?? $data['forma_pagamento_prevista'] ?? '01';
        // Aceita parcelas customizadas (array de {valor, vencimento})
        $parcelasCustom  = $data['parcelas'] ?? null;

        if ($valorTotal <= 0 || empty($descricao)) {
            echo json_encode(['success' => false, 'message' => 'Valor e descrição são obrigatórios']);
            break;
        }

        try {
            $pdo->beginTransaction();
            $idsCriados = [];

            if (is_array($parcelasCustom) && count($parcelasCustom) > 0) {
                $totalParcelas = count($parcelasCustom);
                foreach ($parcelasCustom as $idx => $p) {
                    $valorP = (float)($p['valor'] ?? 0);
                    $vencP  = $p['vencimento'] ?? $primeiroVenc;
                    $stmt = $pdo->prepare("INSERT INTO financeiro
                        (empresa_id, tipo, status, entidade_id, valor_total, vencimento, parcela_numero, parcela_total, forma_pagamento_prevista, categoria, observacoes)
                        VALUES (?, ?, 'Pendente', ?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$empresaId, $tipo, $entidadeId, $valorP, $vencP, $idx+1, $totalParcelas, $formaPgto, $categoria, $observacoes]);
                    $idsCriados[] = (int)$pdo->lastInsertId();
                }
            } else {
                // Gera parcelas iguais
                $valorParcela = round($valorTotal / $numParcelas, 2);
                $somaParciais = $valorParcela * ($numParcelas - 1);
                $ultimaParcela = round($valorTotal - $somaParciais, 2);

                for ($i = 1; $i <= $numParcelas; $i++) {
                    $valorP = ($i === $numParcelas) ? $ultimaParcela : $valorParcela;
                    $vencP = date('Y-m-d', strtotime($primeiroVenc . " +" . (($i-1) * $intervaloDias) . " days"));
                    $stmt = $pdo->prepare("INSERT INTO financeiro
                        (empresa_id, tipo, status, entidade_id, valor_total, vencimento, parcela_numero, parcela_total, forma_pagamento_prevista, categoria, observacoes)
                        VALUES (?, ?, 'Pendente', ?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$empresaId, $tipo, $entidadeId, $valorP, $vencP, $i, $numParcelas, $formaPgto, $categoria, $observacoes]);
                    $idsCriados[] = (int)$pdo->lastInsertId();
                }
            }

            $pdo->commit();

            // Auditoria
            if (function_exists('registrarAuditoria')) {
                $tipoTexto = $tipo === 'R' ? 'Receber' : 'Pagar';
                registrarAuditoria(
                    $pdo, $empresaId, $usuarioId ?? null, $usuarioNome ?? null,
                    'fin_lancamento_manual', 'financeiro', implode(',', $idsCriados),
                    "Lançamento manual ($tipoTexto): $descricao — Total R$ " . number_format($valorTotal, 2, ',', '.') . " em " . count($idsCriados) . "x",
                    null,
                    ['tipo' => $tipo, 'valor_total' => $valorTotal, 'parcelas' => count($idsCriados), 'descricao' => $descricao, 'ids' => $idsCriados]
                );
            }

            echo json_encode(['success' => true, 'ids' => $idsCriados]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'fin_estornar_titulo':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = (int)($data['id'] ?? $_GET['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID inválido']); break; }
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT * FROM financeiro WHERE id = ? AND empresa_id = ?");
            $stmt->execute([$id, $empresaId]);
            $titulo = $stmt->fetch();
            if (!$titulo) throw new Exception("Título não encontrado.");
            if ($titulo['status'] !== 'Pago') throw new Exception("Apenas títulos pagos podem ser estornados.");

            // 1. Reverter status do título
            $pdo->prepare("UPDATE financeiro SET status = 'Pendente', valor_pago = 0, data_baixa = NULL WHERE id = ? AND empresa_id = ?")->execute([$id, $empresaId]);
            // 2. Remover lançamentos no caixa
            $pdo->prepare("DELETE FROM caixa_movimentos WHERE financeiro_id = ? AND empresa_id = ?")->execute([$id, $empresaId]);

            $pdo->commit();

            // Auditoria
            if (function_exists('registrarAuditoria')) {
                $tipoTexto = $titulo['tipo'] === 'R' ? 'Receber' : 'Pagar';
                registrarAuditoria(
                    $pdo, $empresaId, $usuarioId ?? null, $usuarioNome ?? null,
                    'fin_estornar', 'financeiro', $id,
                    "Título $tipoTexto #$id estornado — R$ " . number_format($titulo['valor_pago'], 2, ',', '.'),
                    ['status' => 'Pago', 'valor_pago' => $titulo['valor_pago'], 'data_baixa' => $titulo['data_baixa']],
                    ['status' => 'Pendente', 'valor_pago' => 0, 'data_baixa' => null]
                );
            }

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'fin_editar_titulo':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = (int)($data['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID inválido']); break; }
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT * FROM financeiro WHERE id = ? AND empresa_id = ?");
            $stmt->execute([$id, $empresaId]);
            $titulo = $stmt->fetch();
            if (!$titulo) throw new Exception("Título não encontrado.");
            if ($titulo['status'] === 'Pago') throw new Exception("Títulos pagos não podem ser editados. Estorne primeiro.");

            $novaCategoria   = trim($data['categoria'] ?? $titulo['categoria']);
            $novoValor       = (float)($data['valor_total'] ?? $titulo['valor_total']);
            $novoVencimento  = $data['vencimento'] ?? $titulo['vencimento'];
            $novaObservacao  = $data['observacoes'] ?? $titulo['observacoes'];
            $novaForma       = $data['forma_pagamento_prevista'] ?? $titulo['forma_pagamento_prevista'];

            if ($novoValor <= 0) throw new Exception("Valor inválido.");
            if (empty($novaCategoria)) throw new Exception("Descrição é obrigatória.");

            $pdo->prepare("UPDATE financeiro SET categoria = ?, valor_total = ?, vencimento = ?, observacoes = ?, forma_pagamento_prevista = ? WHERE id = ? AND empresa_id = ?")
                ->execute([$novaCategoria, $novoValor, $novoVencimento, $novaObservacao, $novaForma, $id, $empresaId]);

            $pdo->commit();

            // Auditoria — só registra se algo mudou
            if (function_exists('registrarAuditoria')) {
                $mudou = (
                    $titulo['categoria'] !== $novaCategoria ||
                    abs((float)$titulo['valor_total'] - $novoValor) > 0.001 ||
                    $titulo['vencimento'] !== $novoVencimento ||
                    ($titulo['observacoes'] ?? '') !== ($novaObservacao ?? '') ||
                    ($titulo['forma_pagamento_prevista'] ?? '') !== ($novaForma ?? '')
                );
                if ($mudou) {
                    $tipoTexto = $titulo['tipo'] === 'R' ? 'Receber' : 'Pagar';
                    $partes = [];
                    if ($titulo['categoria'] !== $novaCategoria) $partes[] = "Descrição";
                    if (abs((float)$titulo['valor_total'] - $novoValor) > 0.001) $partes[] = "Valor: R$ " . number_format($titulo['valor_total'], 2, ',', '.') . " → R$ " . number_format($novoValor, 2, ',', '.');
                    if ($titulo['vencimento'] !== $novoVencimento) $partes[] = "Vencimento: {$titulo['vencimento']} → $novoVencimento";
                    registrarAuditoria(
                        $pdo, $empresaId, $usuarioId ?? null, $usuarioNome ?? null,
                        'fin_editar', 'financeiro', $id,
                        "Título $tipoTexto #$id editado — " . implode(' | ', $partes),
                        ['categoria' => $titulo['categoria'], 'valor_total' => $titulo['valor_total'], 'vencimento' => $titulo['vencimento'], 'observacoes' => $titulo['observacoes'], 'forma_pagamento_prevista' => $titulo['forma_pagamento_prevista']],
                        ['categoria' => $novaCategoria, 'valor_total' => $novoValor, 'vencimento' => $novoVencimento, 'observacoes' => $novaObservacao, 'forma_pagamento_prevista' => $novaForma]
                    );
                }
            }

            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'fin_excluir_titulo':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID inválido']); break; }
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT * FROM financeiro WHERE id = ? AND empresa_id = ?");
            $stmt->execute([$id, $empresaId]);
            $titulo = $stmt->fetch();
            if (!$titulo) throw new Exception("Título não encontrado.");
            // Remove movimentos de caixa associados (se já foi pago)
            $pdo->prepare("DELETE FROM caixa_movimentos WHERE financeiro_id = ? AND empresa_id = ?")->execute([$id, $empresaId]);
            $pdo->prepare("DELETE FROM financeiro WHERE id = ? AND empresa_id = ?")->execute([$id, $empresaId]);
            $pdo->commit();
            // Auditoria
            if (function_exists('registrarAuditoria')) {
                $tipoTexto = $titulo['tipo'] === 'R' ? 'Receber' : 'Pagar';
                registrarAuditoria(
                    $pdo, $empresaId, $usuarioId ?? null, $usuarioNome ?? null,
                    'fin_excluir', 'financeiro', $id,
                    "Título $tipoTexto #$id excluído — R$ " . number_format($titulo['valor_total'], 2, ',', '.') . " (status: {$titulo['status']})",
                    ['status' => $titulo['status'], 'valor_total' => $titulo['valor_total'], 'vencimento' => $titulo['vencimento']],
                    null
                );
            }
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'fin_baixar_titulo':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || !isset($data['id'])) {
            echo json_encode(['success' => false, 'message' => 'Dados incompletos']);
            break;
        }

        try {
            $pdo->beginTransaction();

            // 1. Buscar dados do título
            $stmt = $pdo->prepare("SELECT * FROM financeiro WHERE id = ? AND empresa_id = ?");
            $stmt->execute([$data['id'], $empresaId]);
            $titulo = $stmt->fetch();

            if (!$titulo) throw new Exception("Título não encontrado.");

            // 2. Atualizar título para Pago
            $stmtUp = $pdo->prepare("UPDATE financeiro SET status = 'Pago', valor_pago = ?, data_baixa = ? WHERE id = ? AND empresa_id = ?");
            $stmtUp->execute([$data['valor_pago'], $data['data_pagamento'], $data['id']]);

            // 3. Gerar movimento no Caixa
            $tipoM = $titulo['tipo'] === 'R' ? 'C' : 'D';
            $hist = ($titulo['tipo'] === 'R' ? 'Rec: ' : 'Pag: ') . $titulo['categoria'] . " #" . $titulo['id'];
            
            $stmtCaixa = $pdo->prepare("INSERT INTO caixa_movimentos (empresa_id, financeiro_id, conta_id, tipo, valor, data_movimento, forma_pagamento, historico) VALUES (?, ?, ?, ?, ?, ?, '01', ?)");
            $stmtCaixa->execute([
                $empresaId,
                $titulo['id'],
                $data['conta_id'],
                $tipoM,
                $data['valor_pago'],
                $data['data_pagamento'] . ' ' . date('H:i:s'),
                $hist
            ]);

            $pdo->commit();
            // Auditoria
            if (function_exists('registrarAuditoria')) {
                $tipoTexto = $titulo['tipo'] === 'R' ? 'Receber' : 'Pagar';
                registrarAuditoria(
                    $pdo, $empresaId, $usuarioId ?? null, $usuarioNome ?? null,
                    'fin_baixar', 'financeiro', $titulo['id'],
                    "Título $tipoTexto #" . $titulo['id'] . " baixado — R$ " . number_format($data['valor_pago'], 2, ',', '.') . " em " . $data['data_pagamento'],
                    ['status' => $titulo['status'], 'valor_pago' => $titulo['valor_pago']],
                    ['status' => 'Pago', 'valor_pago' => $data['valor_pago'], 'data_baixa' => $data['data_pagamento']]
                );
            }
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;
        
    case 'fin_resumo_dashboard':
        migrarTabelasFinanceiras($pdo);
        $hoje = date('Y-m-d');
        $resumo = [
            'pagar_hoje'    => $pdo->query("SELECT SUM(valor_total - valor_pago) FROM financeiro WHERE empresa_id=$empresaId AND tipo='P' AND status IN ('Pendente','Parcial') AND vencimento='$hoje'")->fetchColumn() ?: 0,
            'receber_hoje'  => $pdo->query("SELECT SUM(valor_total - valor_pago) FROM financeiro WHERE empresa_id=$empresaId AND tipo='R' AND status IN ('Pendente','Parcial') AND vencimento='$hoje'")->fetchColumn() ?: 0,
            'saldo_contas'  => $pdo->query("SELECT SUM(valor * IF(tipo='C', 1, -1)) FROM caixa_movimentos WHERE empresa_id=$empresaId")->fetchColumn() ?: 0,
        ];
        echo json_encode($resumo);
        break;

    case 'fin_listar_movimentos':
        migrarTabelasFinanceiras($pdo);
        $limit  = max(1, min(500, (int)($_GET['limit'] ?? 100)));
        $di     = $_GET['di'] ?? null;
        $df     = $_GET['df'] ?? null;
        $where  = ['cm.empresa_id = ?'];
        $params = [$empresaId];
        if ($di) { $where[] = 'DATE(cm.data_movimento) >= ?'; $params[] = $di; }
        if ($df) { $where[] = 'DATE(cm.data_movimento) <= ?'; $params[] = $df; }
        $sql = "SELECT cm.id, cm.tipo, cm.valor, cm.forma_pagamento, cm.historico,
                       cm.data_movimento, cm.venda_id, cm.compra_id, cm.financeiro_id,
                       cm.conta_id, cf.nome AS conta_nome
                FROM caixa_movimentos cm
                LEFT JOIN contas_financeiras cf ON cf.id = cm.conta_id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY cm.data_movimento DESC, cm.id DESC
                LIMIT $limit";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totCredito = array_sum(array_column(array_filter($rows, fn($r) => $r['tipo'] === 'C'), 'valor'));
        $totDebito  = array_sum(array_column(array_filter($rows, fn($r) => $r['tipo'] === 'D'), 'valor'));

        echo json_encode(['movimentos' => $rows, 'total_credito' => $totCredito, 'total_debito' => $totDebito]);
        break;

    case 'fin_salvar_movimento':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) { echo json_encode(['success' => false, 'message' => 'Dados inválidos']); break; }

        $id        = (int)($data['id'] ?? 0);
        $tipo      = in_array($data['tipo'] ?? '', ['C','D']) ? $data['tipo'] : null;
        $valor     = (float)($data['valor'] ?? 0);
        $historico = trim($data['historico'] ?? '');
        $forma     = $data['forma_pagamento'] ?? '01';
        $contaId   = (int)($data['conta_id'] ?? 0);
        $dataMov   = $data['data_movimento'] ?? date('Y-m-d H:i:s');

        if (!$tipo || $valor <= 0 || !$contaId) {
            echo json_encode(['success' => false, 'message' => 'Tipo, valor e conta são obrigatórios.']);
            break;
        }

        if ($id > 0) {
            // Edição — bloqueia lançamentos vinculados a venda ou compra
            $chk = $pdo->prepare("SELECT venda_id, compra_id FROM caixa_movimentos WHERE id = ? AND empresa_id = ?");
            $chk->execute([$id, $empresaId]);
            $row = $chk->fetch();
            if (!$row) { echo json_encode(['success' => false, 'message' => 'Lançamento não encontrado.']); break; }
            if ($row['venda_id'] || $row['compra_id']) {
                echo json_encode(['success' => false, 'message' => 'Lançamentos originados de vendas ou compras não podem ser editados.']);
                break;
            }
            $pdo->prepare("UPDATE caixa_movimentos SET tipo=?, valor=?, historico=?, forma_pagamento=?, conta_id=?, data_movimento=? WHERE id=? AND empresa_id=?")
                ->execute([$tipo, $valor, $historico, $forma, $contaId, $dataMov, $id, $empresaId]);
            echo json_encode(['success' => true]);
        } else {
            // Novo lançamento manual
            $pdo->prepare("INSERT INTO caixa_movimentos (empresa_id, conta_id, tipo, valor, forma_pagamento, historico, data_movimento) VALUES (?,?,?,?,?,?,?)")
                ->execute([$empresaId, $contaId, $tipo, $valor, $forma, $historico, $dataMov]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
        }
        break;

    case 'fin_excluir_movimento':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID inválido']); break; }

        $chk = $pdo->prepare("SELECT venda_id, compra_id FROM caixa_movimentos WHERE id = ? AND empresa_id = ?");
        $chk->execute([$id, $empresaId]);
        $row = $chk->fetch();
        if (!$row) { echo json_encode(['success' => false, 'message' => 'Lançamento não encontrado.']); break; }
        if ($row['venda_id'] || $row['compra_id']) {
            echo json_encode(['success' => false, 'message' => 'Lançamentos originados de vendas ou compras não podem ser excluídos.']);
            break;
        }
        $pdo->prepare("DELETE FROM caixa_movimentos WHERE id = ? AND empresa_id = ?")->execute([$id, $empresaId]);
        echo json_encode(['success' => true]);
        break;
}
