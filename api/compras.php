<?php
/**
 * API - Módulo de Compras
 * Ações: listar_compras, salvar_compra, excluir_compra, detalhar_compra, importar_xml
 * Gestão de DF-e: dist_dfe, dist_download, dist_listar_locais, dist_manifestar, dist_danfe
 */

function migrarTabelasCompras(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS compras (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id      INT DEFAULT NULL,
        fornecedor_id   INT DEFAULT NULL,
        numero_nf       VARCHAR(60) DEFAULT '',
        data_entrada    DATE NOT NULL,
        chave_acesso    VARCHAR(44) DEFAULT '',
        natureza_operacao VARCHAR(100) DEFAULT 'COMPRA DE MERCADORIA',
        valor_total     DECIMAL(12,2) DEFAULT 0,
        valor_desconto  DECIMAL(12,2) DEFAULT 0,
        valor_frete     DECIMAL(12,2) DEFAULT 0,
        observacoes     TEXT DEFAULT NULL,
        status          ENUM('Rascunho','Confirmada','Cancelada') DEFAULT 'Confirmada',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_empresa (empresa_id),
        INDEX idx_data (data_entrada)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    try { $pdo->exec("ALTER TABLE compras ADD COLUMN chave_acesso VARCHAR(44) DEFAULT '' AFTER data_entrada"); } catch (Exception $e) {}

    $pdo->exec("CREATE TABLE IF NOT EXISTS compras_itens (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        compra_id       INT NOT NULL,
        produto_id      INT NOT NULL,
        quantidade      DECIMAL(12,3) NOT NULL DEFAULT 1,
        valor_unitario  DECIMAL(12,4) NOT NULL DEFAULT 0,
        valor_total     DECIMAL(12,2) NOT NULL DEFAULT 0,
        FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS dfe_documentos (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id      INT DEFAULT NULL,
        nsu             VARCHAR(20) NOT NULL,
        chave           VARCHAR(44) NOT NULL,
        cnpj_emitente   VARCHAR(20),
        nome_emitente   VARCHAR(255),
        valor           DECIMAL(12,2),
        data_emissao    TIMESTAMP NULL,
        manifesto       INT DEFAULT 0, -- 0: Nenhum, 1: Ciencia, 2: Confirmado
        situacao        VARCHAR(20) DEFAULT 'Pendente',
        xml_resumo      LONGTEXT,
        xml_completo    LONGTEXT,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unq_chave (chave, empresa_id),
        INDEX idx_nsu (nsu)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

switch ($action) {

    case 'listar_compras':
        migrarTabelasCompras($pdo);
        $where  = ['c.empresa_id = ?'];
        $params = [$empresaId ?: 0];
        if (!$empresaId && $usuarioPerfil === 'admin') { $where = ['1=1']; $params = []; }
        if (!empty($_GET['data_inicio'])) { $where[] = 'c.data_entrada >= ?'; $params[] = $_GET['data_inicio']; }
        if (!empty($_GET['data_fim']))    { $where[] = 'c.data_entrada <= ?'; $params[] = $_GET['data_fim']; }
        $sqlW = implode(' AND ', $where);
        $stmt = $pdo->prepare("SELECT c.*, f.nome AS fornecedor_nome, f.documento AS fornecedor_documento, (SELECT COUNT(*) FROM compras_itens ci WHERE ci.compra_id = c.id) AS qtd_itens FROM compras c LEFT JOIN fornecedores f ON f.id = c.fornecedor_id WHERE $sqlW ORDER BY c.data_entrada DESC, c.id DESC LIMIT 500");
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
        break;

    case 'detalhar_compra':
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT ci.*, p.descricao AS produto_descricao, p.codigo_interno, p.unidade_comercial FROM compras_itens ci JOIN produtos p ON p.id = ci.produto_id WHERE ci.compra_id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'salvar_compra':
        migrarTabelasCompras($pdo);
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['itens'])) { echo json_encode(['success' => false, 'message' => 'Dados inválidos']); break; }
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("INSERT INTO compras (empresa_id, fornecedor_id, numero_nf, chave_acesso, data_entrada, natureza_operacao, valor_total, valor_desconto, valor_frete, observacoes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmada')");
            $stmt->execute([$empresaId ?: null, !empty($data['fornecedorId']) ? (int)$data['fornecedorId'] : null, $data['numeroNf'] ?? '', $data['chaveAcesso'] ?? '', $data['dataEntrada'], $data['naturezaOperacao'] ?? 'COMPRA DE MERCADORIA', (float)($data['valorTotal'] ?? 0), (float)($data['valorDesconto'] ?? 0), (float)($data['valorFrete'] ?? 0), $data['observacoes'] ?? null]);
            $compraId = $pdo->lastInsertId();
            foreach ($data['itens'] as $item) {
                $prodId = (int)($item['produtoId'] ?? 0);
                $qty = (float)($item['quantidade'] ?? 0);
                $vUnit = (float)($item['valorUnitario'] ?? 0);
                $vTotal = (float)($item['valorTotal'] ?? ($qty * $vUnit));
                if ($prodId <= 0 || $qty <= 0) continue;
                $pdo->prepare("INSERT INTO compras_itens (compra_id, produto_id, quantidade, valor_unitario, valor_total) VALUES (?,?,?,?,?)")->execute([$compraId, $prodId, $qty, $vUnit, $vTotal]);
                $pdo->prepare("UPDATE produtos SET estoque = COALESCE(estoque, 0) + ?, custo_compra = ? WHERE id = ?")->execute([$qty, $vUnit, $prodId]);
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'id' => $compraId]);
        } catch (\Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
        break;

    case 'excluir_compra':
        $id = (int)($_GET['id'] ?? 0);
        $stmtC = $pdo->prepare("SELECT status FROM compras WHERE id = ?" . ($empresaId ? " AND empresa_id = ?" : ""));
        $stmtC->execute($empresaId ? [$id, $empresaId] : [$id]);
        $compra = $stmtC->fetch();
        if (!$compra) { echo json_encode(['success' => false, 'message' => 'Não encontrado']); break; }
        try {
            $pdo->beginTransaction();
            if ($compra['status'] === 'Confirmada') {
                $itens = $pdo->prepare("SELECT produto_id, quantidade FROM compras_itens WHERE compra_id = ?");
                $itens->execute([$id]);
                foreach ($itens->fetchAll() as $item) { $pdo->prepare("UPDATE produtos SET estoque = GREATEST(0, COALESCE(estoque,0) - ?) WHERE id = ?")->execute([$item['quantidade'], $item['produto_id']]); }
            }
            $pdo->prepare("DELETE FROM compras WHERE id = ?")->execute([$id]);
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch (\Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
        break;

    case 'importar_xml':
        try {
            if (empty($_FILES['xml']['tmp_name'])) throw new Exception("Nenhum arquivo enviado.");
            $xmlString = file_get_contents($_FILES['xml']['tmp_name']);
            $xml = @simplexml_load_string($xmlString);
            if (!$xml) throw new Exception("Falha ao ler XML.");
            $nfe = (isset($xml->NFe)) ? $xml->NFe->infNFe : ($xml->infNFe ?? $xml->xpath('//infNFe')[0] ?? NULL);
            if (!$nfe) throw new Exception("infNFe não localizado.");
            
            $fornDoc = (string)$nfe->emit->CNPJ ?: (string)$nfe->emit->CPF;
            $fornNome = (string)$nfe->emit->xNome;
            $stmtF = $pdo->prepare("SELECT id FROM fornecedores WHERE documento = ? AND empresa_id = ?");
            $stmtF->execute([$fornDoc, $empresaId]);
            $fornecedorId = $stmtF->fetchColumn();

            $notaData = [
                'numero' => (string)$nfe->ide->nNF, 'serie' => (string)$nfe->ide->serie, 'data' => date('Y-m-d', strtotime((string)$nfe->ide->dhEmi)),
                'emitente' => ['cnpj' => $fornDoc, 'nome' => $fornNome], 'valor_total' => (float)$nfe->total->ICMSTot->vNF, 'fornecedor_id' => $fornecedorId, 'cnpj_valido' => true
            ];

            $produtosXml = [];
            foreach ($nfe->det as $det) {
                $prod = $det->prod;
                $stmtP = $pdo->prepare("SELECT id, descricao, valor_unitario, cfop, codigo_interno FROM produtos WHERE (codigo_fornecedor = ? OR codigo_barras = ? OR descricao LIKE ?) AND empresa_id = ? LIMIT 1");
                $searchDesc = mb_substr((string)$prod->xProd, 0, 30) . '%';
                $stmtP->execute([(string)$prod->cProd, (string)$prod->cEAN, $searchDesc, $empresaId]);
                $match = $stmtP->fetch();
                $produtosXml[] = [
                    'codigo_xml' => (string)$prod->cProd, 'barras_xml' => (string)$prod->cEAN, 'nome_xml' => (string)$prod->xProd,
                    'cfop_xml' => (string)$prod->CFOP, 'un_xml' => (string)$prod->uCom, 'qtd_xml' => (float)$prod->qCom,
                    'vun_xml' => (float)$prod->vUnCom, 'total_xml' => (float)$prod->vProd, 
                    'matching_id' => $match['id'] ?? null, 'matching_desc' => $match['descricao'] ?? "PRODUTO NÃO LOCALIZADO",
                    'matching_cod' => $match['codigo_interno'] ?? '', 'valor_venda_atual' => (float)($match['valor_unitario'] ?? 0)
                ];
            }
            echo json_encode(['success' => true, 'nota' => $notaData, 'itens' => $produtosXml]);
        } catch (Exception $e) { echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
        break;

    case 'dist_dfe':
        try {
            $empresa = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
            $empresa->execute([$empresaId]);
            $config = $empresa->fetch();
            if (!$config || empty($config['certificado_pfx'])) throw new Exception("Certificado não configurado.");

            $arr = ["atualizacao" => date('Y-m-d H:i:s'), "tpAmb" => (int)($config['ambiente_nfe'] ?: 2), "razaosocial" => $config['razao_social'], "siglaUF" => $config['uf'], "cnpj" => preg_replace('/\D/', '', $config['cnpj']), "schemes" => "PL_009_V4", "versao" => "4.00", "tokenIBPT" => "", "CSC" => "", "CSCid" => ""];
            
            $pfx = $config['certificado_pfx'];
            if (strpos($pfx, 'base64,') !== false) $pfx = base64_decode(explode('base64,', $pfx)[1]);
            elseif (base64_encode(base64_decode($pfx, true)) === $pfx) $pfx = base64_decode($pfx);

            $tools = new \NFePHP\NFe\Tools(json_encode($arr), \NFePHP\Common\Certificate::readPfx($pfx, $config['certificado_senha']));

            $nsu = (int)($_GET['nsu'] ?? $config['ultimo_nsu'] ?? 0);
            @file_put_contents(__DIR__ . '/../nsu_log.txt', "[" . date('Y-m-d H:i:s') . "] Enviando consulta para NSU: " . $nsu . "\n", FILE_APPEND);
            $response = $tools->sefazDistDFe($nsu);
            $response = trim($response);
            if (empty($response)) throw new Exception("SEFAZ retornou uma resposta vazia.");

            // Extrai o conteúdo útil caso a resposta venha em um envelope SOAP
            if (strpos($response, '<retDistDFeInt') !== false) {
                preg_match('/<retDistDFeInt.*<\/retDistDFeInt>/s', $response, $matches);
                if (isset($matches[0])) $response = $matches[0];
            }
            
            $xmlResp = @simplexml_load_string($response, 'SimpleXMLElement', LIBXML_NOERROR | LIBXML_NOWARNING);
            $cStat = (string)($xmlResp->cStat ?? 'ERRO');
            $xMotivo = (string)($xmlResp->xMotivo ?? 'Sem Motivo');
            $ultimoNsu = (string)($xmlResp->ultNSU ?? '0');
            @file_put_contents(__DIR__ . '/../nsu_log.txt', "[" . date('Y-m-d H:i:s') . "] SEFAZ respondeu cStat: " . $cStat . " | Motivo: " . $xMotivo . " | Proximo NSU: " . $ultimoNsu . "\n", FILE_APPEND);

            // Tenta criar as colunas se não existirem
            try {
                $pdo->exec("ALTER TABLE empresas ADD COLUMN data_ultima_consulta_dfe DATETIME DEFAULT NULL");
                $pdo->exec("ALTER TABLE empresas ADD COLUMN ultimo_nsu VARCHAR(20) DEFAULT '0'");
                $pdo->exec("ALTER TABLE empresas ADD COLUMN multa_receber DECIMAL(10,2) DEFAULT 0");
                $pdo->exec("ALTER TABLE empresas ADD COLUMN juros_dia_receber DECIMAL(10,2) DEFAULT 0");
                $pdo->exec("ALTER TABLE empresas ADD COLUMN carencia_dias_receber INT DEFAULT 0");
            } catch (Exception $e) {}

            // Persiste data e NSU para qualquer resposta conhecida da SEFAZ (137, 138 ou 656)
            $dataConsulta = date('Y-m-d H:i:s');
            $sqlUpd = "UPDATE empresas SET data_ultima_consulta_dfe = NOW()";
            $paramsUpd = [];
            if (!empty($ultimoNsu) && $ultimoNsu !== '0') {
                $sqlUpd .= ", ultimo_nsu = ?";
                $paramsUpd[] = strval($ultimoNsu);
            }
            $sqlUpd .= " WHERE id = ?";
            $paramsUpd[] = $empresaId;
            $stmtUpd = $pdo->prepare($sqlUpd);
            if (!$stmtUpd->execute($paramsUpd)) {
                $error = $stmtUpd->errorInfo();
                @file_put_contents(__DIR__ . '/../nsu_log.txt', "[" . date('Y-m-d H:i:s') . "] ERRO AO SALVAR NO BANCO: " . $error[2] . "\n", FILE_APPEND);
            }

            if ($cStat == '656') {
                $motivoSefaz = (string)$xmlResp->xMotivo;
                echo json_encode([
                    'success'       => false,
                    'message'       => "Consumo Indevido: {$motivoSefaz} (Aguarde 1 hora antes de nova consulta).",
                    'ultimo_nsu'    => $ultimoNsu,
                    'data_consulta' => $dataConsulta,
                ]);
                exit;
            }
            if ($cStat != '137' && $cStat != '138') {
                echo json_encode(['success' => false, 'message' => "Erro SEFAZ ({$cStat}): " . (string)$xmlResp->xMotivo]);
                exit;
            }

            $ultimoNsu = (string)$xmlResp->ultNSU;
            $xmlResp->registerXPathNamespace('n', 'http://www.portalfiscal.inf.br/nfe');
            $docsZip = $xmlResp->xpath('//docZip');

            if ($docsZip) {
                foreach ($docsZip as $docZip) {
                    $xml = gzdecode(base64_decode((string)$docZip));
                    $dom = new DOMDocument(); $dom->loadXML($xml);
                    if ($dom->documentElement->localName == 'resNFe') {
                        $ch = (string)$dom->getElementsByTagName('chNFe')->item(0)->nodeValue;
                        $nome = (string)$dom->getElementsByTagName('xNome')->item(0)->nodeValue;
                        $doc = (string)$dom->getElementsByTagName('CNPJ')->item(0)?->nodeValue ?: (string)$dom->getElementsByTagName('CPF')->item(0)?->nodeValue;
                        $vNF = (float)$dom->getElementsByTagName('vNF')->item(0)->nodeValue;
                        $dh = (string)$dom->getElementsByTagName('dhEmi')->item(0)->nodeValue;
                        $nsuDoc = (string)($docZip->attributes()['NSU'] ?? '');

                        $pdo->prepare("INSERT INTO dfe_documentos (empresa_id, nsu, chave, cnpj_emitente, nome_emitente, valor, data_emissao, xml_resumo) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nsu = VALUES(nsu), xml_resumo = VALUES(xml_resumo)")
                            ->execute([$empresaId, $nsuDoc, $ch, $doc, $nome, $vNF, $dh, $xml]);
                    }
                }
            }

            // Atualiza NSU final após processar documentos
            if (!empty($ultimoNsu) && $ultimoNsu !== '0') {
                $pdo->prepare("UPDATE empresas SET ultimo_nsu = ? WHERE id = ?")->execute([strval($ultimoNsu), $empresaId]);
            }

            echo json_encode([
                'success'    => true,
                'docs_count' => count($docsZip),
                'cStat'      => $cStat,
                'xMotivo'    => (string)$xmlResp->xMotivo,
                'ultimo_nsu' => $ultimoNsu,
                'data_consulta' => $dataConsulta,
            ]);
        } catch (Exception $e) { echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
        break;

    case 'dist_listar_locais':
        migrarTabelasCompras($pdo);
        $stmt = $pdo->prepare("SELECT * FROM dfe_documentos WHERE empresa_id = ? ORDER BY nsu DESC LIMIT 500");
        $stmt->execute([$empresaId]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'dist_manifestar':
        try {
            $chave = $_GET['chave'] ?? '';
            $tipo  = (int)($_GET['tipo'] ?? 210210);
            $empresa = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
            $empresa->execute([$empresaId]);
            $config = $empresa->fetch();
            $arr = ["atualizacao" => date('Y-m-d H:i:s'), "tpAmb" => (int)($config['ambiente_nfe'] ?: 2), "razaosocial" => $config['razao_social'], "siglaUF" => $config['uf'], "cnpj" => preg_replace('/\D/', '', $config['cnpj']), "schemes" => "PL_009_V4", "versao" => "4.00", "tokenIBPT" => "", "CSC" => "", "CSCid" => ""];
            
            $pfx = $config['certificado_pfx'];
            if (strpos($pfx, 'base64,') !== false) $pfx = base64_decode(explode('base64,', $pfx)[1]);
            elseif (base64_encode(base64_decode($pfx, true)) === $pfx) $pfx = base64_decode($pfx);

            $tools = new \NFePHP\NFe\Tools(json_encode($arr), \NFePHP\Common\Certificate::readPfx($pfx, $config['certificado_senha']));
            $res = $tools->sefazManifesta($chave, $tipo, ($tipo == 210210 ? 'Ciencia' : 'Confirmacao'), 1);
            $res = trim($res);
            if (empty($res)) throw new Exception("SEFAZ não retornou resposta para o manifesto.");

            // Extrai o conteúdo útil caso a resposta venha em um envelope SOAP
            if (strpos($res, '<retEnvEvento') !== false) {
                preg_match('/<retEnvEvento.*<\/retEnvEvento>/s', $res, $matches);
                if (isset($matches[0])) $res = $matches[0];
            }
            
            $xmlRes = @simplexml_load_string($res, 'SimpleXMLElement', LIBXML_NOERROR | LIBXML_NOWARNING);
            if (!$xmlRes) {
                // Grava log para diagnóstico
                @file_put_contents(__DIR__ . '/../debug_sefaz.log', "DATA: " . date('Y-m-d H:i:s') . "\nRESPOSTA: " . $res . "\n\n", FILE_APPEND);
                throw new Exception("Resposta XML do manifesto é inválida. O log foi gerado para análise.");
            }
            
            $cStat = (string)($xmlRes->xpath('//cStat')[0] ?? '');
            $xMotivo = (string)($xmlRes->xpath('//xMotivo')[0] ?? '');
            
            if ($cStat == '135' || $cStat == '136') {
                $pdo->prepare("UPDATE dfe_documentos SET manifesto = ? WHERE chave = ? AND empresa_id = ?")->execute([($tipo == 210210 ? 1 : 2), $chave, $empresaId]);
                echo json_encode(['success' => true]);
            } else echo json_encode(['success' => false, 'message' => "({$cStat}): {$xMotivo}"]);
        } catch (Exception $e) { echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
        break;

    case 'dist_danfe':
        try {
            $chave = $_GET['chave'] ?? '';
            $stmt = $pdo->prepare("SELECT xml_completo, xml_resumo FROM dfe_documentos WHERE chave = ? AND empresa_id = ?");
            $stmt->execute([$chave, $empresaId]);
            $doc = $stmt->fetch();
            $xml = $doc['xml_completo'] ?: $doc['xml_resumo'];
            $empresa = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
            $empresa->execute([$empresaId]);
            $config = $empresa->fetch();
            header('Content-Type: application/pdf');
            echo (new \App\Services\PrinterService($config, $config['logo_url'] ?? ''))->imprimirNfe($xml);
        } catch (Exception $e) { http_response_code(500); echo $e->getMessage(); }
        break;

    case 'dist_download':
        try {
            $chave = $_GET['chave'] ?? '';
            $empresa = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
            $empresa->execute([$empresaId]);
            $config = $empresa->fetch();
            $arr = ["atualizacao" => date('Y-m-d H:i:s'), "tpAmb" => (int)($config['ambiente_nfe'] ?: 2), "razaosocial" => $config['razao_social'], "siglaUF" => $config['uf'], "cnpj" => preg_replace('/\D/', '', $config['cnpj']), "schemes" => "PL_009_V4", "versao" => "4.00", "tokenIBPT" => "", "CSC" => "", "CSCid" => ""];
            
            $pfx = $config['certificado_pfx'];
            if (strpos($pfx, 'base64,') !== false) $pfx = base64_decode(explode('base64,', $pfx)[1]);
            elseif (base64_encode(base64_decode($pfx, true)) === $pfx) $pfx = base64_decode($pfx);

            $tools = new \NFePHP\NFe\Tools(json_encode($arr), \NFePHP\Common\Certificate::readPfx($pfx, $config['certificado_senha']));
            $response = $tools->sefazDistDFe(0, 0, $chave);
            $xmlResp = @simplexml_load_string($response, 'SimpleXMLElement', LIBXML_NOERROR | LIBXML_NOWARNING);
            
            $xml = null;
            $docsZip = $xmlResp->xpath('//docZip');
            if ($docsZip) {
                foreach ($docsZip as $dz) {
                    $x = gzdecode(base64_decode((string)$dz));
                    if (strpos($x, '<nfeProc') !== false) { $xml = $x; break; }
                }
            }
            if (!$xml) {
                $tools->sefazManifesta($chave, 210210, 'Ciencia', 1);
                $response = $tools->sefazDistDFe(0, 0, $chave);
                $xmlResp = @simplexml_load_string($response, 'SimpleXMLElement', LIBXML_NOERROR | LIBXML_NOWARNING);
                $docsZip = $xmlResp->xpath('//docZip');
                if ($docsZip) {
                    foreach ($docsZip as $dz) {
                        $x = gzdecode(base64_decode((string)$dz));
                        if (strpos($x, '<nfeProc') !== false) { $xml = $x; break; }
                    }
                }
            }
            if (!$xml) throw new Exception("XML ainda não disponível.");
            $pdo->prepare("UPDATE dfe_documentos SET xml_completo = ?, situacao = 'Autorizada' WHERE chave = ? AND empresa_id = ?")->execute([$xml, $chave, $empresaId]);
            
            $xmlObj = simplexml_load_string($xml);
            $nfe = (isset($xmlObj->NFe)) ? $xmlObj->NFe->infNFe : $xmlObj->infNFe;
            $fornDoc = (string)$nfe->emit->CNPJ ?: (string)$nfe->emit->CPF;
            $stmtF = $pdo->prepare("SELECT id FROM fornecedores WHERE documento = ? AND empresa_id = ?");
            $stmtF->execute([$fornDoc, $empresaId]);
            $fornecedorId = $stmtF->fetchColumn();

            $notaData = ['numero' => (string)$nfe->ide->nNF, 'serie' => (string)$nfe->ide->serie, 'data' => date('Y-m-d', strtotime((string)$nfe->ide->dhEmi)), 'emitente' => ['cnpj' => $fornDoc, 'nome' => (string)$nfe->emit->xNome], 'valor_total' => (float)$nfe->total->ICMSTot->vNF, 'fornecedor_id' => $fornecedorId, 'cnpj_valido' => true];
            $itens = [];
            foreach ($nfe->det as $det) {
                $p = $det->prod;
                $stmtP = $pdo->prepare("SELECT id, descricao, valor_unitario, cfop, codigo_interno FROM produtos WHERE (codigo_fornecedor = ? OR codigo_barras = ? OR descricao LIKE ?) AND empresa_id = ? LIMIT 1");
                $stmtP->execute([(string)$p->cProd, (string)$p->cEAN, mb_substr((string)$p->xProd, 0, 30) . '%', $empresaId]);
                $match = $stmtP->fetch();
                $itens[] = ['codigo_xml' => (string)$p->cProd, 'barras_xml' => (string)$p->cEAN, 'nome_xml' => (string)$p->xProd, 'cfop_xml' => (string)$p->CFOP, 'un_xml' => (string)$p->uCom, 'qtd_xml' => (float)$p->qCom, 'vun_xml' => (float)$p->vUnCom, 'total_xml' => (float)$p->vProd, 'matching_id' => $match['id'] ?? null, 'matching_desc' => $match['descricao'] ?? "NÃO LOCALIZADO", 'valor_venda_atual' => (float)($match['valor_unitario'] ?? 0)];
            }
            echo json_encode(['success' => true, 'nota' => $notaData, 'itens' => $itens]);
        } catch (Exception $e) { echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
        break;
}
