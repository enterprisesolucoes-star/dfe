<?php

namespace App\Services;

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Complements;
use Exception;

/**
 * Service Class para emissão de NF-e Modelo 55
 * Adaptado do NfceService para operações B2B/B2C com destinatário e transporte completos.
 */
class NfeService
{
    protected $tools;
    protected $config;
    protected $empresaData;

    public function __construct(array $empresaData, string $pfxContent, string $password)
    {
        try {
            $this->empresaData = $empresaData;
            $this->config = $this->getConfig($empresaData);

            if (empty($pfxContent)) {
                throw new \Exception("O conteúdo do certificado digital está vazio no banco de dados.");
            }

            if (strpos($pfxContent, 'base64,') !== false) {
                $pfxContent = base64_decode(explode('base64,', $pfxContent)[1]);
            } elseif (base64_encode(base64_decode($pfxContent, true)) === $pfxContent) {
                // Tenta decodificar se for base64 puro sem prefixo
                $decoded = base64_decode($pfxContent, true);
                if ($decoded !== false) $pfxContent = $decoded;
            }

            try {
                $certificate = Certificate::readPfx($pfxContent, $password);
                $this->tools = new Tools(json_encode($this->config), $certificate);
                $this->tools->model('55'); 
            } catch (\Throwable $certErr) {
                throw new \Exception("Falha ao ler Certificado NF-e: " . $certErr->getMessage() . " (Verifique se a senha está correta)");
            }
        } catch (\Throwable $e) {
            $msg = $e->getMessage() . " (Local: " . basename($e->getFile()) . " L:" . $e->getLine() . ")";
            throw new \Exception($msg);
        }
    }

    private function getConfig(array $empresa): array
    {
        return [
            "atualizacao" => date('Y-m-d H:i:s'),
            "tpAmb" => (int) $empresa['ambiente'],
            "razaosocial" => $empresa['razao_social'],
            "siglaUF" => $empresa['uf'],
            "cnpj" => $empresa['cnpj'],
            "schemes" => "PL_010v1.20b",
            "versao" => "4.00",
            "tokenIBGE" => $empresa['codigo_municipio'],
            "CSC" => $empresa['csc_token'] ?? '',
            "CSCid" => $empresa['csc_id'] ?? ''
        ];
    }

