<?php
/**
 * Relatório de Fechamento de Caixa — Impressora Térmica
 * Uso: relatorio_caixa.php?caixaId=X
 */
require_once __DIR__ . '/config.php';

$caixaId = (int)($_GET['caixaId'] ?? 0);
if (!$caixaId) { echo 'caixaId inválido'; exit; }

// Dados do caixa
$cx = $pdo->prepare("SELECT * FROM caixas WHERE id = ?");
$cx->execute([$caixaId]);
$caixa = $cx->fetch();
if (!$caixa) { echo 'Caixa não encontrado'; exit; }

// Empresa
$emp = $pdo->query("SELECT * FROM empresas LIMIT 1")->fetch();

// Vendas do caixa
$stmtV = $pdo->prepare("
    SELECT numero, valor_total, status, data_emissao, chave_acesso
    FROM vendas
    WHERE caixa_id = ?
    ORDER BY data_emissao ASC
");
$stmtV->execute([$caixaId]);
$vendas = $stmtV->fetchAll();

// Pagamentos agrupados por forma
$formaLabel = [
    '01'=>'Dinheiro','02'=>'Cheque','03'=>'Crédito','04'=>'Débito',
    '05'=>'Créd. Loja','10'=>'Vale Alim.','11'=>'Vale Ref.',
    '12'=>'Vale Pres.','13'=>'Vale Comb.','15'=>'Boleto','17'=>'PIX','90'=>'Sem Pgto','99'=>'Outros',
];
$stmtP = $pdo->prepare("
    SELECT vp.forma_pagamento, SUM(vp.valor_pagamento) as total
    FROM vendas_pagamentos vp
    JOIN vendas v ON v.id = vp.venda_id
    WHERE v.caixa_id = ? AND v.status IN ('Autorizada','Contingencia')
    GROUP BY vp.forma_pagamento
    ORDER BY total DESC
");
$stmtP->execute([$caixaId]);
$pagamentos = $stmtP->fetchAll();

// Totais
$totalAutorizadas = array_sum(array_map(
    fn($v) => in_array($v['status'], ['Autorizada','Contingencia']) ? (float)$v['valor_total'] : 0,
    $vendas
));
$qtdAutorizadas = count(array_filter($vendas, fn($v) => in_array($v['status'], ['Autorizada','Contingencia'])));
$qtdCanceladas  = count(array_filter($vendas, fn($v) => $v['status'] === 'Cancelada'));

// Dinheiro recebido (para troco)
$dinheiro = 0;
foreach ($pagamentos as $p) { if ($p['forma_pagamento'] === '01') $dinheiro = (float)$p['total']; }
$trocoFinal = $dinheiro + (float)$caixa['troco_inicial'];

// Formata data BR
$fmtDt = fn($d) => $d ? (new DateTime($d))->format('d/m/Y H:i') : '—';
$fmtVal = fn($v) => 'R$ ' . number_format((float)$v, 2, ',', '.');

// Largura da linha (caracteres) — 32 para 58mm, 48 para 80mm
$W = 40;
$linha = str_repeat('-', $W);
$linha2 = str_repeat('=', $W);
$centro = fn($t) => str_pad('', (int)(($W - strlen($t)) / 2)) . $t;
$direita = fn($l, $r, $sep = ' ') => str_pad($l, $W - strlen($r) - 1) . $sep . $r;
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<title>Relatório de Caixa #<?= $caixaId ?></title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    background: #f0f0f0;
    display: flex;
    justify-content: center;
    padding: 20px;
  }

  .cupom {
    background: white;
    width: 302px; /* ~80mm */
    padding: 12px 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  pre {
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.4;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
  }

  .btn-imprimir {
    display: block;
    margin: 16px auto 0;
    padding: 10px 32px;
    background: #1d4ed8;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
  }
  .btn-imprimir:hover { background: #1e40af; }

  @media screen {
    body { background: #f0f0f0; }
  }

  @media print {
    body { background: white; padding: 0; }
    .cupom { box-shadow: none; width: 100%; padding: 0; }
    .btn-imprimir { display: none; }
    @page { margin: 4mm; size: 80mm auto; }
  }
</style>
</head>
<body>
<div class="cupom">
<pre>
<?php
$nomeEmp = mb_strtoupper($emp['razao_social'] ?? 'EMPRESA');
$cnpjEmp = $emp['cnpj'] ?? '';

echo $centro($nomeEmp) . "\n";
if ($cnpjEmp) echo $centro('CNPJ: ' . $cnpjEmp) . "\n";
echo "\n";
echo $centro('RELATÓRIO DE FECHAMENTO DE CAIXA') . "\n";
echo $linha2 . "\n";

echo $direita('Caixa Nº:', '#' . $caixaId) . "\n";
echo $direita('Operador:', mb_strtoupper($caixa['nome_usuario'] ?? '')) . "\n";
echo $direita('Abertura:', $fmtDt($caixa['data_abertura'])) . "\n";
echo $direita('Fechamento:', $fmtDt($caixa['data_fechamento'])) . "\n";
echo $direita('Troco Inicial:', $fmtVal($caixa['troco_inicial'])) . "\n";
echo $linha . "\n";

// Vendas
echo $centro('VENDAS') . "\n";
echo $linha . "\n";
if (empty($vendas)) {
    echo $centro('Nenhuma venda neste caixa') . "\n";
} else {
    foreach ($vendas as $v) {
        $status = $v['status'] === 'Autorizada' ? 'OK ' : ($v['status'] === 'Contingencia' ? 'CON' : ($v['status'] === 'Cancelada' ? 'CAN' : '?  '));
        $num   = str_pad('#' . $v['numero'], 6);
        $dt    = substr($v['data_emissao'] ?? '', 11, 5);
        $val   = str_pad($fmtVal($v['valor_total']), 10, ' ', STR_PAD_LEFT);
        $esq   = $status . ' ' . $num . ' ' . $dt;
        echo str_pad($esq, $W - strlen($val)) . $val . "\n";
    }
}
echo $linha . "\n";

// Resumo
echo "\n";
echo $centro('RESUMO') . "\n";
echo $linha . "\n";
echo $direita('Vendas autorizadas:', $qtdAutorizadas) . "\n";
if ($qtdCanceladas > 0)
    echo $direita('Vendas canceladas:', $qtdCanceladas) . "\n";
echo $linha . "\n";

// Pagamentos
echo "\n";
echo $centro('FORMAS DE PAGAMENTO') . "\n";
echo $linha . "\n";
if (empty($pagamentos)) {
    echo $centro('Sem pagamentos registrados') . "\n";
} else {
    foreach ($pagamentos as $p) {
        $label = $formaLabel[$p['forma_pagamento']] ?? ('Forma ' . $p['forma_pagamento']);
        echo $direita($label . ':', $fmtVal($p['total'])) . "\n";
    }
}
echo $linha2 . "\n";
echo $direita('TOTAL VENDAS:', $fmtVal($totalAutorizadas)) . "\n";
echo $linha2 . "\n";

// Caixa (dinheiro)
echo "\n";
echo $direita('Troco Inicial:', $fmtVal($caixa['troco_inicial'])) . "\n";
echo $direita('Dinheiro Recebido:', $fmtVal($dinheiro)) . "\n";
echo $direita('Total em Caixa:', $fmtVal($trocoFinal)) . "\n";
echo $linha . "\n";

// Rodapé
echo "\n";
$dtImpressao = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('d/m/Y H:i:s');
echo $centro('Impresso em ' . $dtImpressao) . "\n";
echo $centro('NFC-e Pro') . "\n";
?>
</pre>
</div>
<button class="btn-imprimir" onclick="window.print()">Imprimir</button>
<script>
  if (new URLSearchParams(location.search).get('print') === '1') {
    window.onload = function() { window.print(); };
    window.onafterprint = function() { window.close(); };
  }
</script>
</body>
</html>
