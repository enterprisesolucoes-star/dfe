<?php
// api/cobranca.php — Configuração de Cobrança / Boletos

$empresaId = (int)($_REQUEST['empresa_id'] ?? 0);
if ($empresaId <= 0) {
    echo json_encode(['success' => false, 'message' => 'empresa_id inválido']);
    exit;
}

// ── Buscar configuração ───────────────────────────────────────────────────────
if ($action === 'cobranca_config_buscar') {
    $stmt = $pdo->prepare("SELECT * FROM empresas_cobranca WHERE empresa_id = ? AND ativo = 1 LIMIT 1");
    $stmt->execute([$empresaId]);
    $config = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $config ?: null]);
    exit;
}

// ── Salvar configuração ───────────────────────────────────────────────────────
if ($action === 'cobranca_config_salvar') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    $campos = [
        'banco_codigo', 'banco_nome', 'agencia', 'conta', 'convenio',
        'nosso_numero', 'ultima_remessa', 'modalidade', 'forma_entrega',
        'carteira', 'carteira_codigo', 'prazo_devolucao', 'prazo_protesto',
        'multa_valor', 'multa_tipo', 'juros_valor', 'juros_tipo',
        'desconto_valor', 'desconto_tipo', 'instrucoes',
        'client_id', 'client_secret', 'certificado_pem', 'certificado_key',
        'ambiente', 'ativo'
    ];

    // Verificar se já existe
    $stmt = $pdo->prepare("SELECT id FROM empresas_cobranca WHERE empresa_id = ?");
    $stmt->execute([$empresaId]);
    $existe = $stmt->fetch();

    if ($existe) {
        $sets   = implode(', ', array_map(fn($c) => "$c = ?", $campos));
        $values = array_map(fn($c) => $data[$c] ?? null, $campos);
        $values[] = $empresaId;
        $pdo->prepare("UPDATE empresas_cobranca SET $sets WHERE empresa_id = ?")
            ->execute($values);
    } else {
        $cols   = implode(', ', array_merge(['empresa_id'], $campos));
        $phs    = implode(', ', array_fill(0, count($campos) + 1, '?'));
        $values = array_merge([$empresaId], array_map(fn($c) => $data[$c] ?? null, $campos));
        $pdo->prepare("INSERT INTO empresas_cobranca ($cols) VALUES ($phs)")
            ->execute($values);
    }

    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Ação inválida']);
