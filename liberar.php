<?php
// esolucoesia.com/dfe/liberar — Painel administrativo de liberação de acesso
session_start();
ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/config.php';

// ── Tabela de admins ──────────────────────────────────────────────────────────
$pdo->exec("CREATE TABLE IF NOT EXISTS dfe_admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(50) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(100) DEFAULT '',
    ativo TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Reset via URL secreta: liberar.php?reset=DFeAdmin2024
// Remove qualquer admin existente e recria com a senha padrão
if (($_GET['reset'] ?? '') === 'DFeAdmin2024') {
    $pdo->exec("DELETE FROM dfe_admins");
    $pdo->prepare("INSERT INTO dfe_admins (login, senha_hash, nome) VALUES (?, ?, ?)")
        ->execute(['admin', password_hash('admin@dfe2024', PASSWORD_DEFAULT), 'Administrador DFe']);
    // Redireciona para limpar o token da URL do histórico
    header('Location: liberar.php?resetado=1'); exit;
}

// Mensagem pós-reset
if (isset($_GET['resetado'])) {
    $msg = 'Senha do admin redefinida. Login: <strong>admin</strong> / Senha: <strong>admin@dfe2024</strong>';
}

// Cria admin padrão se tabela estiver vazia
if ((int)$pdo->query("SELECT COUNT(*) FROM dfe_admins")->fetchColumn() === 0) {
    $pdo->prepare("INSERT INTO dfe_admins (login, senha_hash, nome) VALUES (?, ?, ?)")
        ->execute(['admin', password_hash('admin@dfe2024', PASSWORD_DEFAULT), 'Administrador DFe']);
}

// Garante colunas necessárias em empresas e usuarios
try { $pdo->query("SELECT external_id FROM empresas LIMIT 1"); } catch (PDOException $e) {
    $pdo->exec("ALTER TABLE empresas ADD COLUMN external_id INT DEFAULT NULL, ADD INDEX idx_external_id (external_id)");
}
try { $pdo->query("SELECT empresa_id FROM usuarios LIMIT 1"); } catch (PDOException $e) {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN empresa_id INT DEFAULT NULL, ADD INDEX idx_empresa_id (empresa_id)");
}

$erro = '';
$msg  = '';

// ── Logout ────────────────────────────────────────────────────────────────────
if (isset($_GET['logout'])) {
    unset($_SESSION['dfe_admin']);
    header('Location: liberar.php'); exit;
}

// ── Login ─────────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['_acao']) && $_POST['_acao'] === 'login') {
    $l = trim($_POST['login'] ?? '');
    $s = $_POST['senha'] ?? '';
    $adm = $pdo->prepare("SELECT * FROM dfe_admins WHERE login=? AND ativo=1");
    $adm->execute([$l]);
    $adm = $adm->fetch();
    if ($adm && password_verify($s, $adm['senha_hash'])) {
        $_SESSION['dfe_admin'] = $adm['id'];
    } else {
        $erro = 'Login ou senha inválidos.';
    }
}

