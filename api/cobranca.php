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

// ── Imprimir Boleto HTML ──────────────────────────────────────────────────────
if ($action === 'boleto_imprimir') {
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $pdo->prepare("SELECT f.*, c.nome as cliente_nome, c.documento as cliente_documento, c.logradouro as cli_logradouro, c.municipio as cli_municipio, c.uf as cli_uf, c.cep as cli_cep FROM financeiro f LEFT JOIN clientes c ON c.id = f.entidade_id WHERE f.id = ? AND f.empresa_id = ?");
    $stmt->execute([$id, $empresaId]);
    $titulo = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$titulo) { http_response_code(404); echo 'Título não encontrado'; exit; }

    $emp = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
    $emp->execute([$empresaId]);
    $empresa = $emp->fetch(PDO::FETCH_ASSOC);

    $cfg = $pdo->prepare("SELECT * FROM empresas_cobranca WHERE empresa_id = ? AND ativo = 1");
    $cfg->execute([$empresaId]);
    $config = $cfg->fetch(PDO::FETCH_ASSOC);

    $venc    = date('d/m/Y', strtotime($titulo['vencimento']));
    $valor   = number_format($titulo['valor_total'], 2, ',', '.');
    $nossoN  = $titulo['boleto_nosso_numero'] ?? '';
    $linha   = $titulo['boleto_linha_digitavel'] ?? '';
    $barras  = $titulo['boleto_codigo_barras'] ?? '';
    $banco   = $config['banco_codigo'] ?? '756';
    $conv    = $config['convenio'] ?? '';
    $agencia = $config['agencia'] ?? '';
    $conta   = $config['conta'] ?? '';

    // Gerar código de barras visual (barras simples via CSS)
    $barrasVisual = '';
    for ($i = 0; $i < strlen($barras); $i++) {
        $d = $barras[$i];
        $w = in_array($d, ['1','3','5','7','9']) ? 3 : 1;
        $barrasVisual .= "<div style='display:inline-block;width:{$w}px;height:50px;background:#000;margin:0'></div>";
        if ($i % 2 === 1) $barrasVisual .= "<div style='display:inline-block;width:1px;height:50px;background:#fff;margin:0'></div>";
    }

    $instrucoes = nl2br(htmlspecialchars($config['instrucoes'] ?? ''));
    $multaTxt   = $config['multa_valor'] > 0 ? "Multa após vencimento: {$config['multa_valor']}{$config['multa_tipo']}" : '';
    $jurosTxt   = $config['juros_valor'] > 0 ? "Juros ao dia: {$config['juros_valor']}{$config['juros_tipo']}" : '';

    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Boleto</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:9pt;color:#000;padding:10mm}
  .boleto{width:190mm;margin:0 auto}
  .linha{display:flex;border-bottom:1px solid #000;padding:2px 0}
  .campo{flex:1;padding:2px 4px}
  .campo-label{font-size:7pt;color:#666;display:block}
  .campo-valor{font-size:9pt;font-weight:bold;display:block}
  .banco-header{display:flex;align-items:center;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:4px}
  .banco-logo{font-size:16pt;font-weight:bold;border-right:2px solid #000;padding-right:10px;margin-right:10px}
  .banco-cod{font-size:14pt;font-weight:bold;border-right:2px solid #000;padding-right:10px;margin-right:10px}
  .linha-digitavel{font-size:11pt;font-weight:bold;text-align:right;flex:1}
  .recibo{border:1px solid #000;padding:4px;margin-bottom:8px}
  .boleto-body{border:1px solid #000;padding:4px}
  .separator{border-top:1px dashed #999;margin:8px 0;padding-top:8px;font-size:7pt;color:#999;text-align:center}
  .barcode{text-align:center;padding:8px 0}
  @media print{body{padding:5mm}}
</style></head><body>
<div class="boleto">
  <!-- RECIBO DO SACADO -->
  <div class="recibo">
    <div class="banco-header">
      <div class="banco-logo">'.$banco.'</div>
      <div class="banco-cod">'.$banco.'-'.(strlen($banco)>3?substr($banco,-1):'X').'</div>
      <div class="linha-digitavel">'.$linha.'</div>
    </div>
    <div class="linha">
      <div class="campo" style="flex:3"><span class="campo-label">Beneficiário</span><span class="campo-valor">'.htmlspecialchars($empresa['razao_social']).' - CNPJ: '.htmlspecialchars($empresa['cnpj']).'</span></div>
      <div class="campo"><span class="campo-label">Agência/Código Beneficiário</span><span class="campo-valor">'.$agencia.'/'.$conta.'</span></div>
    </div>
    <div class="linha">
      <div class="campo" style="flex:2"><span class="campo-label">Sacado</span><span class="campo-valor">'.htmlspecialchars($titulo['cliente_nome'] ?? 'NÃO IDENTIFICADO').'</span></div>
      <div class="campo"><span class="campo-label">CPF/CNPJ</span><span class="campo-valor">'.htmlspecialchars($titulo['cliente_documento'] ?? '').'</span></div>
      <div class="campo"><span class="campo-label">Vencimento</span><span class="campo-valor">'.$venc.'</span></div>
      <div class="campo"><span class="campo-label">Valor</span><span class="campo-valor">R$ '.$valor.'</span></div>
    </div>
    <div class="linha">
      <div class="campo"><span class="campo-label">Nosso Número</span><span class="campo-valor">'.$nossoN.'</span></div>
      <div class="campo"><span class="campo-label">Convênio</span><span class="campo-valor">'.$conv.'</span></div>
      <div class="campo"><span class="campo-label">Data Emissão</span><span class="campo-valor">'.date('d/m/Y', strtotime($titulo['boleto_registrado_em'])).'</span></div>
    </div>
  </div>

  <div class="separator">✂ Corte aqui</div>

  <!-- FICHA DE COMPENSAÇÃO -->
  <div class="boleto-body">
    <div class="banco-header">
      <div class="banco-logo">'.$banco.'</div>
      <div class="banco-cod">'.$banco.'-'.(strlen($banco)>3?substr($banco,-1):'X').'</div>
      <div class="linha-digitavel">'.$linha.'</div>
    </div>
    <div class="linha">
      <div class="campo" style="flex:3"><span class="campo-label">Beneficiário</span><span class="campo-valor">'.htmlspecialchars($empresa['razao_social']).' - CNPJ: '.htmlspecialchars($empresa['cnpj']).'</span></div>
      <div class="campo"><span class="campo-label">Agência/Código Beneficiário</span><span class="campo-valor">'.$agencia.'/'.$conta.'</span></div>
    </div>
    <div class="linha">
      <div class="campo"><span class="campo-label">Data do Documento</span><span class="campo-valor">'.date('d/m/Y', strtotime($titulo['boleto_registrado_em'])).'</span></div>
      <div class="campo"><span class="campo-label">Nosso Número</span><span class="campo-valor">'.$nossoN.'</span></div>
      <div class="campo"><span class="campo-label">Convênio</span><span class="campo-valor">'.$conv.'</span></div>
      <div class="campo"><span class="campo-label">Vencimento</span><span class="campo-valor">'.$venc.'</span></div>
    </div>
    <div class="linha">
      <div class="campo" style="flex:2"><span class="campo-label">Sacado</span><span class="campo-valor">'.htmlspecialchars($titulo['cliente_nome'] ?? 'NÃO IDENTIFICADO').'</span></div>
      <div class="campo"><span class="campo-label">CPF/CNPJ</span><span class="campo-valor">'.htmlspecialchars($titulo['cliente_documento'] ?? '').'</span></div>
    </div>
    <div class="linha">
      <div class="campo" style="flex:2"><span class="campo-label">Instrução / Informações</span>
        <span class="campo-valor" style="font-weight:normal">'.$instrucoes.'<br>'.$multaTxt.' '.$jurosTxt.'</span>
      </div>
      <div class="campo" style="text-align:right">
        <span class="campo-label">Valor do Documento</span>
        <span class="campo-valor" style="font-size:12pt">R$ '.$valor.'</span>
      </div>
    </div>
    <div class="barcode">
      '.$barrasVisual.'
      <div style="font-size:7pt;margin-top:4px">'.$barras.'</div>
    </div>
  </div>
</div>
<script>window.onload=()=>{window.print()}</script>
</body></html>';
    exit;
}

// ── Listar Boletos ────────────────────────────────────────────────────────────
if ($action === 'boleto_listar') {
    $status  = $_GET['status'] ?? '';
    $dtInicio = $_GET['dt_inicio'] ?? date('Y-01-01');
    $dtFim    = $_GET['dt_fim']    ?? date('Y-m-d');

    $where  = ['f.empresa_id = ?', 'f.boleto_status IS NOT NULL'];
    $params = [$empresaId];

    if ($status) { $where[] = 'f.boleto_status = ?'; $params[] = $status; }
    $where[] = 'DATE(f.boleto_registrado_em) BETWEEN ? AND ?';
    $params[] = $dtInicio;
    $params[] = $dtFim;

    $whereStr = implode(' AND ', $where);
    $stmt = $pdo->prepare("
        SELECT f.id, f.valor_total, f.vencimento, f.status AS fin_status,
               f.boleto_nosso_numero, f.boleto_linha_digitavel, f.boleto_codigo_barras,
               f.boleto_status, f.boleto_registrado_em, f.boleto_pago_em,
               f.boleto_remessa_numero, f.categoria, f.documento_id,
               c.nome AS cliente_nome, c.documento AS cliente_documento
        FROM financeiro f
        LEFT JOIN clientes c ON c.id = f.entidade_id
        WHERE $whereStr
        ORDER BY f.boleto_registrado_em DESC
        LIMIT 500
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totais = ['total' => count($rows), 'valor_total' => 0, 'registrado' => 0, 'pago' => 0, 'cancelado' => 0];
    foreach ($rows as $r) {
        $totais['valor_total'] += (float)$r['valor_total'];
        $totais[$r['boleto_status']] = ($totais[$r['boleto_status']] ?? 0) + 1;
    }

    echo json_encode(['success' => true, 'data' => $rows, 'totais' => $totais]);
    exit;
}

// ── Cancelar Boleto ───────────────────────────────────────────────────────────
if ($action === 'boleto_cancelar') {
    $id = (int)($_GET['id'] ?? 0);
    $pdo->prepare("UPDATE financeiro SET boleto_status = 'cancelado' WHERE id = ? AND empresa_id = ?")
        ->execute([$id, $empresaId]);
    echo json_encode(['success' => true]);
    exit;
}

// ── Gerar Remessa CNAB 240 ────────────────────────────────────────────────────
if ($action === 'boleto_remessa') {
    $ids = json_decode(file_get_contents('php://input'), true)['ids'] ?? [];
    if (empty($ids)) { echo json_encode(['success' => false, 'message' => 'Nenhum título selecionado']); exit; }

    $cfg = $pdo->prepare("SELECT * FROM empresas_cobranca WHERE empresa_id = ? AND ativo = 1");
    $cfg->execute([$empresaId]);
    $config = $cfg->fetch(PDO::FETCH_ASSOC);
    if (!$config) { echo json_encode(['success' => false, 'message' => 'Configuração de cobrança não encontrada']); exit; }

    $emp = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
    $emp->execute([$empresaId]);
    $empresa = $emp->fetch(PDO::FETCH_ASSOC);

    // Buscar títulos
    $phs  = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT f.*, c.nome as cliente_nome, c.documento as cliente_documento, c.logradouro, c.municipio, c.uf, c.cep FROM financeiro f LEFT JOIN clientes c ON c.id = f.entidade_id WHERE f.id IN ($phs) AND f.empresa_id = ? AND f.boleto_status = 'registrado'");
    $stmt->execute(array_merge(array_map('intval', $ids), [$empresaId]));
    $titulos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($titulos)) { echo json_encode(['success' => false, 'message' => 'Nenhum título válido encontrado']); exit; }

    // Próximo número de remessa
    $numRemessa = (int)$config['ultima_remessa'] + 1;
    $pdo->prepare("UPDATE empresas_cobranca SET ultima_remessa = ? WHERE empresa_id = ?")
        ->execute([$numRemessa, $empresaId]);

    $cnpjEmp    = preg_replace('/\D/', '', $empresa['cnpj'] ?? '');
    $agencia    = str_pad(preg_replace('/\D/', '', $config['agencia']), 5, '0', STR_PAD_LEFT);
    $conta      = str_pad(preg_replace('/\D/', '', $config['conta']), 12, '0', STR_PAD_LEFT);
    $convenio   = str_pad($config['convenio'], 9, '0', STR_PAD_LEFT);
    $nomeEmp    = str_pad(mb_strtoupper(substr($empresa['razao_social'] ?? '', 0, 30)), 30);
    $banco      = str_pad($config['banco_codigo'], 3, '0', STR_PAD_LEFT);
    $dataHoje   = date('dmY');
    $horaAgora  = date('His');
    $numRemPad  = str_pad($numRemessa, 6, '0', STR_PAD_LEFT);
    $totalLotes = 1;
    $totalReg   = count($titulos) + 4; // header + trailer empresa + header lote + trailer lote

    // ── HEADER DE ARQUIVO (Segmento 0) ──
    $cnab  = str_pad($banco, 3);                          // 001-003 Banco
    $cnab .= '0000';                                       // 004-007 Lote
    $cnab .= '0';                                          // 008 Tipo: Header
    $cnab .= str_repeat(' ', 9);                           // 009-017 Brancos
    $cnab .= '1';                                          // 018 Tipo Inscrição: CNPJ
    $cnab .= str_pad($cnpjEmp, 14, '0', STR_PAD_LEFT);   // 019-032 CNPJ
    $cnab .= str_pad($convenio, 20);                       // 033-052 Convênio
    $cnab .= str_pad($agencia, 5, '0', STR_PAD_LEFT);     // 053-057 Agência
    $cnab .= ' ';                                          // 058 Dígito agência
    $cnab .= str_pad($conta, 12, '0', STR_PAD_LEFT);      // 059-070 Conta
    $cnab .= ' ';                                          // 071 Dígito conta
    $cnab .= ' ';                                          // 072 Dígito ag/conta
    $cnab .= str_pad($nomeEmp, 30);                        // 073-102 Nome empresa
    $cnab .= str_pad('SICOOB', 30);                        // 103-132 Nome banco
    $cnab .= str_repeat(' ', 10);                          // 133-142 Brancos
    $cnab .= '1';                                          // 143 Código remessa
    $cnab .= $dataHoje;                                    // 144-151 Data geração
    $cnab .= $horaAgora;                                   // 152-157 Hora geração
    $cnab .= str_pad($numRemPad, 6, '0', STR_PAD_LEFT);   // 158-163 Sequência
    $cnab .= '089';                                        // 164-166 Versão layout
    $cnab .= '01600';                                      // 167-171 Densidade
    $cnab .= str_repeat(' ', 20);                          // 172-191 Brancos
    $cnab .= str_repeat(' ', 20);                          // 192-211 Brancos
    $cnab .= str_repeat(' ', 29);                          // 212-240 Brancos
    $linhas = [substr($cnab, 0, 240)];

    // ── HEADER DE LOTE ──
    $lote  = str_pad($banco, 3);
    $lote .= '0001';
    $lote .= '1';       // Tipo: Header lote
    $lote .= 'R';       // Operação: Remessa
    $lote .= '01';      // Tipo serviço: Cobrança
    $lote .= '  ';
    $lote .= '040';     // Versão lote
    $lote .= ' ';
    $lote .= '1';       // Tipo inscrição CNPJ
    $lote .= str_pad($cnpjEmp, 15, '0', STR_PAD_LEFT);
    $lote .= str_pad($convenio, 20);
    $lote .= str_pad($agencia, 5, '0', STR_PAD_LEFT);
    $lote .= ' ';
    $lote .= str_pad($conta, 12, '0', STR_PAD_LEFT);
    $lote .= ' ';
    $lote .= ' ';
    $lote .= str_pad($nomeEmp, 30);
    $lote .= str_repeat(' ', 40);
    $lote .= str_repeat(' ', 40);
    $lote .= str_repeat(' ', 8);
    $lote .= str_repeat(' ', 3);
    $linhas[] = substr($lote, 0, 240);

    // ── REGISTROS DE DETALHE ──
    $seqReg = 1;
    foreach ($titulos as $t) {
        $cnpjCli  = preg_replace('/\D/', '', $t['cliente_documento'] ?? '');
        $nomeCli  = str_pad(mb_strtoupper(substr($t['cliente_nome'] ?? 'NAO IDENTIFICADO', 0, 30)), 30);
        $nossoN   = str_pad(preg_replace('/\D/', '', $t['boleto_nosso_numero'] ?? ''), 20, '0', STR_PAD_LEFT);
        $vencDt   = date('dmY', strtotime($t['vencimento']));
        $valorCt  = str_pad(number_format($t['valor_total'], 2, '', ''), 15, '0', STR_PAD_LEFT);
        $seqPad   = str_pad($seqReg, 5, '0', STR_PAD_LEFT);

        // Segmento P
        $segP  = str_pad($banco, 3);
        $segP .= '0001';
        $segP .= '3';         // Detalhe
        $segP .= $seqPad;
        $segP .= 'P';         // Segmento P
        $segP .= ' ';
        $segP .= '01';        // Movimento: Inclusão
        $segP .= str_pad($agencia, 5, '0', STR_PAD_LEFT);
        $segP .= ' ';
        $segP .= str_pad($conta, 12, '0', STR_PAD_LEFT);
        $segP .= ' ';
        $segP .= ' ';
        $segP .= str_pad($nossoN, 20, '0', STR_PAD_LEFT);
        $segP .= str_pad($config['carteira_codigo'] ?? '1', 3, '0', STR_PAD_LEFT);
        $segP .= '0';         // Forma cadastramento: sem emissão
        $segP .= '2';         // Distribuição: entregue pelo cedente
        $segP .= ' ';         // Tipo documento
        $segP .= $vencDt;
        $segP .= $valorCt;
        $segP .= '00000';     // Agência cobradora
        $segP .= ' ';
        $segP .= '00';        // Espécie
        $segP .= 'N';         // Aceite
        $segP .= date('dmY', strtotime($t['boleto_registrado_em'] ?? 'now'));
        $segP .= '1';         // Código juros: valor ao dia
        $segP .= date('dmY', strtotime($t['vencimento'] . ' +1 day'));
        $segP .= str_pad(number_format($config['juros_valor'], 2, '', ''), 15, '0', STR_PAD_LEFT);
        $segP .= '1';         // Código desconto
        $segP .= '00000000';
        $segP .= str_repeat('0', 15);
        $segP .= $valorCt;    // Valor abatimento
        $segP .= str_repeat('0', 15);
        $segP .= strlen($cnpjCli) === 11 ? '1' : '2';
        $segP .= str_pad($cnpjCli, 15, '0', STR_PAD_LEFT);
        $segP .= str_pad($nossoN, 15, '0', STR_PAD_LEFT);
        $segP .= str_repeat(' ', 10);
        $segP .= '3';         // Código mora: taxa mensal
        $segP .= date('dmY', strtotime($t['vencimento'] . ' +1 day'));
        $segP .= str_pad(number_format($config['multa_valor'], 2, '', ''), 15, '0', STR_PAD_LEFT);
        $segP .= str_repeat(' ', 10);
        $linhas[] = substr($segP, 0, 240);
        $seqReg++;

        // Segmento Q
        $segQ  = str_pad($banco, 3);
        $segQ .= '0001';
        $segQ .= '3';
        $segQ .= str_pad($seqReg, 5, '0', STR_PAD_LEFT);
        $segQ .= 'Q';
        $segQ .= ' ';
        $segQ .= '01';
        $segQ .= strlen($cnpjCli) === 11 ? '1' : '2';
        $segQ .= str_pad($cnpjCli, 15, '0', STR_PAD_LEFT);
        $segQ .= $nomeCli;
        $segQ .= str_pad(mb_strtoupper(substr($t['logradouro'] ?? '', 0, 40)), 40);
        $segQ .= str_pad('', 15);
        $segQ .= str_pad(preg_replace('/\D/', '', $t['cep'] ?? ''), 8, '0', STR_PAD_LEFT);
        $segQ .= str_pad(mb_strtoupper(substr($t['municipio'] ?? '', 0, 15)), 15);
        $segQ .= str_pad(strtoupper($t['uf'] ?? ''), 2);
        $segQ .= '0';
        $segQ .= str_repeat('0', 15);
        $segQ .= str_pad('', 30);
        $segQ .= str_repeat(' ', 10);
        $linhas[] = substr($segQ, 0, 240);
        $seqReg++;

        // Marcar como em remessa
        $pdo->prepare("UPDATE financeiro SET boleto_remessa_numero = ? WHERE id = ?")
            ->execute([$numRemessa, $t['id']]);
    }

    // ── TRAILER DE LOTE ──
    $tlote  = str_pad($banco, 3);
    $tlote .= '0001';
    $tlote .= '5';
    $tlote .= str_repeat(' ', 9);
    $tlote .= str_pad($seqReg - 1 + 2, 6, '0', STR_PAD_LEFT); // qtd registros lote
    $tlote .= str_pad(count($titulos), 6, '0', STR_PAD_LEFT);
    $tlote .= str_repeat('0', 17);
    $tlote .= str_pad(number_format(array_sum(array_column($titulos, 'valor_total')), 2, '', ''), 18, '0', STR_PAD_LEFT);
    $tlote .= str_repeat(' ', 31);
    $tlote .= str_repeat(' ', 117);
    $linhas[] = substr($tlote, 0, 240);

    // ── TRAILER DE ARQUIVO ──
    $tarq  = str_pad($banco, 3);
    $tarq .= '9999';
    $tarq .= '9';
    $tarq .= str_repeat(' ', 9);
    $tarq .= str_pad($totalLotes, 6, '0', STR_PAD_LEFT);
    $tarq .= str_pad(count($linhas) + 1, 6, '0', STR_PAD_LEFT);
    $tarq .= str_repeat('0', 6);
    $tarq .= str_repeat(' ', 205);
    $linhas[] = substr($tarq, 0, 240);

    $conteudo = implode("\r\n", $linhas) . "\r\n";
    $nomeArq  = 'REMESSA' . str_pad($numRemessa, 6, '0', STR_PAD_LEFT) . '.REM';

    // Salvar remessa
    $pdo->prepare("INSERT INTO cobranca_remessas (empresa_id, banco_codigo, numero_remessa, total_titulos, valor_total, arquivo_nome, arquivo_conteudo, status, usuario_id) VALUES (?,?,?,?,?,?,?,'gerada',?)")
        ->execute([
            $empresaId, $config['banco_codigo'], $numRemessa,
            count($titulos),
            array_sum(array_column($titulos, 'valor_total')),
            $nomeArq, $conteudo, $usuarioId ?? null
        ]);

    echo json_encode([
        'success'    => true,
        'arquivo'    => $nomeArq,
        'conteudo'   => base64_encode($conteudo),
        'remessa_id' => $pdo->lastInsertId(),
        'total'      => count($titulos),
    ]);
    exit;
}

// ── Importar Retorno .RET ─────────────────────────────────────────────────────
if ($action === 'boleto_retorno') {
    $data     = json_decode(file_get_contents('php://input'), true) ?? [];
    $conteudo = base64_decode($data['conteudo'] ?? '');
    $nomeArq  = $data['nome'] ?? 'retorno.ret';

    if (!$conteudo) { echo json_encode(['success' => false, 'message' => 'Arquivo inválido']); exit; }

    $linhas  = explode("\n", str_replace("\r", "", $conteudo));
    $pagos   = 0;
    $erros   = [];
    $valorTotal = 0;

    foreach ($linhas as $linha) {
        if (strlen($linha) < 240) continue;
        $tipoReg  = substr($linha, 7, 1);
        $segmento = substr($linha, 13, 1);

        if ($tipoReg === '3' && $segmento === 'T') {
            $codMovimento = substr($linha, 15, 2);
            // 06 = Liquidação
            if ($codMovimento === '06') {
                $nossoNumero = trim(substr($linha, 55, 20));
                $valorPago   = (float)(substr($linha, 152, 15)) / 100;
                $dataPagto   = substr($linha, 145, 8);
                $dataPagtoFmt = strlen($dataPagto) === 8
                    ? substr($dataPagto, 4, 4) . '-' . substr($dataPagto, 2, 2) . '-' . substr($dataPagto, 0, 2)
                    : date('Y-m-d');

                // Buscar título pelo nosso número
                $stmt = $pdo->prepare("SELECT id FROM financeiro WHERE boleto_nosso_numero = ? AND empresa_id = ? AND boleto_status = 'registrado'");
                $stmt->execute([$nossoNumero, $empresaId]);
                $titulo = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($titulo) {
                    $pdo->prepare("UPDATE financeiro SET boleto_status = 'pago', boleto_pago_em = ?, status = 'Pago', valor_pago = ?, data_baixa = ? WHERE id = ?")
                        ->execute([$dataPagtoFmt, $valorPago, $dataPagtoFmt, $titulo['id']]);
                    $pagos++;
                    $valorTotal += $valorPago;
                }
            }
        }
    }

    // Salvar retorno
    $pdo->prepare("INSERT INTO cobranca_retornos (empresa_id, banco_codigo, arquivo_nome, arquivo_conteudo, total_registros, total_pagos, valor_total_pago, status, processado_em, usuario_id) VALUES (?,?,?,?,?,?,?,'processado',NOW(),?)")
        ->execute([$empresaId, '756', $nomeArq, $conteudo, count($linhas), $pagos, $valorTotal, $usuarioId ?? null]);

    echo json_encode(['success' => true, 'pagos' => $pagos, 'valor_total' => $valorTotal]);
    exit;
}
