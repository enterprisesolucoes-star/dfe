<?php

class MotorTributarioIBSCBS {

    /**
     * Processa a classificação tributária do IBS/CBS para um item da nota.
     * @param array $dadosItem Array contendo os dados do item e contexto da operação
     * @return array Resultado com CST, cClassTrib e flags de processamento
     * @throws Exception Caso falte informação crítica para desambiguação
     */
    public function classificarItem(array $dadosItem): array {
        // 1. Extração de Variáveis do Contexto
        $ncm                 = $dadosItem['ncm'];
        $tipoOperacao        = $dadosItem['tipoOperacao']; // 'onerosa' ou 'nao_onerosa'
        $destinatarioGoverno = $dadosItem['destinatarioGoverno'] ?? false;
        $simplesNacional     = $dadosItem['simplesNacional'] ?? false;
        $recolhePorFora      = $dadosItem['recolhePorFora'] ?? false; // Simples repassando crédito integral
        $anoCompetencia      = $dadosItem['anoCompetencia'] ?? (int)date('Y');
        $finalidadeUso       = $dadosItem['finalidadeUso'] ?? null;

        // 2. Estado Inicial (Tributável por Padrão)
        $resultado = [
            'cst_ibscbs'              => '000',     // Tributação integral padrão
            'cClassTrib'              => '000001',  // Código padrão de base ampla
            'sujeito_imposto_seletivo'=> false,
            'calcular_tributos_antigos'=> ($anoCompetencia >= 2026 && $anoCompetencia <= 2032), // Período de Transição
            'mensagens_alerta'        => []
        ];

        // 3. Filtro de Onerosidade (A grande peneira)
        if ($tipoOperacao === 'nao_onerosa') {
            // Mapear para códigos de não incidência/suspensão (exemplo fictício '400')
            $resultado['cst_ibscbs'] = '400'; 
            $resultado['cClassTrib'] = '999999';
            $resultado['mensagens_alerta'][] = 'Operação não onerosa. Sem cálculo de IBS/CBS na regra geral.';
            
            return $resultado; // Encerra o fluxo aqui
        }

        // 4. Verificação do Imposto Seletivo (IS)
        if ($this->isSujeitoImpostoSeletivo($ncm)) {
            $resultado['sujeito_imposto_seletivo'] = true;
            $resultado['mensagens_alerta'][] = 'ATENÇÃO: Item sujeito ao Imposto Seletivo. O valor do IS deve compor a base de cálculo do IBS/CBS.';
        }

        // 5. Verificação de Benefícios por NCM (Anexos)
        $anexos = $this->buscarAnexosPorNcm($ncm);
        
        if (!empty($anexos)) {
            if (count($anexos) > 1) {
                // Desambiguação: Requer a finalidade de uso preenchida no ERP/PDV
                if (empty($finalidadeUso)) {
                    throw new Exception("Múltiplos anexos encontrados para o NCM {$ncm}. É obrigatório informar a finalidade de uso do produto para classificar corretamente.");
                }
                $resultado['cClassTrib'] = $this->mapearCodigoPorFinalidade($ncm, $finalidadeUso);
                $resultado['mensagens_alerta'][] = 'Aplicado cClassTrib baseado na finalidade de uso específica.';
            } else {
                // Apenas um anexo aplicável
                $resultado['cClassTrib'] = $anexos[0]['cClassTrib'];
                $resultado['mensagens_alerta'][] = 'Aplicado benefício de anexo único para o NCM.';
            }
        }

        // 6. Sobreposição: Destinatário é Administração Pública?
        if ($destinatarioGoverno) {
            // A regra de compras governamentais sobrepõe anexos comuns
            $resultado['cClassTrib'] = '200999'; // Exemplo de código da tabela oficial para Governo
            $resultado['mensagens_alerta'][] = 'Regra de Governo aplicada: Alíquota/Base reduzida conforme norma específica de compras públicas.';
        }

        // 7. Modificador de Regime: Simples Nacional
        if ($simplesNacional) {
            if ($recolhePorFora) {
                $resultado['cst_ibscbs'] = '090'; // Ex: Recolhimento por fora para repasse de crédito integral
            } else {
                $resultado['cst_ibscbs'] = '091'; // Ex: Recolhimento via DAS (repasse percentual)
            }
        }

        return $resultado;
    }

    // =========================================================================
    // MÉTODOS DE INTEGRAÇÃO (MOCKS) - Substitua pelas suas consultas ao Banco
    // =========================================================================

    private function isSujeitoImpostoSeletivo(string $ncm): bool {
        $ncmsSeletivos = ['22021000', '24022000', '22030000']; 
        return in_array($ncm, $ncmsSeletivos);
    }

    private function buscarAnexosPorNcm(string $ncm): array {
        if ($ncm === '30049099') { // Medicamento
            return [['tipo' => 'Saude', 'cClassTrib' => '200001', 'reducao_base' => 60]];
        }
        if ($ncm === '87032210') { // Veículo
            return [
                ['tipo' => 'PCD', 'cClassTrib' => '200010'],
                ['tipo' => 'Taxista', 'cClassTrib' => '200011']
            ];
        }
        return [];
    }

    private function mapearCodigoPorFinalidade(string $ncm, string $finalidadeUso): string {
        $mapaFinalidades = ['USO_PCD' => '200010', 'USO_TAXISTA' => '200011'];
        return $mapaFinalidades[$finalidadeUso] ?? '000001';
    }
}

// =========================================================================
// EXEMPLO DE USO PARA SIMULAÇÃO
// =========================================================================

header('Content-Type: text/plain; charset=utf-8');
$motor = new MotorTributarioIBSCBS();

try {
    echo "--- SIMULAÇÃO DE CLASSIFICAÇÃO IBS/CBS ---\n\n";

    $cenarios = [
        "Venda de Automóvel (Taxista)" => [
            'ncm'                 => '87032210',
            'tipoOperacao'        => 'onerosa',
            'simplesNacional'     => false,
            'destinatarioGoverno' => false,
            'anoCompetencia'      => 2026,
            'finalidadeUso'       => 'USO_TAXISTA'
        ],
        "Venda de Cerveja (Imposto Seletivo)" => [
            'ncm'                 => '22030000',
            'tipoOperacao'        => 'onerosa',
            'simplesNacional'     => true,
            'recolhePorFora'      => true,
            'anoCompetencia'      => 2027
        ]
    ];

    foreach ($cenarios as $nome => $dados) {
        echo "Cenário: $nome\n";
        print_r($motor->classificarItem($dados));
        echo str_repeat("-", 40) . "\n";
    }

} catch (Exception $e) {
    echo "Erro: " . $e->getMessage();
}