// ── Aprovar ───────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['_acao']) && $_POST['_acao'] === 'aprovar' && isset($_SESSION['dfe_admin'])) {
    $pcId      = (int)($_POST['pc_id']      ?? 0);
    $externalId = (int)($_POST['external_id'] ?? 0);
    $perfil    = in_array($_POST['perfil'] ?? 'operador', ['admin','operador']) ? $_POST['perfil'] : 'operador';

    if (!$pcId || !$externalId) {
        $erro = 'Informe o ID da empresa (u537593198_security) e selecione o perfil.';
    } else {
        $pc = $pdo->prepare("SELECT * FROM pre_cadastros WHERE id=? AND status='aguardando'");
        $pc->execute([$pcId]);
        $pc = $pc->fetch();

        if (!$pc) {
            $erro = 'Cadastro não encontrado ou já processado.';
        } else {
            // Verifica/cria empresa com esse external_id
            $emp = $pdo->prepare("SELECT id FROM empresas WHERE external_id=?");
            $emp->execute([$externalId]);
            $emp = $emp->fetch();

            if (!$emp) {
                // Cria registro de empresa pré-preenchido com dados do cadastro
                $pdo->exec("CREATE TABLE IF NOT EXISTS empresas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    razao_social VARCHAR(255) DEFAULT '',
                    cnpj VARCHAR(18) DEFAULT '',
                    ambiente TINYINT DEFAULT 2,
                    uf CHAR(2) DEFAULT 'GO',
                    codigo_municipio VARCHAR(10) DEFAULT '5208707',
                    numero_nfce INT DEFAULT 0,
                    serie_nfce INT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                $cnpjFmt = preg_replace('/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/', '$1.$2.$3/$4-$5', $pc['cnpj']);
                $pdo->prepare("INSERT INTO empresas (razao_social, cnpj, external_id) VALUES (?,?,?)")
                    ->execute([$pc['razao_social'], $cnpjFmt, $externalId]);
                $empresaId = (int)$pdo->lastInsertId();
            } else {
                $empresaId = (int)$emp['id'];
            }

            // Garante tabela usuarios
            $pdo->exec("CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                empresa_id INT DEFAULT NULL,
                nome VARCHAR(100) NOT NULL,
                login VARCHAR(50) NOT NULL UNIQUE,
                senha_hash VARCHAR(255) NOT NULL,
                perfil ENUM('admin','operador') DEFAULT 'operador',
                ativo TINYINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            // Verifica login duplicado
            $dup = $pdo->prepare("SELECT id FROM usuarios WHERE login=?");
            $dup->execute([$pc['login_desejado']]);
            if ($dup->fetch()) {
                $erro = 'Login "' . htmlspecialchars($pc['login_desejado']) . '" já existe em usuários.';
            } else {
                $pdo->prepare("INSERT INTO usuarios (empresa_id, nome, login, senha_hash, perfil, ativo) VALUES (?,?,?,?,?,1)")
                    ->execute([$empresaId, $pc['nome'], $pc['login_desejado'], $pc['senha_hash'], $perfil]);

                $pdo->prepare("UPDATE pre_cadastros SET status='aprovado' WHERE id=?")->execute([$pcId]);
                $msg = "✓ Usuário <strong>" . htmlspecialchars($pc['login_desejado']) . "</strong> criado e vinculado à empresa ID {$empresaId} (external_id: {$externalId}).";
            }
        }
    }
}

// ── Reprovar ──────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['_acao']) && $_POST['_acao'] === 'reprovar' && isset($_SESSION['dfe_admin'])) {
    $pcId = (int)($_POST['pc_id'] ?? 0);
    if ($pcId) {
        $pdo->prepare("UPDATE pre_cadastros SET status='reprovado' WHERE id=?")->execute([$pcId]);
        $msg = 'Cadastro reprovado.';
    }
}