    /**
     * Fluxo completo de emissão da NF-e Modelo 55.
     */
    public function emitirNfe(
        array $venda,
        array $itens,
        ?array $cliente = null,
        ?array $transporte = null,
        bool $contingencia = false,
        array $aliquotasRtc = []
    ): object {
        try {
            $nfe = new Make($this->config['schemes']);

            $stdInfNFe = new \stdClass();
            $stdInfNFe->versao = '4.00';
            $stdInfNFe->Id = '';
            $stdInfNFe->pk_nItem = null;
            $nfe->taginfNFe($stdInfNFe);

            // Fuso horário conforme UF emitente
            $uf = $this->config['siglaUF'];
            $tzName = 'America/Sao_Paulo';
            if (in_array($uf, ['AM', 'MT', 'MS', 'RO', 'RR']))
                $tzName = 'America/Cuiaba';
            elseif ($uf === 'AC')
                $tzName = 'America/Rio_Branco';

            $dtEmi = new \DateTime('now', new \DateTimeZone($tzName));
            $dtEmi->modify('-3 minutes');

            $tpEmis = $contingencia ? '9' : '1';
            $dhCont = $contingencia ? $dtEmi->format('Y-m-d\TH:i:sP') : null;
            $xJust = $contingencia ? 'PROBLEMAS TECNICOS COM A INTERNET' : null;

            // Regra SEFAZ 696: não-contribuinte (indIEDest=9) exige consumidor final (indFinal=1)
            $indIEDest = $cliente['indIEDest'] ?? '9';
            $indFinal = $venda['consumidorFinal'] ?? '0';
            if ($indIEDest === '9')
                $indFinal = '1';

            // ── 1. ide ──────────────────────────────────────────────────────
            $nfe->tagide((object) [
                'cUF' => substr($this->config['tokenIBGE'], 0, 2),
                'cNF' => str_pad((string) ($venda['id'] ?? rand(1, 99999999)), 8, '0', STR_PAD_LEFT),
                'natOp' => $venda['naturezaOperacao'] ?? 'VENDA',
                'mod' => '55',
                'serie' => $venda['serie'],
                'nNF' => $venda['numero'],
                'dhEmi' => $dtEmi->format('Y-m-d\TH:i:sP'),
                'tpNF' => $venda['tpNF'] ?? '1',
                'idDest' => $this->calcIdDest($cliente),
                'cMunFG' => $this->config['tokenIBGE'],
                'tpImp' => '1',   // DANFE A4 retrato
                'tpEmis' => $tpEmis,
                'cDV' => '0',
                'tpAmb' => $this->config['tpAmb'],
                'finNFe' => $venda['finalidade'] ?? '1',
                'indFinal' => $indFinal,
                'indPres' => $venda['presencaComprador'] ?? '1',
                'procEmi' => '0',
                'verProc' => '1.0.0',
                'dhCont' => $dhCont,
                'xJust' => $xJust,
            ]);

            if (!empty($venda['chaveReferenciada'])) {
                $stdRef = new \stdClass();
                $stdRef->refNFe = preg_replace('/[^0-9]/', '', $venda['chaveReferenciada']);
                $nfe->tagrefNFe($stdRef);
            }

            // ── 2. emit ─────────────────────────────────────────────────────
            $nfe->tagemit((object) [
                'CNPJ' => preg_replace('/[^0-9]/', '', $this->config['cnpj']),
                'xNome' => $this->config['razaosocial'],
                'IE' => preg_replace('/[^0-9]/', '', $this->empresaData['inscricao_estadual'] ?? ''),
                'IM' => preg_replace('/[^0-9]/', '', $this->empresaData['inscricao_municipal'] ?? '') ?: null,
                'CRT' => $this->empresaData['crt'] ?? '1',
            ]);
            $nfe->tagenderEmit((object) [
                'xLgr' => $this->empresaData['logradouro'] ?? 'Rua Principal',
                'nro' => $this->empresaData['numero'] ?? 'SN',
                'xBairro' => $this->empresaData['bairro'] ?? 'Centro',
                'cMun' => $this->config['tokenIBGE'],
                'xMun' => $this->empresaData['municipio'] ?? '',
                'UF' => $this->config['siglaUF'],
                'CEP' => preg_replace('/[^0-9]/', '', $this->empresaData['cep'] ?? '74000000'),
                'cPais' => '1058',
                'xPais' => 'Brasil',
                'fone' => preg_replace('/[^0-9]/', '', $this->empresaData['telefone'] ?? ''),
            ]);

            // ── 3. dest ─────────────────────────────────────────────────────
            if (!empty($cliente))
                $this->tagDestinatario($nfe, $cliente);

            // ── 4. det (itens) ───────────────────────────────────────────────
            $vProd = 0.0;
            $vTotTrib = 0.0;
            $vICMSTotal = 0.0;
            $vIPITotal = 0.0;
            $vPISTotal = 0.0;
            $vCOFINSTotal = 0.0;
            $vCredICMSTotal = 0.0;
            $vCBSTotal = 0.0;
            $vIBSTotal = 0.0;
            $crt = (string) ($this->empresaData['crt'] ?? '1');

            foreach ($itens as $i => $item) {
                $nItem = $i + 1;
                $codigo = preg_replace('/[^a-zA-Z0-9_-]/', '', $item['codigo_interno'] ?? str_pad((string) ($item['produto_id'] ?? 0), 5, '0', STR_PAD_LEFT));
                $desc = $item['descricao'] ?? 'Produto';
                // Limpeza rigorosa para NF-e: remove caracteres de controle, acentos e símbolos inválidos
                $desc = @iconv('UTF-8', 'ASCII//TRANSLIT', $desc);
                $desc = preg_replace('/[^a-zA-Z0-9\s\.\,\-\/\(\)\%\#\*]/', '', $desc);
                $desc = mb_substr(trim($desc), 0, 120);

                $ncm = preg_replace('/[^0-9]/', '', $item['ncm'] ?? '00000000');
                $cfop = $item['cfop'] ?? '5102';
                $uCom = $item['unidade_comercial'] ?? 'UN';
                $qCom = (float) ($item['quantidade'] ?? 1);
                $vUnCom = (float) ($item['valor_unitario'] ?? $item['valorUnitario'] ?? 0);
                $vTotItem = round($qCom * $vUnCom, 2);
                $vProd += $vTotItem;

                $nfe->tagprod((object) [
                    'item' => $nItem,
                    'cProd' => $codigo,
                    'cEAN' => $item['ean'] ?: 'SEM GTIN',
                    'xProd' => $desc,
                    'NCM' => $ncm,
                    'CEST' => !empty($item['cest']) ? preg_replace('/[^0-9]/', '', $item['cest']) : null,
                    'CFOP' => $cfop,
                    'uCom' => $uCom,
                    'qCom' => number_format($qCom, 4, '.', ''),
                    'vUnCom' => number_format($vUnCom, 10, '.', ''),
                    'vProd' => number_format($vTotItem, 2, '.', ''),
                    'cEANTrib' => $item['ean'] ?: 'SEM GTIN',
                    'uTrib' => $uCom,
                    'qTrib' => number_format($qCom, 4, '.', ''),
                    'vUnTrib' => number_format($vUnCom, 10, '.', ''),
                    'vDesc' => ($item['valorDesconto'] ?? 0) > 0 ? number_format($item['valorDesconto'], 2, '.', '') : null,
                    'indTot' => '1',
                ]);

                $pFed = (float) ($item['percentual_tributos_nacional'] ?? 0);
                $pEst = (float) ($item['percentual_tributos_estadual'] ?? 0);
                $vTrib = round($vTotItem * (($pFed + $pEst) / 100), 2);
                $vTotTrib += $vTrib;

                $nfe->tagimposto((object) [
                    'item' => $nItem,
                    'vTotTrib' => number_format($vTrib, 2, '.', ''),
                ]);

                // ICMS
                $orig = (string) ($item['origem_mercadoria'] ?? '0');
                $cstCsosn = (string) ($item['icms_cst_csosn'] ?? ($crt === '3' ? '00' : '102'));
                $aliqICMS = (float) ($item['icms_aliquota'] ?? 0);

                if ($crt === '3') {
                    $vICMSTotal += $this->tagICMSCst($nfe, $nItem, $orig, $cstCsosn, $vTotItem, $aliqICMS);
                } else {
                    $csosn = str_pad(ltrim($cstCsosn, '0') ?: '0', 3, '0', STR_PAD_LEFT);
                    $aliqCredSN = 0;
                    if ($this->empresaData['gerar_credito_simples'] == 1 && in_array($csosn, ['101', '201', '900'])) {
                        $aliqCredSN = (float) ($this->empresaData['aliquota_credito_simples'] ?? 0);
                    }
                    $stdSN = $this->buildICMSSNStd($nItem, $orig, $csosn, $vTotItem, $aliqCredSN);
                    $nfe->tagICMSSN($stdSN);
                    if (isset($stdSN->vCredICMSSN))
                        $vCredICMSTotal += (float) $stdSN->vCredICMSSN;
                }

                // IPI, PIS, COFINS
                $vIPITotal += $this->tagIPI($nfe, $nItem, (string) ($item['ipi_cst'] ?? ''), $vTotItem, (float) ($item['ipi_aliquota'] ?? 0));
                $vPISTotal += $this->tagPISItem($nfe, $nItem, (string) ($item['pis_cst'] ?? '07'), $vTotItem, (float) ($item['pis_aliquota'] ?? 0), $crt);
                $vCOFINSTotal += $this->tagCOFINSItem($nfe, $nItem, (string) ($item['cofins_cst'] ?? '07'), $vTotItem, (float) ($item['cofins_aliquota'] ?? 0), $crt);

                // IBS/CBS (NT 2024.002)
                $cbsCst = $item['cbs_cst'] ?? null;
                if ($cbsCst && !empty($aliquotasRtc)) {
                    $pCBS = $aliquotasRtc['CBS'] ?? 0.0;
                    $pIBSUF = $aliquotasRtc['IBS_UF'] ?? 0.0;
                    $pIBSMun = $aliquotasRtc['IBS_MUNICIPAL'] ?? 0.0;
                    $vCBS = round($vTotItem * $pCBS / 100, 2);
                    $vIBSUF = round($vTotItem * $pIBSUF / 100, 2);
                    $vIBSMun = round($vTotItem * $pIBSMun / 100, 2);
                    $vCBSTotal += $vCBS;
                    $vIBSTotal += ($vIBSUF + $vIBSMun);

                    $dataTag = [
                        'item' => $nItem,
                        'CST' => $cbsCst,
                        'cClassTrib' => !empty($item['cbs_classtrib']) ? $item['cbs_classtrib'] : '01',
                        'vBC' => number_format($vTotItem, 2, '.', ''),
                        'gIBSUF_pIBSUF' => number_format($pIBSUF, 4, '.', ''),
                        'gIBSUF_vIBSUF' => number_format($vIBSUF, 2, '.', ''),
                        'gIBSMun_pIBSMun' => number_format($pIBSMun, 4, '.', ''),
                        'gIBSMun_vIBSMun' => number_format($vIBSMun, 2, '.', ''),
                        'gCBS_pCBS' => number_format($pCBS, 4, '.', ''),
                        'gCBS_vCBS' => number_format($vCBS, 2, '.', ''),
                    ];
                    $hasRed = in_array($cbsCst, ['10', '11', '41', '51', '90']);
                    $dataTag['gIBSUF_ind_gRed'] = !empty($hasRed) ? '1' : '0';
                    $dataTag['gIBSMun_ind_gRed'] = !empty($hasRed) ? '1' : '0';
                    $dataTag['gCBS_ind_gRed'] = !empty($hasRed) ? '1' : '0';

                    if ($hasRed) {
                        $dataTag['gIBSUF_pRedAliq'] = $dataTag['gIBSMun_pRedAliq'] = $dataTag['gCBS_pRedAliq'] = '0.0000';
                        $dataTag['gIBSUF_pAliqEfet'] = number_format($pIBSUF, 4, '.', '');
                        $dataTag['gIBSMun_pAliqEfet'] = number_format($pIBSMun, 4, '.', '');
                        $dataTag['gCBS_pAliqEfet'] = number_format($pCBS, 4, '.', '');
                    }
                    $nfe->tagIBSCBS((object) $dataTag);
                }
            }

            // Totais
            $vDesc = (float) ($venda['valorDesconto'] ?? 0);
            $vFrete = (float) ($venda['valorFrete'] ?? 0);
            $vSeg = (float) ($venda['valorSeguro'] ?? 0);
            $vOutro = (float) ($venda['valorOutras'] ?? 0);
            $vNF = round($vProd - $vDesc + $vFrete + $vSeg + $vOutro + $vIPITotal, 2);

            $nfe->tagICMSTot((object) [
                'vBC' => '0.00',
                'vICMS' => number_format($vICMSTotal, 2, '.', ''),
                'vProd' => number_format($vProd, 2, '.', ''),
                'vFrete' => number_format($vFrete, 2, '.', ''),
                'vSeg' => number_format($vSeg, 2, '.', ''),
                'vDesc' => number_format($vDesc, 2, '.', ''),
                'vIPI' => number_format($vIPITotal, 2, '.', ''),
                'vPIS' => number_format($vPISTotal, 2, '.', ''),
                'vCOFINS' => number_format($vCOFINSTotal, 2, '.', ''),
                'vOutro' => number_format($vOutro, 2, '.', ''),
                'vNF' => number_format($vNF, 2, '.', ''),
                'vTotTrib' => number_format($vTotTrib, 2, '.', ''),
            ]);

            $this->tagTransporte($nfe, $transporte);

            $finalidade = (string) ($venda['finalidade'] ?? '1');

            // Gera seção cobr (cobrança/duplicatas) quando há vencimentos informados
            if ($finalidade !== '4') {
                $todasVencimentos = [];
                foreach (($venda['pagamentos'] ?? []) as $pag) {
                    foreach (($pag['vencimentos'] ?? []) as $v) {
                        $todasVencimentos[] = $v;
                    }
                }
                if (!empty($todasVencimentos)) {
                    $fatStd = new \stdClass();
                    $fatStd->nFat  = str_pad((string)($venda['numero'] ?? '1'), 3, '0', STR_PAD_LEFT);
                    $fatStd->vOrig = number_format($vNF, 2, '.', '');
                    $fatStd->vDesc = '0.00';
                    $fatStd->vLiq  = number_format($vNF, 2, '.', '');
                    $nfe->tagfat($fatStd);
                    foreach ($todasVencimentos as $dup) {
                        $dupStd = new \stdClass();
                        $dupStd->nDup  = str_pad((string)($dup['numero'] ?? '001'), 3, '0', STR_PAD_LEFT);
                        $dupStd->dVenc = $dup['vencimento'] ?? date('Y-m-d');
                        $dupStd->vDup  = number_format((float)($dup['valor'] ?? 0), 2, '.', '');
                        $nfe->tagdup($dupStd);
                    }
                }
            }

            $nfe->tagpag(new \stdClass());
            $vPagTotal = 0.0;
            $cardInjecoes = [];

            if ($finalidade === '4') {
                // Para devolução, força "Sem Pagamento" (tPag=90, vPag=0.00) para evitar rejeição 904
                $nfe->tagdetPag((object) ['tPag' => '90', 'vPag' => '0.00']);
            } else {
                foreach (($venda['pagamentos'] ?? []) as $pag) {
                    $vPagItem = (float) ($pag['valorPagamento'] ?? 0);
                    $vPagTotal += $vPagItem;
                    $tPag = $pag['formaPagamento'] ?? '01';
                    $nfe->tagdetPag((object) ['tPag' => $tPag, 'vPag' => number_format($vPagItem, 2, '.', '')]);

                    if (in_array($tPag, ['03', '04'])) {
                        $cardInjecoes[] = [
                            'tpIntegra' => (string) ($pag['tp_integra'] ?? $pag['tpIntegra'] ?? '2'),
                            'tBand' => (string) ($pag['t_band'] ?? $pag['tBand'] ?? '99'),
                            'cAut' => (string) ($pag['c_aut'] ?? $pag['cAut'] ?? '')
                        ];
                    } else {
                        $cardInjecoes[] = null;
                    }
                }
            }

            if ($vPagTotal > $vNF)
                $nfe->tagvTroco(number_format(round($vPagTotal - $vNF, 2), 2, '.', ''));

            $infCpl = $venda['informacoesAdicionais'] ?? '';
            if ($crt === '1' || $crt === '2') {
                $infCpl = "Documento emitido por ME ou EPP optante pelo Simples Nacional. " . $infCpl;

                // Regra de Aproveitamento de Crédito (LC 123/2006)
                $aliqSimples = (float) ($this->empresaData['aliquota_credito_simples'] ?? 0);
                $podeCredito = ($this->empresaData['gerar_credito_simples'] == 1 && $aliqSimples > 0);

                // Bloqueio 1: Se for Uso e Consumo, não transfere crédito
                if (($venda['finalidade_compra'] ?? $venda['finalidadeCompra'] ?? '1') == '2') {
                    $podeCredito = false;
                }
                // Bloqueio 2: Se o cliente for Simples Nacional, não aproveita crédito
                $regimeCli = (string) ($cliente['regimeTributario'] ?? $cliente['regime_tributario'] ?? '1');
                if ($regimeCli === '1') {
                    $podeCredito = false;
                }

                if ($podeCredito && $vCredICMSTotal > 0) {
                    $infCpl .= sprintf(
                        " ; Permite o aproveitamento do crédito de ICMS no valor de R$ %s; correspondente à alíquota de %s%%, nos termos do art. 23 da LC 123/2006",
                        number_format($vCredICMSTotal, 2, ',', '.'),
                        number_format($aliqSimples, 2, ',', '.')
                    );
                }
            }
            if ($vCBSTotal > 0 || $vIBSTotal > 0)
                $infCpl .= sprintf(" ; IBS/CBS: R$ %s / R$ %s", number_format($vIBSTotal, 2, ',', '.'), number_format($vCBSTotal, 2, ',', '.'));
            $nfe->taginfAdic((object) ['infCpl' => mb_substr(trim($infCpl, " ;"), 0, 5000)]);

            $xmlFinal = $nfe->getXML();

            // Sincronização estrutural de fidelidade absoluta (Modelo Enterprise_RTC - Reforma Tributária 2026)
            if (strpos($xmlFinal, '<IBSCBS>') !== false) {
                $dom = new \DOMDocument('1.0', 'UTF-8');
                $dom->preserveWhiteSpace = false;
                $dom->formatOutput = false;
                if (@$dom->loadXML($xmlFinal)) {
                    $xpath = new \DOMXPath($dom);
                    $xpath->registerNamespace('n', 'http://www.portalfiscal.inf.br/nfe');

                    // 1. Processamento de Itens (det)
                    $detPags = $xpath->query('//n:detPag');
                    foreach ($detPags as $idx => $detPag) {
                        $cardData = $cardInjecoes[$idx] ?? null;
                        if ($cardData && !empty($cardData['cAut'])) {
                            $card = $dom->createElementNS('http://www.portalfiscal.inf.br/nfe', 'card');
                            $card->appendChild($dom->createElementNS('http://www.portalfiscal.inf.br/nfe', 'tpIntegra', $cardData['tpIntegra']));
                            $card->appendChild($dom->createElementNS('http://www.portalfiscal.inf.br/nfe', 'tBand', $cardData['tBand']));
                            $card->appendChild($dom->createElementNS('http://www.portalfiscal.inf.br/nfe', 'cAut', $cardData['cAut']));
                            $detPag->appendChild($card);
                        }
                    }

                    $sumIBS = 0.0;
                    $sumCBS = 0.0;
                    $sumIBSUF = 0.0;
                    $sumIBSMun = 0.0;

                    $dets = $xpath->query('//n:det');
                    foreach ($dets as $det) {
                        // a. Garantir gRed dentro de gIBSUF, gIBSMun e gCBS do item
                        foreach (['gIBSUF', 'gIBSMun', 'gCBS'] as $ig) {
                            $nodeGroup = $det->getElementsByTagName($ig)->item(0);
                            if ($nodeGroup) {
                                // Limpa tags antigas
                                foreach (['ind_gRed', 'pRedAliq', 'pAliqEfet', 'gRed'] as $tg) {
                                    $old = $nodeGroup->getElementsByTagName($tg)->item(0);
                                    if ($old)
                                        $nodeGroup->removeChild($old);
                                }
                                // Cria e insere gRed conforme a classe tributária (Redução só para classes específicas)
                                $cClassTrib = $det->getElementsByTagName('cClassTrib')->item(0)->nodeValue ?? '';
                                if ($cClassTrib !== '000001') {
                                    $gRed = $dom->createElement('gRed');
                                    $gRed->appendChild($dom->createElement('pRedAliq', '100.00'));
                                    $gRed->appendChild($dom->createElement('pAliqEfet', '0.00'));

                                    $vTag = str_replace('g', 'v', $ig);
                                    $valNode = $nodeGroup->getElementsByTagName($vTag)->item(0);

                                    // Força o valor para 0.00 para bater com a redução de 100%
                                    if ($valNode)
                                        $valNode->nodeValue = '0.00';

                                    if ($valNode)
                                        $nodeGroup->insertBefore($gRed, $valNode);
                                    else
                                        $nodeGroup->appendChild($gRed);
                                }
                            }
                        }

                        $vIBSUFNode = $det->getElementsByTagName('vIBSUF')->item(0);
                        if ($vIBSUFNode)
                            $sumIBSUF += (float) $vIBSUFNode->nodeValue;

                        $vIBSMunNode = $det->getElementsByTagName('vIBSMun')->item(0);
                        if ($vIBSMunNode)
                            $sumIBSMun += (float) $vIBSMunNode->nodeValue;

                        $vIBSNode = $det->getElementsByTagName('vIBS')->item(0);
                        if ($vIBSNode)
                            $sumIBS += (float) $vIBSNode->nodeValue;

                        $vCBSNode = $det->getElementsByTagName('vCBS')->item(0);
                        if ($vCBSNode)
                            $sumCBS += (float) $vCBSNode->nodeValue;

                        // b. vItem no final de det
                        $vProdNode = $det->getElementsByTagName('vProd')->item(0);
                        $vItemVal = $vProdNode ? $vProdNode->nodeValue : '0.00';
                        $oldVitem = $det->getElementsByTagName('vItem')->item(0);
                        if ($oldVitem)
                            $det->removeChild($oldVitem);
                        $det->appendChild($dom->createElement('vItem', $vItemVal));
                    }

                    // 2. Processamento de Totais (IBSCBSTot)
                    $totais = $xpath->query('//n:total/n:IBSCBSTot')->item(0);
                    if ($totais) {
                        $vBCNode = $totais->getElementsByTagName('vBCIBSCBS')->item(0);
                        $vBC = $vBCNode ? $vBCNode->nodeValue : '0.00';

                        $valIBS = number_format($sumIBS, 2, '.', '');
                        $valCBS = number_format($sumCBS, 2, '.', '');
                        $vUF = number_format($sumIBSUF, 2, '.', '');
                        $vMun = number_format($sumIBSMun, 2, '.', '');

                        // Limpa o grupo totalmente para evitar duplicatas
                        while ($totais->hasChildNodes())
                            $totais->removeChild($totais->firstChild);

                        $totais->appendChild($dom->createElement('vBCIBSCBS', $vBC));

                        // Grupo gIBS
                        $gIBS = $dom->createElement('gIBS');
                        $gUF = $dom->createElement('gIBSUF');
                        $gUF->appendChild($dom->createElement('vDif', '0.00'));
                        $gUF->appendChild($dom->createElement('vDevTrib', '0.00'));
                        $gUF->appendChild($dom->createElement('vIBSUF', $vUF));
                        $gIBS->appendChild($gUF);

                        $gMun = $dom->createElement('gIBSMun');
                        $gMun->appendChild($dom->createElement('vDif', '0.00'));
                        $gMun->appendChild($dom->createElement('vDevTrib', '0.00'));
                        $gMun->appendChild($dom->createElement('vIBSMun', $vMun));
                        $gIBS->appendChild($gMun);

                        $vIBSNode = $dom->createElement('vIBS', $valIBS);
                        $gIBS->appendChild($vIBSNode);
                        $gIBS->appendChild($dom->createElement('vCredPres', '0.00'));
                        $gIBS->appendChild($dom->createElement('vCredPresCondSus', '0.00'));
                        $totais->appendChild($gIBS);

                        // Grupo gCBS
                        $gCBSNode = $dom->createElement('gCBS');
                        $gCBSNode->appendChild($dom->createElement('vDif', '0.00'));
                        $gCBSNode->appendChild($dom->createElement('vDevTrib', '0.00'));
                        $gCBSNode->appendChild($dom->createElement('vCBS', $valCBS));
                        $gCBSNode->appendChild($dom->createElement('vCredPres', '0.00'));
                        $gCBSNode->appendChild($dom->createElement('vCredPresCondSus', '0.00'));
                        $totais->appendChild($gCBSNode);

                        // gMono (todos os 6 campos obrigatórios conforme XSD TIBSCBSMonoTot)
                        $gMono = $dom->createElement('gMono');
                        $gMono->appendChild($dom->createElement('vIBSMono', '0.00'));
                        $gMono->appendChild($dom->createElement('vCBSMono', '0.00'));
                        $gMono->appendChild($dom->createElement('vIBSMonoReten', '0.00'));
                        $gMono->appendChild($dom->createElement('vCBSMonoReten', '0.00'));
                        $gMono->appendChild($dom->createElement('vIBSMonoRet', '0.00'));
                        $gMono->appendChild($dom->createElement('vCBSMonoRet', '0.00'));
                        $totais->appendChild($gMono);
                        $gEstorno = $dom->createElement('gEstornoCred');
                        $gEstorno->appendChild($dom->createElement('vIBSEstCred', '0.00'));
                        $gEstorno->appendChild($dom->createElement('vCBSEstCred', '0.00'));
                        $totais->appendChild($gEstorno);
                    }

                    // 4. Garantir vNFTot no final de total
                    $totalGrp = $xpath->query('//n:total')->item(0);
                    if ($totalGrp) {
                        $oldVnftot = $totalGrp->getElementsByTagName('vNFTot')->item(0);
                        if ($oldVnftot && $oldVnftot->parentNode === $totalGrp)
                            $totalGrp->removeChild($oldVnftot);
                        $vNFNode = $totalGrp->getElementsByTagName('vNF')->item(0);
                        $vNFVal = $vNFNode ? $vNFNode->nodeValue : '0.00';
                        $totalGrp->appendChild($dom->createElement('vNFTot', $vNFVal));
                    }

                    $xmlFinal = $dom->saveXML();
                }
            }

            $xmlAssinado = $this->tools->signNFe($xmlFinal);
            if ($contingencia)
                return (object) ['sucesso' => true, 'xml_assinado' => $xmlAssinado, 'chave_acesso' => $nfe->getChave(), 'status' => 'Contingencia'];

            $resp = $this->tools->sefazEnviaLote([$xmlAssinado], str_pad((string) ($venda['numero'] ?? 0), 15, '0', STR_PAD_LEFT), 1);
            $std = $this->parseResposta($resp);

            // Captura agressiva do protocolo (Independente do cStat do Lote)
            $nProt = '';
            $chNFe = $nfe->getChave();
            $cStatFinal = $std->cStat;
            $motivoFinal = $std->xMotivo;

            if ($std->protNFe) {
                $cStatFinal = $std->protNFe->infProt->cStat;
                $motivoFinal = $std->protNFe->infProt->xMotivo;
                $nProt = $std->protNFe->infProt->nProt;
                $chNFe = $std->protNFe->infProt->chNFe ?: $chNFe;
            }

            if ($cStatFinal == 204)
                return $this->tratarDuplicidade($xmlAssinado, $venda['id'] ?? 0);
            if ($cStatFinal != 100) {
                if (strpos($motivoFinal, 'Schema') !== false || strpos($motivoFinal, 'caracteres especiais') !== false) {
                    $this->sendEmailDeveloper($motivoFinal, $xmlAssinado);
                }
                return (object) ['sucesso' => false, 'status' => 'Rejeitada', 'mensagem_erro' => "Rejeição ({$cStatFinal}): " . $motivoFinal, 'xml' => $xmlAssinado];
            }

            return (object) ['sucesso' => true, 'xml_assinado' => Complements::toAuthorize($xmlAssinado, $resp), 'protocolo' => $nProt, 'chave_acesso' => $chNFe, 'status' => 'Autorizada'];

        } catch (\Throwable $e) {
            $msg = $e->getMessage() . " (Local: " . basename($e->getFile()) . " L:" . $e->getLine() . ")";
            return (object) [
                'sucesso' => false, 
                'status' => 'ErroConexao', 
                'mensagem_erro' => "Erro de comunicação: " . $msg . ". Deseja emitir em contingência?"
            ];
        }
    }

