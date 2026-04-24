<?php
use App\Services\NfeService;

/**
 * API NF-e Modelo 55 - Versão Restaurada e Estabilizada
 */

function migrarColunasNfe(PDO $pdo): void {
    $colunas = [
        'modelo TINYINT DEFAULT 65',
        'natureza_operacao VARCHAR(60)',
        'cliente_id INT',
        'empresa_id INT',
        'status VARCHAR(20) DEFAULT "Pendente"',
        'chave_acesso VARCHAR(44)',
        'protocolo VARCHAR(20)',
        'xml_autorizado LONGTEXT',
        'finalidade CHAR(1) DEFAULT "1"',
        'devolucao_de_id INT DEFAULT NULL'
    ];
    foreach ($colunas as $col) {
        $name = explode(' ', $col)[0];
        try { $pdo->query("SELECT $name FROM vendas LIMIT 1"); }
        catch (Exception $e) { $pdo->exec("ALTER TABLE vendas ADD COLUMN $col"); }
    }
}

function fetchEmpresaNfe(PDO $pdo, int $empresaId): array|false {
    $s = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
    $s->execute([$empresaId ?: 1]);
    return $s->fetch();
}




switch ($action) {
    case 'nfe_listar':
        migrarColunasNfe($pdo);
        $where = ["(v.modelo = 55 OR (v.modelo IS NULL AND v.natureza_operacao IS NOT NULL AND v.natureza_operacao NOT LIKE 'VENDA CONSUMIDOR%'))"];
        $params = [];
        if ($empresaId) { $where[] = "v.empresa_id = ?"; $params[] = $empresaId; }
        $di = $_GET['data_inicio'] ?? ''; $df = $_GET['data_fim'] ?? '';
        if ($di) { $where[] = "DATE(v.data_emissao) >= ?"; $params[] = $di; }
        if ($df) { $where[] = "DATE(v.data_emissao) <= ?"; $params[] = $df; }

        $sqlW = implode(' AND ', $where);
        $stmt = $pdo->prepare("SELECT v.*, c.nome as cliente_nome, c.documento as cliente_documento, c.email as cliente_email FROM vendas v LEFT JOIN clientes c ON c.id = v.cliente_id WHERE $sqlW ORDER BY v.data_emissao DESC LIMIT 500");
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
        break;

    case 'nfe_emitir':
        migrarColunasNfe($pdo);
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) { echo json_encode(['success' => false, 'message' => 'Dados inválidos']); break; }

        $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['certificado_pfx'])) {
            echo json_encode(['success' => false, 'message' => 'Certificado digital não configurado.']);
            break;
        }

        $venda = $data['venda'];
        $clienteData = $data['cliente'] ?? null;
        $transporteData = $data['transporte'] ?? [];

        // DDL fora da transação (CREATE TABLE causa commit implícito no MySQL)
        $contaIdFin = garantirContaFinanceira($pdo, (int)$empresaDb['id']);

        try {
            $pdo->beginTransaction();

            // Trava numeração
            $stmtLock = $empresaId
                ? $pdo->prepare("SELECT numero_nfe, serie_nfe FROM empresas WHERE id=? FOR UPDATE")
                : $pdo->prepare("SELECT numero_nfe, serie_nfe FROM empresas ORDER BY id ASC LIMIT 1 FOR UPDATE");
            $stmtLock->execute($empresaId ? [$empresaId] : []);
            $empresaLocked = $stmtLock->fetch();

            $venda['numero'] = (int)$empresaLocked['numero_nfe'] + 1;
            $venda['serie']  = (int)$empresaLocked['serie_nfe'] > 0 ? (int)$empresaLocked['serie_nfe'] : 1;

            $dtBanco = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
            $dataEmissaoSql = $dtBanco->format('Y-m-d H:i:s');

            // Resolve cliente_id
            $clienteId = null;
            if ($clienteData && !empty($clienteData['documento'])) {
                $docLimpo = preg_replace('/[^0-9]/', '', $clienteData['documento']);
                $stmtCli = $pdo->prepare("SELECT id FROM clientes WHERE REPLACE(REPLACE(REPLACE(documento,'.',''),'-',''),'/','') = ? LIMIT 1");
                $stmtCli->execute([$docLimpo]);
                $cliRow = $stmtCli->fetch();
                $clienteId = $cliRow ? (int)$cliRow['id'] : null;
            }

            // INSERT vendas com modelo=55
            $stmt = $pdo->prepare("
                INSERT INTO vendas 
                    (empresa_id, modelo, numero, serie, valor_total, valor_desconto,
                     valor_frete, valor_seguro, valor_outras, valor_ipi, valor_icms, valor_pis, valor_cofins,
                     natureza_operacao, cliente_id, status, data_emissao, finalidade, devolucao_de_id)
                VALUES (?, 55, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente', ?, ?, ?)
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
                $venda['naturezaOperacao'] ?? 'VENDA',
                $clienteId,
                $dataEmissaoSql,
                $venda['finalidade'] ?? '1',
                $venda['devolucaoDeId'] ?? null
            ]);
            $vendaId = $pdo->lastInsertId();
            $venda['id'] = $vendaId;

            // INSERT itens
            $itensEnriquecidos = [];
            foreach ($venda['itens'] as $item) {
                $stmtP = $pdo->prepare("SELECT * FROM produtos WHERE id = ?");
                $stmtP->execute([(int)($item['produtoId'] ?? 0)]);
                $prod = $stmtP->fetch() ?: [];
                $itemMerged = array_merge($prod, $item);

                $stmtI = $pdo->prepare("
                    INSERT INTO vendas_itens
                        (venda_id, produto_id, quantidade, valor_unitario, valor_total,
                         ncm, cfop, unidade, origem)
                    VALUES (?,?,?,?,?,?,?,?,?)
                ");
                $stmtI->execute([
                    $vendaId,
                    (int)($item['produtoId'] ?? $item['produto_id'] ?? 0),
                    (float)($item['quantidade'] ?? 1),
                    (float)($item['valorUnitario'] ?? $item['valor_unitario'] ?? 0),
                    (float)($item['valorTotal'] ?? $item['valor_total'] ?? 0),
                    $item['ncm'] ?? null,
                    $item['cfop'] ?? null,
                    $item['unidade'] ?? $item['unidadeComercial'] ?? null,
                    (int)($item['origem'] ?? 0),
                ]);

                $itemMerged['valor_unitario'] = $itemMerged['valorUnitario'] ?? $itemMerged['valor_unitario'] ?? 0;
                $itensEnriquecidos[] = $itemMerged;
            }

            // INSERT pagamentos
            foreach (($venda['pagamentos'] ?? []) as $pag) {
                $fPag = $pag['formaPagamento'] ?? $pag['forma_pagamento'] ?? '01';
                $vPag = (float)($pag['valorPagamento'] ?? $pag['valor_pagamento'] ?? 0);

                $tpIntegra = $pag['tpIntegra'] ?? $pag['tp_integra'] ?? '2';
                $tBand     = $pag['tBand']     ?? $pag['t_band']    ?? null;
                $cAut      = $pag['cAut']      ?? $pag['c_aut']     ?? null;
                $stmtPag = $pdo->prepare("INSERT INTO vendas_pagamentos (venda_id, forma_pagamento, valor_pagamento, tp_integra, t_band, c_aut) VALUES (?, ?, ?, ?, ?, ?)");
                $stmtPag->execute([ $vendaId, $fPag, $vPag, $tpIntegra, $tBand, $cAut ]);
            }

            // Buscar alíquotas RTC
            $aliquotasRtc = [];
            try {
                $hoje = (new \DateTime('now', new \DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
                $stmtAliq = $pdo->query("SELECT imposto, percentual FROM rtc_aliquotas WHERE d_ini_vig <= '{$hoje}' AND (d_fim_vig IS NULL OR d_fim_vig >= '{$hoje}')");
                foreach ($stmtAliq->fetchAll() as $aliqRow) {
                    $aliquotasRtc[$aliqRow['imposto']] = (float)$aliqRow['percentual'];
                }
            } catch (\Exception $e) {}

            // Resolver transportador
            if (!empty($transporteData['transportadorId'])) {
                $stmtTr = $pdo->prepare("SELECT * FROM transportadores WHERE id = ?");
                $stmtTr->execute([(int)$transporteData['transportadorId']]);
                $transporteData['transportadorData'] = $stmtTr->fetch() ?: null;
                if ($transporteData['transportadorData']) {
                    $tr = $transporteData['transportadorData'];
                    $transporteData['transportadorData']['endereco'] = [
                        'logradouro' => $tr['logradouro'] ?? '',
                        'municipio'  => $tr['municipio'] ?? '',
                        'uf'         => $tr['uf'] ?? '',
                    ];
                }
            }

            // Emitir via NfeService
            $servico = new NfeService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
            $resultado = $servico->emitirNfe($venda, $itensEnriquecidos, $clienteData, $transporteData, false, $aliquotasRtc);

            if ($resultado->sucesso) {
                $statusSalvar = $resultado->status === 'Contingencia' ? 'Contingencia' : 'Autorizada';
                $chaveAcesso = (string)($resultado->chave_acesso ?? '');
                $pdo->prepare("UPDATE vendas SET status = ?, protocolo = ?, chave_acesso = ?, xml_autorizado = ? WHERE id = ?")
                    ->execute([$statusSalvar, $resultado->protocolo ?? '', $chaveAcesso, $resultado->xml_assinado ?? '', $vendaId]);

                $pdo->prepare("UPDATE empresas SET numero_nfe = ? WHERE id = ?")
                    ->execute([$venda['numero'], $empresaDb['id']]);

                // Baixa de estoque
                foreach ($venda['itens'] as $item) {
                    $pdo->prepare("UPDATE produtos SET estoque = GREATEST(0, estoque - ?) WHERE id = ?")
                        ->execute([(float)($item['quantidade'] ?? 1), (int)($item['produtoId'] ?? 0)]);
                }

                // INTEGRAÇÃO FINANCEIRA SÓ NO SUCESSO
                $formasParceladas = ['05', '15']; // Crédito Loja e Boleto → sempre Contas a Receber
                foreach (($venda['pagamentos'] ?? []) as $pag) {
                    $fPag = $pag['formaPagamento'] ?? $pag['forma_pagamento'] ?? '01';
                    $vPag = (float)($pag['valorPagamento'] ?? $pag['valor_pagamento'] ?? 0);
                    $vencimentos = $pag['vencimentos'] ?? [];

                    // Forma parcelada sem vencimentos enviados → cria parcela única com 30 dias
                    if (empty($vencimentos) && in_array($fPag, $formasParceladas) && $vPag > 0) {
                        $vencimentos = [[
                            'numero'     => '001',
                            'vencimento' => date('Y-m-d', strtotime('+30 days')),
                            'valor'      => $vPag,
                        ]];
                    }

                    if (!empty($vencimentos)) {
                        // Parcelas em contas a receber
                        $totalParts = count($vencimentos);
                        foreach ($vencimentos as $p) {
                            $stmtFin = $pdo->prepare("INSERT INTO financeiro (empresa_id, venda_id, tipo, status, valor_total, vencimento, parcela_numero, parcela_total, forma_pagamento_prevista, entidade_id, categoria) VALUES (?, ?, 'R', 'Pendente', ?, ?, ?, ?, ?, ?, 'Venda NF-e')");
                            $stmtFin->execute([$empresaDb['id'], $vendaId, $p['valor'], $p['vencimento'], $p['numero'], $totalParts, $fPag, $clienteId]);
                        }
                    } elseif ($contaIdFin) {
                        // Pagamento à vista: lança no caixa
                        $hist = "Venda NF-e #" . $venda['numero'];
                        $pdo->prepare("INSERT INTO caixa_movimentos (empresa_id, venda_id, conta_id, tipo, valor, forma_pagamento, historico) VALUES (?, ?, ?, 'C', ?, ?, ?)")
                            ->execute([$empresaDb['id'], $vendaId, $contaIdFin, $vPag, $fPag, $hist]);
                    }
                }

                $pdo->commit();

                echo json_encode([
                    'success'     => true,
                    'id'          => $vendaId,
                    'numero'      => $venda['numero'],
                    'status'      => $statusSalvar,
                    'protocolo'   => $resultado->protocolo ?? '',
                    'chaveAcesso' => $chaveAcesso,
                    'xml'         => base64_encode($resultado->xml_assinado ?? '')
                ]);
            } else {
                $pdo->prepare("UPDATE vendas SET status = 'Rejeitada' WHERE id = ?")->execute([$vendaId]);
                $pdo->commit();

                echo json_encode([
                    'success' => false,
                    'message' => 'Rejeição SEFAZ: ' . ($resultado->mensagem_erro ?? 'Erro desconhecido'),
                    'xml'     => !empty($resultado->xml_assinado) ? base64_encode($resultado->xml_assinado) : null
                ]);

                notificarRejeicaoSefaz($empresaDb, $venda, $resultado->mensagem_erro ?? '', $resultado->xml_assinado ?? '');
            }
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage() . ' L' . $e->getLine()]);
        }
        break;

    case 'nfe_danfe':
        $id = (int)$_GET['id'];
        $v = $pdo->query("SELECT xml_autorizado, status FROM vendas WHERE id = $id")->fetch();
        if ($v && $v['xml_autorizado']) {
            $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
            try {
                $printer = new \App\Services\PrinterService($empresaDb, $empresaDb['logo_url'] ?? '');
                header_remove('Content-Type');
                $pdf = $printer->imprimirNfe($v['xml_autorizado']);
                header('Content-Type: application/pdf');
                header('Content-Disposition: inline; filename="danfe_nfe_' . $id . '.pdf"');
                echo $pdf;
            } catch (\Throwable $e) {
                http_response_code(500);
                echo "Erro ao gerar DANFE: " . $e->getMessage();
            }
        } else {
            echo "XML não encontrado. Status: " . ($v['status'] ?? 'N/A');
        }
        break;

    case 'nfe_download_xml':
        $id = (int)$_GET['id'];
        $v = $pdo->query("SELECT xml_autorizado, chave_acesso FROM vendas WHERE id = $id")->fetch();
        if ($v && $v['xml_autorizado']) {
            header('Content-Type: application/xml');
            header('Content-Disposition: attachment; filename="'.$v['chave_acesso'].'.xml"');
            echo $v['xml_autorizado'];
        }
        break;

    case 'nfe_emitir_pendente':
        migrarColunasNfe($pdo);
        $id = (int)$_GET['id'];
        $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['certificado_pfx'])) {
            echo json_encode(['success' => false, 'message' => 'Certificado digital não configurado.']);
            break;
        }
        try {
            $vendaDb = $pdo->query("SELECT * FROM vendas WHERE id = $id")->fetch();
            if (!$vendaDb) { echo json_encode(['success' => false, 'message' => 'Venda não encontrada']); break; }

            $clienteDb = null;
            if ($vendaDb['cliente_id']) {
                $clienteDb = $pdo->query("SELECT * FROM clientes WHERE id = {$vendaDb['cliente_id']}")->fetch();
                if ($clienteDb) {
                    $clienteDb['endereco'] = [
                        'logradouro' => $clienteDb['logradouro'] ?? '',
                        'numero' => $clienteDb['numero'] ?? '',
                        'bairro' => $clienteDb['bairro'] ?? '',
                        'municipio' => $clienteDb['municipio'] ?? '',
                        'codigoMunicipio' => $clienteDb['codigo_municipio'] ?? '',
                        'uf' => $clienteDb['uf'] ?? '',
                        'cep' => $clienteDb['cep'] ?? '',
                    ];
                }
            }

            $itensDb = $pdo->query("
                SELECT vi.*, p.codigo_interno, p.descricao, p.ncm, p.cfop,
                       p.unidade_comercial, p.icms_cst_csosn, p.codigo_barras as ean,
                       p.cbs_cst, p.cbs_classtrib, p.ibs_cst, p.ibs_classtrib, p.ccredpres
                FROM vendas_itens vi
                LEFT JOIN produtos p ON p.id = vi.produto_id
                WHERE vi.venda_id = $id
            ")->fetchAll();

            $vendaDbArray = [
                'id' => $vendaDb['id'],
                'numero' => $vendaDb['numero'],
                'serie' => $vendaDb['serie'],
                'naturezaOperacao' => $vendaDb['natureza_operacao'] ?? 'VENDA',
                'valorTotal' => (float)$vendaDb['valor_total'],
                'valorDesconto' => (float)($vendaDb['valor_desconto'] ?? 0),
                'valorFrete' => (float)($vendaDb['valor_frete'] ?? 0),
                'valorSeguro' => (float)($vendaDb['valor_seguro'] ?? 0),
                'valorOutras' => (float)($vendaDb['valor_outras'] ?? 0),
            ];

            // Buscar pagamentos
            $pagsDb = $pdo->query("SELECT * FROM vendas_pagamentos WHERE venda_id = $id")->fetchAll();
            $vendaDbArray['pagamentos'] = array_map(fn($p) => [
                'formaPagamento' => $p['forma_pagamento'],
                'valorPagamento' => (float)$p['valor_pagamento'],
            ], $pagsDb);

            // Alíquotas RTC
            $aliquotasRtc = [];
            try {
                $hoje = (new \DateTime('now', new \DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
                $stmtAliq = $pdo->query("SELECT imposto, percentual FROM rtc_aliquotas WHERE d_ini_vig <= '{$hoje}' AND (d_fim_vig IS NULL OR d_fim_vig >= '{$hoje}')");
                foreach ($stmtAliq->fetchAll() as $aliqRow) {
                    $aliquotasRtc[$aliqRow['imposto']] = (float)$aliqRow['percentual'];
                }
            } catch (\Exception $e) {}

            $servico = new NfeService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
            $resultado = $servico->emitirNfe($vendaDbArray, $itensDb, $clienteDb, [], false, $aliquotasRtc);

            if ($resultado->sucesso) {
                $statusSalvar = $resultado->status === 'Contingencia' ? 'Contingencia' : 'Autorizada';
                $chaveAcesso = (string)($resultado->chave_acesso ?? '');
                $pdo->prepare("UPDATE vendas SET status = ?, protocolo = ?, chave_acesso = ?, xml_autorizado = ? WHERE id = ?")
                    ->execute([$statusSalvar, $resultado->protocolo ?? '', $chaveAcesso, $resultado->xml_assinado ?? '', $id]);
                $pdo->prepare("UPDATE empresas SET numero_nfe = ? WHERE id = ?")
                    ->execute([$vendaDb['numero'], $empresaDb['id']]);

                echo json_encode([
                    'success' => true, 'id' => $id, 'numero' => $vendaDb['numero'],
                    'status' => $statusSalvar, 'protocolo' => $resultado->protocolo ?? '',
                    'chaveAcesso' => $chaveAcesso
                ]);
            } else {
                // Se há pagamento TEF aprovado, mantém TEFAprovado para retry ficar visível
                $temTefAprovado = (int)$pdo->query("SELECT COUNT(*) FROM vendas_pagamentos WHERE venda_id = $id AND forma_pagamento IN ('03','04','17') AND status_pagamento = 4")->fetchColumn() > 0;
                $statusRejeitar = $temTefAprovado ? 'TEFAprovado' : 'Rejeitada';
                $pdo->prepare("UPDATE vendas SET status = ? WHERE id = ?")->execute([$statusRejeitar, $id]);
                echo json_encode(['success' => false, 'message' => ($resultado->mensagem_erro ?? 'Erro desconhecido')]);
            }
        } catch (Exception $e) { echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
    case 'nfe_enviar_xml_contador':
        $di = $_POST['data_inicio'] ?? '';
        $df = $_POST['data_fim'] ?? '';
        $emailContador = $_POST['email'] ?? '';

        if (empty($emailContador) || !filter_var($emailContador, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'E-mail do contador inválido.']);
            break;
        }

        $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['smtp_host']) || empty($empresaDb['smtp_user'])) {
            echo json_encode(['success' => false, 'message' => 'Configurações SMTP da empresa incompletas. Verifique Configurações > Parâmetros.']);
            break;
        }

        $where = ["status IN ('Autorizada', 'Cancelada')", "modelo = 55"];
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

        $zipFilename = 'NFe_XMLs_' . date('Y-m-d') . '_' . time() . '.zip';
        $zipPath = sys_get_temp_dir() . '/' . $zipFilename;
        $zip = new ZipArchive();

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            echo json_encode(['success' => false, 'message' => 'Erro ao criar arquivo ZIP no servidor.']);
            break;
        }

        $xmlsAdded = 0;
        foreach ($vendas as $v) {
            $chave = $v['chave_acesso'] ?: ('NFe_' . $v['numero'] . '_' . $v['id']);
            
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
            
            $mail->Subject = "NF-e XMLs (Período: {$diBR} a {$dfBR}) - " . $empresaDb['razao_social'];
            
            $body = "<h3>XMLs NF-e</h3>";
            $body .= "<p>Anexo gerado contendo os XMLs das notas NF-e no período de <b>{$diBR}</b> a <b>{$dfBR}</b> para a empresa <b>{$empresaDb['razao_social']}</b>.</p>";
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

    case 'nfe_enviar_email_doc':
        $id = (int)($_POST['id'] ?? $_GET['id'] ?? 0);
        $emailCliente = $_POST['email'] ?? $_GET['email'] ?? '';
        
        if ($id <= 0 || empty($emailCliente)) {
            echo json_encode(['success' => false, 'message' => 'E-mail inválido']);
            break;
        }

        $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['smtp_host'])) {
            echo json_encode(['success' => false, 'message' => 'SMTP não configurado.']);
            break;
        }

        $stmt = $pdo->prepare("SELECT numero, serie, chave_acesso, status, xml_autorizado FROM vendas WHERE id = ? AND modelo = 55");
        $stmt->execute([$id]);
        $venda = $stmt->fetch();

        if (!$venda || empty($venda['xml_autorizado']) || !in_array($venda['status'], ['Autorizada', 'Cancelada'])) {
            echo json_encode(['success' => false, 'message' => 'Nota Fiscal inválida ou sem XML autorizado.']);
            break;
        }

        try {
            $printer = new \App\Services\PrinterService($empresaDb, $empresaDb['logo_url'] ?? '');
            $pdfString = $printer->imprimirNfe($venda['xml_autorizado']);

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
            $mail->Subject = "NF-e Emitida: {$venda['numero']} / {$venda['serie']}";
            
            $body = "<h3>NF-e Emitida</h3>";
            $body .= "<p>Olá,</p>";
            $body .= "<p>Segue em anexo o arquivo XML e o DANFE (PDF) da NF-e nº {$venda['numero']}.</p>";
            $body .= "<p>Chave de Acesso: {$venda['chave_acesso']}</p>";
            $body .= "<br><p>Desenvolvido por Enterprise Soluções - <a href='https://esolucoesia.com'>https://esolucoesia.com</a></p>";
            
            $mail->isHTML(true);
            $mail->Body = $body;

            $filenameBase = "NFe_{$venda['chave_acesso']}";
            $mail->addStringAttachment($pdfString, "{$filenameBase}.pdf", 'base64', 'application/pdf');
            $mail->addStringAttachment($venda['xml_autorizado'], "{$filenameBase}.xml", 'base64', 'application/xml');

            $mail->send();
            echo json_encode(['success' => true]);
        } catch (\Exception $e) {
             echo json_encode(['success' => false, 'message' => 'Erro interno ao enviar e-mail: ' . $e->getMessage()]);
        }
        break;

    case 'nfe_listar_cce':
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT id, numero_sequencia, correcao, protocolo, status, created_at FROM nfe_cce WHERE venda_id = ? AND empresa_id = ? ORDER BY numero_sequencia DESC");
        $stmt->execute([$id, $empresaId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'nfe_enviar_cce':
        $id = (int)($_POST['id'] ?? $_GET['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true);
        $correcao = trim($data['correcao'] ?? '');
        
        if ($id <= 0 || strlen($correcao) < 15) {
            echo json_encode(['success' => false, 'message' => 'Correcao deve ter no minimo 15 caracteres.']);
            break;
        }
        if (strlen($correcao) > 1000) {
            echo json_encode(['success' => false, 'message' => 'Correcao deve ter no maximo 1000 caracteres.']);
            break;
        }
        
        $stmt = $pdo->prepare("SELECT numero, serie, chave_acesso, status, data_emissao FROM vendas WHERE id = ? AND modelo = 55 AND empresa_id = ?");
        $stmt->execute([$id, $empresaId]);
        $venda = $stmt->fetch();
        
        if (!$venda || $venda['status'] !== 'Autorizada') {
            echo json_encode(['success' => false, 'message' => 'NFe nao esta autorizada.']);
            break;
        }
        
        if (!empty($venda['data_emissao'])) {
            $dataAut = strtotime($venda['data_emissao']);
            $horasPassadas = (time() - $dataAut) / 3600;
            if ($horasPassadas > 720) {
                echo json_encode(['success' => false, 'message' => 'Prazo de 720 horas (30 dias) para CCe expirado.']);
                break;
            }
        }
        
        $cnt = $pdo->prepare("SELECT COUNT(*) as qtd, MAX(numero_sequencia) as max_seq FROM nfe_cce WHERE venda_id = ? AND status = 'Autorizada'");
        $cnt->execute([$id]);
        $info = $cnt->fetch();
        $qtdCce = (int)$info['qtd'];
        $proxSeq = (int)$info['max_seq'] + 1;
        
        if ($qtdCce >= 20) {
            echo json_encode(['success' => false, 'message' => 'Limite de 20 CCe por NFe atingido.']);
            break;
        }
        
        try {
            $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
            $pfxContent = $empresaDb['certificado_pfx'];
            $senha = $empresaDb['certificado_senha'];
            if (strpos($pfxContent, 'base64,') !== false) {
                $pfxContent = base64_decode(explode('base64,', $pfxContent)[1]);
            }
            
            $configJson = json_encode([
                "atualizacao" => date('Y-m-d H:i:s'),
                "tpAmb" => (int)($empresaDb['ambiente_nfe'] ?? 2),
                "razaosocial" => $empresaDb['razao_social'],
                "siglaUF" => $empresaDb['uf'],
                "cnpj" => $empresaDb['cnpj'],
                "schemes" => "PL_009_V4",
                "versao" => "4.00",
                "tokenIBGE" => $empresaDb['codigo_municipio'],
                "proxyConf" => ["proxy" => "", "port" => "", "user" => "", "pass" => ""]
            ]);
            
            $certificate = \NFePHP\Common\Certificate::readPfx($pfxContent, $senha);
            $tools = new \NFePHP\NFe\Tools($configJson, $certificate);
            $tools->model('55');
            
            $resp = $tools->sefazCCe($venda['chave_acesso'], $correcao, $proxSeq);
            
            $st = new \NFePHP\NFe\Common\Standardize($resp);
            $retorno = $st->toArray();
            
            $cStat = $retorno['infEvento']['cStat'] ?? $retorno['retEvento']['infEvento']['cStat'] ?? '';
            $xMotivo = $retorno['infEvento']['xMotivo'] ?? $retorno['retEvento']['infEvento']['xMotivo'] ?? 'Erro ao processar';
            $nProt = $retorno['infEvento']['nProt'] ?? $retorno['retEvento']['infEvento']['nProt'] ?? '';
            
            if (in_array($cStat, ['135', '136'])) {
                // Montar procEventoNFe (envio + retorno) para permitir geração do PDF
                try {
                    $dom = new \DOMDocument('1.0', 'UTF-8');
                    $dom->preserveWhiteSpace = false;
                    $dom->formatOutput = false;
                    $dom->loadXML($resp);
                    $retEvento = $dom->getElementsByTagName('retEvento')->item(0);
                    $evento = $tools->lastRequest ?? null;
                    
                    // Tenta extrair o evento enviado do lastRequest
                    $domEnvio = new \DOMDocument('1.0', 'UTF-8');
                    if ($evento) {
                        $domEnvio->loadXML($evento);
                        $eventoXML = $domEnvio->getElementsByTagName('evento')->item(0);
                    }
                    
                    $procXml = '<?xml version="1.0" encoding="UTF-8"?>';
                    $procXml .= '<procEventoNFe versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">';
                    if (isset($eventoXML)) {
                        $procXml .= $dom->saveXML($dom->importNode($eventoXML, true));
                    }
                    if ($retEvento) {
                        $procXml .= $dom->saveXML($retEvento);
                    }
                    $procXml .= '</procEventoNFe>';
                    
                    $xmlFinal = $procXml;
                } catch (\Throwable $ex) {
                    $xmlFinal = $resp;
                }
                
                $pdo->prepare("INSERT INTO nfe_cce (empresa_id, venda_id, numero_sequencia, correcao, protocolo, xml_cce, status) VALUES (?, ?, ?, ?, ?, ?, 'Autorizada')")
                    ->execute([$empresaId, $id, $proxSeq, $correcao, $nProt, $xmlFinal]);
                echo json_encode(['success' => true, 'message' => "CCe #{$proxSeq} autorizada (Protocolo: {$nProt})", 'protocolo' => $nProt, 'sequencia' => $proxSeq]);
            } else {
                echo json_encode(['success' => false, 'message' => "SEFAZ: [{$cStat}] {$xMotivo}"]);
            }
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Erro ao emitir CCe: ' . $e->getMessage()]);
        }
        break;

    case 'nfe_cce_pdf':
        $cceId = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT c.*, v.xml_autorizado FROM nfe_cce c JOIN vendas v ON v.id = c.venda_id WHERE c.id = ? AND c.empresa_id = ?");
        $stmt->execute([$cceId, $empresaId]);
        $cce = $stmt->fetch();
        if (!$cce || empty($cce['xml_cce'])) {
            echo "CCe não encontrada"; break;
        }
        try {
            $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
            $printer = new \App\Services\PrinterService($empresaDb, $empresaDb['logo_url'] ?? '');
            $pdf = $printer->imprimirCce($cce['xml_cce'], $cce['xml_autorizado']);
            header("Content-Type: application/pdf");
            header("Content-Disposition: inline; filename=\"CCe_{$cce['venda_id']}_{$cce['numero_sequencia']}.pdf\"");
            echo $pdf;
        } catch (\Exception $e) {
            echo "Erro ao gerar CCe PDF: " . $e->getMessage();
        }
        break;

    case 'nfe_cancelar':
        $vendaId    = (int)($_GET['id'] ?? 0);
        $data       = json_decode(file_get_contents('php://input'), true);
        $justificativa = trim($data['justificativa'] ?? '');

        if ($vendaId <= 0 || strlen($justificativa) < 15) {
            echo json_encode(['success' => false, 'message' => 'ID inválido ou justificativa com menos de 15 caracteres.']);
            break;
        }

        $stmt = $pdo->prepare("SELECT * FROM vendas WHERE id = ? AND modelo = 55");
        $stmt->execute([$vendaId]);
        $venda = $stmt->fetch();

        if (!$venda) {
            echo json_encode(['success' => false, 'message' => 'NF-e não encontrada.']);
            break;
        }
        if ($venda['status'] !== 'Autorizada') {
            echo json_encode(['success' => false, 'message' => 'Apenas NF-e Autorizadas podem ser canceladas.']);
            break;
        }
        if (empty($venda['chave_acesso']) || empty($venda['protocolo'])) {
            echo json_encode(['success' => false, 'message' => 'Chave de acesso ou protocolo não encontrado.']);
            break;
        }

        $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['certificado_pfx'])) {
            echo json_encode(['success' => false, 'message' => 'Certificado digital não configurado.']);
            break;
        }

        // DDL fora de transação
        $contaIdCanc = garantirContaFinanceira($pdo, (int)$empresaDb['id']);

        try {
            $servico = new NfeService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
            $resultado = $servico->cancelarNfe($venda['chave_acesso'], $venda['protocolo'], $justificativa);

            if ($resultado->sucesso) {
                // Garante colunas de cancelamento
                foreach (['xml_cancelamento LONGTEXT', 'protocolo_cancelamento VARCHAR(30)', 'justificativa_cancelamento VARCHAR(255)', 'data_cancelamento DATETIME'] as $col) {
                    $colName = explode(' ', $col)[0];
                    try { $pdo->query("SELECT $colName FROM vendas LIMIT 1"); } catch (PDOException $e) {
                        $pdo->exec("ALTER TABLE vendas ADD COLUMN $col DEFAULT NULL");
                    }
                }

                $pdo->prepare("UPDATE vendas SET status = 'Cancelada', xml_cancelamento = ?, protocolo_cancelamento = ?, justificativa_cancelamento = ?, data_cancelamento = NOW() WHERE id = ?")
                    ->execute([$resultado->xml_cancelamento ?? '', $resultado->protocolo ?? '', $justificativa, $vendaId]);

                // Estorno de estoque
                $itens = $pdo->prepare("SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = ?");
                $itens->execute([$vendaId]);
                foreach ($itens->fetchAll() as $it) {
                    $pdo->prepare("UPDATE produtos SET estoque = estoque + ? WHERE id = ?")
                        ->execute([$it['quantidade'], $it['produto_id']]);
                }

                // Estorno financeiro: reverte créditos lançados em caixa_movimentos na emissão
                if ($contaIdCanc) {
                    $credsCaixa = $pdo->prepare("SELECT conta_id, valor, forma_pagamento FROM caixa_movimentos WHERE venda_id = ? AND empresa_id = ? AND tipo = 'C'");
                    $credsCaixa->execute([$vendaId, $empresaDb['id']]);
                    $credRows = $credsCaixa->fetchAll();
                    if ($credRows) {
                        foreach ($credRows as $cr) {
                            $pdo->prepare("INSERT INTO caixa_movimentos (empresa_id, venda_id, conta_id, tipo, valor, forma_pagamento, historico) VALUES (?, ?, ?, 'D', ?, ?, ?)")
                                ->execute([$empresaDb['id'], $vendaId, $cr['conta_id'], $cr['valor'], $cr['forma_pagamento'], "Cancelamento NF-e #" . $venda['numero']]);
                        }
                    } else {
                        // Fallback: sem crédito no caixa, lança débito por vendas_pagamentos
                        $pags = $pdo->prepare("SELECT forma_pagamento, valor_pagamento FROM vendas_pagamentos WHERE venda_id = ?");
                        $pags->execute([$vendaId]);
                        foreach ($pags->fetchAll() as $pc) {
                            $pdo->prepare("INSERT INTO caixa_movimentos (empresa_id, venda_id, conta_id, tipo, valor, forma_pagamento, historico) VALUES (?, ?, ?, 'D', ?, ?, ?)")
                                ->execute([$empresaDb['id'], $vendaId, $contaIdCanc, $pc['valor_pagamento'], $pc['forma_pagamento'], "Cancelamento NF-e #" . $venda['numero']]);
                        }
                    }
                    $pdo->prepare("UPDATE financeiro SET status = 'Cancelado' WHERE venda_id = ? AND empresa_id = ? AND status IN ('Pendente','Parcial')")
                        ->execute([$vendaId, $empresaDb['id']]);
                }

                echo json_encode(['success' => true, 'protocolo' => $resultado->protocolo ?? '']);
            } else {
                echo json_encode(['success' => false, 'message' => $resultado->mensagem]);
            }
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'message' => 'Erro PHP no cancelamento: ' . $e->getMessage()]);
        }
        break;

    case 'nfe_cce':
        $vendaId = (int)($_GET['id'] ?? 0);
        $data    = json_decode(file_get_contents('php://input'), true);
        $texto   = trim($data['texto'] ?? '');
        $seq     = max(1, (int)($data['sequencia'] ?? 1));

        if ($vendaId <= 0 || strlen($texto) < 15) {
            echo json_encode(['success' => false, 'message' => 'Texto deve ter pelo menos 15 caracteres.']);
            break;
        }

        $stmt = $pdo->prepare("SELECT * FROM vendas WHERE id = ? AND modelo = 55");
        $stmt->execute([$vendaId]);
        $venda = $stmt->fetch();

        if (!$venda) { echo json_encode(['success' => false, 'message' => 'NF-e não encontrada.']); break; }
        if ($venda['status'] !== 'Autorizada') { echo json_encode(['success' => false, 'message' => 'Apenas NF-e Autorizadas podem receber CC-e.']); break; }
        if (empty($venda['chave_acesso'])) { echo json_encode(['success' => false, 'message' => 'Chave de acesso não encontrada.']); break; }

        $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['certificado_pfx'])) {
            echo json_encode(['success' => false, 'message' => 'Certificado digital não configurado.']);
            break;
        }

        try {
            $servico   = new NfeService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
            $resultado = $servico->cartaCorrecaoNfe($venda['chave_acesso'], $texto, $seq);

            if ($resultado->sucesso) {
                echo json_encode(['success' => true, 'protocolo' => $resultado->protocolo ?? '', 'mensagem' => $resultado->mensagem ?? '']);
            } else {
                echo json_encode(['success' => false, 'message' => $resultado->mensagem]);
            }
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'message' => 'Erro PHP na CC-e: ' . $e->getMessage()]);
        }
        break;

    case 'nfe_excluir':
        $id = (int)($_GET['id'] ?? 0);
        $stmtChk = $pdo->prepare("SELECT status FROM vendas WHERE id = ? AND modelo = 55");
        $stmtChk->execute([$id]);
        $vRow = $stmtChk->fetch();
        if (!$vRow) {
            echo json_encode(['success' => false, 'message' => 'NF-e não encontrada']);
            break;
        }
        if ($vRow['status'] === 'Autorizada') {
            echo json_encode(['success' => false, 'message' => 'NF-e autorizada não pode ser excluída. Cancele-a na SEFAZ primeiro.']);
            break;
        }
        
        $pdo->prepare("DELETE FROM vendas_pagamentos WHERE venda_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM vendas_itens WHERE venda_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM vendas WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'nfe_buscar_para_devolucao':
        $vendaId = (int)($_GET['id'] ?? $_GET['venda_id'] ?? 0);
        if (!$vendaId) { echo json_encode(['success' => false, 'message' => 'ID da venda não informado']); break; }
        
        try {
            $venda = $pdo->query("
                SELECT v.*, 
                       c.nome as cliente_nome, 
                       c.documento as cliente_documento, 
                       c.ie as cliente_ie,
                       c.indIEDest as cliente_ind_ie_dest,
                       c.telefone as cliente_telefone,
                       c.logradouro, 
                       c.numero as numero_end, 
                       c.complemento, 
                       c.bairro, 
                       c.municipio, 
                       c.uf, 
                       c.cep, 
                       c.codigo_municipio
                FROM vendas v 
                LEFT JOIN clientes c ON c.id = v.cliente_id 
                WHERE v.id = $vendaId
            ")->fetch();
            
            if (!$venda) { echo json_encode(['success' => false, 'message' => 'Venda não encontrada']); break; }
            
            $cliente = null;
            if ($venda['cliente_id']) {
                $cliente = $pdo->query("SELECT * FROM clientes WHERE id = {$venda['cliente_id']}")->fetch();
            }
            
            $itens = $pdo->query("
                SELECT vi.*, 
                       p.descricao,
                       vi.aliq_icms as icms_aliquota,
                       vi.aliq_pis as pis_aliquota,
                       vi.aliq_cofins as cofins_aliquota,
                       vi.aliq_ipi as ipi_aliquota,
                       vi.origem as origem_mercadoria,
                       vi.unidade as unidade_comercial,
                       p.icms_cst_csosn as icms_cst_csosn,
                       p.pis_cst as pis_cst,
                       p.cofins_cst as cofins_cst
                FROM vendas_itens vi
                LEFT JOIN produtos p ON p.id = vi.produto_id
                WHERE vi.venda_id = $vendaId
            ")->fetchAll();
            
            $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
            echo json_encode(['success' => true, 'venda' => $venda, 'cliente' => $cliente, 'itens' => $itens, 'empresa' => $empresaDb]);
        } catch (Exception $e) { echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
        break;

    case 'nfe_devolucao':
        migrarColunasNfe($pdo);
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) { echo json_encode(['success' => false, 'message' => 'Dados inválidos']); break; }

        $empresaDb = fetchEmpresaNfe($pdo, $empresaId);
        if (!$empresaDb || empty($empresaDb['certificado_pfx'])) {
            echo json_encode(['success' => false, 'message' => 'Certificado digital não configurado.']);
            break;
        }

        $venda = $data['venda'];
        $clienteData = $data['cliente'] ?? null;
        $devolucaoDeId = (int)($data['devolucaoDeId'] ?? 0);
        
        // Buscar chave da nota original para referenciar
        $vendaOriginal = $pdo->query("SELECT chave_acesso, numero, serie FROM vendas WHERE id = $devolucaoDeId")->fetch();
        if (!$vendaOriginal || empty($vendaOriginal['chave_acesso'])) {
            echo json_encode(['success' => false, 'message' => 'Nota original não encontrada ou sem chave de acesso para referenciar.']);
            break;
        }
        $venda['chaveReferenciada'] = $vendaOriginal['chave_acesso'];

        try {
            $pdo->beginTransaction();

            $stmtLock = $empresaId
                ? $pdo->prepare("SELECT numero_nfe, serie_nfe FROM empresas WHERE id=? FOR UPDATE")
                : $pdo->prepare("SELECT numero_nfe, serie_nfe FROM empresas ORDER BY id ASC LIMIT 1 FOR UPDATE");
            $stmtLock->execute($empresaId ? [$empresaId] : []);
            $empresaLocked = $stmtLock->fetch();

            $venda['numero'] = (int)$empresaLocked['numero_nfe'] + 1;
            $venda['serie']  = (int)$empresaLocked['serie_nfe'] > 0 ? (int)$empresaLocked['serie_nfe'] : 1;

            $dtBanco = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
            $dataEmissaoSql = $dtBanco->format('Y-m-d H:i:s');

            // Resolve cliente_id
            $clienteId = null;
            if ($clienteData && !empty($clienteData['documento'])) {
                $docLimpo = preg_replace('/[^0-9]/', '', $clienteData['documento']);
                $stmtCli = $pdo->prepare("SELECT id FROM clientes WHERE REPLACE(REPLACE(REPLACE(documento,'.',''),'-',''),'/','') = ? LIMIT 1");
                $stmtCli->execute([$docLimpo]);
                $cliRow = $stmtCli->fetch();
                $clienteId = $cliRow ? (int)$cliRow['id'] : null;
            }

            $stmt = $pdo->prepare("
                INSERT INTO vendas 
                    (empresa_id, modelo, numero, serie, valor_total, valor_desconto, status, data_emissao,
                     natureza_operacao, cliente_id, devolucao_de_id, finalidade)
                VALUES (?, 55, ?, ?, ?, ?, 'Pendente', ?, ?, ?, ?, '4')
            ");
            $stmt->execute([
                $empresaDb['id'], $venda['numero'], $venda['serie'],
                (float)($venda['valorTotal'] ?? 0), (float)($venda['valorDesconto'] ?? 0),
                $dataEmissaoSql, $venda['naturezaOperacao'] ?? 'DEVOLUCAO', $clienteId, $devolucaoDeId
            ]);
            $vendaId = $pdo->lastInsertId();
            $venda['id'] = $vendaId;

            $itensEnriquecidos = [];
            foreach ($venda['itens'] as $item) {
                $stmtP = $pdo->prepare("SELECT * FROM produtos WHERE id = ?");
                $stmtP->execute([(int)($item['produtoId'] ?? 0)]);
                $prod = $stmtP->fetch() ?: [];
                $itemMerged = array_merge($prod, $item);

                $stmtI = $pdo->prepare("
                    INSERT INTO vendas_itens
                        (venda_id, produto_id, quantidade, valor_unitario, valor_total, ncm, cfop, unidade, origem)
                    VALUES (?,?,?,?,?,?,?,?,?)
                ");
                $stmtI->execute([
                    $vendaId, (int)($item['produtoId'] ?? 0), (float)$item['quantidade'],
                    (float)$item['valorUnitario'], (float)$item['valorTotal'],
                    $item['ncm'] ?? null, $item['cfop'] ?? null, $item['unidade'] ?? null, (int)($item['origem'] ?? 0)
                ]);
                $itensEnriquecidos[] = $itemMerged;
            }

            foreach (($venda['pagamentos'] ?? []) as $pag) {
                $pdo->prepare("INSERT INTO vendas_pagamentos (venda_id, forma_pagamento, valor_pagamento) VALUES (?, ?, ?)")
                    ->execute([$vendaId, $pag['formaPagamento'], (float)$pag['valorPagamento']]);
            }

            $servico = new NfeService($empresaDb, $empresaDb['certificado_pfx'], $empresaDb['certificado_senha']);
            $resultado = $servico->emitirNfe($venda, $itensEnriquecidos, $clienteData, [], false, []);

            if ($resultado->sucesso) {
                $statusSalvar = 'Autorizada';
                $chaveAcesso = (string)($resultado->chave_acesso ?? '');
                $pdo->prepare("UPDATE vendas SET status = ?, protocolo = ?, chave_acesso = ?, xml_autorizado = ? WHERE id = ?")
                    ->execute([$statusSalvar, $resultado->protocolo ?? '', $chaveAcesso, $resultado->xml_assinado ?? '', $vendaId]);
                $pdo->prepare("UPDATE empresas SET numero_nfe = ? WHERE id = ?")
                    ->execute([$venda['numero'], $empresaDb['id']]);

                // Estorno de estoque na devolução de VENDA
                foreach ($venda['itens'] as $item) {
                    $pdo->prepare("UPDATE produtos SET estoque = estoque + ? WHERE id = ?")
                        ->execute([(float)$item['quantidade'], (int)$item['produtoId']]);
                }
                $pdo->commit();
                echo json_encode(['success' => true, 'id' => $vendaId, 'chave' => $chaveAcesso]);
            } else {
                $pdo->prepare("UPDATE vendas SET status = 'Rejeitada' WHERE id = ?")->execute([$vendaId]);
                $pdo->commit();
                echo json_encode(['success' => false, 'message' => 'Rejeição SEFAZ: ' . ($resultado->mensagem_erro ?? 'Erro desconhecido')]);
            }
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()]);
        }
        break;

}
