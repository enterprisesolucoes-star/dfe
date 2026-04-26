<?php

namespace App\Services;

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Complements;
use Exception;

/**
 * Service Class para integração com SPED-NFe (NFC-e Modelo 65)
 * @author Senior Backend Developer
 */
class NfceService
{
    protected $tools;
    protected $config;
    protected $empresaData;

    /**
     * Injeção de dados da empresa e certificado
     */
    public function __construct(array $empresaData, string $pfxContent, string $password)
    {
        try {
            $this->empresaData = $empresaData;
            $this->config = $this->getConfig($empresaData);

            if (empty($pfxContent)) {
                throw new \Exception("O conteúdo do certificado digital está vazio no banco de dados.");
            }

            // Decodifica Base64 se estiver salvo com prefixo data: no banco
            if (strpos($pfxContent, 'base64,') !== false) {
                $pfxContent = base64_decode(explode('base64,', $pfxContent)[1]);
            } elseif (base64_encode(base64_decode($pfxContent, true)) === $pfxContent) {
                // Tenta decodificar se for base64 puro sem prefixo
                $decoded = base64_decode($pfxContent, true);
                if ($decoded !== false)
                    $pfxContent = $decoded;
            }

            try {
                $certificate = Certificate::readPfx($pfxContent, $password);
                $this->tools = new Tools(json_encode($this->config), $certificate);
                $this->tools->model('65');
            } catch (\Throwable $certErr) {
                throw new \Exception("Falha ao ler Certificado: " . $certErr->getMessage() . " (Verifique se a senha está correta)");
            }
        } catch (\Throwable $e) {
            throw new \Exception($e->getMessage());
        }
    }

    /**
     * Gera o JSON de configuração exigido pela nfephp
     */
    private function getConfig(array $empresa): array
    {
        return [
            "atualizacao" => date('Y-m-d H:i:s'),
            "tpAmb" => (int) $empresa['ambiente'], // 1-Produção, 2-Homologação
            "razaosocial" => $empresa['razao_social'],
            "siglaUF" => $empresa['uf'],
            "cnpj" => $empresa['cnpj'],
            "schemes" => "PL_010v1.20b",
            "versao" => "4.00",
            "tokenIBGE" => $empresa['codigo_municipio'],
            "CSC" => $empresa['csc_token'],
            "CSCid" => $empresa['csc_id'],
            "proxyConf" => [
                "proxy" => "",
                "port" => "",
                "user" => "",
                "pass" => ""
            ]
        ];
    }