    public function cartaCorrecaoNfe(string $chave, string $texto, int $sequencia = 1): object
    {
        try {
            $resp = $this->tools->sefazCCe($chave, $texto, $sequencia);
            $std = $this->parseResposta($resp);
            $cStat = $std->retEvento->infEvento->cStat ?? $std->cStat;
            $xMotivo = $std->retEvento->infEvento->xMotivo ?? $std->xMotivo;
            if (in_array($cStat, ['135', '136']))
                return (object) ['sucesso' => true, 'protocolo' => $std->retEvento->infEvento->nProt ?? '', 'mensagem' => $xMotivo];
            return (object) ['sucesso' => false, 'mensagem' => "({$cStat}): {$xMotivo}"];
        } catch (\Exception $e) {
            return (object) ['sucesso' => false, 'mensagem' => $e->getMessage()];
        }
    }

    public function cancelarNfe(string $chave, string $protocolo, string $justificativa): object
    {
        try {
            $resp = $this->tools->sefazCancela($chave, $justificativa, $protocolo);
            $std = $this->parseResposta($resp);
            $cStat = $std->retEvento->infEvento->cStat ?? $std->cStat;
            $xMotivo = $std->retEvento->infEvento->xMotivo ?? $std->xMotivo;
            if (in_array($cStat, ['135', '155']))
                return (object) ['sucesso' => true, 'protocolo' => $std->retEvento->infEvento->nProt ?? '', 'mensagem' => $xMotivo, 'xml_cancelamento' => $resp];
            return (object) ['sucesso' => false, 'mensagem' => "({$cStat}): {$xMotivo}"];
        } catch (Exception $e) {
            return (object) ['sucesso' => false, 'mensagem' => $e->getMessage()];
        }
    }

