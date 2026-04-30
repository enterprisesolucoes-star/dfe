<?php
/**
 * backup_admin.php — Endpoint de gerenciamento de backups (admin only)
 *
 * Actions:
 *   ?action=listar       → Lista backups locais e nuvem (JSON)
 *   ?action=download&f=  → Faz download de um backup específico
 *   ?action=gerar        → Executa backup-dfe.sh sob demanda (JSON)
 *   ?action=status       → Status geral (último backup, espaço, nuvem) (JSON)
 */

session_start();
date_default_timezone_set('America/Sao_Paulo');

// ── Autenticação ─────────────────────────────────────────────
if (!isset($_SESSION['dfe_admin'])) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Não autorizado']);
    exit;
}

$BACKUP_DIR     = '/var/backups/dfe';
$BACKUP_SCRIPT  = '/usr/local/bin/backup-dfe.sh';
$RCLONE_REMOTE  = 'gdrive:Backups-DFe';
$LOG_FILE       = '/var/log/backup-dfe.log';

$action = $_GET['action'] ?? '';

// ── Helper: formata bytes em KB/MB/GB ───────────────────────
function formatBytes($bytes) {
    if ($bytes >= 1073741824) return number_format($bytes / 1073741824, 2) . ' GB';
    if ($bytes >= 1048576)    return number_format($bytes / 1048576, 2) . ' MB';
    if ($bytes >= 1024)       return number_format($bytes / 1024, 2) . ' KB';
    return $bytes . ' B';
}

// ── Helper: identifica tipo do backup pelo nome ─────────────
function tipoBackup($nome) {
    if (strpos($nome, 'dfe_db_') === 0)       return 'Banco de Dados';
    if (strpos($nome, 'dfe_uploads_') === 0)  return 'Uploads';
    return 'Outro';
}

// ── Helper: extrai data do nome do arquivo ─────────────────
function dataBackup($nome) {
    if (preg_match('/_(\d{8})_(\d{6})/', $nome, $m)) {
        $d = $m[1]; $t = $m[2];
        return sprintf('%s/%s/%s %s:%s:%s',
            substr($d, 6, 2), substr($d, 4, 2), substr($d, 0, 4),
            substr($t, 0, 2), substr($t, 2, 2), substr($t, 4, 2));
    }
    return '-';
}

