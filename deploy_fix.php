<?php
// SIA NFC-e - Script de Diagnóstico Sênior v1.6
header('Content-Type: text/plain');

echo "--- DIAGNÓSTICO DE AMBIENTE ---\n";
echo "Data/Hora: " . date('Y-m-d H:i:s') . "\n";
echo "Diretório Atual: " . __DIR__ . "\n";
echo "URI: " . $_SERVER['REQUEST_URI'] . "\n";
echo "PHP Version: " . phpversion() . "\n\n";

echo "--- LISTA DE ARQUIVOS NO DIRETÓRIO ---\n";
$files = scandir(__DIR__);
foreach ($files as $file) {
    if ($file != "." && $file != "..") {
        $size = filesize(__DIR__ . "/" . $file);
        $mtime = date("Y-m-d H:i:s", filemtime(__DIR__ . "/" . $file));
        echo sprintf("[%s] %-25s %10d bytes\n", $mtime, $file, $size);
    }
}

echo "--- LISTA DE ASSETS ---/n";
if (is_dir('assets')) {
    $assets = scandir('assets');
    foreach ($assets as $asset) {
        if ($asset != "." && $asset != "..") {
            echo sprintf("%-30s %10d bytes\n", $asset, filesize('assets/'.$asset));
        }
    }
} else {
    echo "PASTA ASSETS NÃO EXISTE!\n";
}

echo "\n--- CONTEÚDO DO .HTACCESS ATUAL ---\n";
if (file_exists('.htaccess')) {
    echo file_get_contents('.htaccess');
} else {
    echo "FALTANDO!\n";
}

echo "\n--- LIMPANDO ARQUIVOS OBSOLETOS ---\n";
if (file_exists('index.html')) {
    if (unlink('index.html')) echo "index.html DELETADO com sucesso.\n";
    else echo "ERRO ao deletar index.html.\n";
}
if (file_exists('pdv.php')) {
    if (unlink('pdv.php')) echo "pdv.php DELETADO com sucesso.\n";
    else echo "ERRO ao deletar pdv.php.\n";
}

echo "\n--- TENTANDO FORÇAR OVERWRITE DO INDEX.PHP ---\n";
$indexContent = '<?php // SIA NFC-e v1.6 FORCE ?>
<!doctype html><html><head><meta charset="UTF-8"><title>SIA v1.6 FORCE</title>
<script type="module" src="assets/index-BLb8q1qG.js?v=' . time() . '"></script>
<link rel="stylesheet" href="assets/index-CNR-9IHu.css?v=' . time() . '">
<style>body { background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }</style>
</head><body><div id="root_v17">Carregando v1.9... (Auto-Montagem Ativa)</div></body></html>';

if (file_put_contents('index.php', $indexContent)) {
    echo "index.php sobrescrito com SUCESSO via script.\n";
} else {
    echo "ERRO ao sobrescrever index.php. Problema de permissão no Hostinger?\n";
}
