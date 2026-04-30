<?php
/**
 * api/backup_admin.php
 * Módulo de gerenciamento de backups (somente admin do sistema)
 */

date_default_timezone_set('America/Sao_Paulo');

$BACKUP_DIR    = '/var/backups/dfe';
$BACKUP_SCRIPT = '/usr/local/bin/backup-dfe.sh';
$RCLONE_REMOTE = 'gdrive:Backups-DFe';

function isAdminLogado(PDO $pdo): bool {
    $tok = $_GET['adm_token'] ?? $_POST['adm_token'] ?? '';
    if (empty($tok)) return false;
    $stmt = $pdo->prepare("SELECT id FROM dfe_admins WHERE token = ? AND token_exp > NOW() AND ativo = 1");
    $stmt->execute([$tok]);
    return (bool) $stmt->fetch();
}

if (!isAdminLogado($pdo)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acesso negado: apenas administradores']);
    exit;
}

function fmtBytes($b) {
    if ($b >= 1073741824) return number_format($b / 1073741824, 2) . ' GB';
    if ($b >= 1048576)    return number_format($b / 1048576, 2) . ' MB';
    if ($b >= 1024)       return number_format($b / 1024, 2) . ' KB';
    return $b . ' B';
}
function tipoBkp($n) {
    if (strpos($n, 'dfe_db_') === 0)      return 'Banco de Dados';
    if (strpos($n, 'dfe_uploads_') === 0) return 'Uploads';
    return 'Outro';
}
function dataBkp($n) {
    if (preg_match('/_(\d{8})_(\d{6})/', $n, $m)) {
        $d = $m[1]; $t = $m[2];
        return sprintf('%s/%s/%s %s:%s:%s',
            substr($d,6,2), substr($d,4,2), substr($d,0,4),
            substr($t,0,2), substr($t,2,2), substr($t,4,2));
    }
    return '-';
}

if ($action === 'backup_admin_status') {
    $files = is_dir($BACKUP_DIR) ? glob($BACKUP_DIR . '/dfe_db_*.sql.gz') : [];
    usort($files, fn($a, $b) => filemtime($b) - filemtime($a));

    $ultimo = $files ? [
        'nome'        => basename($files[0]),
        'data'        => dataBkp(basename($files[0])),
        'tamanho'     => fmtBytes(filesize($files[0])),
        'idade_horas' => round((time() - filemtime($files[0])) / 3600, 1),
    ] : null;

    $disco_livre = @disk_free_space($BACKUP_DIR) ?: 0;
    $disco_total = @disk_total_space($BACKUP_DIR) ?: 1;
    $disco_uso   = round(100 - ($disco_livre / $disco_total * 100), 1);

    $total_backups = 0;
    foreach (glob($BACKUP_DIR . '/*.gz') ?: [] as $f) $total_backups += filesize($f);

    $rclone_ok = false; $rclone_qtd = 0; $rclone_tam = 0;
    $cmd = "rclone size " . escapeshellarg($RCLONE_REMOTE) . " --json 2>/dev/null";
    $out = @shell_exec($cmd);
    if ($out) {
        $info = json_decode($out, true);
        if ($info) {
            $rclone_ok = true;
            $rclone_qtd = $info['count'] ?? 0;
            $rclone_tam = $info['bytes'] ?? 0;
        }
    }

    echo json_encode([
        'success' => true,
        'ultimo_backup' => $ultimo,
        'disco' => [
            'livre'    => fmtBytes($disco_livre),
            'total'    => fmtBytes($disco_total),
            'uso_pct'  => $disco_uso,
        ],
        'backups_local' => [
            'qtd'     => count(glob($BACKUP_DIR . '/*.gz') ?: []),
            'tamanho' => fmtBytes($total_backups),
        ],
        'nuvem' => [
            'conectado' => $rclone_ok,
            'qtd'       => $rclone_qtd,
            'tamanho'   => fmtBytes($rclone_tam),
        ],
    ]);
    exit;
}

if ($action === 'backup_admin_listar') {
    $local = [];
    if (is_dir($BACKUP_DIR)) {
        $files = glob($BACKUP_DIR . '/*.gz');
        usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
        foreach ($files as $f) {
            $name = basename($f);
            $local[] = [
                'nome'    => $name,
                'tipo'    => tipoBkp($name),
                'data'    => dataBkp($name),
                'tamanho' => fmtBytes(filesize($f)),
                'bytes'   => filesize($f),
            ];
        }
    }

    $nuvem = [];
    $cmd = "rclone lsjson " . escapeshellarg($RCLONE_REMOTE) . " 2>/dev/null";
    $out = @shell_exec($cmd);
    if ($out) {
        $arr = json_decode($out, true) ?? [];
        usort($arr, fn($a, $b) => strcmp($b['ModTime'] ?? '', $a['ModTime'] ?? ''));
        foreach ($arr as $item) {
            if (empty($item['Name']) || ($item['IsDir'] ?? false)) continue;
            $name = $item['Name'];
            $nuvem[] = [
                'nome'    => $name,
                'tipo'    => tipoBkp($name),
                'data'    => dataBkp($name),
                'tamanho' => fmtBytes($item['Size'] ?? 0),
                'bytes'   => $item['Size'] ?? 0,
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'local'   => $local,
        'nuvem'   => $nuvem,
    ]);
    exit;
}

if ($action === 'backup_admin_gerar') {
    @set_time_limit(300);
    $cmd = "sudo " . escapeshellcmd($BACKUP_SCRIPT) . " 2>&1";
    $output = @shell_exec($cmd);
    $sucesso = ($output && strpos($output, 'Backup finalizado') !== false);

    echo json_encode([
        'success' => $sucesso,
        'output'  => $output ?: 'Sem retorno do script',
    ]);
    exit;
}

if ($action === 'backup_admin_download') {
    $nome = $_GET['arquivo'] ?? '';

    if (!preg_match('/^[a-zA-Z0-9_.\-]+\.(sql\.gz|tar\.gz)$/', $nome)) {
        http_response_code(400);
        echo 'Nome de arquivo inválido.';
        exit;
    }

    $path = $BACKUP_DIR . '/' . $nome;
    if (!file_exists($path) || !is_readable($path)) {
        http_response_code(404);
        echo 'Backup não encontrado.';
        exit;
    }

    while (ob_get_level()) ob_end_clean();

    header('Content-Type: application/gzip');
    header('Content-Disposition: attachment; filename="' . $nome . '"');
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: no-cache, no-store, must-revalidate');
    readfile($path);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Action backup_admin inválida']);
