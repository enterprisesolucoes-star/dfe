<?php
require_once __DIR__ . '/config.php';

$emp  = $pdo->query("SELECT uf FROM empresas LIMIT 1")->fetch();
$cnpj = IBPT_CNPJ;
$uf   = strtoupper($emp['uf'] ?? 'GO');

echo "<h2>Diagnóstico IBPT — Parâmetros base</h2>";
echo "CNPJ IBPT: {$cnpj} | UF: {$uf}<br>";
echo "Token: " . substr(IBPT_TOKEN, 0, 10) . "...<br>";

function testar($url, $label) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ]);
    $raw      = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err      = curl_error($ch);
    curl_close($ch);
    $cor = $httpCode === 200 ? 'green' : ($httpCode === 400 ? 'orange' : 'red');
    echo "<hr><b style='color:{$cor}'>[HTTP {$httpCode}] {$label}</b><br>";
    echo "<small>" . htmlspecialchars($url) . "</small><br>";
    if ($err) echo "<b style='color:red'>cURL error: " . htmlspecialchars($err) . "</b><br>";
    echo "<pre>" . htmlspecialchars(substr($raw, 0, 500)) . "</pre>";
    if ($httpCode === 200) {
        $res  = json_decode($raw, true);
        $item = is_array($res) && isset($res[0]) ? $res[0] : $res;
        if (isset($item['Nacional'])) {
            echo "<b style='color:green'>✔ Nacional={$item['Nacional']}% Estadual={$item['Estadual']}%</b><br>";
        }
    }
}

// Teste 1: GTIN real de produto conhecido (Coca-Cola 350ml)
testar(
    "https://apidoni.ibpt.org.br/api/v1/produtos"
    . "?token=" . IBPT_TOKEN
    . "&cnpj={$cnpj}&codigo=22021000&uf={$uf}&ex=0"
    . "&descricao=" . urlencode('Refrigerante')
    . "&unidadeMedida=" . urlencode('UN')
    . "&valor=5.00"
    . "&gtin=7894900011517",
    "NCM 22021000 + GTIN real Coca-Cola (7894900011517)"
);

// Teste 2: NCM de alimento com GTIN real de biscoito
testar(
    "https://apidoni.ibpt.org.br/api/v1/produtos"
    . "?token=" . IBPT_TOKEN
    . "&cnpj={$cnpj}&codigo=19059090&uf={$uf}&ex=0"
    . "&descricao=" . urlencode('Biscoito')
    . "&unidadeMedida=" . urlencode('UN')
    . "&valor=9.50"
    . "&gtin=7896045101630",
    "NCM 19059090 + GTIN real biscoito (7896045101630)"
);

// Teste 3: Sem GTIN (omitir o parâmetro)
testar(
    "https://apidoni.ibpt.org.br/api/v1/produtos"
    . "?token=" . IBPT_TOKEN
    . "&cnpj={$cnpj}&codigo=19059090&uf={$uf}&ex=0"
    . "&descricao=" . urlencode('Biscoito')
    . "&unidadeMedida=" . urlencode('UN')
    . "&valor=9.50",
    "NCM 19059090 SEM parâmetro gtin"
);

// Teste 4: Token diferente (verificar se é problema de token)
echo "<hr><h3>Verificando token</h3>";
echo "Token completo: <code>" . htmlspecialchars(IBPT_TOKEN) . "</code><br>";

// Teste 5: NCM de produto básico (arroz)
testar(
    "https://apidoni.ibpt.org.br/api/v1/produtos"
    . "?token=" . IBPT_TOKEN
    . "&cnpj={$cnpj}&codigo=10063021&uf={$uf}&ex=0"
    . "&descricao=" . urlencode('Arroz')
    . "&unidadeMedida=" . urlencode('KG')
    . "&valor=10.00"
    . "&gtin=7896036090879",
    "NCM 10063021 (arroz) + GTIN real arroz (7896036090879)"
);
