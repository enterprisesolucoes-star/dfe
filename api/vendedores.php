<?php
// api/vendedores.php — CRUD de vendedores

$empresaId = (int)($_REQUEST['empresa_id'] ?? 0);
if ($empresaId <= 0) {
    echo json_encode(['success' => false, 'message' => 'empresa_id inválido']);
    exit;
}

if ($action === 'listar_vendedores') {
    $stmt = $pdo->prepare("SELECT id, nome, documento, telefone, email, percentual_comissao, ativo FROM vendedores WHERE empresa_id = ? ORDER BY nome");
    $stmt->execute([$empresaId]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

if ($action === 'salvar_vendedor') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $id    = (int)($data['id'] ?? 0);
    $nome  = trim($data['nome'] ?? '');
    $doc   = trim($data['documento'] ?? '');
    $tel   = trim($data['telefone'] ?? '');
    $email = trim($data['email'] ?? '');
    $perc  = (float)($data['percentual_comissao'] ?? 0);
    $ativo = !empty($data['ativo']) ? 1 : 0;

    if ($nome === '') {
        echo json_encode(['success' => false, 'message' => 'Nome obrigatório']);
        exit;
    }
    if ($perc < 0 || $perc > 100) {
        echo json_encode(['success' => false, 'message' => 'Percentual deve estar entre 0 e 100']);
        exit;
    }

    if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE vendedores SET nome=?, documento=?, telefone=?, email=?, percentual_comissao=?, ativo=? WHERE id=? AND empresa_id=?");
        $stmt->execute([$nome, $doc, $tel, $email, $perc, $ativo, $id, $empresaId]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO vendedores (empresa_id, nome, documento, telefone, email, percentual_comissao, ativo) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$empresaId, $nome, $doc, $tel, $email, $perc, 1]);
        $id = (int)$pdo->lastInsertId();
    }
    echo json_encode(['success' => true, 'id' => $id]);
    exit;
}

if ($action === 'excluir_vendedor') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) { echo json_encode(['success' => false, 'message' => 'ID inválido']); exit; }
    $stmt = $pdo->prepare("DELETE FROM vendedores WHERE id=? AND empresa_id=?");
    $stmt->execute([$id, $empresaId]);
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Ação inválida']);