// ════════════════════════════════════════════════════════════
// ACTION: LISTAR
// ════════════════════════════════════════════════════════════
if ($action === 'listar') {
    header('Content-Type: application/json');

    $local = [];
    if (is_dir($BACKUP_DIR)) {
        $files = glob($BACKUP_DIR . '/*.gz');
        usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
        foreach ($files as $f) {
            $name = basename($f);
            $local[] = [
                'nome'     => $name,
                'tipo'     => tipoBackup($name),
                'data'     => dataBackup($name),
                'tamanho'  => formatBytes(filesize($f)),
                'bytes'    => filesize($f),
                'mtime'    => filemtime($f),
            ];
        }
    }

    // Nuvem (rclone)
    $nuvem = [];
    $cmd = "rclone lsjson " . escapeshellarg($RCLONE_REMOTE) . " 2>/dev/null";
    $out = shell_exec($cmd);
    if ($out) {
        $arr = json_decode($out, true) ?? [];
        usort($arr, fn($a, $b) => strcmp($b['ModTime'] ?? '', $a['ModTime'] ?? ''));
        foreach ($arr as $item) {
            if (empty($item['Name']) || ($item['IsDir'] ?? false)) continue;
            $name = $item['Name'];
            $nuvem[] = [
                'nome'    => $name,
                'tipo'    => tipoBackup($name),
                'data'    => dataBackup($name),
                'tamanho' => formatBytes($item['Size'] ?? 0),
                'bytes'   => $item['Size'] ?? 0,
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'local'   => $local,
        'nuvem'   => $nuvem,
        'total_local'  => count($local),
        'total_nuvem'  => count($nuvem),
    ]);
    exit;
}

// ════════════════════════════════════════════════════════════
// ACTION: DOWNLOAD
// ════════════════════════════════════════════════════════════
if ($action === 'download') {
    $nome = $_GET['f'] ?? '';

    // Validação anti-traversal: só nome de arquivo, sem barras
    if (!preg_match('/^[a-zA-Z0-9_.\-]+\.(sql\.gz|tar\.gz)$/', $nome)) {
        http_response_code(400);
        echo 'Nome de arquivo inválido.';
        exit;
    }

    $path = $BACKUP_DIR . '/' . $nome;
    if (!file_exists($path) || !is_readable($path)) {
        http_response_code(404);
        echo 'Backup não encontrado ou sem permissão.';
        exit;
    }

    header('Content-Type: application/gzip');
    header('Content-Disposition: attachment; filename="' . $nome . '"');
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: no-cache, no-store, must-revalidate');
    readfile($path);
    exit;
}

// ════════════════════════════════════════════════════════════
// ACTION: GERAR (executa o script)
// ════════════════════════════════════════════════════════════
if ($action === 'gerar') {
    header('Content-Type: application/json');

    set_time_limit(300); // 5 minutos
    $cmd = "sudo " . escapeshellcmd($BACKUP_SCRIPT) . " 2>&1";
    $output = shell_exec($cmd);

    $sucesso = ($output && strpos($output, 'Backup finalizado') !== false);

    echo json_encode([
        'success' => $sucesso,
        'output'  => $output ?: 'Sem retorno do script',
    ]);
    exit;
}

// ════════════════════════════════════════════════════════════
// ACTION: STATUS
// ════════════════════════════════════════════════════════════
if ($action === 'status') {
    header('Content-Type: application/json');

    // Último backup do banco
    $files = is_dir($BACKUP_DIR) ? glob($BACKUP_DIR . '/dfe_db_*.sql.gz') : [];
    usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
    $ultimo = $files ? [
        'nome'    => basename($files[0]),
        'data'    => dataBackup(basename($files[0])),
        'tamanho' => formatBytes(filesize($files[0])),
        'idade_horas' => round((time() - filemtime($files[0])) / 3600, 1),
    ] : null;

    // Espaço em disco
    $disco_livre = disk_free_space($BACKUP_DIR);
    $disco_total = disk_total_space($BACKUP_DIR);
    $disco_uso   = $disco_total ? round(100 - ($disco_livre / $disco_total * 100), 1) : 0;

    // Total ocupado pelos backups
    $total_backups = 0;
    foreach (glob($BACKUP_DIR . '/*.gz') ?: [] as $f) {
        $total_backups += filesize($f);
    }

    // Status do rclone (Google Drive)
    $rclone_ok = false;
    $rclone_qtd = 0;
    $rclone_tam = 0;
    $cmd = "rclone size " . escapeshellarg($RCLONE_REMOTE) . " --json 2>/dev/null";
    $out = shell_exec($cmd);
    if ($out) {
        $info = json_decode($out, true);
        if ($info) {
            $rclone_ok  = true;
            $rclone_qtd = $info['count'] ?? 0;
            $rclone_tam = $info['bytes'] ?? 0;
        }
    }

    echo json_encode([
        'success' => true,
        'ultimo_backup'      => $ultimo,
        'disco' => [
            'livre'    => formatBytes($disco_livre),
            'total'    => formatBytes($disco_total),
            'uso_pct'  => $disco_uso,
        ],
        'backups_local' => [
            'qtd'     => count(glob($BACKUP_DIR . '/*.gz') ?: []),
            'tamanho' => formatBytes($total_backups),
        ],
        'nuvem' => [
            'conectado' => $rclone_ok,
            'qtd'       => $rclone_qtd,
            'tamanho'   => formatBytes($rclone_tam),
        ],
    ]);
    exit;
}

// ── Action inválida ──────────────────────────────────────────
http_response_code(400);
header('Content-Type: application/json');
echo json_encode(['error' => 'Action inválida. Use: listar, download, gerar, status']);