// ── Carregar dados ────────────────────────────────────────────────────────────
$pendentes = [];
$aprovados = [];
if (isset($_SESSION['dfe_admin'])) {
    try {
        $pendentes = $pdo->query("SELECT * FROM pre_cadastros WHERE status='aguardando' ORDER BY created_at DESC")->fetchAll();
        $aprovados = $pdo->query("SELECT p.*, u.empresa_id, e.external_id
            FROM pre_cadastros p
            LEFT JOIN usuarios u ON u.login = p.login_desejado
            LEFT JOIN empresas e ON e.id = u.empresa_id
            WHERE p.status='aprovado' ORDER BY p.created_at DESC LIMIT 20")->fetchAll();
    } catch (PDOException $e) {}
}

function fmtCnpj(string $c): string {
    return preg_replace('/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/', '$1.$2.$3/$4-$5', $c);
}
function fmtDt(string $d): string {
    return date('d/m/Y H:i', strtotime($d));
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DFe IA — Painel de Liberação</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; color: #1e293b; }
    /* Login */
    .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#1e3a5f,#0f2540); }
    .login-card { background: #fff; border-radius: 1rem; padding: 2.5rem 2rem; width: 100%; max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
    .login-card h1 { font-size: 1.4rem; font-weight: 700; text-align: center; color: #1e293b; margin-bottom: 1.75rem; }
    /* Layout */
    .topbar { background: #1e3a5f; color: #fff; padding: .9rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
    .topbar h1 { font-size: 1.1rem; font-weight: 700; }
    .topbar a { color: #93c5fd; font-size: .82rem; text-decoration: none; }
    .topbar a:hover { color: #fff; }
    .container { max-width: 1100px; margin: 2rem auto; padding: 0 1.5rem; }
    /* Inputs */
    label { display: block; font-size: .83rem; font-weight: 500; color: #475569; margin: .9rem 0 .3rem; }
    input, select {
      width: 100%; padding: .6rem .9rem;
      border: 1px solid #cbd5e1; border-radius: .5rem;
      font-size: .9rem; color: #0f172a;
      outline: none; transition: border-color .2s;
    }
    input:focus, select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.15); }
    /* Buttons */
    .btn { display: inline-flex; align-items: center; gap: .4rem; padding: .55rem 1.1rem; border: none; border-radius: .45rem; font-size: .85rem; font-weight: 600; cursor: pointer; transition: background .2s; }
    .btn-primary { background: #2563eb; color: #fff; } .btn-primary:hover { background: #1d4ed8; }
    .btn-success { background: #16a34a; color: #fff; } .btn-success:hover { background: #15803d; }
    .btn-danger  { background: #dc2626; color: #fff; } .btn-danger:hover  { background: #b91c1c; }
    .btn-block   { width: 100%; justify-content: center; margin-top: 1.25rem; padding: .75rem; font-size: .95rem; }
    /* Cards / Sections */
    .section { background: #fff; border-radius: .75rem; border: 1px solid #e2e8f0; margin-bottom: 2rem; overflow: hidden; }
    .section-hd { padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
    .section-hd h2 { font-size: 1rem; font-weight: 700; color: #1e293b; }
    .badge { font-size: .72rem; font-weight: 700; padding: .2rem .55rem; border-radius: 99px; }
    .badge-warn  { background: #fef3c7; color: #92400e; }
    .badge-ok    { background: #dcfce7; color: #166534; }
    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: .85rem; }
    th { background: #f8fafc; padding: .75rem 1rem; text-align: left; font-size: .72rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    td { padding: .75rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }
    .mono { font-family: monospace; font-size: .8rem; }
    /* Alert */
    .alert { padding: .75rem 1.1rem; border-radius: .5rem; font-size: .88rem; margin-bottom: 1.25rem; }
    .alert-erro { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
    .alert-ok   { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
    /* Modal */
    .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 50; align-items: center; justify-content: center; }
    .overlay.open { display: flex; }
    .modal { background: #fff; border-radius: .75rem; width: 100%; max-width: 440px; padding: 2rem; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
    .modal h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: .25rem; }
    .modal p  { font-size: .83rem; color: #64748b; margin-bottom: .5rem; }
    .modal-footer { display: flex; gap: .75rem; margin-top: 1.5rem; }
    .modal-footer .btn { flex: 1; justify-content: center; }
    .empty { text-align: center; padding: 3rem; color: #94a3b8; font-size: .9rem; }
  </style>
</head>
<body>

<?php if (!isset($_SESSION['dfe_admin'])): ?>
<!-- ── TELA DE LOGIN ──────────────────────────────────────────────────────── -->
<div class="login-wrap">
  <div class="login-card">
    <h1>🔐 DFe IA — Painel Admin</h1>
    <?php if ($erro): ?><div class="alert alert-erro"><?= htmlspecialchars($erro) ?></div><?php endif; ?>
    <form method="POST">
      <input type="hidden" name="_acao" value="login">
      <label>Login</label>
      <input type="text" name="login" autofocus required placeholder="login admin">
      <label>Senha</label>
      <input type="password" name="senha" required placeholder="••••••">
      <button type="submit" class="btn btn-primary btn-block">Entrar</button>
    </form>
  </div>
</div>

<?php else: ?>
<!-- ── PAINEL ─────────────────────────────────────────────────────────────── -->
<div class="topbar">
  <h1>🔓 DFe IA — Liberação de Acesso</h1>
  <a href="?logout=1">Sair</a>
</div>

<div class="container">

  <?php if ($msg): ?><div class="alert alert-ok"><?= $msg ?></div><?php endif; ?>
  <?php if ($erro): ?><div class="alert alert-erro"><?= htmlspecialchars($erro) ?></div><?php endif; ?>

  <!-- ── Pendentes ─────────────────────────────────────────────────────────── -->
  <div class="section">
    <div class="section-hd">
      <h2>Solicitações Aguardando Liberação</h2>
      <span class="badge badge-warn"><?= count($pendentes) ?> pendente(s)</span>
    </div>
    <?php if (empty($pendentes)): ?>
      <div class="empty">Nenhuma solicitação pendente.</div>
    <?php else: ?>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Empresa / Responsável</th>
          <th>CNPJ</th>
          <th>Contato</th>
          <th>Usuário</th>
          <th>Data</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($pendentes as $p): ?>
        <tr>
          <td class="mono"><?= $p['id'] ?></td>
          <td>
            <strong><?= htmlspecialchars($p['razao_social']) ?></strong><br>
            <span style="color:#64748b;font-size:.8rem"><?= htmlspecialchars($p['nome']) ?></span>
          </td>
          <td class="mono"><?= fmtCnpj($p['cnpj']) ?></td>
          <td>
            <?= htmlspecialchars($p['email']) ?><br>
            <span style="color:#64748b;font-size:.8rem"><?= htmlspecialchars($p['telefone'] ?: '—') ?></span>
          </td>
          <td class="mono" style="color:#2563eb;font-weight:700"><?= htmlspecialchars($p['login_desejado']) ?></td>
          <td style="font-size:.8rem;color:#64748b;white-space:nowrap"><?= fmtDt($p['created_at']) ?></td>
          <td>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">
              <button class="btn btn-success" onclick="abrirLiberar(<?= $p['id'] ?>, '<?= htmlspecialchars(addslashes($p['razao_social'])) ?>', '<?= htmlspecialchars(addslashes($p['login_desejado'])) ?>')">
                Liberar
              </button>
              <form method="POST" style="display:inline" onsubmit="return confirm('Reprovar este cadastro?')">
                <input type="hidden" name="_acao" value="reprovar">
                <input type="hidden" name="pc_id" value="<?= $p['id'] ?>">
                <button type="submit" class="btn btn-danger">Reprovar</button>
              </form>
            </div>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <?php endif; ?>
  </div>

  <!-- ── Aprovados recentes ──────────────────────────────────────────────── -->
  <div class="section">
    <div class="section-hd">
      <h2>Aprovados Recentes</h2>
      <span class="badge badge-ok"><?= count($aprovados) ?></span>
    </div>
    <?php if (empty($aprovados)): ?>
      <div class="empty">Nenhum cadastro aprovado ainda.</div>
    <?php else: ?>
    <table>
      <thead>
        <tr>
          <th>Empresa</th>
          <th>CNPJ</th>
          <th>Usuário</th>
          <th>Empresa ID (interno)</th>
          <th>External ID</th>
          <th>Data</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($aprovados as $p): ?>
        <tr>
          <td><strong><?= htmlspecialchars($p['razao_social']) ?></strong></td>
          <td class="mono"><?= fmtCnpj($p['cnpj']) ?></td>
          <td class="mono" style="color:#2563eb;font-weight:700"><?= htmlspecialchars($p['login_desejado']) ?></td>
          <td class="mono"><?= $p['empresa_id'] ?? '—' ?></td>
          <td class="mono"><?= $p['external_id'] ?? '—' ?></td>
          <td style="font-size:.8rem;color:#64748b"><?= fmtDt($p['created_at']) ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <?php endif; ?>
  </div>

</div><!-- /container -->

<!-- ── Modal de Liberação ─────────────────────────────────────────────────── -->
<div class="overlay" id="overlay">
  <div class="modal">
    <h3>Liberar Acesso</h3>
    <p id="modal-desc"></p>
    <form method="POST" id="form-liberar">
      <input type="hidden" name="_acao" value="aprovar">
      <input type="hidden" name="pc_id" id="modal-pc-id">

      <label>ID da Empresa (u537593198_security) <span style="color:#ef4444">*</span></label>
      <input type="number" name="external_id" id="modal-ext-id" min="1" required
             placeholder="Ex: 42">
      <p style="font-size:.75rem;color:#94a3b8;margin-top:.3rem">
        Consulte no banco u537593198_security a tabela de empresas e informe o ID correspondente.
      </p>

      <label>Perfil do usuário</label>
      <select name="perfil">
        <option value="operador">Operador</option>
        <option value="admin">Administrador</option>
      </select>

      <div class="modal-footer">
        <button type="button" class="btn btn-danger" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-success">✓ Confirmar Liberação</button>
      </div>
    </form>
  </div>
</div>

<script>
function abrirLiberar(id, empresa, login) {
  document.getElementById('modal-pc-id').value = id;
  document.getElementById('modal-ext-id').value = '';
  document.getElementById('modal-desc').textContent = empresa + ' — usuário: ' + login;
  document.getElementById('overlay').classList.add('open');
  setTimeout(() => document.getElementById('modal-ext-id').focus(), 100);
}
function fecharModal() {
  document.getElementById('overlay').classList.remove('open');
}
document.getElementById('overlay').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});
</script>

<?php endif; ?>
</body>
</html>
