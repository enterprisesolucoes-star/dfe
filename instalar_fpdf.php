<?php
// ⚠️ DELETE este arquivo após executar UMA VEZ!
// Acesse: https://esolucoesia.com/dfe/instalar_fpdf.php?run=1

$libDir  = __DIR__ . '/lib';
$fontDir = $libDir . '/font';
$outFile = $libDir . '/fpdf.php';

if (!isset($_GET['run'])) {
    echo '<a href="?run=1" style="font-family:sans-serif;font-size:16px">Clique aqui para instalar o FPDF + fontes</a>';
    exit;
}

foreach ([$libDir, $fontDir] as $dir) {
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        die("Erro: não foi possível criar $dir");
    }
}

$base = 'https://raw.githubusercontent.com/setasign/fpdf/master/';
$ctx  = stream_context_create(['http' => ['timeout' => 30]]);

echo '<pre style="font-family:monospace;font-size:13px">';

// Baixa fpdf.php principal
$data = @file_get_contents($base . 'fpdf.php', false, $ctx);
if (!$data || strlen($data) < 1000) {
    echo "✗ Erro ao baixar fpdf.php\n"; exit;
}
file_put_contents($outFile, $data);
echo "✓ fpdf.php (" . number_format(strlen($data)) . " bytes)\n";

// Fontes necessárias pelos módulos (helvetica=Arial, courier)
$fontes = [
    'helvetica.php', 'helveticab.php', 'helveticai.php', 'helveticabi.php',
    'courier.php',   'courierb.php',   'courieri.php',   'courierbi.php',
    'times.php',     'timesb.php',     'timesi.php',     'timesbi.php',
];

foreach ($fontes as $font) {
    $url  = $base . 'font/' . $font;
    $dest = $fontDir . '/' . $font;
    $fc   = @file_get_contents($url, false, $ctx);
    if ($fc && strlen($fc) > 50) {
        file_put_contents($dest, $fc);
        echo "✓ font/$font\n";
    } else {
        echo "✗ Falha: font/$font\n";
    }
}

// Testa
echo "\nTestando...\n";
define('FPDF_FONTPATH', $fontDir . '/');
require_once $outFile;

if (class_exists('FPDF')) {
    $pdf = new FPDF();
    $pdf->AddPage();
    $pdf->SetFont('Arial','B',12);
    $pdf->Cell(0,10,'Teste OK');
    echo "✓ FPDF " . FPDF::VERSION . " funcionando!\n";
    echo "\n✅ CONCLUÍDO. Delete este arquivo do servidor.\n";
} else {
    echo "✗ Classe FPDF não carregou.\n";
}
echo '</pre>';
