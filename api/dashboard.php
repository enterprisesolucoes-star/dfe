<?php
switch ($action) {
    case 'dashboard_vendas':
        $query = "
            SELECT 
                DATE_FORMAT(v.data_emissao, '%Y-%m') as periodo,
                v.modelo,
                v.status,
                SUM(v.valor_total) as valor,
                COUNT(*) as quantidade
            FROM vendas v
            WHERE v.data_emissao >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 11 MONTH)
              " . ($empresaId ? "AND v.empresa_id = ?" : "") . "
            GROUP BY periodo, v.modelo, v.status
            ORDER BY periodo ASC
        ";
        
        $stmt = $pdo->prepare($query);
        if ($empresaId) {
            $stmt->execute([$empresaId]);
        } else {
            $stmt->execute();
        }
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Formata os dados para o gráfico (agrupar por período)
        $chartData = [];
        $periodos = [];
        
        foreach ($results as $row) {
            $p = $row['periodo'];
            if (!isset($chartData[$p])) {
                $chartData[$p] = [
                    'periodo' => $p,
                    'nfe' => 0,
                    'nfce' => 0,
                    'nfe_count' => 0,
                    'nfce_count' => 0,
                    'total' => 0,
                    'count' => 0,
                    'cancelado_count' => 0
                ];
            }
            
            $valor = (float)$row['valor'];
            $qtd = (int)$row['quantidade'];
            
            if ($row['status'] === 'Autorizada') {
                if ($row['modelo'] == 55) {
                    $chartData[$p]['nfe'] += $valor;
                    $chartData[$p]['nfe_count'] += $qtd;
                } else {
                    $chartData[$p]['nfce'] += $valor;
                    $chartData[$p]['nfce_count'] += $qtd;
                }
                $chartData[$p]['total'] += $valor;
                $chartData[$p]['count'] += $qtd;
            } else if (in_array($row['status'], ['Cancelada', 'Cancelado', 'Inutilizada', 'Inutilizado'])) {
                $chartData[$p]['cancelado_count'] += $qtd;
            }
        }
        
        echo json_encode(array_values($chartData));
        break;

    case 'dashboard_financeiro':
        try {
            require_once 'financeiro.php';
            if (function_exists('migrarTabelasFinanceiras')) {
                migrarTabelasFinanceiras($pdo);
            }
            $queryResumo = "SELECT
                SUM(CASE WHEN tipo = 'R' THEN (valor_total - valor_pago) ELSE 0 END) as receber_atual,
                SUM(CASE WHEN tipo = 'P' THEN (valor_total - valor_pago) ELSE 0 END) as pagar_atual,
                SUM(CASE WHEN tipo = 'R' AND vencimento < DATE_FORMAT(NOW(), '%Y-%m-01') THEN (valor_total - valor_pago) ELSE 0 END) as receber_ant,
                SUM(CASE WHEN tipo = 'P' AND vencimento < DATE_FORMAT(NOW(), '%Y-%m-01') THEN (valor_total - valor_pago) ELSE 0 END) as pagar_ant
                FROM financeiro
                WHERE status IN ('Pendente', 'Parcial')" . ($empresaId ? " AND empresa_id = " . (int)$empresaId : "");

            $stmtResumo = $pdo->query($queryResumo);
            $resumo = $stmtResumo ? $stmtResumo->fetch(PDO::FETCH_ASSOC) : ['total_receber' => 0, 'total_pagar' => 0];

        $queryChart = "
            SELECT 
                DATE_FORMAT(vencimento, '%Y-%m') as periodo,
                tipo,
                SUM(valor_total - valor_pago) as valor
            FROM financeiro
            WHERE status IN ('Pendente', 'Parcial') 
              AND vencimento >= DATE_FORMAT(NOW(), '%Y-%m-01')
              AND vencimento < DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 6 MONTH)
              " . ($empresaId ? "AND empresa_id = " . (int)$empresaId : "") . "
            GROUP BY periodo, tipo
            ORDER BY periodo ASC
        ";
        
        $stmtChart = $pdo->query($queryChart);
        $results = $stmtChart ? $stmtChart->fetchAll(PDO::FETCH_ASSOC) : [];

        $chartData = [];
        for ($i = 0; $i < 6; $i++) {
            $mes = date('Y-m', strtotime("+$i months"));
            $chartData[$mes] = [
                'periodo' => $mes,
                'receber' => 0,
                'pagar' => 0
            ];
        }

        foreach ($results as $row) {
            $p = $row['periodo'];
            if (isset($chartData[$p])) {
                if ($row['tipo'] === 'R') {
                    $chartData[$p]['receber'] += (float)$row['valor'];
                } else {
                    $chartData[$p]['pagar'] += (float)$row['valor'];
                }
            }
        }

        echo json_encode([
            'total_receber' => (float)($resumo['receber_atual'] ?? 0),
            'total_pagar' => (float)($resumo['pagar_atual'] ?? 0),
            'receber_ant' => (float)($resumo['receber_ant'] ?? 0),
            'pagar_ant' => (float)($resumo['pagar_ant'] ?? 0),
            'chart' => array_values($chartData)
        ]);
        } catch (\Exception $e) {
            // Em caso de erro (ex: tabela nao existe), envia zerado
            $chartData = [];
            for ($i = 0; $i < 6; $i++) {
                $mes = date('Y-m', strtotime("+$i months"));
                $chartData[$mes] = ['periodo' => $mes, 'receber' => 0, 'pagar' => 0];
            }
            echo json_encode([
                'total_receber' => 0,
                'total_pagar' => 0,
                'receber_ant' => 0,
                'pagar_ant' => 0,
                'chart' => array_values($chartData)
            ]);
        }
        break;
}