    private function calcIdDest(?array $cliente): string
    {
        $ufD = strtoupper($cliente['endereco']['uf'] ?? '');
        $ufE = strtoupper($this->config['siglaUF']);
        if (!$ufD || $ufD === $ufE)
            return '1';
        return ($ufD === 'EX') ? '3' : '2';
    }

    private function tagDestinatario(Make $nfe, array $cliente): void
    {
        $doc = preg_replace('/[^0-9]/', '', $cliente['documento'] ?? '');
        $ieRaw = trim($cliente['ie'] ?? '');
        $ieLimpa = preg_replace('/[^0-9]/', '', $ieRaw);

        $indIEDest = (string) ($cliente['indIEDest'] ?? '9');
        if (strtoupper($ieRaw) === 'ISENTO') {
            $indIEDest = '2';
        } elseif (empty($ieLimpa)) {
            $indIEDest = '9';
        }

        $stdD = [
            'xNome' => mb_substr(trim($cliente['nome'] ?? 'Destinatário'), 0, 60),
            'indIEDest' => $indIEDest
        ];

        if ($indIEDest === '1' && !empty($ieLimpa)) {
            $stdD['IE'] = $ieLimpa;
        } elseif ($indIEDest === '2' && !empty($ieLimpa)) {
            $stdD['IE'] = $ieLimpa;
        }

        if (!empty($cliente['email']))
            $stdD['email'] = mb_substr(trim($cliente['email']), 0, 60);
        if (strlen($doc) === 14)
            $stdD['CNPJ'] = $doc;
        else
            $stdD['CPF'] = $doc;
        $nfe->tagdest((object) $stdD);
        $end = $cliente['endereco'] ?? [];
        if (!empty($end['logradouro'])) {
            $nfe->tagenderDest((object) [
                'xLgr' => $end['logradouro'],
                'nro' => $end['numero'] ?? 'SN',
                'xCpl' => $end['complemento'] ?? null,
                'xBairro' => $end['bairro'] ?? '',
                'cMun' => $end['codigoMunicipio'] ?? '',
                'xMun' => $end['municipio'] ?? '',
                'UF' => $end['uf'] ?? '',
                'CEP' => preg_replace('/[^0-9]/', '', $end['cep'] ?? ''),
                'cPais' => '1058',
                'xPais' => 'Brasil'
            ]);
        }
    }

