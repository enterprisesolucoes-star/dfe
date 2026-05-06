<?php
// api/comissoes_helper.php — Funções reutilizáveis para geração/cancelamento de comissões
// Pode ser incluído por outros módulos via require_once.
// NÃO contém endpoints/actions e não chama exit/echo.

if (!function_exists('gerarComissao')) {

/**
 * Gera comissão para um documento.
 *
 * @param PDO $pdo
 * @param string $tipo  Aceita: 'orcamento', 'os', 'nfe', 'nfce', 'pedido'
 * @param int $docId
 * @param int $empresaId
 * @param int $usuarioId  Opcional, para auditoria
 * @return array [success, message?, comissao_id?, vendedor?, valor_comissao?]
 */
function gerarComissao(PDO $pdo, string $tipo, int $docId, int $empresaId, int $usuarioId = 0): array {

    // Mapeamento tipo → tabela e status que dispara
    // ENUM no banco: 'orcamento','os','pedido','nfe','nfce'
    $tabelas = [
        'orcamento' => ['tabela' => 'orcamentos',     'status_gatilho' => 'Aprovado',  'where_extra' => ''],
        'os'        => ['tabela' => 'ordens_servico', 'status_gatilho' => 'Concluída', 'where_extra' => ''],
        'pedido'    => ['tabela' => 'pedidos',        'status_gatilho' => null,        'where_extra' => ''],
        'nfe'       => ['tabela' => 'vendas',         'status_gatilho' => 'Autorizada','where_extra' => " AND modelo = 55"],
        'nfce'      => ['tabela' => 'vendas',         'status_gatilho' => 'Autorizada','where_extra' => " AND modelo = 65"],
    ];

    if (!isset($tabelas[$tipo])) {
        return ['success' => false, 'message' => 'Tipo de documento inválido: ' . $tipo];
    }

    $tabela     = $tabelas[$tipo]['tabela'];
    $gatilho    = $tabelas[$tipo]['status_gatilho'];
    $whereExtra = $tabelas[$tipo]['where_extra'];

    // Buscar o documento
    $sql = "SELECT id, empresa_id, vendedor_id, valor_total, status FROM {$tabela} WHERE id = ? AND empresa_id = ?{$whereExtra}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$docId, $empresaId]);
    $doc = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$doc) {
        return ['success' => false, 'message' => 'Documento não encontrado'];
    }
    if ($gatilho !== null && $doc['status'] !== $gatilho) {
        // Aceita 'Contingencia' como equivalente a 'Autorizada' para nfe/nfce
        $isFiscal = in_array($tipo, ['nfe', 'nfce']);
        if (!($isFiscal && $doc['status'] === 'Contingencia')) {
            return ['success' => false, 'message' => "Status do documento não é '{$gatilho}' (atual: {$doc['status']})"];
        }
    }
    if (empty($doc['vendedor_id'])) {
        return ['success' => false, 'message' => 'Documento sem vendedor vinculado'];
    }

    // Verificar duplicidade
    $stmt = $pdo->prepare("SELECT id FROM comissoes WHERE documento_tipo = ? AND documento_id = ? AND empresa_id = ?");
    $stmt->execute([$tipo, $docId, $empresaId]);
    if ($stmt->fetch()) {
        return ['success' => false, 'message' => 'Comissão já gerada para este documento', 'duplicado' => true];
    }

    // Buscar vendedor
    $stmt = $pdo->prepare("SELECT id, nome, percentual_comissao, ativo FROM vendedores WHERE id = ? AND empresa_id = ?");
    $stmt->execute([$doc['vendedor_id'], $empresaId]);
    $vendedor = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$vendedor)              return ['success' => false, 'message' => 'Vendedor não encontrado'];
    if (!$vendedor['ativo'])     return ['success' => false, 'message' => 'Vendedor inativo'];
    if ($vendedor['percentual_comissao'] <= 0) {
        return ['success' => false, 'message' => 'Vendedor sem percentual de comissão configurado'];
    }

    // Calcular
    $valorDoc    = (float)$doc['valor_total'];
    $percentual  = (float)$vendedor['percentual_comissao'];
    $valorComiss = round($valorDoc * $percentual / 100, 2);
    $competencia = date('Y-m-01');

    // Inserir
    $stmt = $pdo->prepare("
        INSERT INTO comissoes
            (empresa_id, vendedor_id, documento_tipo, documento_id, valor_documento,
             percentual, valor_comissao, competencia, status, gerado_em, gerado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', NOW(), ?)
    ");
    $stmt->execute([
        $empresaId, $doc['vendedor_id'], $tipo, $docId,
        $valorDoc, $percentual, $valorComiss, $competencia,
        $usuarioId ?: null,
    ]);

    return [
        'success'        => true,
        'comissao_id'    => (int)$pdo->lastInsertId(),
        'vendedor'       => $vendedor['nome'],
        'valor_comissao' => $valorComiss,
    ];
}

/**
 * Cancela comissão(ões) de um documento (qualquer comissão pendente ou aprovada).
 */
function cancelarComissao(PDO $pdo, string $tipo, int $docId, int $empresaId, string $motivo = ''): array {
    $stmt = $pdo->prepare("
        UPDATE comissoes
        SET status = 'cancelada', cancelado_em = NOW(), cancelado_motivo = ?
        WHERE documento_tipo = ? AND documento_id = ? AND empresa_id = ?
        AND status IN ('pendente', 'aprovada')
    ");
    $stmt->execute([$motivo ?: 'Documento cancelado', $tipo, $docId, $empresaId]);

    if ($stmt->rowCount() === 0) {
        return ['success' => false, 'message' => 'Nenhuma comissão ativa encontrada para cancelar'];
    }
    return ['success' => true, 'canceladas' => $stmt->rowCount()];
}

/**
 * Retorna o momento_comissao configurado para a empresa: 'emissao' ou 'pagamento'.
 * Default: 'emissao'.
 */
function getMomentoComissao(PDO $pdo, int $empresaId): string {
    $stmt = $pdo->prepare("SELECT momento_comissao FROM empresas WHERE id = ?");
    $stmt->execute([$empresaId]);
    $val = $stmt->fetchColumn();
    return ($val === 'pagamento') ? 'pagamento' : 'emissao';
}

/**
 * Wrapper: gera comissão respeitando momento_comissao.
 * Se momento = 'emissao', gera. Se 'pagamento', NÃO gera (será gerada no fluxo de baixa financeira).
 */
function gerarComissaoSeEmissao(PDO $pdo, string $tipo, int $docId, int $empresaId, int $usuarioId = 0): array {
    $momento = getMomentoComissao($pdo, $empresaId);
    if ($momento === 'pagamento') {
        return ['success' => true, 'pulado' => true, 'message' => 'Geração diferida para o pagamento'];
    }
    return gerarComissao($pdo, $tipo, $docId, $empresaId, $usuarioId);
}

} // if (!function_exists)