    /**
     * Fluxo completo: Gerar XML, Assinar, Validar e Transmitir
     */
    public function emitirNfce($venda, array $itens, $cliente = null, bool $contingencia = false, array $aliquotasRtc = []): object
    {
        try {
            $nfe = new Make($this->config['schemes']);

            $stdInfNFe = new \stdClass();
            $stdInfNFe->versao = '4.00';
            $stdInfNFe->Id = '';
            $stdInfNFe->pk_nItem = null;
            $nfe->taginfNFe($stdInfNFe);

            // Fuso horário oficial do Brasil baseado na UF do emitente
            $uf = $this->config['siglaUF'];
            $tzName = 'America/Sao_Paulo';
            if (in_array($uf, ['AM', 'MT', 'MS', 'RO', 'RR'])) {
                $tzName = 'America/Cuiaba';
            } elseif ($uf === 'AC') {
                $tzName = 'America/Rio_Branco';
            }

            $dtEmi = new \DateTime('now', new \DateTimeZone($tzName));
            $dtEmi->modify('-5 minutes'); // Margem de segurança de relógios

            // 1. Identificação (ide)
            $tpEmis = $contingencia ? '9' : '1'; // 9 = Contingência Offline
            $dhCont = $contingencia ? $dtEmi->format('Y-m-d\TH:i:sP') : null;
            $xJust = $contingencia ? 'PROBLEMAS TECNICOS COM A INTERNET' : null;

            $nfe->tagide((object) [
                'cUF' => substr($this->config['tokenIBGE'], 0, 2),
                'cNF' => str_pad((string) ($venda['id'] ?? 0), 8, '0', STR_PAD_LEFT),
                'natOp' => 'VENDA',
                'mod' => '65',
                'serie' => $venda['serie'],
                'nNF' => $venda['numero'],
                'dhEmi' => $dtEmi->format('Y-m-d\TH:i:sP'),
                'tpNF' => '1',
                'idDest' => '1',
                'cMunFG' => $this->config['tokenIBGE'],
                'tpImp' => '4', // DANFE NFC-e
                'tpEmis' => $tpEmis,
                'cDV' => '0',
                'tpAmb' => $this->config['tpAmb'],
                'finNFe' => '1',
                'indFinal' => '1',
                'indPres' => '1',
                'procEmi' => '0',
                'verProc' => '1.0.0',
                'dhCont' => $dhCont,
                'xJust' => $xJust
            ]);

            // 2. Emitente (emit e enderEmit)
            $nfe->tagemit((object) [
                'CNPJ' => preg_replace('/[^0-9]/', '', $this->config['cnpj']),
                'xNome' => $this->config['razaosocial'],
                'IE' => preg_replace('/[^0-9]/', '', $this->empresaData['inscricao_estadual'] ?? ''),
                'CRT' => $this->empresaData['crt'] ?? '1'
            ]);
            $nfe->tagenderEmit((object) [
                'xLgr' => $this->empresaData['logradouro'] ?? 'Rua Principal',
                'nro' => $this->empresaData['numero'] ?? 'SN',
                'xBairro' => $this->empresaData['bairro'] ?? 'Centro',
                'cMun' => $this->config['tokenIBGE'],
                'xMun' => $this->empresaData['municipio'] ?? 'Capital',
                'UF' => $this->config['siglaUF'],
                'CEP' => preg_replace('/[^0-9]/', '', $this->empresaData['cep'] ?? '74000000'),
                'cPais' => '1058',
                'xPais' => 'Brasil',
                'fone' => preg_replace('/[^0-9]/', '', $this->empresaData['telefone'] ?? '')
            ]);

            // 3. Destinatário (dest) OPCIONAL em NFC-e
            if (!empty($cliente)) {
                $docDest = preg_replace('/[^0-9]/', '', $cliente['documento'] ?? '');
                $stdDest = [
                    'xNome' => $cliente['nome'] ?? 'Consumidor',
                    'indIEDest' => '9' // 9 = Não Contribuinte
                ];
                if (strlen($docDest) === 14) {
                    $stdDest['CNPJ'] = $docDest;
                } elseif (strlen($docDest) === 11) {
                    $stdDest['CPF'] = $docDest;
                }
                $nfe->tagdest((object) $stdDest);
            }

            // 4. Itens e Impostos
            $vProd = 0;
            $vTotTrib = 0;
            $vCBSTotal = 0.0;
            $vIBSTotal = 0.0;
            foreach ($itens as $i => $item) {
                $nItem = $i + 1;

                // Mapeamento tolerante (aceita arrays do DB ou React baseados em camelCase)
                $codigo = preg_replace('/[^a-zA-Z0-9_-]/', '', $item['codigo_interno'] ?? $item['codigoInterno'] ?? str_pad((string) ($item['produto_id'] ?? 0), 5, '0', STR_PAD_LEFT));
                $desc = $item['descricao'] ?? 'Produto';
                // Limpeza rigorosa para NF-e: remove caracteres de controle, acentos e símbolos inválidos
                $desc = iconv('UTF-8', 'ASCII//TRANSLIT', $desc);
                $desc = preg_replace('/[^a-zA-Z0-9\s\.\,\-\/\(\)\%\#\*]/', '', $desc);
                $desc = mb_substr(trim($desc), 0, 120);

                $ncm = preg_replace('/[^0-9]/', '', $item['ncm'] ?? '00000000');
                $cfop = $item['cfop'] ?? '5102';
                $uCom = $item['unidade_comercial'] ?? $item['unidadeComercial'] ?? 'UN';
                $qCom = (float) ($item['quantidade'] ?? 1);
                $vUnCom = (float) ($item['valor_unitario'] ?? $item['valorUnitario']);
                $vTotItem = round($qCom * $vUnCom, 2); // Regra 629 da SEFAZ - Deve ser a multiplicação exata

                $nfe->tagprod((object) [
                    'item' => $nItem,
                    'cProd' => $codigo,
                    'cEAN' => 'SEM GTIN',
                    'xProd' => $desc,
                    'NCM' => $ncm,
                    'CFOP' => $cfop,
                    'uCom' => $uCom,
                    'qCom' => number_format($qCom, 4, '.', ''),
                    'vUnCom' => number_format($vUnCom, 4, '.', ''),
                    'vProd' => number_format($vTotItem, 2, '.', ''),
                    'cEANTrib' => 'SEM GTIN',
                    'uTrib' => $uCom,
                    'qTrib' => number_format($qCom, 4, '.', ''),
                    'vUnTrib' => number_format($vUnCom, 4, '.', ''),
                    'indTot' => '1'
                ]);

                $vProd += $vTotItem;

                $pFed = (float) ($item['percentual_tributos_nacional'] ?? $item['percentualTributosNacional'] ?? 0);
                $pEst = (float) ($item['percentual_tributos_estadual'] ?? $item['percentualTributosEstadual'] ?? 0);
                $vTotTribItem = round($vTotItem * (($pFed + $pEst) / 100), 2);
                $vTotTrib += $vTotTribItem;

                $nfe->tagimposto((object) [
                    'item' => $nItem,
                    'vItemUpdate' => number_format($vTotItem, 2, '.', ''),
                    'vTotTrib' => number_format($vTotTribItem, 2, '.', '')
                ]);

                $csosn = (string) ($item['icms_cst_csosn'] ?? $item['icmsCstCsosn'] ?? '102');
                $csosn = str_pad(ltrim($csosn, '0') ?: '0', 3, '0', STR_PAD_LEFT);
                $nfe->tagICMSSN($this->buildICMSSNStd($nItem, '0', $csosn, $vTotItem));
                $nfe->tagPIS((object) ['item' => $nItem, 'CST' => '07']);
                $nfe->tagCOFINS((object) ['item' => $nItem, 'CST' => '07']);

                // Injeta as tags IBSCBS nativas pelo novo schema (Reforma Tributária)
                $cbsCst = $item['cbs_cst'] ?? $item['cbsCst'] ?? null;
                if ($cbsCst && !empty($aliquotasRtc)) {
                    $pCBS = $aliquotasRtc['CBS'] ?? 0.0;
                    $pIBSUF = $aliquotasRtc['IBS_UF'] ?? 0.0;
                    $pIBSMun = $aliquotasRtc['IBS_MUNICIPAL'] ?? 0.0;
                    $vBC = $vTotItem;
                    $vCBS = round($vBC * $pCBS / 100, 2);
                    $vIBSUF = round($vBC * $pIBSUF / 100, 2);
                    $vIBSMun = round($vBC * $pIBSMun / 100, 2);
                    $vCBSTotal += $vCBS;
                    $vIBSTotal += $vIBSUF + $vIBSMun;

                    $dataTag = [
                        'item' => $nItem,
                        'CST' => $cbsCst,
                        'cClassTrib' => $item['cbs_classtrib'] ?? $item['cbsClasstrib'] ?? '',
                        'vBC' => number_format($vBC, 2, '.', ''),
                        'gIBSUF_pIBSUF' => number_format($pIBSUF, 4, '.', ''),
                        'gIBSUF_vIBSUF' => number_format($vIBSUF, 2, '.', ''),
                        'gIBSMun_pIBSMun' => number_format($pIBSMun, 4, '.', ''),
                        'gIBSMun_vIBSMun' => number_format($vIBSMun, 2, '.', ''),
                        'gCBS_pCBS' => number_format($pCBS, 4, '.', ''),
                        'gCBS_vCBS' => number_format($vCBS, 2, '.', ''),
                    ];

                    // CSTs que admitem redução (Grupo gRed)
                    $cstsComReducao = ['10', '11', '21', '31', '41'];
                    if (in_array($cbsCst, $cstsComReducao)) {
                        $dataTag['gIBSUF_pRedAliq'] = '0.0000';
                        $dataTag['gIBSUF_pAliqEfet'] = number_format($pIBSUF, 4, '.', '');
                        $dataTag['gIBSMun_pRedAliq'] = '0.0000';
                        $dataTag['gIBSMun_pAliqEfet'] = number_format($pIBSMun, 4, '.', '');
                        $dataTag['gCBS_pRedAliq'] = '0.0000';
                        $dataTag['gCBS_pAliqEfet'] = number_format($pCBS, 4, '.', '');
                    }

                    $nfe->tagIBSCBS((object) $dataTag);
                }
            }

            // 5. Totais e Pagamentos
            $vDescTotal = (float) ($venda['valorDesconto'] ?? 0);
            $vNF = $vProd - $vDescTotal;

            $nfe->tagICMSTot((object) [
                'vBC' => '0.00',
                'vICMS' => '0.00',
                'vICMSDeson' => '0.00',
                'vFCP' => '0.00',
                'vBCST' => '0.00',
                'vST' => '0.00',
                'vFCPST' => '0.00',
                'vFCPSTRet' => '0.00',
                'vProd' => number_format($vProd, 2, '.', ''),
                'vFrete' => '0.00',
                'vSeg' => '0.00',
                'vDesc' => number_format($vDescTotal, 2, '.', ''),
                'vII' => '0.00',
                'vIPI' => '0.00',
                'vIPIDevol' => '0.00',
                'vPIS' => '0.00',
                'vCOFINS' => '0.00',
                'vOutro' => '0.00',
                'vNF' => number_format($vNF, 2, '.', ''),
                'vTotTrib' => number_format($vTotTrib, 2, '.', '')
            ]);

            $nfe->tagtransp((object) ['modFrete' => '9']);

            $cardInjecoes = []; // coleta dados de <card> para injetar via DOM após getXML()
            $vPagTotal = 0.0;
            foreach (($venda['pagamentos'] ?? []) as $pag) {
                $vPagTotal += (float) ($pag['valorPagamento'] ?? 0);
            }

            // Tratamento de Troco Automático p/ Regra 866 SEFAZ
            $vTroco = round($vPagTotal - $vNF, 2);
            $stdPag = new \stdClass();
            if ($vTroco > 0) {
                $stdPag->vTroco = number_format($vTroco, 2, '.', '');
            }
            $nfe->tagpag($stdPag);

            foreach (($venda['pagamentos'] ?? []) as $pag) {
                $tPag = $pag['formaPagamento'] ?? '01';
                $vPagItem = (float) ($pag['valorPagamento'] ?? 0);

                $nfe->tagdetPag((object) [
                    'tPag' => $tPag,
                    'vPag' => number_format($vPagItem, 2, '.', '')
                ]);

                // Coleta dados de <card> apenas para cartão crédito/débito (PIX=17 nunca usa <card>)
                if (in_array($tPag, ['03', '04'])) {
                    if (!empty($pag['tef_autorizacao'])) {
                        $cnpjCredenciadora = preg_replace('/\D/', '', $pag['tef_cnpj_credenciadora'] ?? '');
                        if (strlen($cnpjCredenciadora) === 14) {
                            // TEF integrado com CNPJ da credenciadora (tpIntegra=1)
                            $cardInjecoes[] = [
                                'tpIntegra' => '1',
                                'CNPJ' => $cnpjCredenciadora,
                                'tBand' => $pag['tef_bandeira_id'] ?? '99',
                                'cAut' => $pag['tef_autorizacao']
                            ];
                        } else {
                            $cardInjecoes[] = [
                                'tpIntegra' => '2',
                                'tBand' => $pag['tef_bandeira_id'] ?? '99',
                                'cAut' => $pag['tef_autorizacao']
                            ];
                        }
                    } else if (!empty($pag['cAut'])) {
                        // POS Manual (Bandeiras selecionadas manualmente)
                        $cardInjecoes[] = [
                            'tpIntegra' => '2',
                            'tBand' => $pag['tBand'] ?? '99',
                            'cAut' => $pag['cAut']
                        ];
                    } else {
                        $cardInjecoes[] = ['tpIntegra' => '2'];
                    }
                } else {
                    $cardInjecoes[] = null;
                }
            }
            $infCplTexto = "Documento emitido por ME ou EPP optante pelo Simples Nacional.";
            if ($vCBSTotal > 0 || $vIBSTotal > 0) {
                $infCplTexto .= sprintf(
                    " ; Tributos Reforma Tributaria - CBS: R$ %s | IBS: R$ %s",
                    number_format($vCBSTotal, 2, ',', '.'),
                    number_format($vIBSTotal, 2, ',', '.')
                );
            }
            $infCplTexto .= " ; Enterprise Soluções - esolucoesia.com";
            $nfe->taginfAdic((object) ['infCpl' => $infCplTexto]);

            // 6. Geração e Assinatura
            $xml = $nfe->getXML();

            // Injeta <card> via DOM (tagCard() ausente em sped-nfe v5 instalado)
            // Nota: <gTrib> (NT 2024.001) aguarda ativação do novo schema pela SEFAZ
            $xmlFinal = $nfe->getXML();

            // Sincronização estrutural de fidelidade absoluta (Modelo Enterprise_RTC - Reforma Tributária 2026)
            if (strpos($xmlFinal, '<IBSCBS>') !== false) {
                $dom = new \DOMDocument('1.0', 'UTF-8');
                $dom->preserveWhiteSpace = false;
                $dom->formatOutput = false;
                if (@$dom->loadXML($xmlFinal)) {
                    $xpath = new \DOMXPath($dom);
                    $xpath->registerNamespace('n', 'http://www.portalfiscal.inf.br/nfe');

                    // 1. Injeção de <card> em <detPag>
                    $detPags = $xpath->query('//n:detPag');
                    foreach ($detPags as $idx => $detPag) {
                        $cardData = $cardInjecoes[$idx] ?? null;
                        if ($cardData && !empty($cardData['cAut'])) {
                            $card = $dom->createElementNS('http://www.portalfiscal.inf.br/nfe', 'card');
                            $card->appendChild($dom->createElementNS('http://www.portalfiscal.inf.br/nfe', 'tpIntegra', $cardData['tpIntegra']));
                            if (!empty($cardData['CNPJ']))
                                $card->appendChild($dom->createElementNS('http://www.portalfiscal.inf.br/nfe', 'CNPJ', $cardData['CNPJ']));
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
                        // Sincronização de fidelidade absoluta (Modelo Enterprise_RTC - Reforma Tributária 2026)
                        // Conforme NT 2024.002, o grupo gIBSCBS deve ser mantido dentro de IBSCBS

                        foreach (['gIBSUF', 'gIBSMun', 'gCBS'] as $ig) {
                            $nodeGroup = $det->getElementsByTagName($ig)->item(0);
                            if ($nodeGroup) {
                                foreach (['ind_gRed', 'pRedAliq', 'pAliqEfet', 'gRed'] as $tg) {
                                    $old = $nodeGroup->getElementsByTagName($tg)->item(0);
                                    if ($old)
                                        $nodeGroup->removeChild($old);
                                }
                                $cClassTrib = $det->getElementsByTagName('cClassTrib')->item(0)->nodeValue ?? '';
                                if ($cClassTrib !== '000001') {
                                    $gRed = $dom->createElement('gRed');
                                    $gRed->appendChild($dom->createElement('pRedAliq', '100.00'));
                                    $gRed->appendChild($dom->createElement('pAliqEfet', '0.00'));
                                    $vTag = str_replace('g', 'v', $ig);
                                    $valNode = $nodeGroup->getElementsByTagName($vTag)->item(0);
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

                        $vProdNode = $det->getElementsByTagName('vProd')->item(0);
                        $vItemVal = $vProdNode ? $vProdNode->nodeValue : '0.00';
                        $oldVitem = $det->getElementsByTagName('vItem')->item(0);
                        if ($oldVitem)
                            $det->removeChild($oldVitem);
                        $det->appendChild($dom->createElement('vItem', $vItemVal));
                    }

                    $totalGrp = $xpath->query('//n:total')->item(0);
                    $totais = $xpath->query('//n:total/n:IBSCBSTot')->item(0);
                    if ($totais) {
                        $vBCNode = $totais->getElementsByTagName('vBCIBSCBS')->item(0);
                        $vBC = $vBCNode ? $vBCNode->nodeValue : '0.00';
                        $valIBS = number_format($sumIBS, 2, '.', '');
                        $valCBS = number_format($sumCBS, 2, '.', '');
                        $vUF = number_format($sumIBSUF, 2, '.', '');
                        $vMun = number_format($sumIBSMun, 2, '.', '');
                        while ($totais->hasChildNodes())
                            $totais->removeChild($totais->firstChild);
                        $totais->appendChild($dom->createElement('vBCIBSCBS', $vBC));

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
                        $gIBS->appendChild($dom->createElement('vIBS', $valIBS));
                        $gIBS->appendChild($dom->createElement('vCredPres', '0.00'));
                        $gIBS->appendChild($dom->createElement('vCredPresCondSus', '0.00'));
                        $totais->appendChild($gIBS);

                        $gCBS = $dom->createElement('gCBS');
                        $gCBS->appendChild($dom->createElement('vDif', '0.00'));
                        $gCBS->appendChild($dom->createElement('vDevTrib', '0.00'));
                        $gCBS->appendChild($dom->createElement('vCBS', $valCBS));
                        $gCBS->appendChild($dom->createElement('vCredPres', '0.00'));
                        $gCBS->appendChild($dom->createElement('vCredPresCondSus', '0.00'));
                        $totais->appendChild($gCBS);

                        // gMono (Totais da Monofasia - todos os 6 campos obrigatórios conforme XSD TIBSCBSMonoTot)
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


                    // vNFTot no final de total (Valor Total da NF-e incluindo tributos se houver)
                    if ($totalGrp) {
                        $oldVnftot = $totalGrp->getElementsByTagName('vNFTot')->item(0);
                        if ($oldVnftot && $oldVnftot->parentNode === $totalGrp) {
                            $totalGrp->removeChild($oldVnftot);
                        }
                        $vNFNode = $totalGrp->getElementsByTagName('vNF')->item(0);
                        $vNFVal = $vNFNode ? $vNFNode->nodeValue : '0.00';
                        $totalGrp->appendChild($dom->createElement('vNFTot', $vNFVal));
                    }

                    $xmlFinal = $dom->saveXML();
                }
            } else {
                // Injeção simples de <card> para XMLs sem Reforma Tributária
                if (array_filter($cardInjecoes)) {
                    $dom = new \DOMDocument('1.0', 'UTF-8');
                    $dom->loadXML($xmlFinal);
                    $ns = 'http://www.portalfiscal.inf.br/nfe';
                    $detPags = $dom->getElementsByTagNameNS($ns, 'detPag');
                    foreach ($detPags as $idx => $detPagEl) {
                        $cardData = $cardInjecoes[$idx] ?? null;
                        if ($cardData && !empty($cardData['cAut'])) {
                            $cardEl = $dom->createElementNS($ns, 'card');
                            $cardEl->appendChild($dom->createElementNS($ns, 'tpIntegra', $cardData['tpIntegra']));
                            if (!empty($cardData['CNPJ']))
                                $cardEl->appendChild($dom->createElementNS($ns, 'CNPJ', $cardData['CNPJ']));
                            $cardEl->appendChild($dom->createElementNS($ns, 'tBand', $cardData['tBand']));
                            $cardEl->appendChild($dom->createElementNS($ns, 'cAut', $cardData['cAut']));
                            $detPagEl->appendChild($cardEl);
                        }
                    }
                    $xmlFinal = $dom->saveXML();
                }
            }

            $xml = $xmlFinal;


            $xmlAssinado = $this->tools->signNFe($xml);

            // Se for contingência, já retorna o XML assinado para impressão imediata
            if ($contingencia) {
                return (object) [
                    'sucesso' => true,
                    'xml_assinado' => $xmlAssinado,
                    'protocolo' => null,
                    'chave_acesso' => $nfe->getChave(),
                    'status' => 'Contingencia',
                    'mensagem_erro' => null
                ];
            }

            // 7. Transmissão Síncrona
            $idLote = str_pad((string) ($venda['numero'] ?? 0), 15, '0', STR_PAD_LEFT);
            $resp = $this->tools->sefazEnviaLote([$xmlAssinado], $idLote, 1); // 1 = Síncrono

            // Parse da resposta SEFAZ
            $std = $this->parseResposta($resp);
            $cStatLote = $std->cStat;
            $cStatNota = $cStatLote;
            $xMotivoNota = $std->xMotivo;
            $nProt = '';
            $chNFe = $nfe->getChave();

            // Se o lote foi processado (104), pega o status individual da nota
            if ($cStatLote == 104 && $std->protNFe) {
                $cStatNota = $std->protNFe->infProt->cStat;
                $xMotivoNota = $std->protNFe->infProt->xMotivo;
                $nProt = $std->protNFe->infProt->nProt;
                $chNFe = $std->protNFe->infProt->chNFe ?: $nfe->getChave();
            }

            // Log da Requisição/Resposta
            $this->logSefaz($venda['id'], $cStatNota, $xMotivoNota, $xmlAssinado, $resp);

            // 8. Tratamento de Rejeições e Duplicidade
            if ($cStatNota == 204) { // Duplicidade
                return $this->tratarDuplicidade($xmlAssinado, $venda['id']);
            }

            if ($cStatNota != 100) {
                $erroAmigavel = $this->parseRejeicao($cStatNota, $xMotivoNota);
                if (strpos($xMotivoNota, 'Schema') !== false || strpos($xMotivoNota, 'caracteres especiais') !== false) {
                    $this->sendEmailDeveloper($xMotivoNota, $xmlAssinado);
                }
                return (object) [
                    'sucesso' => false,
                    'xml_assinado' => $xmlAssinado,
                    'protocolo' => null,
                    'status' => 'Rejeitada',
                    'mensagem_erro' => $erroAmigavel
                ];
            }


            // 9. QR Code e Protocolo
            $xmlProtocolado = Complements::toAuthorize($xmlAssinado, $resp);

            return (object) [
                'sucesso' => true,
                'xml_assinado' => $xmlProtocolado,
                'protocolo' => $nProt,
                'chave_acesso' => $chNFe,
                'status' => 'Autorizada',
                'mensagem_erro' => null
            ];

        } catch (\Throwable $e) {
            // Diagnóstico detalhado para identificar o que não foi encontrado
            $msg = $e->getMessage() . " (Local: " . basename($e->getFile()) . " L:" . $e->getLine() . ")";

            return (object) [
                'sucesso' => false,
                'xml_assinado' => null,
                'protocolo' => null,
                'status' => 'ErroConexao',
                'mensagem_erro' => "Erro de comunicação: " . $msg . ". Deseja emitir em contingência?"
            ];
        }
    }

    /**
     * Parse da resposta XML da SEFAZ sem depender do Standardize.
     * Remove prefixos de namespace para garantir compatibilidade com qualquer versão.
     */
    private function parseResposta(string $xmlResp): object
    {
        // Remove declarações xmlns e prefixos de namespace para parse simples
        $xmlLimpo = preg_replace('/\s+xmlns(?::\w+)?="[^"]*"/', '', $xmlResp);
        $xmlLimpo = preg_replace('/<(\/?)\w+:/', '<$1', $xmlLimpo);

        $xml = @simplexml_load_string($xmlLimpo, 'SimpleXMLElement', LIBXML_NOERROR | LIBXML_NOWARNING);

        $vazio = (object) [
            'cStat' => '',
            'xMotivo' => '',
            'protNFe' => null,
            'retEvento' => null,
            'infInut' => null
        ];
        if (!$xml)
            return $vazio;

        // Helper para extrair texto do primeiro match XPath
        $get = fn($path) => (string) ($xml->xpath($path)[0] ?? '');

        $cStat = $get('//cStat');
        $xMotivo = $get('//xMotivo');

        // Protocolo da nota individual (dentro de protNFe)
        $protNFe = null;
        $cStatProt = $get('//protNFe//cStat');
        if ($cStatProt !== '') {
            $protNFe = (object) [
                'infProt' => (object) [
                    'cStat' => $cStatProt,
                    'xMotivo' => $get('//protNFe//xMotivo'),
                    'nProt' => $get('//protNFe//nProt'),
                    'chNFe' => $get('//protNFe//chNFe'),
                ]
            ];
            // O cStat do lote pode ser diferente do cStat da nota; usamos o lote para decisão
            // mas expõe o cStat do lote no campo raiz
        }

        // Retorno de evento (cancelamento)
        $retEvento = (object) [
            'infEvento' => (object) [
                'cStat' => $get('//retEvento//cStat') ?: $cStat,
                'xMotivo' => $get('//retEvento//xMotivo') ?: $xMotivo,
                'nProt' => $get('//retEvento//nProt'),
            ]
        ];

        // Inutilização
        $infInut = (object) [
            'cStat' => $get('//infInut//cStat') ?: $cStat,
            'xMotivo' => $get('//infInut//xMotivo') ?: $xMotivo,
            'nProt' => $get('//infInut//nProt'),
        ];

        return (object) compact('cStat', 'xMotivo', 'protNFe', 'retEvento', 'infInut');
    }

    /**
     * Transmite uma NFC-e previamente gravada e assinada em Contingência
     */
    public function transmitirAtrasada(string $xmlAssinado, int $numero, int $vendaId): object
    {
        try {
            $idLote = str_pad((string) ($numero ?? 0), 15, '0', STR_PAD_LEFT);
            $resp = $this->tools->sefazEnviaLote([$xmlAssinado], $idLote, 1);

            $std = $this->parseResposta($resp);
            if ($std->cStat == 104 && $std->protNFe) {
                $cStatNota = $std->protNFe->infProt->cStat;
                $xMotivoNota = $std->protNFe->infProt->xMotivo;
            } else {
                $cStatNota = $std->cStat;
                $xMotivoNota = $std->xMotivo;
            }

            $this->logSefaz($vendaId, $cStatNota, $xMotivoNota, $xmlAssinado, $resp);

            if ($cStatNota == 204) {
                return $this->tratarDuplicidade($xmlAssinado, $vendaId);
            }

            if ($cStatNota != 100) {
                $erroAmigavel = $this->parseRejeicao($cStatNota, $xMotivoNota);
                return (object) [
                    'sucesso' => false,
                    'xml_assinado' => $xmlAssinado,
                    'protocolo' => null,
                    'status' => 'Rejeitada',
                    'mensagem_erro' => $erroAmigavel
                ];
            }

            $xmlProtocolado = Complements::toAuthorize($xmlAssinado, $resp);

            return (object) [
                'sucesso' => true,
                'xml_assinado' => $xmlProtocolado,
                'protocolo' => $std->protNFe->infProt->nProt ?? '',
                'chave_acesso' => $std->protNFe->infProt->chNFe ?? '',
                'status' => 'Autorizada',
                'mensagem_erro' => null
            ];
        } catch (Exception $e) {
            return (object) [
                'sucesso' => false,
                'xml_assinado' => $xmlAssinado,
                'protocolo' => null,
                'status' => 'ErroConexao',
                'mensagem_erro' => "Erro de comunicação na transmissão: " . $e->getMessage()
            ];
        }
    }

    /**
     * Busca o protocolo de uma nota já autorizada em caso de duplicidade
     */
    private function tratarDuplicidade(string $xml, int $vendaId): object
    {
        try {
            $chave = $this->extractChave($xml);
            $resp = $this->tools->sefazConsultaChave($chave);
            $std = $this->parseResposta($resp);

            if ($std->cStat == 100 || $std->cStat == 101) {
                $xmlProtocolado = Complements::toAuthorize($xml, $resp);
                return (object) [
                    'sucesso' => true,
                    'xml_assinado' => $xmlProtocolado,
                    'protocolo' => $std->protNFe->infProt->nProt ?? '',
                    'status' => 'Autorizada',
                    'mensagem_erro' => null
                ];
            }
        } catch (Exception $e) {
        }

        return (object) [
            'sucesso' => false,
            'xml_assinado' => $xml,
            'protocolo' => null,
            'status' => 'Rejeitada',
            'mensagem_erro' => "Duplicidade detectada, mas não foi possível recuperar o protocolo automaticamente."
        ];
    }

    /**
     * Mapeia códigos de erro da SEFAZ para mensagens amigáveis
     */
    private function parseRejeicao(string $cStat, string $xMotivo): string
    {
        $map = [
            '203' => 'O CPF/CNPJ do destinatário é inválido. Verifique o cadastro do cliente.',
            '702' => 'O NCM informado para um dos produtos não existe na tabela da SEFAZ.',
            '610' => 'O valor total da nota difere do somatório dos itens. Verifique os cálculos.',
            '225' => 'Falha no Schema XML. Verifique se há caracteres especiais inválidos.',
            '539' => 'Duplicidade de NFC-e com diferença na Chave de Acesso.',
            '602' => 'O CFOP informado não é permitido para NFC-e (Modelo 65).'
        ];

        if ($cStat === '' && $xMotivo === '') {
            return "Resposta inválida ou sem retorno da SEFAZ. Verifique o certificado e as configurações.";
        }
        return $map[$cStat] ?? "Rejeição SEFAZ ({$cStat}): {$xMotivo}";
    }

    private function logSefaz($vendaId, $cStat, $xMotivo, $req, $res)
    {
        // Aqui seria inserido no banco de dados (tabela logs_sefaz)
        // Ex: DB::table('logs_sefaz')->insert([...]);
    }

    /**
     * Monta o stdClass correto para tagICMSSN conforme o CSOSN.
     * Cada código exige campos diferentes na biblioteca NFePHP.
     */
    private function buildICMSSNStd(int $item, string $orig, string $csosn, float $vProd): \stdClass
    {
        $std = new \stdClass();
        $std->item = $item;
        $std->orig = $orig;
        $std->CSOSN = $csosn;

        switch ($csosn) {
            case '101': // Tributada c/ crédito
                $std->pCredSN = '0.00';
                $std->vCredICMSSN = '0.00';
                break;

            case '201': // c/ crédito + ST
                $std->modBCST = '4';
                $std->pMVAST = '0.00';
                $std->pRedBCST = '0.00';
                $std->vBCST = '0.00';
                $std->pICMSST = '0.00';
                $std->vICMSST = '0.00';
                // FCP-ST não enviado quando zero (SEFAZ rejeita com erro 881)
                $std->pCredSN = '0.00';
                $std->vCredICMSSN = '0.00';
                break;

            case '202':
            case '203': // ST sem crédito
                $std->modBCST = '4';
                $std->pMVAST = '0.00';
                $std->pRedBCST = '0.00';
                $std->vBCST = '0.00';
                $std->pICMSST = '0.00';
                $std->vICMSST = '0.00';
                // FCP-ST não enviado quando zero (SEFAZ rejeita com erro 881)
                break;

            case '500': // ST retido anteriormente
                $std->vBCSTRet = '0.00';
                $std->pST = '0.00';
                $std->vICMSSTRet = '0.00';
                // FCP-ST não enviado quando zero (SEFAZ rejeita com erro 881)
                break;

            case '900': // Outros
                $std->modBC = '3';
                $std->vBC = number_format($vProd, 2, '.', '');
                $std->pRedBC = '0.00';
                $std->pICMS = '0.00';
                $std->vICMS = '0.00';
                $std->modBCST = '4';
                $std->pMVAST = '0.00';
                $std->pRedBCST = '0.00';
                $std->vBCST = '0.00';
                $std->pICMSST = '0.00';
                $std->vICMSST = '0.00';
                // FCP-ST não enviado quando zero (SEFAZ rejeita com erro 881)
                $std->pCredSN = '0.00';
                $std->vCredICMSSN = '0.00';
                break;

            // 102, 103, 104, 300, 400 — apenas orig + CSOSN são suficientes
        }

        return $std;
    }

    private function extractChave(string $xml): string
    {
        preg_match('/Id="NFe(\d+)"/', $xml, $matches);
        return $matches[1] ?? '';
    }

    /**
     * Cancelamento de NFC-e (Evento 110111)
     */
    public function cancelarNfce(int $vendaId, string $justificativa, array $vendaData): object
    {
        try {
            // 1. Validações de Negócio
            if (strlen($justificativa) < 15) {
                throw new Exception("A justificativa deve ter no mínimo 15 caracteres.");
            }

            $chave = $vendaData['chave_acesso'];
            $nProt = $vendaData['protocolo'];

            // 2. Geração do Evento
            $xJust = $justificativa;
            $dhEvento = new \DateTime('now', new \DateTimeZone('America/Sao_Paulo'));
            $response = $this->tools->sefazCancela($chave, $xJust, $nProt, $dhEvento, 1);

            // 3. Tratamento do Retorno
            $std = $this->parseResposta($response);

            // Log da Operação
            $this->logSefaz($vendaId, $std->cStat, $std->xMotivo, "Cancelamento: $chave", $response);

            // cStat 128 = lote processado; o status real do evento está em retEvento
            $cStatEvento = (string) ($std->retEvento->infEvento->cStat ?? $std->cStat);
            $xMotivoEvento = (string) ($std->retEvento->infEvento->xMotivo ?? $std->xMotivo);
            $nProtEvento = (string) ($std->retEvento->infEvento->nProt ?? '');

            if ($cStatEvento == '135' || $cStatEvento == '155') {
                return (object) [
                    'sucesso' => true,
                    'mensagem' => 'Nota Cancelada com Sucesso',
                    'protocolo' => $nProtEvento,
                    'xmlCancelamento' => $response
                ];
            }

            return (object) [
                'sucesso' => false,
                'mensagem' => "Rejeição SEFAZ ({$cStatEvento}): {$xMotivoEvento}"
            ];

        } catch (Exception $e) {
            return (object) [
                'sucesso' => false,
                'mensagem' => $e->getMessage()
            ];
        }
    }

    /**
     * Inutilização de Numeração
     */
    public function inutilizarNumeracao(int $serie, int $nIni, int $nFin, string $justificativa): object
    {
        try {
            if (strlen($justificativa) < 15) {
                throw new Exception("A justificativa deve ter no mínimo 15 caracteres.");
            }

            $response = $this->tools->sefazInutiliza($serie, $nIni, $nFin, $justificativa);

            $std = $this->parseResposta($response);

            if ($std->infInut->cStat == 102) { // 102 = Inutilização de número homologado
                return (object) [
                    'sucesso' => true,
                    'mensagem' => 'Numeração Inutilizada com Sucesso',
                    'protocolo' => $std->infInut->nProt
                ];
            }

            return (object) [
                'sucesso' => false,
                'mensagem' => "Rejeição SEFAZ: {$std->infInut->xMotivo}"
            ];

        } catch (Exception $e) {
            return (object) [
                'sucesso' => false,
                'mensagem' => $e->getMessage()
            ];
        }
    }

    private function sendEmailDeveloper(string $erro, string $xml): void
    {
        try {
            $e = $this->empresaData;
            // Só envia se houver SMTP configurado (mesmo método do contador)
            if (empty($e['smtp_host']) || empty($e['smtp_user']))
                return;

            $developerEmail = 'heliomaralves@msn.com';
            $envPath = dirname(__DIR__, 2) . '/.env';
            if (file_exists($envPath)) {
                $content = file_get_contents($envPath);
                if (preg_match('/DEVELOPER_EMAIL=(.*)/', $content, $m))
                    $developerEmail = trim($m[1]);
            }

            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host = $e['smtp_host'];
            $mail->SMTPAuth = true;
            $mail->Username = $e['smtp_user'];
            $mail->Password = $e['smtp_pass'];
            $smtpSec = strtolower(trim($e['smtp_secure'] ?? ''));
            $mail->SMTPSecure = ($smtpSec === 'nenhum' || empty($smtpSec)) ? false : $smtpSec;
            $mail->Port = (int) ($e['smtp_port'] ?: 587);
            if ($mail->SMTPSecure === false)
                $mail->SMTPAutoTLS = false;

            $mail->setFrom($mail->Username, $e['razao_social'] ?? 'Enterprise RTC');
            $mail->addAddress($developerEmail);
            $mail->Subject = "[ALERTA SCHEMA] " . ($e['razao_social'] ?? 'Empresa');

            $body = "<h2>Falha de Schema XML</h2>";
            $body .= "<p><b>Origem:</b> " . ($e['razao_social'] ?? '') . "</p>";
            $body .= "<p><b>Erro SEFAZ:</b> $erro</p>";
            $body .= "<p><b>Data:</b> " . date('d/m/Y H:i:s') . "</p>";
            $body .= "<hr><pre>" . htmlspecialchars($xml) . "</pre>";

            $mail->isHTML(true);
            $mail->Body = $body;
            $mail->send();
        } catch (\Exception $e) {
        }
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
                'xMotivo' => "Erro no Motor Fiscal: " . $e->getMessage()
            ];
        }
    }
}