    private function tagICMSCst(Make $nfe, int $item, string $orig, string $cst, float $vProd, float $aliq): float
    {
        $cst = str_pad($cst, 2, '0', STR_PAD_LEFT);
        $vBC = $vProd;
        $vI = round($vBC * $aliq / 100, 2);
        $std = (object) ['item' => $item, 'orig' => $orig, 'CST' => $cst, 'modBC' => '3', 'vBC' => number_format($vBC, 2, '.', ''), 'pICMS' => number_format($aliq, 2, '.', ''), 'vICMS' => number_format($vI, 2, '.', '')];
        if ($cst === '00')
            $nfe->tagICMS00($std);
        elseif ($cst === '20') {
            $std->pRedBC = '0.00';
            $nfe->tagICMS20($std);
        } elseif (in_array($cst, ['40', '41', '50'])) {
            unset($std->vBC, $std->pICMS, $std->vICMS);
            $nfe->tagICMS40($std);
            $vI = 0;
        } elseif ($cst === '51') {
            $std->pRedBC = '0.00';
            $std->vICMSOp = $std->vICMS;
            $std->pDif = '100.00';
            $std->vICMSDif = $std->vICMS;
            $std->vICMS = '0.00';
            $nfe->tagICMS51($std);
            $vI = 0;
        } elseif ($cst === '60') {
            $std->vBCSTRet = '0.00';
            $std->pST = '0.00';
            $std->vICMSSTRet = '0.00';
            $nfe->tagICMS60($std);
            $vI = 0;
        } else {
            $std->modBCST = '4';
            $std->pMVAST = '0.00';
            $std->vBCST = '0.00';
            $std->pICMSST = '0.00';
            $std->vICMSST = '0.00';
            $nfe->tagICMS90($std);
        }
        return $vI;
    }

