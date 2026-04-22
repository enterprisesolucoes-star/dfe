<?php
/**
 * Importação da Tabela IBPT (Lei 12.741/2012)
 *
 * COMO OBTER O CSV:
 * 1. Acesse https://www.ibpt.org.br/tabela-de-aliquotas/
 * 2. Baixe o arquivo ZIP da UF desejada (ex: "Tabela GO")
 * 3. Extraia o CSV e faça upload abaixo
 *
 * O CSV usa separador ";" e tem o cabeçalho:
 * Codigo;Ex;Tabela;Descricao;Aliquota Nacional;Aliquota Importados;
 * Aliquota Estadual;Aliquota Municipal;Vigencia Inicio;Vigencia Fim;
 * Chave;Versao;Fonte
 *
 * Para importar TODAS as UFs, repita o processo com cada arquivo.
 */
require_once __DIR__ . '/config.php';

// Cria a tabela se não existir
$pdo->exec("
    CREATE TABLE IF NOT EXISTS ibpt_ncm (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        codigo           VARCHAR(10)    NOT NULL,
        ex               VARCHAR(5)     NOT NULL DEFAULT '0',
        tabela           CHAR(2)        NOT NULL,
        descricao        VARCHAR(300)   DEFAULT '',
        aliquota_nacional   DECIMAL(8,4) DEFAULT 0,
        aliquota_importados DECIMAL(8,4) DEFAULT 0,
        aliquota_estadual   DECIMAL(8,4) DEFAULT 0,
        aliquota_municipal  DECIMAL(8,4) DEFAULT 0,
        vigencia_inicio  DATE,
        vigencia_fim     DATE,
        chave            VARCHAR(100)   DEFAULT '',
        versao           VARCHAR(20)    DEFAULT '',
        fonte            VARCHAR(100)   DEFAULT '',
        uf               CHAR(2)        NOT NULL,
        INDEX idx_ncm_uf  (codigo, uf),
        INDEX idx_codigo  (codigo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$msg    = '';
$erro   = '';
$linhas = 0;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['csv'])) {
    $uf = strtoupper(trim($_POST['uf'] ?? ''));
    if (strlen($uf) !== 2) {
        $erro = 'Informe a UF (2 letras).';
    } elseif ($_FILES['csv']['error'] !== UPLOAD_ERR_OK) {
        $erro = 'Erro no upload do arquivo.';
    } else {
        $path = $_FILES['csv']['tmp_name'];
        $handle = fopen($path, 'r');

        // Detecta e remove BOM UTF-8 se existir
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") rewind($handle);

        // Pula cabeçalho
        $cabecalho = fgetcsv($handle, 2000, ';');

        // Remove registros existentes para esta UF (evita duplicatas)
        $pdo->prepare("DELETE FROM ibpt_ncm WHERE uf = ?")->execute([$uf]);

        $stmt = $pdo->prepare("
            INSERT INTO ibpt_ncm
                (codigo, ex, tabela, descricao, aliquota_nacional, aliquota_importados,
                 aliquota_estadual, aliquota_municipal, vigencia_inicio, vigencia_fim,
                 chave, versao, fonte, uf)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");

        $pdo->beginTransaction();
        try {
            while (($col = fgetcsv($handle, 2000, ';')) !== false) {
                if (count($col) < 10) continue;
                // Normaliza decimais: substitui vírgula por ponto
                $toFloat = fn($v) => (float)str_replace(',', '.', trim($v ?? '0'));
                // Datas: dd/mm/yyyy → yyyy-mm-dd
                $toDate = function($v) {
                    $v = trim($v ?? '');
                    if (preg_match('#(\d{2})/(\d{2})/(\d{4})#', $v, $m)) return "{$m[3]}-{$m[2]}-{$m[1]}";
                    return null;
                };
                $stmt->execute([
                    preg_replace('/[^0-9]/', '', $col[0]),  // codigo
                    trim($col[1] ?? '0'),                    // ex
                    strtoupper(trim($col[2] ?? 'II')),       // tabela
                    mb_substr(trim($col[3] ?? ''), 0, 300),  // descricao
                    $toFloat($col[4]),                        // aliquota_nacional
                    $toFloat($col[5]),                        // aliquota_importados
                    $toFloat($col[6]),                        // aliquota_estadual
                    $toFloat($col[7]),                        // aliquota_municipal
                    $toDate($col[8]),                         // vigencia_inicio
                    $toDate($col[9]),                         // vigencia_fim
                    trim($col[10] ?? ''),                     // chave
                    trim($col[11] ?? ''),                     // versao
                    trim($col[12] ?? ''),                     // fonte
                    $uf,
                ]);
                $linhas++;
            }
            $pdo->commit();
            $msg = "✔ {$linhas} registros importados para UF {$uf} com sucesso!";
        } catch (Exception $e) {
            $pdo->rollBack();
            $erro = 'Erro ao importar: ' . $e->getMessage();
        }
        fclose($handle);
    }
}

// Exibe contagem atual por UF
$stats = $pdo->query("SELECT uf, COUNT(*) as total FROM ibpt_ncm GROUP BY uf ORDER BY uf")->fetchAll();
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Importar Tabela IBPT</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; }
        h2   { color: #333; }
        .ok  { background: #d4edda; border: 1px solid #28a745; padding: 10px; border-radius: 4px; color: #155724; }
        .err { background: #f8d7da; border: 1px solid #dc3545; padding: 10px; border-radius: 4px; color: #721c24; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f0f0f0; }
        input[type=file], select, input[type=text] { margin: 6px 0; padding: 6px; width: 100%; box-sizing: border-box; }
        button { background: #007bff; color: white; border: none; padding: 10px 24px; font-size: 16px; border-radius: 4px; cursor: pointer; margin-top: 10px; }
        button:hover { background: #0056b3; }
        .instrucoes { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; margin-bottom: 20px; font-size: 14px; }
    </style>
</head>
<body>
<h2>Importar Tabela IBPT — Lei 12.741/2012</h2>

<div class="instrucoes">
    <b>Como obter o CSV:</b><br>
    1. Acesse <a href="https://www.ibpt.org.br/tabela-de-aliquotas/" target="_blank">ibpt.org.br/tabela-de-aliquotas</a><br>
    2. Baixe o arquivo da sua UF (ex: <b>Tabela GO</b>) — formato ZIP<br>
    3. Extraia o arquivo <code>.csv</code> do ZIP<br>
    4. Selecione a UF, escolha o arquivo e clique em Importar
</div>

<?php if ($msg): ?><div class="ok"><?= htmlspecialchars($msg) ?></div><br><?php endif; ?>
<?php if ($erro): ?><div class="err"><?= htmlspecialchars($erro) ?></div><br><?php endif; ?>

<form method="post" enctype="multipart/form-data">
    <label><b>UF:</b></label>
    <input type="text" name="uf" maxlength="2" placeholder="GO" style="width:60px" required>
    <br>
    <label><b>Arquivo CSV da tabela IBPT:</b></label>
    <input type="file" name="csv" accept=".csv,.txt" required>
    <button type="submit">Importar</button>
</form>

<?php if ($stats): ?>
<h3>Registros importados por UF</h3>
<table>
    <tr><th>UF</th><th>Registros</th><th>Ação</th></tr>
    <?php foreach ($stats as $s): ?>
    <tr>
        <td><?= htmlspecialchars($s['uf']) ?></td>
        <td><?= number_format($s['total'], 0, ',', '.') ?></td>
        <td><a href="?limpar=<?= urlencode($s['uf']) ?>" onclick="return confirm('Remover UF <?= $s['uf'] ?>?')">Remover</a></td>
    </tr>
    <?php endforeach; ?>
</table>
<?php else: ?>
<p><i>Nenhuma tabela importada ainda.</i></p>
<?php endif; ?>

</body>
</html>
<?php
// Limpar UF específica
if (isset($_GET['limpar'])) {
    $ufDel = strtoupper(trim($_GET['limpar']));
    if (preg_match('/^[A-Z]{2}$/', $ufDel)) {
        $pdo->prepare("DELETE FROM ibpt_ncm WHERE uf = ?")->execute([$ufDel]);
        header("Location: importar_ibpt.php");
        exit;
    }
}
