<?php
switch ($action) {

    case 'produtos':
        try { $pdo->exec("ALTER TABLE produtos DROP COLUMN percentual_tributos"); } catch (PDOException $e) {}
        try { $pdo->exec("ALTER TABLE produtos DROP COLUMN percentual_tributos_nacional"); } catch (PDOException $e) {}
        try { $pdo->exec("ALTER TABLE produtos DROP COLUMN percentual_tributos_estadual"); } catch (PDOException $e) {}
        try { $pdo->query("SELECT empresa_id FROM produtos LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE produtos ADD COLUMN empresa_id INT DEFAULT NULL, ADD INDEX idx_empresa (empresa_id)");
        }
        // Migração: atribui registros sem empresa_id à empresa da sessão (ou à primeira empresa)
        $empRef = $empresaId ?: (int)($pdo->query("SELECT id FROM empresas ORDER BY id LIMIT 1")->fetchColumn() ?: 0);
        if ($empRef) {
            $pdo->prepare("UPDATE produtos SET empresa_id=? WHERE empresa_id IS NULL")->execute([$empRef]);
        }
        try { $pdo->query("SELECT codigo_fornecedor FROM produtos LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE produtos ADD COLUMN codigo_fornecedor VARCHAR(60) DEFAULT NULL, ADD INDEX idx_cod_forn (codigo_fornecedor)");
        }
        if ($empresaId) {
            $stmt = $pdo->prepare("SELECT * FROM produtos WHERE empresa_id=? ORDER BY descricao ASC");
            $stmt->execute([$empresaId]);
        } else {
            $stmt = $pdo->query("SELECT * FROM produtos ORDER BY descricao ASC");
        }
        echo json_encode($stmt->fetchAll());
        break;

    case 'salvar_produto':
        // Migrações de colunas
        try { $pdo->query("SELECT codigo_fornecedor FROM produtos LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE produtos ADD COLUMN codigo_fornecedor VARCHAR(60) DEFAULT NULL, ADD INDEX idx_cod_forn (codigo_fornecedor)");
        }
        try { $pdo->query("SELECT custo_compra FROM produtos LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE produtos ADD COLUMN custo_compra DECIMAL(10,2) DEFAULT 0, ADD COLUMN simples_nacional DECIMAL(5,2) DEFAULT 0, ADD COLUMN despesas_operacionais DECIMAL(5,2) DEFAULT 0, ADD COLUMN frete_seguro DECIMAL(5,2) DEFAULT 0, ADD COLUMN margem_lucro DECIMAL(5,2) DEFAULT 0");
        }
        try { $pdo->query("SELECT estoque FROM produtos LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE produtos ADD COLUMN estoque DECIMAL(10,3) DEFAULT 0");
        }
        try { $pdo->query("SELECT cbs_cst FROM produtos LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE produtos ADD COLUMN cbs_cst VARCHAR(10) DEFAULT NULL, ADD COLUMN cbs_classtrib VARCHAR(20) DEFAULT NULL, ADD COLUMN ibs_cst VARCHAR(10) DEFAULT NULL, ADD COLUMN ibs_classtrib VARCHAR(20) DEFAULT NULL, ADD COLUMN ccredpres VARCHAR(10) DEFAULT NULL");
        }
        try { $pdo->query("SELECT pis_cst FROM produtos LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE produtos ADD COLUMN pis_cst VARCHAR(2) DEFAULT NULL, ADD COLUMN pis_aliquota DECIMAL(10,4) DEFAULT 0, ADD COLUMN cofins_cst VARCHAR(2) DEFAULT NULL, ADD COLUMN cofins_aliquota DECIMAL(10,4) DEFAULT 0, ADD COLUMN origem_mercadoria TINYINT DEFAULT 0");
        }
        $data = json_decode(file_get_contents('php://input'), true);

        $custoCopra  = (float)($data['custoCopra'] ?? 0);
        $simplesNac  = (float)($data['simplesNacional'] ?? 0);
        $despesasOp  = (float)($data['despesasOperacionais'] ?? 0);
        $freteSeguro = (float)($data['freteSeguro'] ?? 0);
        $margemLucro = (float)($data['margemLucro'] ?? 0);
        $estoque     = (float)($data['estoque'] ?? 0);
        $cbsCst      = $data['cbsCst'] ?? null;
        $cbsClasstrib = $data['cbsClasstrib'] ?? null;
        $ibsCst      = $data['ibsCst'] ?? null;
        $ibsClasstrib = $data['ibsClasstrib'] ?? null;
        $ccredpres   = $data['cCredPres'] ?? null;
        $codForn     = $data['codigoFornecedor'] ?? null;

        if (isset($data['id']) && $data['id'] > 0) {
            // Captura estado antes para auditoria
            $auditAntes = null;
            try {
                $stmtAnt = $pdo->prepare("SELECT descricao, valor_unitario, custo_compra, estoque FROM produtos WHERE id = ?");
                $stmtAnt->execute([$data['id']]);
                $auditAntes = $stmtAnt->fetch();
            } catch (Throwable $e) {}

            $stmt = $pdo->prepare("UPDATE produtos SET codigo_interno=?, codigo_barras=?, descricao=?, ncm=?, unidade_comercial=?, valor_unitario=?, cfop=?, icms_cst_csosn=?, custo_compra=?, simples_nacional=?, despesas_operacionais=?, frete_seguro=?, margem_lucro=?, estoque=?, cbs_cst=?, cbs_classtrib=?, ibs_cst=?, ibs_classtrib=?, ccredpres=?, codigo_fornecedor=? WHERE id=?" . ($empresaId ? " AND empresa_id=?" : ""));
            $params = [$data['codigoInterno'], $data['codigoBarras'] ?? null, $data['descricao'], $data['ncm'], $data['unidadeComercial'], $data['valorUnitario'], $data['cfop'], $data['icmsCstCsosn'], $custoCopra, $simplesNac, $despesasOp, $freteSeguro, $margemLucro, $estoque, $cbsCst, $cbsClasstrib, $ibsCst, $ibsClasstrib, $ccredpres, $codForn, $data['id']];
            if ($empresaId) $params[] = $empresaId;
            $stmt->execute($params);

            // Auditoria — só registra se houve mudança em preço, custo ou estoque
            if (function_exists('registrarAuditoria') && $auditAntes) {
                $precoAntes  = (float)$auditAntes['valor_unitario'];
                $precoDepois = (float)$data['valorUnitario'];
                $custoAntes  = (float)$auditAntes['custo_compra'];
                $custoDepois = $custoCopra;
                $estoqueAntes  = (float)$auditAntes['estoque'];
                $estoqueDepois = $estoque;
                $mudouPreco   = abs($precoAntes - $precoDepois) > 0.001;
                $mudouCusto   = abs($custoAntes - $custoDepois) > 0.001;
                $mudouEstoque = abs($estoqueAntes - $estoqueDepois) > 0.001;
                if ($mudouPreco || $mudouCusto || $mudouEstoque) {
                    $partes = [];
                    if ($mudouPreco)   $partes[] = "Preço: R$ " . number_format($precoAntes, 2, ',', '.') . " → R$ " . number_format($precoDepois, 2, ',', '.');
                    if ($mudouCusto)   $partes[] = "Custo: R$ " . number_format($custoAntes, 2, ',', '.') . " → R$ " . number_format($custoDepois, 2, ',', '.');
                    if ($mudouEstoque) $partes[] = "Estoque: " . number_format($estoqueAntes, 3, ',', '.') . " → " . number_format($estoqueDepois, 3, ',', '.');
                    registrarAuditoria(
                        $pdo, $empresaId, $usuarioId ?? null, $usuarioNome ?? null,
                        'alterar_produto', 'produto', (int)$data['id'],
                        ($auditAntes['descricao'] ?? '') . " — " . implode(' | ', $partes),
                        ['valor_unitario' => $precoAntes, 'custo_compra' => $custoAntes, 'estoque' => $estoqueAntes],
                        ['valor_unitario' => $precoDepois, 'custo_compra' => $custoDepois, 'estoque' => $estoqueDepois]
                    );
                }
            }
        } else {
            // Auto-gera código interno sequencial por empresa se não informado
            $codigoInterno = trim($data['codigoInterno'] ?? '');
            if (empty($codigoInterno)) {
                $empRef = $empresaId ?: 0;
                $maxStmt = $pdo->prepare("SELECT MAX(CAST(codigo_interno AS UNSIGNED)) FROM produtos WHERE empresa_id = ?");
                $maxStmt->execute([$empRef]);
                $maxCod = (int)$maxStmt->fetchColumn();
                $codigoInterno = str_pad($maxCod + 1, 6, '0', STR_PAD_LEFT);
            } else {
                $codigoInterno = str_pad($codigoInterno, 6, '0', STR_PAD_LEFT);
            }
            $stmt = $pdo->prepare("INSERT INTO produtos (empresa_id, codigo_interno, codigo_barras, descricao, ncm, unidade_comercial, valor_unitario, cfop, icms_cst_csosn, custo_compra, simples_nacional, despesas_operacionais, frete_seguro, margem_lucro, estoque, cbs_cst, cbs_classtrib, ibs_cst, ibs_classtrib, ccredpres, codigo_fornecedor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$empresaId ?: null, $codigoInterno, $data['codigoBarras'] ?? null, $data['descricao'], $data['ncm'], $data['unidadeComercial'], $data['valorUnitario'], $data['cfop'], $data['icmsCstCsosn'], $custoCopra, $simplesNac, $despesasOp, $freteSeguro, $margemLucro, $estoque, $cbsCst, $cbsClasstrib, $ibsCst, $ibsClasstrib, $ccredpres, $codForn]);
        }

        echo json_encode(['success' => true]);
        break;

    case 'excluir_produto':
        $id = (int)($_GET['id'] ?? 0);
        if ($empresaId) {
            $pdo->prepare("DELETE FROM produtos WHERE id=? AND empresa_id=?")->execute([$id, $empresaId]);
        } else {
            $pdo->prepare("DELETE FROM produtos WHERE id=?")->execute([$id]);
        }
        echo json_encode(['success' => true]);
        break;

}