    private function buildICMSSNStd(int $item, string $orig, string $csosn, float $vProd, float $aliqCr = 0): \stdClass
    {
        $std = (object) ['item' => $item, 'orig' => $orig, 'CSOSN' => $csosn];
        if ($csosn === '101' || $csosn === '201' || $csosn === '900') {
            $vCr = round($vProd * $aliqCr / 100, 2);
            $std->pCredSN = number_format($aliqCr, 2, '.', '');
            $std->vCredICMSSN = number_format($vCr, 2, '.', '');
        }
        if (in_array($csosn, ['201', '202', '203', '900'])) {
            $std->modBCST = '4';
            $std->pMVAST = '0.00';
            $std->pRedBCST = '0.00';
            $std->vBCST = '0.00';
            $std->pICMSST = '0.00';
            $std->vICMSST = '0.00';
        }
        if ($csosn === '500') {
            $std->vBCSTRet = '0.00';
            $std->pST = '0.00';
            $std->vICMSSTRet = '0.00';
        }
        if ($csosn === '900') {
            $std->modBC = '3';
            $std->vBC = number_format($vProd, 2, '.', '');
            $std->pRedBC = '0.00';
            $std->pICMS = '0.00';
            $std->vICMS = '0.00';
        }
        return $std;
    }

    private function tagIPI(Make $nfe, int $item, string $cst, float $vProd, float $aliq): float
    {
        $cst = str_pad($cst, 2, '0', STR_PAD_LEFT);
        $std = (object) ['item' => $item, 'cEnq' => '999', 'CST' => $cst];

        // Se for CST de tributação, precisa enviar base e alíquota (mesmo que 0.00)
        if (in_array($cst, ['00', '49', '50', '99'])) {
            $vI = round($vProd * $aliq / 100, 2);
            $std->vBC = number_format($vProd, 2, '.', '');
            $std->pIPI = number_format($aliq, 2, '.', '');
            $std->vIPI = number_format($vI, 2, '.', '');
            $nfe->tagIPI($std);
            return $vI;
        }

        $nfe->tagIPI($std);
        return 0;
    }

