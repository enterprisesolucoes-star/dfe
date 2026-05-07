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

    case 'dashboard_kpis':
        try {
            // Aceita dt_inicio/dt_fim como parâmetros; default = mês atual
            $dtIni  = $_GET['dt_inicio'] ?? date('Y-m-01');
            $dtFim  = $_GET['dt_fim']    ?? date('Y-m-t');

            // Período anterior — mesma duração imediatamente anterior
            $diff   = (strtotime($dtFim) - strtotime($dtIni)) / 86400 + 1;
            $dtIniAnt = date('Y-m-d', strtotime($dtIni . ' -' . $diff . ' days'));
            $dtFimAnt = date('Y-m-d', strtotime($dtIni . ' -1 day'));

            $hoje    = date('Y-m-d');
            $em7dias = date('Y-m-d', strtotime('+7 days'));

            $empFilter = $empresaId ? " AND empresa_id = " . (int)$empresaId : "";
            $empFilterCustom = function($alias) use ($empresaId) {
                return $empresaId ? " AND {$alias}.empresa_id = " . (int)$empresaId : "";
            };

            // Helper p/ trend
            $trend = function($atual, $ant) {
                if ($ant <= 0) return $atual > 0 ? 100 : 0;
                return round((($atual - $ant) / $ant) * 100, 1);
            };

            // 1) Orçamentos pendentes (snapshot atual, não usa filtro)
            $orcPend = $pdo->query("SELECT COUNT(*) qtd, COALESCE(SUM(valor_total),0) val
                FROM orcamentos
                WHERE status IN ('Rascunho','Enviado') {$empFilter}")->fetch(PDO::FETCH_ASSOC);

            // 2) Orçamentos do período + período anterior (taxa de conversão + ticket)
            $stmt = $pdo->prepare("SELECT
                COUNT(*) total,
                SUM(CASE WHEN status='Aprovado' THEN 1 ELSE 0 END) aprovados,
                COALESCE(AVG(CASE WHEN status='Aprovado' THEN valor_total END),0) ticket
                FROM orcamentos
                WHERE data_criacao >= ? AND data_criacao <= ? {$empFilter}");
            $stmt->execute([$dtIni, $dtFim . ' 23:59:59']);
            $orcAtual = $stmt->fetch(PDO::FETCH_ASSOC);

            $stmt->execute([$dtIniAnt, $dtFimAnt . ' 23:59:59']);
            $orcAnt = $stmt->fetch(PDO::FETCH_ASSOC);

            $taxaConv = (int)$orcAtual['total'] > 0
                ? round(((int)$orcAtual['aprovados'] / (int)$orcAtual['total']) * 100, 1) : 0;
            $taxaConvAnt = (int)$orcAnt['total'] > 0
                ? round(((int)$orcAnt['aprovados'] / (int)$orcAnt['total']) * 100, 1) : 0;

            // 3) OS em andamento (snapshot)
            $osAnd = $pdo->query("SELECT COUNT(*) qtd
                FROM ordens_servico
                WHERE status IN ('Aberta','Em Andamento') {$empFilter}")->fetch(PDO::FETCH_ASSOC);

            // 4) OS concluídas no período (ticket + trend)
            $stmt = $pdo->prepare("SELECT COUNT(*) qtd, COALESCE(AVG(valor_total),0) ticket
                FROM ordens_servico
                WHERE status='Concluída' AND data_criacao >= ? AND data_criacao <= ? {$empFilter}");
            $stmt->execute([$dtIni, $dtFim . ' 23:59:59']);
            $osAtual = $stmt->fetch(PDO::FETCH_ASSOC);
            $stmt->execute([$dtIniAnt, $dtFimAnt . ' 23:59:59']);
            $osAnt2 = $stmt->fetch(PDO::FETCH_ASSOC);

            // Ticket médio combinado (orcamento + OS)
            $ticketAtual = ((float)$orcAtual['ticket'] + (float)$osAtual['ticket']) / 2;
            $ticketAnt   = ((float)$orcAnt['ticket']  + (float)$osAnt2['ticket'])  / 2;
            if ($ticketAtual == 0) $ticketAtual = (float)($orcAtual['ticket'] ?: $osAtual['ticket']);
            if ($ticketAnt == 0)   $ticketAnt   = (float)($orcAnt['ticket']   ?: $osAnt2['ticket']);

            // 5) Top 5 clientes do período
            $stmt = $pdo->prepare("
                SELECT cliente_id, cliente_nome, SUM(valor) total
                FROM (
                    SELECT v.cliente_id, COALESCE(c.nome, c.razao_social, 'Consumidor') AS cliente_nome, v.valor_total AS valor
                    FROM vendas v
                    LEFT JOIN clientes c ON c.id = v.cliente_id
                    WHERE v.status='Autorizada' AND v.data_emissao >= ? AND v.data_emissao <= ?
                      " . ($empresaId ? "AND v.empresa_id = " . (int)$empresaId : "") . "
                      AND v.cliente_id IS NOT NULL

                    UNION ALL

                    SELECT o.cliente_id, COALESCE(c.nome, c.razao_social, o.cliente_nome) AS cliente_nome, o.valor_total AS valor
                    FROM orcamentos o
                    LEFT JOIN clientes c ON c.id = o.cliente_id
                    WHERE o.status='Aprovado' AND o.data_criacao >= ? AND o.data_criacao <= ?
                      " . ($empresaId ? "AND o.empresa_id = " . (int)$empresaId : "") . "

                    UNION ALL

                    SELECT os.cliente_id, COALESCE(c.nome, c.razao_social, os.cliente_nome) AS cliente_nome, os.valor_total AS valor
                    FROM ordens_servico os
                    LEFT JOIN clientes c ON c.id = os.cliente_id
                    WHERE os.status='Concluída' AND os.data_criacao >= ? AND os.data_criacao <= ?
                      " . ($empresaId ? "AND os.empresa_id = " . (int)$empresaId : "") . "
                ) t
                WHERE cliente_nome IS NOT NULL AND cliente_nome <> ''
                GROUP BY cliente_id, cliente_nome
                ORDER BY total DESC
                LIMIT 5
            ");
            $f = $dtFim . ' 23:59:59';
            $stmt->execute([$dtIni, $f, $dtIni, $f, $dtIni, $f]);
            $topClientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 6) Top 5 produtos
            $stmt = $pdo->prepare("
                SELECT vi.produto_id, COALESCE(p.descricao, 'Produto removido') AS descricao,
                       SUM(vi.quantidade) qtd, SUM(vi.valor_total) total
                FROM vendas_itens vi
                INNER JOIN vendas v ON v.id = vi.venda_id
                LEFT JOIN produtos p ON p.id = vi.produto_id
                WHERE v.status='Autorizada' AND v.data_emissao >= ? AND v.data_emissao <= ?
                  " . ($empresaId ? "AND v.empresa_id = " . (int)$empresaId : "") . "
                GROUP BY vi.produto_id, p.descricao
                ORDER BY total DESC
                LIMIT 5
            ");
            $stmt->execute([$dtIni, $f]);
            $topProdutos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 7-10) Vencimentos (snapshot atual; não muda com filtro de período)
            $recVenc = $pdo->query("SELECT COUNT(*) qtd, COALESCE(SUM(valor_total - valor_pago),0) val
                FROM financeiro WHERE tipo='R' AND status IN ('Pendente','Parcial')
                AND vencimento >= '{$hoje}' AND vencimento <= '{$em7dias}' {$empFilter}")->fetch(PDO::FETCH_ASSOC);
            $recVencidas = $pdo->query("SELECT COUNT(*) qtd, COALESCE(SUM(valor_total - valor_pago),0) val
                FROM financeiro WHERE tipo='R' AND status IN ('Pendente','Parcial')
                AND vencimento < '{$hoje}' {$empFilter}")->fetch(PDO::FETCH_ASSOC);
            $pagVenc = $pdo->query("SELECT COUNT(*) qtd, COALESCE(SUM(valor_total - valor_pago),0) val
                FROM financeiro WHERE tipo='P' AND status IN ('Pendente','Parcial')
                AND vencimento >= '{$hoje}' AND vencimento <= '{$em7dias}' {$empFilter}")->fetch(PDO::FETCH_ASSOC);
            $pagVencidas = $pdo->query("SELECT COUNT(*) qtd, COALESCE(SUM(valor_total - valor_pago),0) val
                FROM financeiro WHERE tipo='P' AND status IN ('Pendente','Parcial')
                AND vencimento < '{$hoje}' {$empFilter}")->fetch(PDO::FETCH_ASSOC);

            
            // Vendas do periodo filtrado pelo periodo selecionado
            $stmtV = $pdo->prepare("SELECT COUNT(*) qtd, COALESCE(SUM(valor_total),0) total FROM vendas WHERE status='Autorizada' AND data_emissao >= ? AND data_emissao <= ?" . ($empresaId ? " AND empresa_id = " . (int)$empresaId : ""));
            $stmtV->execute([$dtIni, $dtFim . ' 23:59:59']);
            $vendasAtual = $stmtV->fetch(PDO::FETCH_ASSOC);
            $stmtV->execute([$dtIniAnt, $dtFimAnt . ' 23:59:59']);
            $vendasAnt = $stmtV->fetch(PDO::FETCH_ASSOC);

echo json_encode([
                'success' => true,
                'periodo' => ['dt_inicio' => $dtIni, 'dt_fim' => $dtFim, 'dt_ini_ant' => $dtIniAnt, 'dt_fim_ant' => $dtFimAnt],
                'orcamentos_pendentes' => [
                    'qtd' => (int)$orcPend['qtd'], 'valor' => (float)$orcPend['val'],
                ],
                'taxa_conversao' => [
                    'percentual' => $taxaConv, 'aprovados' => (int)$orcAtual['aprovados'], 'total' => (int)$orcAtual['total'],
                    'trend' => round($taxaConv - $taxaConvAnt, 1),
                ],
                'os_andamento' => ['qtd' => (int)$osAnd['qtd']],
                'os_concluidas_periodo' => [
                    'qtd' => (int)$osAtual['qtd'],
                    'trend' => $trend((int)$osAtual['qtd'], (int)$osAnt2['qtd']),
                ],
                'ticket_medio' => [
                    'orcamento' => (float)$orcAtual['ticket'],
                    'os' => (float)$osAtual['ticket'],
                    'medio' => $ticketAtual,
                    'trend' => $trend($ticketAtual, $ticketAnt),
                ],
                'top_clientes' => $topClientes,
                'top_produtos' => $topProdutos,
                'contas_receber' => [
                    'vencendo_7d' => ['qtd' => (int)$recVenc['qtd'], 'valor' => (float)$recVenc['val']],
                    'vencidas'    => ['qtd' => (int)$recVencidas['qtd'], 'valor' => (float)$recVencidas['val']],
                ],
                'contas_pagar' => [
                    'vencendo_7d' => ['qtd' => (int)$pagVenc['qtd'], 'valor' => (float)$pagVenc['val']],
                    'vencidas'    => ['qtd' => (int)$pagVencidas['qtd'], 'valor' => (float)$pagVencidas['val']],
                ],
            'vendas_periodo' => [
                    'total' => (float)$vendasAtual['total'],
                    'qtd'   => (int)$vendasAtual['qtd'],
                    'trend' => $trend((float)$vendasAtual['total'], (float)$vendasAnt['total']),
                ],
            ]);
        } catch (\Exception $e) {
            echo json_encode([
                'success' => false, 'message' => $e->getMessage(),
                'orcamentos_pendentes' => ['qtd' => 0, 'valor' => 0],
                'taxa_conversao' => ['percentual' => 0, 'aprovados' => 0, 'total' => 0, 'trend' => 0],
                'os_andamento' => ['qtd' => 0],
                'os_concluidas_periodo' => ['qtd' => 0, 'trend' => 0],
                'ticket_medio' => ['orcamento' => 0, 'os' => 0, 'medio' => 0, 'trend' => 0],
                'top_clientes' => [], 'top_produtos' => [],
                'contas_receber' => ['vencendo_7d' => ['qtd'=>0,'valor'=>0], 'vencidas' => ['qtd'=>0,'valor'=>0]],
                'contas_pagar'   => ['vencendo_7d' => ['qtd'=>0,'valor'=>0], 'vencidas' => ['qtd'=>0,'valor'=>0]],
            'vendas_periodo' => ['total' => 0, 'qtd' => 0, 'trend' => 0],
            ]);
        }
        break;


    case 'dashboard_status_donut':
        try {
            $hojeIni = date('Y-m-01');
            $hojeFim = date('Y-m-t') . ' 23:59:59';
            $empFilter = $empresaId ? " AND empresa_id = " . (int)$empresaId : "";

            $rows = $pdo->query("
                SELECT status, COUNT(*) qtd, COALESCE(SUM(valor_total),0) val
                FROM vendas
                WHERE data_emissao >= '{$hojeIni}' AND data_emissao <= '{$hojeFim}' {$empFilter}
                GROUP BY status
            ")->fetchAll(PDO::FETCH_ASSOC);

            $mapa = [
                'Autorizada'  => ['nome' => 'Autorizadas',  'cor' => '#22c55e', 'qtd' => 0, 'val' => 0],
                'Contingencia'=> ['nome' => 'Contingência', 'cor' => '#0ea5e9', 'qtd' => 0, 'val' => 0],
                'Pendente'    => ['nome' => 'Pendentes',    'cor' => '#f59e0b', 'qtd' => 0, 'val' => 0],
                'Cancelada'   => ['nome' => 'Canceladas',   'cor' => '#ef4444', 'qtd' => 0, 'val' => 0],
                'Rejeitada'   => ['nome' => 'Rejeitadas',   'cor' => '#a855f7', 'qtd' => 0, 'val' => 0],
                'Inutilizada' => ['nome' => 'Inutilizadas', 'cor' => '#6b7280', 'qtd' => 0, 'val' => 0],
            ];

            foreach ($rows as $r) {
                $st = $r['status'];
                if (isset($mapa[$st])) {
                    $mapa[$st]['qtd'] = (int)$r['qtd'];
                    $mapa[$st]['val'] = (float)$r['val'];
                }
            }

            $segmentos = [];
            $total_qtd = 0;
            foreach ($mapa as $st => $info) {
                if ($info['qtd'] > 0) {
                    $segmentos[] = $info;
                    $total_qtd += $info['qtd'];
                }
            }

            echo json_encode([
                'success' => true,
                'segmentos' => $segmentos,
                'total_qtd' => $total_qtd,
            ]);
        } catch (\Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage(),
                'segmentos' => [],
                'total_qtd' => 0,
            ]);
        }
        break;

}
