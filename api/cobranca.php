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


// ── Gerar Boleto ──────────────────────────────────────────────────────────────
if ($action === 'boleto_gerar') {
    $data         = json_decode(file_get_contents('php://input'), true) ?? [];
    $financeiroId = (int)($data['financeiro_id'] ?? 0);

    if (!$financeiroId) {
        echo json_encode(['success' => false, 'message' => 'financeiro_id inválido']);
        exit;
    }

    // Buscar título
    $stmt = $pdo->prepare("SELECT * FROM financeiro WHERE id = ? AND empresa_id = ? AND tipo = 'R'");
    $stmt->execute([$financeiroId, $empresaId]);
    $titulo = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$titulo) { echo json_encode(['success' => false, 'message' => 'Título não encontrado']); exit; }
    if ($titulo['boleto_status'] === 'registrado') { echo json_encode(['success' => false, 'message' => 'Boleto já gerado para este título']); exit; }

    // Buscar configuração da cobrança
    $cfg = $pdo->prepare("SELECT * FROM empresas_cobranca WHERE empresa_id = ? AND ativo = 1 LIMIT 1");
    $cfg->execute([$empresaId]);
    $config = $cfg->fetch(PDO::FETCH_ASSOC);
    if (!$config) { echo json_encode(['success' => false, 'message' => 'Configuração de cobrança não encontrada. Configure em Configurações → Cobrança.']); exit; }

    // Buscar empresa
    $emp = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
    $emp->execute([$empresaId]);
    $empresa = $emp->fetch(PDO::FETCH_ASSOC);

    // Buscar cliente
    $clienteNome = $titulo['entidade_id']
        ? ($pdo->prepare("SELECT nome, documento FROM clientes WHERE id = ?") && false ?: (function() use ($pdo, $titulo) {
            $s = $pdo->prepare("SELECT nome, documento FROM clientes WHERE id = ?");
            $s->execute([$titulo['entidade_id']]);
            return $s->fetch(PDO::FETCH_ASSOC);
          })())
        : null;

    // Nosso número sequencial
    $nossoNumero = (int)$config['nosso_numero'];
    $pdo->prepare("UPDATE empresas_cobranca SET nosso_numero = nosso_numero + 1 WHERE empresa_id = ?")
        ->execute([$empresaId]);

    // Por enquanto gera boleto simulado (será substituído pela API Sicoob quando tiver credenciais)
    // Formato do nosso número Sicoob: convenio + nosso_numero
    $nossoNumeroFmt = $config['convenio'] . str_pad($nossoNumero, 7, '0', STR_PAD_LEFT);

    // Linha digitável simulada (será gerada pela API Sicoob)
    $linhaDigitavel = '75691.' . substr($nossoNumeroFmt, 0, 5) . ' ' .
                      substr($nossoNumeroFmt, 5, 5) . '.' . substr($nossoNumeroFmt, 5, 6) . ' ' .
                      '1.' . date('Ymd', strtotime($titulo['vencimento'])) . ' ' .
                      number_format($titulo['valor_total'], 2, '', '');

    $codigoBarras = '75691' . date('Ymd', strtotime($titulo['vencimento'])) .
                    number_format($titulo['valor_total'], 2, '', '') . $nossoNumeroFmt;

    // Salvar no financeiro
    $pdo->prepare("
        UPDATE financeiro SET
            boleto_nosso_numero    = ?,
            boleto_codigo_barras   = ?,
            boleto_linha_digitavel = ?,
            boleto_status          = 'registrado',
            boleto_registrado_em   = NOW()
        WHERE id = ? AND empresa_id = ?
    ")->execute([$nossoNumeroFmt, $codigoBarras, $linhaDigitavel, $financeiroId, $empresaId]);

    // Retornar dados atualizados
    $stmt = $pdo->prepare("SELECT * FROM financeiro WHERE id = ?");
    $stmt->execute([$financeiroId]);
    $tituloAtualizado = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'boleto' => $tituloAtualizado]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Ação inválida']);