    private function tagPISItem(Make $nfe, int $item, string $cst, float $vProd, float $aliq, string $crt): float
    {
        $std = (object) ['item' => $item, 'CST' => str_pad($cst, 2, '0', STR_PAD_LEFT)];
        if (in_array((int) $cst, [1, 2, 49, 99]) && $aliq > 0) {
            $vI = round($vProd * $aliq / 100, 2);
            $std->vBC = number_format($vProd, 2, '.', '');
            $std->pPIS = number_format($aliq, 2, '.', '');
            $std->vPIS = number_format($vI, 2, '.', '');
            $nfe->tagPIS($std);
            return $vI;
        }
        $std->vBC = $std->pPIS = $std->vPIS = '0.00';
        $nfe->tagPIS($std);
        return 0;
    }

    private function tagCOFINSItem(Make $nfe, int $item, string $cst, float $vProd, float $aliq, string $crt): float
    {
        $std = (object) ['item' => $item, 'CST' => str_pad($cst, 2, '0', STR_PAD_LEFT)];
        if (in_array((int) $cst, [1, 2, 49, 99]) && $aliq > 0) {
            $vI = round($vProd * $aliq / 100, 2);
            $std->vBC = number_format($vProd, 2, '.', '');
            $std->pCOFINS = number_format($aliq, 2, '.', '');
            $std->vCOFINS = number_format($vI, 2, '.', '');
            $nfe->tagCOFINS($std);
            return $vI;
        }
        $std->vBC = $std->pCOFINS = $std->vCOFINS = '0.00';
        $nfe->tagCOFINS($std);
        return 0;
    }

