<?php
require_once __DIR__ . '/config.php';
$stmt = $pdo->query("SELECT logo_path FROM empresas ORDER BY id LIMIT 1");
$row = $stmt->fetch();
if (!$row || empty($row['logo_path'])) { http_response_code(404); exit; }
$file = __DIR__ . '/' . ltrim($row['logo_path'], '/');
if (!file_exists($file)) { http_response_code(404); exit; }
$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
$mime = $ext === 'png' ? 'image/png' : 'image/jpeg';
header('Content-Type: ' . $mime);
header('Cache-Control: max-age=86400');
readfile($file);
