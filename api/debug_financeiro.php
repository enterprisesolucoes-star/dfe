<?php
/**
 * Script de Debug para Diagnóstico do Módulo Financeiro
 */
require_once __DIR__ . '/../config.php';
session_start();

header('Content-Type: application/json');

$empresaId = (int)($_SESSION['empresa_id'] ?? 0);

if ($empresaId <= 0) {
    echo json_encode(['error' => 'Sessão expirada ou empresa_id não encontrado na sessão.']);
    exit;
}

try {
    $results = [];

    // 1. Verificar se a tabela existe
    $checkTable = $pdo->query("SHOW TABLES LIKE 'financeiro'")->fetch();
    $results['tabela_existe'] = $checkTable ? true : false;

    if ($results['tabela_existe']) {
        // 2. Contagem total de registros para esta empresa
        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM financeiro WHERE empresa_id = ?");
        $stmtCount->execute([$empresaId]);
        $results['total_registros_empresa'] = (int)$stmtCount->fetchColumn();

        // 3. Contagem por tipo
        $stmtTipo = $pdo->prepare("SELECT tipo, COUNT(*) as qtd FROM financeiro WHERE empresa_id = ? GROUP BY tipo");
        $stmtTipo->execute([$empresaId]);
        $results['contagem_por_tipo'] = $stmtTipo->fetchAll(PDO::FETCH_ASSOC);

        // 4. Verificar se existem Joins quebrados (vendas sem cliente ou financeiro sem venda)
        $stmtTestJoin = $pdo->prepare("
            SELECT f.id, f.venda_id, f.entidade_id, v.cliente_id as venda_cliente_id, c.nome as cliente_nome
            FROM financeiro f
            LEFT JOIN vendas v ON f.venda_id = v.id
            LEFT JOIN clientes c ON v.cliente_id = c.id
            WHERE f.empresa_id = ? AND f.tipo = 'R'
            LIMIT 5
        ");
        $stmtTestJoin->execute([$empresaId]);
        $results['amostra_vinculos'] = $stmtTestJoin->fetchAll(PDO::FETCH_ASSOC);

        // 5. Query completa que o frontend usa (Simulação)
        $queryFinal = "SELECT f.*, 
                        COALESCE(c.nome, fo.nome, c2.nome, 'NÃO ENCONTRADO') as nome_entidade
                      FROM financeiro f
                      LEFT JOIN clientes c      ON f.entidade_id = c.id
                      LEFT JOIN fornecedores fo ON f.entidade_id = fo.id
                      LEFT JOIN vendas v        ON f.venda_id = v.id
                      LEFT JOIN clientes c2     ON v.cliente_id = c2.id
                      WHERE f.empresa_id = ? AND f.tipo = 'R' 
                      ORDER BY f.vencimento ASC LIMIT 10";
        
        $stmtFinal = $pdo->prepare($queryFinal);
        $stmtFinal->execute([$empresaId]);
        $results['resultado_busca_real'] = $stmtFinal->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode($results, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
