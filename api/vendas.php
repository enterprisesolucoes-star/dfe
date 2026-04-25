<?php
use App\Services\NfceService;
use App\Services\NfeService;
use App\Services\PrinterService;

/**
 * Busca registro da empresa respeitando o isolamento multi-tenant.
 * $pdo, $empresaId disponíveis via api.php (escopo include).
 */
function fetchEmpresaDb(PDO $pdo, int $empresaId): array|false {
    if ($empresaId > 0) {
        $s = $pdo->prepare("SELECT * FROM empresas WHERE id=?");
        $s->execute([$empresaId]);
        return $s->fetch();
    }
    // Admin sem empresa vinculada: usa a primeira cadastrada
    return $pdo->query("SELECT * FROM empresas LIMIT 1")->fetch();
}
$empresaDb = fetchEmpresaDb($pdo, $empresaId);

switch ($action) {

    case 'vendas':
        $where = ["v.modelo = 65"];
        $params = [];

        if ($empresaId) {
            // Usuário vinculado a uma empresa: filtra apenas os registros dela
            $where[] = "v.empresa_id = ?";
            $params[] = $empresaId;
        } elseif ($usuarioPerfil !== 'admin') {
            // Operador sem empresa_id não pode ver nenhuma nota
            echo json_encode([]);
            break;
        }
        // Admin sem empresa_id: sem filtro de empresa (vê todas)

        $di = $_GET['data_inicio'] ?? '';
        $df = $_GET['data_fim'] ?? '';

        if ($di) {
            $where[] = "DATE(v.data_emissao) >= ?";
            $params[] = $di;
        }
        if ($df) {
            $where[] = "DATE(v.data_emissao) <= ?";
            $params[] = $df;
        }

        $sqlWhere = implode(" AND ", $where);
        $stmt = $pdo->prepare("
            SELECT v.*,
                   (SELECT COUNT(*) FROM vendas_pagamentos vp
                    WHERE vp.venda_id = v.id
                      AND vp.forma_pagamento IN ('03','04','10','11','12','13','15','17')
                   ) AS tem_tef,
                   c.email AS cliente_email
            FROM vendas v
            LEFT JOIN clientes c ON c.id = v.cliente_id
            WHERE $sqlWhere
            ORDER BY v.data_emissao DESC
            LIMIT 1000
        ");
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
        break;

    case 'emitir':
        // Garantir que colunas de desconto/troco existam (migração)
        try { $pdo->query("SELECT valor_desconto FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN valor_desconto DECIMAL(10,2) DEFAULT 0");
        }
        try { $pdo->query("SELECT valor_troco FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN valor_troco DECIMAL(10,2) DEFAULT 0");
        }
        try { $pdo->query("SELECT empresa_id FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN empresa_id INT DEFAULT NULL");
        }
        // Migração: colunas críticas de vendas
        $vendasCols = [
            'xml_autorizado MEDIUMTEXT DEFAULT NULL',
            'xml_cancelamento MEDIUMTEXT DEFAULT NULL',
            'protocolo_cancelamento VARCHAR(20) DEFAULT NULL',
            'justificativa_cancelamento VARCHAR(255) DEFAULT NULL',
            'data_cancelamento DATETIME DEFAULT NULL',
            'usuario_id INT DEFAULT NULL',
            'caixa_id INT DEFAULT NULL',
            'modelo TINYINT DEFAULT 65 COMMENT \'55=NF-e, 65=NFC-e\'',
        ];
        foreach ($vendasCols as $col) {
            $colName = explode(' ', $col)[0];
            try { $pdo->query("SELECT $colName FROM vendas LIMIT 1"); } catch (PDOException $e) {
                $pdo->exec("ALTER TABLE vendas ADD COLUMN $col");
            }
        }
        // Migração: colunas de tributos em vendas_itens
        $itensCols = [
            'percentual_tributos_nacional DECIMAL(5,2) DEFAULT 0',
            'percentual_tributos_estadual DECIMAL(5,2) DEFAULT 0',
            'vbc_icms DECIMAL(10,2) DEFAULT 0',
            'aliq_icms DECIMAL(10,2) DEFAULT 0',
            'valor_icms DECIMAL(10,2) DEFAULT 0',
            'vbc_pis DECIMAL(10,2) DEFAULT 0',
            'aliq_pis DECIMAL(10,2) DEFAULT 0',
            'valor_pis DECIMAL(10,2) DEFAULT 0',
            'vbc_cofins DECIMAL(10,2) DEFAULT 0',
            'aliq_cofins DECIMAL(10,2) DEFAULT 0',
            'valor_cofins DECIMAL(10,2) DEFAULT 0',
            'vbc_ipi DECIMAL(10,2) DEFAULT 0',
            'aliq_ipi DECIMAL(10,2) DEFAULT 0',
            'valor_ipi DECIMAL(10,2) DEFAULT 0',
            'ncm VARCHAR(10) DEFAULT NULL',
            'cfop VARCHAR(4) DEFAULT NULL',
            'unidade VARCHAR(6) DEFAULT NULL',
            'origem TINYINT DEFAULT 0',
            'cbs_cst VARCHAR(2) DEFAULT NULL',
            'cbs_classtrib VARCHAR(10) DEFAULT NULL',
        ];
        foreach ($itensCols as $col) {
            $colName = explode(' ', $col)[0];
            try { $pdo->query("SELECT $colName FROM vendas_itens LIMIT 1"); } catch (PDOException $e) {
                $pdo->exec("ALTER TABLE vendas_itens ADD COLUMN $col");
            }
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            echo json_encode(['success' => false, 'message' => 'Dados inválidos']);
            exit;
        }

        $venda = $data['venda'];

        // Buscar dados do emitente e certificado direto do banco (segurança e integridade)
        $empresaDb = fetchEmpresaDb($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['certificado_pfx'])) {
            echo json_encode(['success' => false, 'message' => 'Certificado digital não configurado/inválido. Acesse as configurações e realize o upload do PFX.']);
            exit;
        }

        // DDL fora da transação (CREATE TABLE causa commit implícito no MySQL)
        $contaIdFin = garantirContaFinanceira($pdo, (int)$empresaDb['id']);

        try {
            $pdo->beginTransaction();

            // Trava o registro da empresa para garantir a fila da numeração
            $stmt = $empresaId
                ? $pdo->prepare("SELECT numero_nfce, serie_nfce FROM empresas WHERE id=? FOR UPDATE")
                : $pdo->prepare("SELECT numero_nfce, serie_nfce FROM empresas ORDER BY id ASC LIMIT 1 FOR UPDATE");
            $stmt->execute($empresaId ? [$empresaId] : []);
            $empresaLocked = $stmt->fetch();

            // Sobrescreve pelo controle estrito do backend
            $venda['numero'] = (int)$empresaLocked['numero_nfce'] + 1;
            $venda['serie'] = (int)$empresaLocked['serie_nfce'] > 0 ? (int)$empresaLocked['serie_nfce'] : 1;

            $dtBanco = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
            $dataEmissaoSql = $dtBanco->format('Y-m-d H:i:s');

            $usuarioIdV = (int)($venda['usuarioId'] ?? 0) ?: null;
            $caixaIdV   = (int)($venda['caixaId']   ?? 0) ?: null;

            // Insere venda com todos os campos fiscais (sincronizado com nfe.php)
            $stmt = $pdo->prepare("
                INSERT INTO vendas 
                    (empresa_id, modelo, numero, serie, valor_total, valor_desconto, 
                     valor_frete, valor_seguro, valor_outras, valor_ipi, valor_icms, valor_pis, valor_cofins,
                     vbc_icms, vbc_pis, vbc_cofins, vbc_ipi,
                     natureza_operacao, status, data_emissao, usuario_id, caixa_id) 
                VALUES (?, 65, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VENDA CONSUMIDOR - NFCE', 'Pendente', ?, ?, ?)
            ");
            $stmt->execute([
                $empresaDb['id'], 
                $venda['numero'], 
                $venda['serie'], 
                (float)($venda['valorTotal'] ?? 0), 
                (float)($venda['valorDesconto'] ?? 0),
                (float)($venda['valorFrete'] ?? 0),
                (float)($venda['valorSeguro'] ?? 0),
                (float)($venda['valorOutras'] ?? 0),
                (float)($venda['valorIPI'] ?? 0),
                (float)($venda['valorICMS'] ?? 0),
                (float)($venda['valorPIS'] ?? 0),
                (float)($venda['valorCOFINS'] ?? 0),
                (float)($venda['vbcICMS'] ?? 0),
                (float)($venda['vbcPIS'] ?? 0),
                (float)($venda['vbcCOFINS'] ?? 0),
                (float)($venda['vbcIPI'] ?? 0),
                $dataEmissaoSql, 
                $usuarioIdV, 
                $caixaIdV
            ]);
            $vendaId = $pdo->lastInsertId();
            $venda['id'] = $vendaId;

            foreach ($venda['itens'] as $item) {
                // Enriquecimento do item com dados do cadastro para persistência completa
                $stmtP = $pdo->prepare("SELECT * FROM produtos WHERE id = ?");
                $stmtP->execute([(int) ($item['produtoId'] ?? 0)]);
                $prod = $stmtP->fetch() ?: [];
                $item = array_merge($prod, $item);

                $stmt = $pdo->prepare("
                    INSERT INTO vendas_itens
                        (venda_id, produto_id, quantidade, valor_unitario, valor_total,
                         percentual_tributos_nacional, percentual_tributos_estadual,
                         vbc_icms, aliq_icms, valor_icms,
                         vbc_pis, aliq_pis, valor_pis,
                         vbc_cofins, aliq_cofins, valor_cofins,
                         vbc_ipi, aliq_ipi, valor_ipi,
                         ncm, cfop, unidade, origem,
                         cbs_cst, cbs_classtrib)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ");
                $stmt->execute([
                    $vendaId,
                    (int) ($item['produto_id'] ?? $item['produtoId'] ?? 0),
                    (float) ($item['quantidade'] ?? 1),
                    (float) ($item['valor_unitario'] ?? $item['valorUnitario'] ?? 0),
                    (float) ($item['valor_total'] ?? $item['valorTotal'] ?? 0),
                    (float) ($item['percentual_tributos_nacional'] ?? $item['percentualTributosNacional'] ?? 0),
                    (float) ($item['percentual_tributos_estadual'] ?? $item['percentualTributosEstadual'] ?? 0),
                    (float) ($item['vbc_icms'] ?? $item['valor_total'] ?? $item['valorTotal'] ?? 0),
                    (float) ($item['aliq_icms'] ?? $item['icms_aliquota'] ?? 0),
                    (float) ($item['valor_icms'] ?? 0),
                    (float) ($item['vbc_pis'] ?? $item['valor_total'] ?? $item['valorTotal'] ?? 0),
                    (float) ($item['aliq_pis'] ?? $item['pis_aliquota'] ?? 0),
                    (float) ($item['valor_pis'] ?? 0),
                    (float) ($item['vbc_cofins'] ?? $item['valor_total'] ?? $item['valorTotal'] ?? 0),
                    (float) ($item['aliq_cofins'] ?? $item['cofins_aliquota'] ?? 0),
                    (float) ($item['valor_cofins'] ?? 0),
                    (float) ($item['vbc_ipi'] ?? $item['valor_total'] ?? $item['valorTotal'] ?? 0),
                    (float) ($item['aliq_ipi'] ?? $item['ipi_aliquota'] ?? 0),
                    (float) ($item['valor_ipi'] ?? 0),
                    $item['ncm'] ?? $item['NCM'] ?? null,
                    $item['cfop'] ?? null,
                    $item['unidade_comercial'] ?? $item['unidade'] ?? null,
                    (int) ($item['origem_mercadoria'] ?? $item['origem'] ?? 0),
                    $item['cbs_cst'] ?? $item['cbsCst'] ?? null,
                    $item['cbs_classtrib'] ?? $item['cbsClasstrib'] ?? null,
                ]);
                $vendaItemId = $pdo->lastInsertId();

                // Persiste detalhamento RTC (IBS/CBS/IS) se houver alíquotas
                if (!empty($aliquotasRtc)) {
                    $baseRTC = (float)($item['vbc_icms'] ?? $item['valor_total'] ?? $item['valorTotal'] ?? 0);
                    if (isset($aliquotasRtc['CBS'])) {
                        $pCBS = $aliquotasRtc['CBS'];
                        $vCBS = round($baseRTC * ($pCBS / 100), 2);
                        $pdo->prepare("INSERT INTO vendas_itens_cbs (venda_item_id, base_calculo, aliquota, valor) VALUES (?,?,?,?)")->execute([$vendaItemId, $baseRTC, $pCBS, $vCBS]);
                    }
                    $pIBS = ($aliquotasRtc['IBS_UF'] ?? 0) + ($aliquotasRtc['IBS_MUNICIPAL'] ?? 0);
                    if ($pIBS > 0) {
                        $vIBS = round($baseRTC * ($pIBS / 100), 2);
                        $pdo->prepare("INSERT INTO vendas_itens_ibs (venda_item_id, base_calculo, aliquota, valor) VALUES (?,?,?,?)")->execute([$vendaItemId, $baseRTC, $pIBS, $vIBS]);
                    }
                }
            }

            foreach (($venda['pagamentos'] ?? []) as $pag) {
                $fPag = $pag['forma_pagamento'] ?? $pag['formaPagamento'];
                $vPag = (float)($pag['valor_pagamento'] ?? $pag['valorPagamento']);

                $stmt = $pdo->prepare("INSERT INTO vendas_pagamentos (venda_id, forma_pagamento, valor_pagamento, tp_integra, t_band, c_aut) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $vendaId, 
                    $fPag, 
                    $vPag,
                    $pag['tp_integra'] ?? ($isTefRequired ? 1 : 2),
                    $pag['t_band'] ?? $pag['tBand'] ?? null,
                    $pag['c_aut'] ?? $pag['cAut'] ?? null
                ]);
            }

            // ... (emissão e lógica de contingência) ...

            // Enriquecer itens com dados do produto para o serviço de emissão
            $itensEnriquecidos = [];
            foreach ($venda['itens'] as $item) {
                $stmtP = $pdo->prepare("SELECT * FROM produtos WHERE id = ?");
                $stmtP->execute([$item['produtoId'] ?? $item['produto_id'] ?? 0]);
                $prod = $stmtP->fetch() ?: [];
                $item = array_merge($prod, $item);
                $item['valor_unitario'] = $item['valorUnitario'] ?? $item['valor_unitario'] ?? 0;
                $itensEnriquecidos[] = $item;
            }

            // Buscar alíquotas RTC vigentes (CBS/IBS — Reforma Tributária)
            $aliquotasRtc = [];
            try {
                $hoje = (new \DateTime('now', new \DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
                $stmtAliq = $pdo->query("SELECT imposto, percentual FROM rtc_aliquotas WHERE d_ini_vig <= '{$hoje}' AND (d_fim_vig IS NULL OR d_fim_vig >= '{$hoje}')");
                foreach ($stmtAliq->fetchAll() as $aliqRow) {
                    $aliquotasRtc[$aliqRow['imposto']] = (float)$aliqRow['percentual'];
                }
            } catch (\Exception $e) { /* tabela ainda não existe */ }

            // Chamar o serviço de emissão conforme a API configurada
            $isContingencia = (isset($empresaDb['emissao_contingencia']) && $empresaDb['emissao_contingencia'] == 1);
            $destinatario = !empty($venda['destinatario']) ? $venda['destinatario'] : null;

            // Chamar o serviço de emissão (Padrão: NFePHP)
            $isContingencia = (isset($empresaDb['emissao_contingencia']) && $empresaDb['emissao_contingencia'] == 1);
            $destinatario = !empty($venda['destinatario']) ? $venda['destinatario'] : null;

            $service = new NfceService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
            $resultado = $service->emitirNfce($venda, $itensEnriquecidos, $destinatario, $isContingencia, $aliquotasRtc);

            // Fallback para contingência em caso de erro de conexão com SEFAZ (apenas NFePHP)
            if (!$resultado->sucesso && $resultado->status === 'ErroConexao' && !$isContingencia) {
                // Pagamentos eletrônicos (cartão/PIX) já aprovados: SEMPRE gera contingência
                // pois o dinheiro já foi capturado e o documento fiscal precisa ser emitido
                $formasEletronicas = ['03','04','10','11','12','13','15','17']; // crédito, débito, VA, VR, VP, VC, boleto, PIX
                $temPagamentoEletronico = false;
                foreach (($venda['pagamentos'] ?? []) as $pag) {
                    if (in_array($pag['formaPagamento'], $formasEletronicas)) {
                        $temPagamentoEletronico = true;
                        break;
                    }
                }
                // Para pagamento eletrônico: sempre contingência. Para dinheiro: só se configurado.
                if ($temPagamentoEletronico || (!isset($empresaDb['contingencia_automatica']) || $empresaDb['contingencia_automatica'] == 1)) {
                    $resultado = $service->emitirNfce($venda, $itensEnriquecidos, $destinatario, true, $aliquotasRtc);
                }
            }

            if ($resultado->sucesso) {
                $statusSalvar = $resultado->status === 'Contingencia' ? 'Contingencia' : 'Autorizada';
                $chaveAcesso = (string)($resultado->chave_acesso ?? '');
                $stmt = $pdo->prepare("UPDATE vendas SET status = ?, protocolo = ?, chave_acesso = ?, xml_autorizado = ? WHERE id = ?");
                $stmt->execute([$statusSalvar, $resultado->protocolo, $chaveAcesso, $resultado->xml_assinado, $vendaId]);

                $stmt = $pdo->prepare("UPDATE empresas SET numero_nfce = ? WHERE id = ?");
                $stmt->execute([$venda['numero'], $empresaDb['id']]);

                // Baixa de estoque para cada item da venda
                try { $pdo->query("SELECT estoque FROM produtos LIMIT 1"); } catch (PDOException $e2) {
                    $pdo->exec("ALTER TABLE produtos ADD COLUMN estoque DECIMAL(10,3) DEFAULT 0");
                }
                foreach ($venda['itens'] as $item) {
                    $pdo->prepare("UPDATE produtos SET estoque = GREATEST(0, estoque - ?) WHERE id = ?")
                        ->execute([$item['quantidade'], $item['produtoId']]);
                }

                // INTEGRAÇÃO FINANCEIRA SÓ NO SUCESSO
                $formasParceladas = ['05', '15'];
                foreach (($venda['pagamentos'] ?? []) as $pag) {
                    $fPag = $pag['forma_pagamento'] ?? $pag['formaPagamento'];
                    $vPag = (float)($pag['valor_pagamento'] ?? $pag['valorPagamento']);
                    $parcelas = $pag['parcelas'] ?? [];

                    // Forma parcelada sem parcelas enviadas → cria parcela única com 30 dias
                    if (empty($parcelas) && in_array($fPag, $formasParceladas) && $vPag > 0) {
                        $parcelas = [[
                            'numero'     => '001',
                            'vencimento' => date('Y-m-d', strtotime('+30 days')),
                            'valor'      => $vPag,
                        ]];
                    }

                    if (!empty($parcelas)) {
                        $totalParts = count($parcelas);
                        foreach ($parcelas as $p) {
                            $stmtFin = $pdo->prepare("INSERT INTO financeiro (empresa_id, venda_id, tipo, status, valor_total, vencimento, parcela_numero, parcela_total, forma_pagamento_prevista, entidade_id, categoria) VALUES (?, ?, 'R', 'Pendente', ?, ?, ?, ?, ?, ?, 'Venda NFC-e')");
                            $stmtFin->execute([$empresaDb['id'], $vendaId, $p['valor'], $p['vencimento'], $p['numero'], $totalParts, $fPag, $venda['clienteId'] ?? null]);
                        }
                    } elseif ($contaIdFin) {
                        $hist = "Venda NFC-e #" . $venda['numero'];
                        $pdo->prepare("INSERT INTO caixa_movimentos (empresa_id, venda_id, conta_id, tipo, valor, forma_pagamento, historico, usuario_id) VALUES (?, ?, ?, 'C', ?, ?, ?, ?)")
                            ->execute([$empresaDb['id'], $vendaId, $contaIdFin, $vPag, $fPag, $hist, $usuarioIdV]);
                    }
                }

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'id' => $vendaId,
                    'status' => $statusSalvar,
                    'protocolo' => $resultado->protocolo,
                    'chaveAcesso' => $chaveAcesso,
                    'xml' => base64_encode($resultado->xml_assinado)
                ]);
            } else {
                $statusRej = ($resultado->status ?? 'Rejeitada');
                $stmt = $pdo->prepare("UPDATE vendas SET status = ? WHERE id = ?");
                $stmt->execute([$statusRej, $vendaId]);

                if (strpos($resultado->mensagem_erro ?? '', '539') !== false || strpos($resultado->mensagem_erro ?? '', 'diferença na Chave') !== false) {
                    $stmt = $pdo->prepare("UPDATE empresas SET numero_nfce = ? WHERE id = ?");
                    $stmt->execute([$venda['numero'], $empresaDb['id']]);
                }

                $pdo->commit();

                echo json_encode([
                    'success' => false,
                    'message' => 'Rejeição SEFAZ: ' . $resultado->mensagem_erro
                ]);

                // Notifica desenvolvedor em caso de falha (.env)
                notificarRejeicaoSefaz($empresaDb, $venda, $resultado->mensagem_erro, $resultado->xml_assinado);
            }
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['success' => false, 'message' => 'Erro interno de emissão PHP: ' . $e->getMessage() . ' na linha ' . $e->getLine() . ' de ' . $e->getFile()]);
        }
        break;

    // Salva venda + itens + pagamentos sem emitir NFC-e (para fluxo TEF)
    case 'salvar_pendente':
        try { $pdo->query("SELECT valor_desconto FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN valor_desconto DECIMAL(10,2) DEFAULT 0");
        }
        try { $pdo->query("SELECT empresa_id FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN empresa_id INT DEFAULT NULL");
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            echo json_encode(['success' => false, 'message' => 'Dados inválidos']);
            exit;
        }

        $venda = $data['venda'];

        try {
            $pdo->beginTransaction();

            $stmt = $empresaId
                ? $pdo->prepare("SELECT numero_nfce, serie_nfce, id FROM empresas WHERE id=? FOR UPDATE")
                : $pdo->prepare("SELECT numero_nfce, serie_nfce, id FROM empresas ORDER BY id ASC LIMIT 1 FOR UPDATE");
            $stmt->execute($empresaId ? [$empresaId] : []);
            $empresaLocked = $stmt->fetch();

            $venda['numero'] = (int)$empresaLocked['numero_nfce'] + 1;
            $venda['serie']  = (int)$empresaLocked['serie_nfce'] > 0 ? (int)$empresaLocked['serie_nfce'] : 1;

            $dtBanco = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
            $dataEmissaoSql = $dtBanco->format('Y-m-d H:i:s');

            $stmt = $pdo->prepare("INSERT INTO vendas (empresa_id, modelo, numero, serie, valor_total, valor_desconto, natureza_operacao, status, data_emissao) VALUES (?, 65, ?, ?, ?, ?, 'VENDA CONSUMIDOR - NFCE', 'PendenteTEF', ?)");
            $stmt->execute([$empresaLocked['id'], $venda['numero'], $venda['serie'], $venda['valorTotal'], $venda['valorDesconto'] ?? 0, $dataEmissaoSql]);
            $vendaId = $pdo->lastInsertId();

            foreach ($venda['itens'] as $item) {
                $stmt = $pdo->prepare("
                    INSERT INTO vendas_itens
                        (venda_id, produto_id, quantidade, valor_unitario, valor_total,
                         percentual_tributos_nacional, percentual_tributos_estadual,
                         vbc_icms, aliq_icms, valor_icms,
                         vbc_pis, aliq_pis, valor_pis,
                         vbc_cofins, aliq_cofins, valor_cofins,
                         vbc_ipi, aliq_ipi, valor_ipi,
                         ncm, cfop, unidade, origem,
                         cbs_cst, cbs_classtrib)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ");
                $stmt->execute([
                    $vendaId,
                    (int) ($item['produtoId'] ?? 0),
                    (float) ($item['quantidade'] ?? 1),
                    (float) ($item['valorUnitario'] ?? 0),
                    (float) ($item['valorTotal'] ?? 0),
                    (float) ($item['percentualTributosNacional'] ?? 0),
                    (float) ($item['percentualTributosEstadual'] ?? 0),
                    (float) ($item['vbc_icms'] ?? 0),
                    (float) ($item['aliq_icms'] ?? 0),
                    (float) ($item['valor_icms'] ?? 0),
                    (float) ($item['vbc_pis'] ?? 0),
                    (float) ($item['aliq_pis'] ?? 0),
                    (float) ($item['valor_pis'] ?? 0),
                    (float) ($item['vbc_cofins'] ?? 0),
                    (float) ($item['aliq_cofins'] ?? 0),
                    (float) ($item['valor_cofins'] ?? 0),
                    (float) ($item['vbc_ipi'] ?? 0),
                    (float) ($item['aliq_ipi'] ?? 0),
                    (float) ($item['valor_ipi'] ?? 0),
                    $item['ncm'] ?? $item['NCM'] ?? null,
                    $item['cfop'] ?? null,
                    $item['unidade'] ?? null,
                    (int) ($item['origem'] ?? 0),
                    $item['cbsCst'] ?? $item['cbs_cst'] ?? null,
                    $item['cbsClasstrib'] ?? $item['cbs_classtrib'] ?? null,
                ]);
            }

            $pagamentosTefIds = [];
            foreach (($venda['pagamentos'] ?? []) as $pag) {
                $stmt = $pdo->prepare("INSERT INTO vendas_pagamentos (venda_id, forma_pagamento, valor_pagamento, status_pagamento) VALUES (?, ?, ?, 0)");
                $stmt->execute([$vendaId, $pag['formaPagamento'], $pag['valorPagamento']]);
                if (in_array($pag['formaPagamento'], ['03', '04', '17'])) {
                    $pagamentosTefIds[] = (int)$pdo->lastInsertId();
                }
            }

            $pdo->commit();

            echo json_encode([
                'success'       => true,
                'vendaId'       => $vendaId,
                'pagamentoId'   => $pagamentosTefIds[0] ?? null, // backwards compat
                'pagamentosIds' => $pagamentosTefIds,
                'numero'        => $venda['numero']
            ]);
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Erro ao salvar venda pendente: ' . $e->getMessage()]);
        }
        break;

    // Emite NFC-e para venda já salva no banco (após aprovação TEF)
    case 'emitir_pendente':
        $vendaId = (int)($_GET['id'] ?? 0);
        if ($vendaId <= 0) {
            echo json_encode(['success' => false, 'message' => 'ID de venda inválido']);
            exit;
        }

        $empresaDb = fetchEmpresaDb($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['certificado_pfx'])) {
            echo json_encode(['success' => false, 'message' => 'Certificado digital não configurado.']);
            exit;
        }

        // Carrega venda
        $stmt = $pdo->prepare("SELECT * FROM vendas WHERE id = ?");
        $stmt->execute([$vendaId]);
        $vendaDb = $stmt->fetch();
        if (!$vendaDb) {
            echo json_encode(['success' => false, 'message' => 'Venda não encontrada']);
            exit;
        }

        // Carrega itens com dados completos do produto (NCM, CFOP, tributos, RTC etc.)
        $stmt = $pdo->prepare("
            SELECT vi.*, p.codigo_interno, p.descricao, p.ncm, p.cfop,
                   p.unidade_comercial, p.icms_cst_csosn,
                   p.cbs_cst, p.cbs_classtrib, p.ibs_cst, p.ibs_classtrib, p.ccredpres
            FROM vendas_itens vi
            LEFT JOIN produtos p ON p.id = vi.produto_id
            WHERE vi.venda_id = ?
        ");
        $stmt->execute([$vendaId]);
        $itensDb = $stmt->fetchAll();

        // Carrega pagamentos com dados TEF
        $stmt = $pdo->prepare("SELECT * FROM vendas_pagamentos WHERE venda_id = ?");
        $stmt->execute([$vendaId]);
        $pagsDb = $stmt->fetchAll();

        $pdo->exec("CREATE TABLE IF NOT EXISTS vendas_itens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            venda_id INT NOT NULL,
            produto_id INT NOT NULL,
            quantidade DECIMAL(10,3) NOT NULL,
            valor_unitario DECIMAL(10,2) NOT NULL,
            valor_total DECIMAL(10,2) NOT NULL,
            percentual_tributos_nacional DECIMAL(5,2) DEFAULT 0,
            percentual_tributos_estadual DECIMAL(5,2) DEFAULT 0
        )");
        try { $pdo->query("SELECT percentual_tributos_nacional FROM vendas_itens LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas_itens ADD COLUMN percentual_tributos_nacional DECIMAL(5,2) DEFAULT 0, ADD COLUMN percentual_tributos_estadual DECIMAL(5,2) DEFAULT 0");
        }

        $itens = array_map(function($i) {
            return [
                'id'                  => $i['id'],
                'vendaId'             => $i['venda_id'],
                'produtoId'           => $i['produto_id'],
                'quantidade'          => (float)$i['quantidade'],
                'valorUnitario'       => (float)$i['valor_unitario'],
                'valorTotal'          => (float)$i['valor_total'],
                'valorDesconto'       => 0,
                'codigo_interno'      => $i['codigo_interno'] ?? null,
                'descricao'           => $i['descricao'] ?? null,
                'ncm'                 => $i['ncm'] ?? null,
                'cfop'                => $i['cfop'] ?? null,
                'unidade_comercial'   => $i['unidade_comercial'] ?? null,
                'icms_cst_csosn'      => $i['icms_cst_csosn'] ?? null,
                'percentual_tributos' => (float)(($i['percentual_tributos_nacional'] ?? 0) + ($i['percentual_tributos_estadual'] ?? 0)),
                'percentualTributosNacional' => (float)($i['percentual_tributos_nacional'] ?? 0),
                'percentualTributosEstadual' => (float)($i['percentual_tributos_estadual'] ?? 0),
                'cbs_cst'             => $i['cbs_cst'] ?? null,
                'cbs_classtrib'       => $i['cbs_classtrib'] ?? null,
                'ibs_cst'             => $i['ibs_cst'] ?? null,
                'ibs_classtrib'       => $i['ibs_classtrib'] ?? null,
                'ccredpres'           => $i['ccredpres'] ?? null,
            ];
        }, $itensDb);

        $pagamentos = array_map(function($p) {
            return [
                'id'                    => $p['id'],
                'vendaId'               => $p['venda_id'],
                'formaPagamento'        => $p['forma_pagamento'],
                'valorPagamento'        => (float)$p['valor_pagamento'],
                'tef_autorizacao'       => $p['tef_autorizacao'] ?? null,
                'tef_bandeira_id'       => $p['tef_bandeira_id'] ?? null,
                'tef_cnpj_credenciadora'=> $p['tef_cnpj_credenciadora'] ?? null
            ];
        }, $pagsDb);

        $venda = [
            'id'            => $vendaDb['id'],
            'numero'        => $vendaDb['numero'],
            'serie'         => $vendaDb['serie'],
            'valorTotal'    => (float)$vendaDb['valor_total'],
            'valorDesconto' => (float)($vendaDb['valor_desconto'] ?? 0),
            'itens'         => $itens,
            'pagamentos'    => $pagamentos
        ];

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("SELECT numero_nfce FROM empresas WHERE id = ? FOR UPDATE");
            $stmt->execute([$empresaDb['id']]);

            // Buscar alíquotas RTC vigentes
            $aliquotasRtc = [];
            try {
                $hoje = (new \DateTime('now', new \DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
                $stmtAliq = $pdo->query("SELECT imposto, percentual FROM rtc_aliquotas WHERE d_ini_vig <= '{$hoje}' AND (d_fim_vig IS NULL OR d_fim_vig >= '{$hoje}')");
                foreach ($stmtAliq->fetchAll() as $aliqRow) {
                    $aliquotasRtc[$aliqRow['imposto']] = (float)$aliqRow['percentual'];
                }
            } catch (\Exception $e) { /* tabela ainda não existe */ }

            $service = new NfceService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
            $isContingencia = (isset($empresaDb['emissao_contingencia']) && $empresaDb['emissao_contingencia'] == 1);
            $resultado = $service->emitirNfce($venda, $itens, null, $isContingencia, $aliquotasRtc);

            if (!$resultado->sucesso && $resultado->status === 'ErroConexao' && (!isset($empresaDb['contingencia_automatica']) || $empresaDb['contingencia_automatica'] == 1) && !$isContingencia) {
                $resultado = $service->emitirNfce($venda, $itens, null, true, $aliquotasRtc);
            }

            if ($resultado->sucesso) {
                $statusSalvar = $resultado->status === 'Contingencia' ? 'Contingencia' : 'Autorizada';
                $chaveAcesso  = (string)($resultado->chave_acesso ?? '');
                $stmt = $pdo->prepare("UPDATE vendas SET status = ?, protocolo = ?, chave_acesso = ?, xml_autorizado = ? WHERE id = ?");
                $stmt->execute([$statusSalvar, $resultado->protocolo, $chaveAcesso, $resultado->xml_assinado, $vendaId]);

                $stmt = $pdo->prepare("UPDATE empresas SET numero_nfce = ? WHERE id = ?");
                $stmt->execute([$vendaDb['numero'], $empresaDb['id']]);

                // Baixa de estoque (emitir_pendente)
                try { $pdo->query("SELECT estoque FROM produtos LIMIT 1"); } catch (PDOException $e2) {
                    $pdo->exec("ALTER TABLE produtos ADD COLUMN estoque DECIMAL(10,3) DEFAULT 0");
                }
                foreach ($itens as $item) {
                    $pdo->prepare("UPDATE produtos SET estoque = GREATEST(0, estoque - ?) WHERE id = ?")
                        ->execute([$item['quantidade'], $item['produtoId']]);
                }

                $pdo->commit();

                echo json_encode([
                    'success'    => true,
                    'id'         => $vendaId,
                    'status'     => $statusSalvar,
                    'protocolo'  => $resultado->protocolo,
                    'chaveAcesso'=> $chaveAcesso,
                    'xml'        => base64_encode($resultado->xml_assinado)
                ]);
            } else {
                $stmt = $pdo->prepare("UPDATE vendas SET status = 'Rejeitada' WHERE id = ?");
                $stmt->execute([$vendaId]);

                if (strpos($resultado->mensagem_erro ?? '', '539') !== false || strpos($resultado->mensagem_erro ?? '', 'diferença na Chave') !== false) {
                    $stmt = $pdo->prepare("UPDATE empresas SET numero_nfce = ? WHERE id = ?");
                    $stmt->execute([$vendaDb['numero'], $empresaDb['id']]);
                }

                $pdo->commit();

                echo json_encode([
                    'success' => false,
                    'message' => 'Rejeição SEFAZ: ' . $resultado->mensagem_erro
                ]);
            }
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Erro interno de emissão PHP: ' . $e->getMessage() . ' na linha ' . $e->getLine()]);
        }
        break;

    // Verifica se existe pagamento TEF pendente (status_pagamento=0) para recuperação no reload
    case 'verificar_tef_pendente':
        // Busca venda com pagamento TEF em andamento (com uniqueid mas não aprovado ainda)
        $stmt = $pdo->query("
            SELECT vp.id as pagamento_id, vp.payment_uniqueid, v.id as venda_id, v.numero
            FROM vendas_pagamentos vp
            JOIN vendas v ON vp.venda_id = v.id
            WHERE vp.status_pagamento = 0
              AND vp.payment_uniqueid IS NOT NULL
              AND v.status IN ('PendenteTEF', 'TEFAprovado')
            ORDER BY vp.id ASC
            LIMIT 1
        ");
        $row = $stmt->fetch();
        if (!$row) { echo json_encode(['found' => false]); break; }

        $vendaIdPend = $row['venda_id'];
        // Busca TODOS os pagamentos TEF dessa venda ainda não aprovados
        $stmtAll = $pdo->prepare("
            SELECT id FROM vendas_pagamentos
            WHERE venda_id = ? AND forma_pagamento IN ('03','04','17') AND status_pagamento != 4
            ORDER BY id ASC
        ");
        $stmtAll->execute([$vendaIdPend]);
        $allIds = array_column($stmtAll->fetchAll(), 'id');

        echo json_encode([
            'found'         => true,
            'pagamentoId'   => $row['pagamento_id'],   // backwards compat
            'pagamentosIds' => array_map('intval', $allIds),
            'uniqueid'      => $row['payment_uniqueid'],
            'vendaId'       => $vendaIdPend,
            'numero'        => (int)$row['numero']
        ]);
        break;

    // Reinicia tentativa TEF para venda PendenteTEF ou Rejeitada
    case 'tef_retry':
        $vendaId = (int)($_GET['venda_id'] ?? 0);
        if (!$vendaId) { echo json_encode(['success' => false, 'message' => 'venda_id obrigatório']); break; }

        // Busca TODOS os pagamentos TEF desta venda (pode haver mais de um)
        $stmt = $pdo->prepare("
            SELECT vp.id, v.numero
            FROM vendas_pagamentos vp
            JOIN vendas v ON v.id = vp.venda_id
            WHERE vp.venda_id = ? AND vp.forma_pagamento IN ('03','04','17')
            ORDER BY vp.id ASC
        ");
        $stmt->execute([$vendaId]);
        $rows = $stmt->fetchAll();

        if (!$rows) {
            echo json_encode(['success' => false, 'message' => 'Pagamento TEF não encontrado para esta venda']);
            break;
        }

        $pagamentosTefIds = array_map(fn($r) => (int)$r['id'], $rows);
        $numero = (int)$rows[0]['numero'];

        // Reseta dados TEF de TODOS os pagamentos para iniciar nova transação
        $placeholders = implode(',', array_fill(0, count($pagamentosTefIds), '?'));
        $pdo->prepare("
            UPDATE vendas_pagamentos SET
                payment_uniqueid = NULL, status_pagamento = 0,
                tef_nsu = NULL, tef_autorizacao = NULL,
                tef_bandeira_id = NULL, tef_bandeira_nome = NULL,
                tef_cnpj_credenciadora = NULL, tef_json_retorno = NULL
            WHERE id IN ($placeholders)
        ")->execute($pagamentosTefIds);

        // Volta status da venda para PendenteTEF
        $pdo->prepare("UPDATE vendas SET status = 'PendenteTEF' WHERE id = ? AND status IN ('Rejeitada','PendenteTEF','TEFAprovado')")
            ->execute([$vendaId]);

        echo json_encode([
            'success'       => true,
            'pagamentoId'   => $pagamentosTefIds[0], // backwards compat
            'pagamentosIds' => $pagamentosTefIds,
            'vendaId'       => $vendaId,
            'numero'        => $numero
        ]);
        break;

    // Diagnóstico TEF: limpa vendas PendenteTEF sem uniqueid travadas
    case 'limpar_tef_travado':
        $pdo->exec("UPDATE vendas SET status = 'Rejeitada' WHERE status = 'PendenteTEF' AND id NOT IN (
            SELECT DISTINCT venda_id FROM vendas_pagamentos WHERE payment_uniqueid IS NOT NULL AND status_pagamento = 0
        )");
        echo json_encode(['success' => true, 'message' => 'Vendas PendenteTEF travadas marcadas como Rejeitada']);
        break;

    // Verifica se existe ao menos um SmartPOS configurado (usado pelo frontend antes de abrir TefModal)
    case 'tem_smartpos':
        $stmtEmp = $empresaId ? $pdo->prepare("SELECT id FROM empresas WHERE id=?") : $pdo->query("SELECT id FROM empresas LIMIT 1");
        if ($empresaId) $stmtEmp->execute([$empresaId]);
        $emp = $stmtEmp->fetch();
        $empId = $emp['id'] ?? 0;
        $stmtSP = $pdo->prepare("SELECT COUNT(*) FROM smartpos WHERE empresa_id = ?");
        $stmtSP->execute([$empId]);
        echo json_encode(['tem' => (int)$stmtSP->fetchColumn() > 0]);
        break;

    // Solicita transação TEF na SuperTEF e salva uniqueid
    case 'tef_solicitar':
        $data = json_decode(file_get_contents('php://input'), true);
        $idPagamento = $data['id_pagamento'] ?? 0;

        $stmt = $pdo->prepare("
            SELECT vp.*, sp.numero_serie as serial_terminal
            FROM vendas_pagamentos vp
            JOIN vendas v ON vp.venda_id = v.id
            JOIN smartpos sp ON v.empresa_id = sp.empresa_id
            WHERE vp.id = ?
            LIMIT 1
        ");
        $stmt->execute([$idPagamento]);
        $pag = $stmt->fetch();

        if (!$pag || empty($pag['serial_terminal'])) {
            echo json_encode(['success' => false, 'message' => 'Terminal SmartPOS não configurado para esta empresa']);
            exit;
        }

        // Mapeamento forma_pagamento SEFAZ → transaction_type SuperTEF (string)
        // 04=Débito→"1", 03=Crédito→"2", 17=Pix→"3"
        $tipoTEF = ($pag['forma_pagamento'] == '04') ? "1" : (($pag['forma_pagamento'] == '03') ? "2" : "3");

        // amount em reais (decimal), ex: R$3,50 = 3.50
        // Empiricamente confirmado: amount=350 → terminal exibe R$350,00 (não são centavos)
        $amountReais = round((float)$pag['valor_pagamento'], 2);

        $payload = [
            "cliente_chave"     => $pag['serial_terminal'], // numero_serie do SmartPOS
            "pos_id"            => null,                     // null = qualquer terminal do cliente
            "transaction_type"  => $tipoTEF,
            "installment_count" => 1,
            "installment_type"  => 1,
            "amount"            => $amountReais,
            "order_id"          => (string)$pag['id'],
            "description"       => "Venda #" . $pag['venda_id'],
            "print_receipt"     => true
        ];

        $ch = curl_init(SUPERTEF_URL_BASE);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . SUPERTEF_TOKEN
            ],
            CURLOPT_POST            => 1,
            CURLOPT_POSTFIELDS      => json_encode($payload),
            CURLOPT_RETURNTRANSFER  => true,
            CURLOPT_TIMEOUT         => 15,
            CURLOPT_SSL_VERIFYPEER  => false,
            CURLOPT_SSL_VERIFYHOST  => false
        ]);

        $rawResponse = curl_exec($ch);
        $curlError   = curl_error($ch);
        $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $res = json_decode($rawResponse, true);

        // SuperTEF retorna HTTP 200 ou 201 com payment_uniqueid no corpo
        if (($httpCode == 200 || $httpCode == 201) && isset($res['payment_uniqueid'])) {
            $uniqueid = (string)$res['payment_uniqueid'];
            $stmt = $pdo->prepare("UPDATE vendas_pagamentos SET payment_uniqueid = ?, status_pagamento = 1 WHERE id = ?");
            $stmt->execute([$uniqueid, $idPagamento]);
            echo json_encode([
                'success'        => true,
                'uniqueid'       => $uniqueid,
                'debug_amount'   => $amountReais,           // valor enviado em reais (para diagnóstico)
                'debug_valor_db' => $pag['valor_pagamento'] // valor bruto do banco
            ]);
        } else {
            $detalhe = '';
            if (!empty($curlError))   $detalhe = "cURL: $curlError";
            elseif ($httpCode === 0)  $detalhe = "Sem resposta (timeout/sem conexão)";
            elseif ($httpCode === 401) $detalhe = "Token inválido (HTTP 401)";
            elseif ($httpCode === 403) $detalhe = "Acesso negado (HTTP 403)";
            elseif ($httpCode === 422) $detalhe = ($res['message'] ?? "Dados inválidos") . " | " . json_encode($payload);
            else                       $detalhe = ($res['message'] ?? "HTTP $httpCode") . ($rawResponse ? " | " . substr($rawResponse, 0, 300) : '');
            echo json_encode(['success' => false, 'message' => "TEF ($httpCode): $detalhe"]);
        }
        break;

    // Consulta status da transação TEF e atualiza banco quando aprovada
    case 'tef_consultar':
        $uniqueId = $_GET['uniqueid'] ?? '';

        if (!$uniqueId) {
            echo json_encode(['success' => false, 'message' => 'uniqueid obrigatório']);
            break;
        }

        // Busca venda_id pelo payment_uniqueid para rejeições
        $stmtLookup = $pdo->prepare("SELECT id, venda_id FROM vendas_pagamentos WHERE payment_uniqueid = ? LIMIT 1");
        $stmtLookup->execute([(string)$uniqueId]);
        $rowLookup = $stmtLookup->fetch();

        // GET /pagamentos/by-uniqueid/{payment_uniqueid} — endpoint específico que retorna payment_data completo (incluindo acquirer_cnpj)
        $urlConsulta = SUPERTEF_URL_BASE . '/by-uniqueid/' . urlencode($uniqueId);
        $ch = curl_init($urlConsulta);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER      => ['Authorization: Bearer ' . SUPERTEF_TOKEN],
            CURLOPT_RETURNTRANSFER  => true,
            CURLOPT_TIMEOUT         => 10,
            CURLOPT_SSL_VERIFYPEER  => false,
            CURLOPT_SSL_VERIFYHOST  => false
        ]);

        $rawResponse = curl_exec($ch);
        $curlError   = curl_error($ch);
        $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($curlError || $httpCode === 0) {
            // Erro de rede — não rejeita, continua aguardando
            echo json_encode(['success' => true, 'status' => 1, 'message' => "Aguardando (cURL: $curlError)"]);
            break;
        }

        $res = json_decode($rawResponse, true);

        // Suporta resposta como lista {data:[...]} ou objeto direto
        if (isset($res['data']) && is_array($res['data']) && count($res['data']) > 0) {
            $item = $res['data'][0];
        } else {
            $item = $res ?? [];
        }

        // Se a resposta não tem payment_status (endpoint inválido/404), aguarda
        if (!is_array($item) || !isset($item['payment_status'])) {
            echo json_encode([
                'success' => true, 'status' => 1,
                'message' => 'Aguardando',
                'debug_http' => $httpCode,
                'debug_raw'  => substr($rawResponse ?? '', 0, 200)
            ]);
            break;
        }

        $paymentStatus  = (int)$item['payment_status'];
        $paymentData    = $item['payment_data'] ?? [];
        $authCode       = $paymentData['authorization_code'] ?? null;
        $acquirerCnpj   = $paymentData['acquirer_cnpj'] ?? $item['acquirer_cnpj'] ?? null;

        // SuperTEF: payment_status 4 = "Pago" (aprovado), 1 = "Solicitado" (pendente)
        // Aprovado: status 4 OU authorization_code preenchido
        $aprovado = ($paymentStatus === 4) || !empty($authCode);
        // Recusado: HTTP 200, não aprovado, status diferente de 1 (pendente)
        $recusado = !$aprovado && $httpCode === 200 && $paymentStatus !== 1;

        // Converte datas UTC do SuperTEF para horário Brasil (UTC-3)
        $tzBrasil = new DateTimeZone('America/Sao_Paulo');
        $itemBrt = $item;
        foreach (['data_criacao', 'created_at'] as $campo) {
            if (!empty($itemBrt[$campo])) {
                try {
                    $dt = new DateTime($itemBrt[$campo]);
                    $dt->setTimezone($tzBrasil);
                    $itemBrt[$campo] = $dt->format('Y-m-d H:i:s');
                } catch (Exception $e) {}
            }
        }
        if (!empty($itemBrt['payment_data']['authorization_date_time'])) {
            try {
                $dt = new DateTime($itemBrt['payment_data']['authorization_date_time']);
                $dt->setTimezone($tzBrasil);
                $itemBrt['payment_data']['authorization_date_time'] = $dt->format('Y-m-d H:i:s');
            } catch (Exception $e) {}
        }

        if ($aprovado) {
            $bandeiraNome = $paymentData['brand'] ?? 'OUTROS';
            $bandeiraId   = mapearBandeiraSefaz($bandeiraNome);

            $stmt = $pdo->prepare("
                UPDATE vendas_pagamentos SET
                    status_pagamento = 4,
                    tef_nsu = ?, tef_autorizacao = ?,
                    tef_bandeira_id = ?, tef_bandeira_nome = ?,
                    tef_cnpj_credenciadora = ?, tef_json_retorno = ?
                WHERE payment_uniqueid = ?
            ");
            $stmt->execute([
                $paymentData['nsu'] ?? null,
                $authCode,
                $bandeiraId,
                $bandeiraNome,
                $acquirerCnpj,
                json_encode($itemBrt),                  // salva com datas em BRT
                (string)$uniqueId
            ]);

            // Marca a venda como TEFAprovado: pagamento aprovado, nota ainda não emitida
            $pdo->prepare("UPDATE vendas SET status = 'TEFAprovado' WHERE id = (SELECT venda_id FROM vendas_pagamentos WHERE payment_uniqueid = ? LIMIT 1)")
                ->execute([(string)$uniqueId]);

            echo json_encode([
                'success'      => true,
                'status'       => 4, // 4 = aprovado (padrão interno)
                'autorizacao'  => $authCode,
                'nsu'          => $paymentData['nsu'] ?? null,
                'bandeira'     => $bandeiraNome,
                'bandeira_id'  => $bandeiraId,
                'cnpj_credenciadora' => $acquirerCnpj,
                'payment_status_raw' => $paymentStatus
            ]);
        } elseif ($recusado) {
            // Marca o pagamento e a venda como rejeitados no banco
            $vendaIdRecusada = $rowLookup ? (int)$rowLookup['venda_id'] : null;
            $pdo->prepare("UPDATE vendas_pagamentos SET status_pagamento = 5, tef_json_retorno = ? WHERE payment_uniqueid = ?")
                ->execute([json_encode($item), (string)$uniqueId]);
            if ($vendaIdRecusada) {
                // Rejeição TEF ≠ Cancelamento de NFC-e autorizada
                $pdo->prepare("UPDATE vendas SET status = 'Rejeitada' WHERE id = ?")
                    ->execute([$vendaIdRecusada]);
            }

            echo json_encode([
                'success'            => false,
                'status'             => 5, // 5 = recusado (padrão interno)
                'message'            => $item['payment_message'] ?? 'Transação recusada',
                'payment_status_raw' => $paymentStatus
            ]);
        } else {
            // Ainda pendente (status 1 = Solicitado)
            echo json_encode([
                'success'            => true,
                'status'             => 1, // 1 = aguardando
                'message'            => $item['payment_message'] ?? 'Aguardando',
                'payment_status_raw' => $paymentStatus
            ]);
        }
        break;

    case 'cancelar':
        $vendaId    = (int)($_GET['id'] ?? 0);
        $data       = json_decode(file_get_contents('php://input'), true);
        $justificativa = trim($data['justificativa'] ?? '');

        if ($vendaId <= 0 || strlen($justificativa) < 15) {
            echo json_encode(['success' => false, 'message' => 'ID inválido ou justificativa com menos de 15 caracteres.']);
            break;
        }

        // Garantir colunas de cancelamento
        try { $pdo->query("SELECT xml_cancelamento FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN xml_cancelamento LONGTEXT DEFAULT NULL");
        }
        try { $pdo->query("SELECT protocolo_cancelamento FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN protocolo_cancelamento VARCHAR(30) DEFAULT NULL");
        }
        try { $pdo->query("SELECT justificativa_cancelamento FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN justificativa_cancelamento VARCHAR(255) DEFAULT NULL");
        }
        try { $pdo->query("SELECT empresa_id FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN empresa_id INT DEFAULT NULL");
        }
        try { $pdo->query("SELECT data_cancelamento FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN data_cancelamento DATETIME DEFAULT NULL");
        }

        $stmt = $pdo->prepare("SELECT * FROM vendas WHERE id = ?");
        $stmt->execute([$vendaId]);
        $venda = $stmt->fetch();

        if (!$venda) {
            echo json_encode(['success' => false, 'message' => 'Venda não encontrada.']);
            break;
        }
        if ($venda['status'] !== 'Autorizada') {
            echo json_encode(['success' => false, 'message' => 'Apenas notas Autorizadas podem ser canceladas.']);
            break;
        }
        if (empty($venda['chave_acesso']) || empty($venda['protocolo'])) {
            echo json_encode(['success' => false, 'message' => 'Chave de acesso ou protocolo não encontrado.']);
            break;
        }

        $empresaDb = fetchEmpresaDb($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['certificado_pfx'])) {
            echo json_encode(['success' => false, 'message' => 'Certificado digital não configurado.']);
            break;
        }

        try {
            if (($empresaDb['fiscal_api'] ?? 'nfephp') === 'tecnospeed') {
                $service = new PlugNotasService($empresaDb['plugnotas_api_key'] ?? '', (int)($empresaDb['ambiente'] ?? 2));
            } else {
                $service = new NfceService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
            }
            $resultado = $service->cancelarNfce($vendaId, $justificativa, $venda);

            if ($resultado->sucesso) {
                $stmt = $pdo->prepare("UPDATE vendas SET status = 'Cancelada', xml_cancelamento = ?, protocolo_cancelamento = ?, justificativa_cancelamento = ?, data_cancelamento = NOW() WHERE id = ?");
                $stmt->execute([$resultado->xmlCancelamento ?? '', $resultado->protocolo ?? '', $justificativa, $vendaId]);

                // Estorno de estoque ao cancelar nota Autorizada
                $itensCanc = $pdo->prepare("SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = ?");
                $itensCanc->execute([$vendaId]);
                foreach ($itensCanc->fetchAll() as $ic) {
                    $pdo->prepare("UPDATE produtos SET estoque = estoque + ? WHERE id = ?")
                        ->execute([$ic['quantidade'], $ic['produto_id']]);
                }

                // Estorno financeiro: debita no caixa revertendo os créditos lançados na emissão
                $contaIdCanc = garantirContaFinanceira($pdo, (int)$empresaDb['id']);
                if ($contaIdCanc) {
                    // Estratégia 1: reverter créditos já lançados em caixa_movimentos para esta venda
                    $credsCaixa = $pdo->prepare("SELECT conta_id, valor, forma_pagamento FROM caixa_movimentos WHERE venda_id = ? AND empresa_id = ? AND tipo = 'C'");
                    $credsCaixa->execute([$vendaId, $empresaDb['id']]);
                    $credRows = $credsCaixa->fetchAll();
                    if ($credRows) {
                        foreach ($credRows as $cr) {
                            $pdo->prepare("INSERT INTO caixa_movimentos (empresa_id, venda_id, conta_id, tipo, valor, forma_pagamento, historico) VALUES (?, ?, ?, 'D', ?, ?, ?)")
                                ->execute([$empresaDb['id'], $vendaId, $cr['conta_id'], $cr['valor'], $cr['forma_pagamento'], "Cancelamento NFC-e #" . $venda['numero']]);
                        }
                    } else {
                        // Estratégia 2 (fallback): sem crédito no caixa, lança débito baseado em vendas_pagamentos
                        $pagsCancelados = $pdo->prepare("SELECT forma_pagamento, valor_pagamento FROM vendas_pagamentos WHERE venda_id = ?");
                        $pagsCancelados->execute([$vendaId]);
                        foreach ($pagsCancelados->fetchAll() as $pc) {
                            $pdo->prepare("INSERT INTO caixa_movimentos (empresa_id, venda_id, conta_id, tipo, valor, forma_pagamento, historico) VALUES (?, ?, ?, 'D', ?, ?, ?)")
                                ->execute([$empresaDb['id'], $vendaId, $contaIdCanc, $pc['valor_pagamento'], $pc['forma_pagamento'], "Cancelamento NFC-e #" . $venda['numero']]);
                        }
                    }
                    // Cancela títulos pendentes em contas a receber
                    $pdo->prepare("UPDATE financeiro SET status = 'Cancelado' WHERE venda_id = ? AND empresa_id = ? AND status IN ('Pendente','Parcial')")
                        ->execute([$vendaId, $empresaDb['id']]);
                }

                echo json_encode(['success' => true, 'protocolo' => $resultado->protocolo]);
            } else {
                echo json_encode(['success' => false, 'message' => $resultado->mensagem]);
            }
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'message' => 'Erro PHP no cancelamento: ' . $e->getMessage()]);
        }
        break;

    case 'excluir_venda':
        $id = (int)($_GET['id'] ?? 0);
        // Bloqueia exclusão de NFC-e Autorizada (deve ser cancelada na SEFAZ antes)
        $stmtChk = $pdo->prepare("SELECT status FROM vendas WHERE id = ?");
        $stmtChk->execute([$id]);
        $vRow = $stmtChk->fetch();
        if (!$vRow) {
            echo json_encode(['success' => false, 'message' => 'Venda não encontrada']);
            break;
        }
        if ($vRow['status'] === 'Autorizada') {
            echo json_encode(['success' => false, 'message' => 'NFC-e autorizada não pode ser excluída. Cancele-a na SEFAZ primeiro.']);
            break;
        }
        // Excluir nunca estorna estoque — baixa só ocorre na autorização

        $pdo->prepare("DELETE FROM vendas_pagamentos WHERE venda_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM vendas_itens WHERE venda_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM vendas WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'transmitir_contingencia':
        $vendaId = $_GET['id'] ?? 0;
        if ($vendaId <= 0) exit;

        $empresaDb = fetchEmpresaDb($pdo, $empresaId);
        if (!$empresaDb) {
            echo json_encode(['success' => false, 'message' => 'Empresa não encontrada']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT numero, xml_autorizado FROM vendas WHERE id = ? AND status = 'Contingencia'");
        $stmt->execute([$vendaId]);
        $venda = $stmt->fetch();

        if ($venda && !empty($venda['xml_autorizado'])) {
            try {
                if (($empresaDb['fiscal_api'] ?? 'nfephp') === 'tecnospeed') {
                    $service = new PlugNotasService($empresaDb['plugnotas_api_key'] ?? '', (int)($empresaDb['ambiente'] ?? 2));
                } else {
                    $service = new NfceService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
                }
                $resultado = $service->transmitirAtrasada($venda['xml_autorizado'], $venda['numero'], $vendaId);

                if ($resultado->sucesso) {
                    $stmt = $pdo->prepare("UPDATE vendas SET status = 'Autorizada', protocolo = ?, xml_autorizado = ? WHERE id = ?");
                    $stmt->execute([$resultado->protocolo, $resultado->xml_assinado, $vendaId]);
                    echo json_encode(['success' => true]);
                } else {
                    // Erro de conexão: mantém Contingência (SEFAZ instável, pode tentar depois)
                    // Rejeição real da SEFAZ: muda para Rejeitada
                    $isErroConexao = ($resultado->status ?? '') === 'ErroConexao';
                    if (!$isErroConexao) {
                        $stmt = $pdo->prepare("UPDATE vendas SET status = 'Rejeitada' WHERE id = ?");
                        $stmt->execute([$vendaId]);
                    }
                    $msg = $isErroConexao
                        ? 'SEFAZ temporariamente indisponível. A nota permanece em Contingência e pode ser retransmitida.'
                        : 'Rejeição SEFAZ: ' . $resultado->mensagem_erro;
                    echo json_encode(['success' => false, 'message' => $msg]);
                }
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'Erro interno de emissão PHP: ' . $e->getMessage()]);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Venda não encontrada ou não está em contingência.']);
        }
        break;

    case 'transmitir_lote_contingencia':
        $empresaDb = fetchEmpresaDb($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['certificado_pfx'])) {
            echo json_encode(['success' => false, 'message' => 'Certificado não configurado.']);
            exit;
        }

        // Limitando a 20 NFC-e por vez conforme decisão
        $stmt = $pdo->prepare("SELECT id, numero, xml_autorizado FROM vendas WHERE status = 'Contingencia' ORDER BY data_emissao ASC LIMIT 20");
        $stmt->execute();
        $vendas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($vendas)) {
            echo json_encode(['success' => true, 'message' => 'Nenhuma contingência.', 'processadas' => 0]);
            break;
        }

        $sucessos = 0;
        $erros = 0;
        if (($empresaDb['fiscal_api'] ?? 'nfephp') === 'tecnospeed') {
            $service = new PlugNotasService($empresaDb['plugnotas_api_key'] ?? '', (int)($empresaDb['ambiente'] ?? 2));
        } else {
            $service = new NfceService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
        }

        foreach ($vendas as $v) {
            if (empty($v['xml_autorizado'])) continue;

            try {
                $resultado = $service->transmitirAtrasada($v['xml_autorizado'], $v['numero'], $v['id']);
                if ($resultado->sucesso) {
                    $stmtUpdate = $pdo->prepare("UPDATE vendas SET status = 'Autorizada', protocolo = ?, xml_autorizado = ? WHERE id = ?");
                    $stmtUpdate->execute([$resultado->protocolo, $resultado->xml_assinado, $v['id']]);
                    $sucessos++;
                } else {
                    $isErroConexao = ($resultado->status ?? '') === 'ErroConexao';
                    if (!$isErroConexao) {
                        $pdo->prepare("UPDATE vendas SET status = 'Rejeitada' WHERE id = ?")->execute([$v['id']]);
                    }
                    $erros++;
                }
            } catch (Exception $e) {
                $erros++;
            }
        }

        echo json_encode([
            'success' => true, 
            'message' => "Processamento concluído: $sucessos transmitidas, $erros pendentes/rejeitadas.", 
            'processadas' => count($vendas),
            'sucessos' => $sucessos,
            'erros' => $erros
        ]);
        break;

    case 'danfe':
        $vendaId = (int)($_GET['id'] ?? 0);
        if ($vendaId <= 0) exit;

        // Migração: garante coluna xml_autorizado
        try { $pdo->query("SELECT xml_autorizado FROM vendas LIMIT 1"); } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN xml_autorizado MEDIUMTEXT DEFAULT NULL");
        }

        $stmt = $pdo->prepare("SELECT xml_autorizado, status FROM vendas WHERE id = ?");
        $stmt->execute([$vendaId]);
        $venda = $stmt->fetch();

        if ($venda && !empty($venda['xml_autorizado'])) {
            $printer = new PrinterService([]);
            try {
                header_remove('Content-Type');
                $pdf = $printer->imprimirNfce($venda['xml_autorizado']);
                header('Content-Type: application/pdf');
                header('Content-Disposition: inline; filename="danfe_' . $vendaId . '.pdf"');
                echo $pdf;
            } catch (\Throwable $e) {
                http_response_code(500);
                echo "Erro Fatal ao gerar PDF: " . $e->getMessage() . " na linha " . $e->getLine() . " de " . $e->getFile();
            }
        } else {
            $status = $venda['status'] ?? 'não encontrada';
            echo "XML não encontrado. Status da venda: {$status}. ID: {$vendaId}.";
        }
        break;

    case 'danfe_contingencia':
        $vendaId = $_GET['id'] ?? 0;
        if ($vendaId <= 0) exit;

        $stmt = $pdo->prepare("SELECT xml_autorizado, status FROM vendas WHERE id = ?");
        $stmt->execute([$vendaId]);
        $venda = $stmt->fetch();

        if ($venda && !empty($venda['xml_autorizado'])) {
            $printer = new PrinterService([]);
            try {
                header_remove('Content-Type');
                $pdf = $printer->imprimirNfce($venda['xml_autorizado']);
                header('Content-Type: application/pdf');
                header('Content-Disposition: inline; filename="danfe_contingencia_' . $vendaId . '.pdf"');
                echo $pdf;
            } catch (\Throwable $e) {
                http_response_code(500);
                echo "Erro Fatal ao gerar PDF: " . $e->getMessage() . " na linha " . $e->getLine() . " de " . $e->getFile();
            }
        } else {
            $status = $venda['status'] ?? 'não encontrada';
            echo "XML não encontrado. Status: {$status}. ID: {$vendaId}.";
        }
        break;

    case 'tef_status':
        $pagamentoId = (int)($_GET['id'] ?? 0);
        if (!$pagamentoId) { echo json_encode(['success' => false, 'message' => 'id obrigatório']); break; }
        $stmt = $pdo->prepare("SELECT * FROM vendas_pagamentos WHERE id = ?");
        $stmt->execute([$pagamentoId]);
        $pag = $stmt->fetch();
        if (!$pag) { echo json_encode(['success' => false, 'message' => 'Pagamento não encontrado']); break; }
        echo json_encode(['success' => true, 'pagamento' => $pag]);
        break;

    case 'tef_cancelar':
        $uniqueId = $_GET['uniqueid'] ?? '';
        if (!$uniqueId) { echo json_encode(['success' => false, 'message' => 'uniqueid obrigatório']); break; }
        $urlCancel = SUPERTEF_URL_BASE . '/' . urlencode($uniqueId) . '/cancel';
        $ch = curl_init($urlCancel);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . SUPERTEF_TOKEN, 'Content-Type: application/json'],
            CURLOPT_CUSTOMREQUEST  => 'POST',
            CURLOPT_POSTFIELDS     => '{}',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false
        ]);
        $rawResponse = curl_exec($ch);
        $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $res = json_decode($rawResponse, true);
        if ($httpCode === 200 || $httpCode === 201) {
            $pdo->prepare("UPDATE vendas_pagamentos SET status_pagamento = 6 WHERE payment_uniqueid = ?")
                ->execute([(string)$uniqueId]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => ($res['message'] ?? "HTTP $httpCode")]);
        }
        break;

    case 'tef_confirmar':
        $uniqueId = $_GET['uniqueid'] ?? '';
        if (!$uniqueId) { echo json_encode(['success' => false, 'message' => 'uniqueid obrigatório']); break; }
        $urlConfirm = SUPERTEF_URL_BASE . '/' . urlencode($uniqueId) . '/confirm';
        $ch = curl_init($urlConfirm);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . SUPERTEF_TOKEN, 'Content-Type: application/json'],
            CURLOPT_CUSTOMREQUEST  => 'POST',
            CURLOPT_POSTFIELDS     => '{}',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false
        ]);
        $rawResponse = curl_exec($ch);
        $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $res = json_decode($rawResponse, true);
        if ($httpCode === 200 || $httpCode === 201) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => ($res['message'] ?? "HTTP $httpCode")]);
        }
        break;

    case 'ibpt_consultar':
        $ncm = preg_replace('/[^0-9]/', '', $_GET['ncm'] ?? '');
        if (strlen($ncm) < 8) { echo json_encode(['success' => false, 'message' => 'NCM inválido']); break; }
        $emp = fetchEmpresaDb($pdo, $empresaId);
        $uf  = strtoupper($emp['uf'] ?? 'GO');
        // Busca na tabela unificada rtc_ncm — prefere ex=0 e tabela padrão
        $stmt = $pdo->prepare(
            "SELECT aliq_nacional, aliq_estadual, descricao FROM rtc_ncm
             WHERE tipo = 'ibpt' AND ncm = ? AND uf = ? AND (ex = '0' OR ex = '') AND tabela IN ('0', 'I', 'II', '1', '2')
             ORDER BY vigencia_fim DESC LIMIT 1"
        );
        $stmt->execute([$ncm, $uf]);
        $row = $stmt->fetch();
        // Fallback: qualquer ex para este NCM/UF
        if (!$row) {
            $stmt = $pdo->prepare(
                "SELECT aliq_nacional, aliq_estadual, descricao FROM rtc_ncm
                 WHERE tipo = 'ibpt' AND ncm = ? AND uf = ?
                 ORDER BY tabela ASC, vigencia_fim DESC LIMIT 1"
            );
            $stmt->execute([$ncm, $uf]);
            $row = $stmt->fetch();
        }
        if ($row) {
            $nacional  = round((float)$row['aliq_nacional'], 2);
            $estadual  = round((float)$row['aliq_estadual'], 2);
            $total     = round($nacional + $estadual, 2);
            $descricao = $row['descricao'] ?? '';
            echo json_encode(['success' => true, 'percentual' => $total, 'nacional' => $nacional, 'estadual' => $estadual, 'descricao' => $descricao]);
        } else {
            echo json_encode(['success' => false, 'message' => "NCM {$ncm} não encontrado. Importe a tabela IBPT em NCM / Tabela IBPT."]);
        }
        break;

    case 'listar_smartpos':
        $stmtEmp = $empresaId ? $pdo->prepare("SELECT id FROM empresas WHERE id=?") : $pdo->query("SELECT id FROM empresas LIMIT 1");
        if ($empresaId) $stmtEmp->execute([$empresaId]);
        $emp = $stmtEmp->fetch();
        $empresaIdSP = $emp['id'] ?? 0;
        $stmt = $pdo->prepare("SELECT * FROM smartpos WHERE empresa_id = ? ORDER BY apelido ASC");
        $stmt->execute([$empresaIdSP]);
        $rows = $stmt->fetchAll();
        // Mapeia numero_serie para o formato esperado pelo front
        $rows = array_map(function($r) {
            $r['numeroSerie'] = $r['numero_serie'] ?? '';
            return $r;
        }, $rows);
        echo json_encode($rows);
        break;

    case 'salvar_smartpos':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmtEmp = $empresaId ? $pdo->prepare("SELECT id FROM empresas WHERE id=?") : $pdo->query("SELECT id FROM empresas LIMIT 1");
        if ($empresaId) $stmtEmp->execute([$empresaId]);
        $emp = $stmtEmp->fetch();
        $empresaIdSP = $emp['id'] ?? 0;
        $numeroSerie = $data['numeroSerie'] ?? '';
        if (isset($data['id']) && $data['id'] > 0) {
            $stmt = $pdo->prepare("UPDATE smartpos SET codigo=?, numero_serie=?, integradora=?, apelido=? WHERE id=? AND empresa_id=?");
            $stmt->execute([$data['codigo'], $numeroSerie, $data['integradora'], $data['apelido'], $data['id'], $empresaIdSP]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO smartpos (empresa_id, codigo, numero_serie, integradora, apelido) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$empresaIdSP, $data['codigo'], $numeroSerie, $data['integradora'], $data['apelido']]);
        }
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        break;

    case 'excluir_smartpos':
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("DELETE FROM smartpos WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'cosmos_lookup':
        $q    = $_GET['q'] ?? '';
        $type = $_GET['type'] ?? 'gtin';
        if (empty($q)) {
            echo json_encode(['error' => 'Parâmetro q é obrigatório']);
            break;
        }

        $stmtEmp = $empresaId ? $pdo->prepare("SELECT cosmos_token FROM empresas WHERE id=?") : $pdo->query("SELECT cosmos_token FROM empresas LIMIT 1");
        if ($empresaId) $stmtEmp->execute([$empresaId]);
        $empRow = $stmtEmp->fetch();
        $cosmosToken = $empRow['cosmos_token'] ?? '';
        if (empty($cosmosToken)) {
            echo json_encode(['error' => 'Token Cosmos não configurado. Acesse Configurações > Parâmetros Fiscais.']);
            break;
        }

        if ($type === 'gtin') {
            $url = 'https://api.cosmos.bluesoft.com.br/gtins/' . urlencode($q);
        } else {
            $url = 'https://api.cosmos.bluesoft.com.br/ncms/' . urlencode($q);
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-Cosmos-Token: ' . $cosmosToken,
            'Content-Type: application/json',
            'User-Agent: API Request'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $decoded = json_decode($resp, true);
            echo json_encode($decoded ?: ['error' => 'Resposta inválida da Cosmos API']);
        } elseif ($httpCode === 404) {
            echo json_encode(['error' => 'Produto não encontrado na base Cosmos.']);
        } elseif ($httpCode === 401 || $httpCode === 403) {
            echo json_encode(['error' => 'Token Cosmos inválido ou sem permissão.']);
        } else {
            echo json_encode(['error' => "Erro na Cosmos API (HTTP $httpCode)"]);
        }
        break;

    case 'nfce_download_xml':
        $id = (int)$_GET['id'];
        $v = $pdo->query("SELECT xml_autorizado, chave_acesso FROM vendas WHERE id = $id")->fetch();
        if ($v && $v['xml_autorizado']) {
            header('Content-Type: application/xml');
            header('Content-Disposition: attachment; filename="'.$v['chave_acesso'].'.xml"');
            echo $v['xml_autorizado'];
        }
        break;

    case 'baixar_xml_lote':
        $di = $_GET['data_inicio'] ?? '';
        $df = $_GET['data_fim'] ?? '';
        $where = ["status IN ('Autorizada', 'Cancelada')"];
        $params = [];
        if ($di) { $where[] = "DATE(data_emissao) >= ?"; $params[] = $di; }
        if ($df) { $where[] = "DATE(data_emissao) <= ?"; $params[] = $df; }

        $sqlWhere = implode(" AND ", $where);
        $stmt = $pdo->prepare("SELECT id, numero, chave_acesso, status, xml_autorizado, xml_cancelamento FROM vendas WHERE $sqlWhere");
        $stmt->execute($params);
        $vendas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($vendas)) {
            die("Nenhum XML encontrado para este período.");
        }

        $zipFilename = 'NFCe_XMLs_' . date('Y-m-d') . '_' . time() . '.zip';
        $zipPath = sys_get_temp_dir() . '/' . $zipFilename;
        $zip = new ZipArchive();

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            die("Erro ao criar arquivo ZIP no servidor.");
        }

        $xmlsAdded = 0;
        foreach ($vendas as $v) {
            $chave = $v['chave_acesso'] ?: ('NFCe_' . $v['numero'] . '_' . $v['id']);
            
            if ($v['status'] === 'Autorizada' && !empty($v['xml_autorizado'])) {
                $zip->addFromString("Autorizadas/{$chave}-nfe.xml", $v['xml_autorizado']);
                $xmlsAdded++;
            } elseif ($v['status'] === 'Cancelada' && !empty($v['xml_cancelamento'])) {
                $zip->addFromString("Canceladas/{$chave}-nfe.xml", $v['xml_cancelamento']);
                $xmlsAdded++;
            }
        }

        $zip->close();
        if ($xmlsAdded === 0) {
            unlink($zipPath);
            die("Os registros não possuíam o conteúdo do XML gravado.");
        }

        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $zipFilename . '"');
        header('Content-Length: ' . filesize($zipPath));
        readfile($zipPath);
        unlink($zipPath);
        exit;

    case 'enviar_xml_contador':
        $di = $_POST['data_inicio'] ?? $_GET['data_inicio'] ?? '';
        $df = $_POST['data_fim'] ?? $_GET['data_fim'] ?? '';
        $emailContador = $_POST['email'] ?? $_GET['email'] ?? '';

        if (empty($emailContador) || !filter_var($emailContador, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'E-mail do contador inválido.']);
            break;
        }

        $empresaDb = fetchEmpresaDb($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['smtp_host']) || empty($empresaDb['smtp_user'])) {
            echo json_encode(['success' => false, 'message' => 'Configurações SMTP da empresa incompletas. Verifique Configurações > Parâmetros.']);
            break;
        }

        $where = ["status IN ('Autorizada', 'Cancelada')"];
        $params = [];
        if ($di) { $where[] = "DATE(data_emissao) >= ?"; $params[] = $di; }
        if ($df) { $where[] = "DATE(data_emissao) <= ?"; $params[] = $df; }

        $sqlWhere = implode(" AND ", $where);
        $stmt = $pdo->prepare("SELECT id, numero, chave_acesso, status, xml_autorizado, xml_cancelamento FROM vendas WHERE $sqlWhere");
        $stmt->execute($params);
        $vendas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($vendas)) {
            echo json_encode(['success' => false, 'message' => 'Nenhum XML encontrado para o período especificado.']);
            break;
        }

        $zipFilename = 'NFCe_XMLs_' . date('Y-m-d') . '_' . time() . '.zip';
        $zipPath = sys_get_temp_dir() . '/' . $zipFilename;
        $zip = new ZipArchive();

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            echo json_encode(['success' => false, 'message' => 'Erro ao criar arquivo ZIP no servidor.']);
            break;
        }

        $xmlsAdded = 0;
        foreach ($vendas as $v) {
            $chave = $v['chave_acesso'] ?: ('NFCe_' . $v['numero'] . '_' . $v['id']);
            
            if ($v['status'] === 'Autorizada' && !empty($v['xml_autorizado'])) {
                $zip->addFromString("Autorizadas/{$chave}-nfe.xml", $v['xml_autorizado']);
                $xmlsAdded++;
            } elseif ($v['status'] === 'Cancelada' && !empty($v['xml_cancelamento'])) {
                $zip->addFromString("Canceladas/{$chave}-nfe.xml", $v['xml_cancelamento']);
                $xmlsAdded++;
            }
        }

        $zip->close();
        
        if ($xmlsAdded === 0) {
            @unlink($zipPath);
            echo json_encode(['success' => false, 'message' => 'Os registros encontrados não possuíam conteúdo XML.']);
            break;
        }

        try {
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host       = $empresaDb['smtp_host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $empresaDb['smtp_user'];
            $mail->Password   = $empresaDb['smtp_pass'];
            $smtpSec = strtolower(trim($empresaDb['smtp_secure']));
            $mail->SMTPSecure = ($smtpSec === 'nenhum' || empty($smtpSec)) ? false : $smtpSec;
            $mail->Port       = (int)$empresaDb['smtp_port'] ?: 587;
            
            if ($mail->SMTPSecure === false) {
                $mail->SMTPAutoTLS = false;
            }

            $mail->setFrom($empresaDb['smtp_user'], $empresaDb['razao_social']);
            $mail->addAddress($emailContador);

            $mail->isHTML(true);
            
            $diBR = $di ? date('d/m/Y', strtotime($di)) : 'Início';
            $dfBR = $df ? date('d/m/Y', strtotime($df)) : 'Fim';
            
            $mail->Subject = "NFC-e XMLs (Período: {$diBR} a {$dfBR}) - " . $empresaDb['razao_social'];
            
            $body = "<h3>XMLs NFC-e</h3>";
            $body .= "<p>Anexo gerado contendo os XMLs das notas no período de <b>{$diBR}</b> a <b>{$dfBR}</b> para a empresa <b>{$empresaDb['razao_social']}</b>.</p>";
            $body .= "<br><br>";
            $body .= "<p>Não responder este e-mail..</p>";
            $body .= "<p>Desenvolvido por Enterprise Soluções - <a href='https://esolucoesia.com'>https://esolucoesia.com</a> - (64) 98117-0400</p>";
            
            $mail->Body = $body;

            $mail->addAttachment($zipPath, $zipFilename);
            $mail->send();

            @unlink($zipPath);
            echo json_encode(['success' => true]);
        } catch (\Exception $e) {
            @unlink($zipPath);
            $err = isset($mail) ? $mail->ErrorInfo : $e->getMessage();
            echo json_encode(['success' => false, 'message' => 'Erro ao enviar e-mail: ' . $err]);
        }
        break;

    // ── Enviar Documento por E-mail (PDF + XML) ────────────────────────────────
    case 'nfce_buscar_email_cliente':
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT c.email FROM vendas v LEFT JOIN clientes c ON c.id = v.cliente_id WHERE v.id = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        echo json_encode(['email' => $row['email'] ?? '']);
        break;

    case 'enviar_email_doc':
        $id = (int)($_POST['id'] ?? $_GET['id'] ?? 0);
        $emailCliente = $_POST['email'] ?? $_GET['email'] ?? '';
        
        if ($id <= 0 || empty($emailCliente)) {
            echo json_encode(['success' => false, 'message' => 'E-mail inválido']);
            break;
        }

        $empresaDb = fetchEmpresaDb($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['smtp_host'])) {
            echo json_encode(['success' => false, 'message' => 'SMTP não configurado.']);
            break;
        }

        $stmt = $pdo->prepare("SELECT numero, serie, chave_acesso, status, xml_autorizado FROM vendas WHERE id = ?");
        $stmt->execute([$id]);
        $venda = $stmt->fetch();

        if (!$venda || empty($venda['xml_autorizado']) || !in_array($venda['status'], ['Autorizada', 'Cancelada'])) {
            echo json_encode(['success' => false, 'message' => 'Nota Fiscal inválida ou sem XML autorizado.']);
            break;
        }

        try {
            $printer = new \App\Services\PrinterService([]);
            $pdfString = $printer->imprimirNfce($venda['xml_autorizado']);

            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host       = $empresaDb['smtp_host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $empresaDb['smtp_user'];
            $mail->Password   = $empresaDb['smtp_pass'];
            $smtpSec = strtolower(trim($empresaDb['smtp_secure']));
            $mail->SMTPSecure = ($smtpSec === 'nenhum' || empty($smtpSec)) ? false : $smtpSec;
            $mail->Port       = (int)$empresaDb['smtp_port'] ?: 587;
            
            if ($mail->SMTPSecure === false) {
                $mail->SMTPAutoTLS = false;
            }

            $mail->setFrom($empresaDb['smtp_user'], $empresaDb['razao_social']);
            $mail->addAddress($emailCliente);
            $mail->Subject = "NFC-e Emitida: {$venda['numero']} / {$venda['serie']}";
            
            $body = "<h3>NFC-e Emitida</h3>";
            $body .= "<p>Olá,</p>";
            $body .= "<p>Segue em anexo o arquivo XML e o DANFE (PDF) da NFC-e n° {$venda['numero']}.</p>";
            $body .= "<p>Chave de Acesso: {$venda['chave_acesso']}</p>";
            $body .= "<br><p>Desenvolvido por Enterprise Soluções - <a href='https://esolucoesia.com'>https://esolucoesia.com</a></p>";
            
            $mail->isHTML(true);
            $mail->Body = $body;

            $filenameBase = "NFCe_{$venda['chave_acesso']}";
            $mail->addStringAttachment($pdfString, "{$filenameBase}.pdf", 'base64', 'application/pdf');
            $mail->addStringAttachment($venda['xml_autorizado'], "{$filenameBase}.xml", 'base64', 'application/xml');

            $mail->send();
            echo json_encode(['success' => true]);
        } catch (\Exception $e) {
             echo json_encode(['success' => false, 'message' => 'Erro interno ao enviar e-mail: ' . $e->getMessage()]);
        }
        break;

    case 'status_sefaz':
        try {
            $modelo = $_GET['modelo'] ?? '65';
            if (!$empresaDb) {
                throw new \Exception("Dados da empresa não carregados corretamente.");
            }
            
            $svc = null;
            if ($modelo == '55') {
                $svc = new NfeService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
            } else {
                $svc = new NfceService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
            }
            
            $res = $svc->statusServico();
            echo json_encode($res);
        } catch (\Throwable $e) {
            echo json_encode([
                'success' => false,
                'cStat' => '999',
                'xMotivo' => 'Erro de Inicialização: ' . $e->getMessage()
            ]);
        }
        break;
}