    private function tagTransporte(Make $nfe, ?array $transporte): void
    {
        $mod = $transporte['modFrete'] ?? '9';
        $nfe->tagtransp((object) ['modFrete' => $mod]);
        $tr = $transporte['transportadorData'] ?? null;
        if (!empty($tr) && $mod !== '9') {
            $doc = preg_replace('/[^0-9]/', '', $tr['documento'] ?? '');
            $std = (object) ['xNome' => $tr['nome'] ?? '', 'IE' => preg_replace('/[^0-9]/', '', $tr['ie'] ?? ''), 'xEnder' => $tr['endereco']['logradouro'] ?? '', 'xMun' => $tr['endereco']['municipio'] ?? '', 'UF' => $tr['endereco']['uf'] ?? ''];
            if (strlen($doc) === 14)
                $std->CNPJ = $doc;
            else
                $std->CPF = $doc;
            $nfe->tagtransporta($std);
        }
        foreach (($transporte['volumes'] ?? []) as $v) {
            if (empty($v['qVol']) && empty($v['pesoB']))
                continue;
            $nfe->tagvol((object) ['qVol' => (int) $v['qVol'], 'esp' => $v['esp'] ?? null, 'marca' => $v['marca'] ?? null, 'pesoL' => number_format((float) $v['pesoL'], 3, '.', ''), 'pesoB' => number_format((float) $v['pesoB'], 3, '.', '')]);
        }
    }

    private function parseResposta(string $xml): object
    {
        $xml = preg_replace(['/\s+xmlns(?::\w+)?="[^"]*"/', '/<(\/?)\w+:/'], ['', '<$1'], $xml);
        $s = @simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOERROR | LIBXML_NOWARNING);
        if (!$s)
            return (object) ['cStat' => '', 'xMotivo' => '', 'protNFe' => null, 'retEvento' => null];
        $g = fn($p) => (string) ($s->xpath($p)[0] ?? '');
        $prot = null;
        if ($g('//protNFe//cStat') !== '')
            $prot = (object) ['infProt' => (object) ['cStat' => $g('//protNFe//cStat'), 'xMotivo' => $g('//protNFe//xMotivo'), 'nProt' => $g('//protNFe//nProt'), 'chNFe' => $g('//protNFe//chNFe')]];
        return (object) ['cStat' => $g('//cStat'), 'xMotivo' => $g('//xMotivo'), 'protNFe' => $prot, 'retEvento' => (object) ['infEvento' => (object) ['cStat' => $g('//retEvento//cStat') ?: $g('//cStat'), 'xMotivo' => $g('//retEvento//xMotivo') ?: $g('//xMotivo'), 'nProt' => $g('//retEvento//nProt')]]];
    }

    private function tratarDuplicidade(string $xml, int $vendaId): object
    {
        try {
            $dom = new \DOMDocument();
            $dom->loadXML($xml);
            $inf = $dom->getElementsByTagName('infNFe')->item(0);
            $ch = $inf ? ltrim($inf->getAttribute('Id'), 'NFe') : '';
            $r = $this->tools->sefazConsultaChave($ch);
            $std = $this->parseResposta($r);
            if (in_array($std->cStat, ['100', '101']))
                return (object) ['sucesso' => true, 'xml_assinado' => Complements::toAuthorize($xml, $r), 'protocolo' => $std->protNFe->infProt->nProt, 'chave_acesso' => $std->protNFe->infProt->chNFe, 'status' => 'Autorizada'];
        } catch (Exception $e) {
        }
        return (object) ['sucesso' => false, 'xml_assinado' => $xml, 'status' => 'Rejeitada', 'mensagem_erro' => 'Duplicidade detectada.'];
    }

    private function sendEmailDeveloper(string $erro, string $xml): void
    {
        try {
            $e = $this->empresaData;
            if (empty($e['smtp_host']) || empty($e['smtp_user'])) return;

            $developerEmail = 'heliomaralves@msn.com';
            $envPath = dirname(__DIR__, 2) . '/.env';
            if (file_exists($envPath)) {
                $content = file_get_contents($envPath);
                if (preg_match('/DEVELOPER_EMAIL=(.*)/', $content, $m)) $developerEmail = trim($m[1]);
            }

            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host       = $e['smtp_host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $e['smtp_user'];
            $mail->Password   = $e['smtp_pass'];
            $smtpSec = strtolower(trim($e['smtp_secure'] ?? ''));
            $mail->SMTPSecure = ($smtpSec === 'nenhum' || empty($smtpSec)) ? false : $smtpSec;
            $mail->Port       = (int)($e['smtp_port'] ?: 587);
            if ($mail->SMTPSecure === false) $mail->SMTPAutoTLS = false;

            $mail->setFrom($mail->Username, $e['razao_social'] ?? 'Enterprise RTC');
            $mail->addAddress($developerEmail);
            $mail->Subject = "[ALERTA SCHEMA NF-e] " . ($e['razao_social'] ?? 'Empresa');
            
            $body = "<h2>Falha de Schema XML (NF-e)</h2>";
            $body .= "<p><b>Origem:</b> " . ($e['razao_social'] ?? '') . "</p>";
            $body .= "<p><b>Erro SEFAZ:</b> $erro</p>";
            $body .= "<p><b>Data:</b> " . date('d/m/Y H:i:s') . "</p>";
            $body .= "<hr><pre>" . htmlspecialchars($xml) . "</pre>";
            
            $mail->isHTML(true);
            $mail->Body = $body;
            $mail->send();
        } catch (\Exception $e) {}
    }

    /**
     * Consulta o status do serviço na SEFAZ (Webservice de Status)
     */
    public function statusServico(): object
    {
        try {
            $resp = $this->tools->sefazStatus();
            $std = $this->parseResposta($resp);
            return (object) [
                'success' => ($std->cStat == 107),
                'cStat' => $std->cStat,
                'xMotivo' => $std->xMotivo,
                'xml' => $resp
            ];
        } catch (\Throwable $e) {
            return (object) [
                'success' => false,
                'cStat' => '999',
                'xMotivo' => "Erro no Motor Fiscal NF-e: " . $e->getMessage()
            ];
        }
    }
}

