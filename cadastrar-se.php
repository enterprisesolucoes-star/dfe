<?php
// Página pública de cadastro — esolucoesia.com/dfe/cadastrar-se
// Acesso liberado manualmente pelo administrador após aprovação.

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/config.php';

$erro    = '';
$sucesso = false;

// Garante tabela de pré-cadastros com todas as colunas necessárias
$pdo->exec("CREATE TABLE IF NOT EXISTS pre_cadastros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    cnpj VARCHAR(14) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) DEFAULT '',
    login_desejado VARCHAR(50) NOT NULL DEFAULT '',
    senha_hash VARCHAR(255) NOT NULL DEFAULT '',
    status ENUM('aguardando','aprovado','reprovado') DEFAULT 'aguardando',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Migrações de colunas caso tabela já exista sem elas
foreach (['login_desejado VARCHAR(50) NOT NULL DEFAULT \'\'', 'senha_hash VARCHAR(255) NOT NULL DEFAULT \'\''] as $colDef) {
    $col = explode(' ', $colDef)[0];
    try { $pdo->query("SELECT $col FROM pre_cadastros LIMIT 1"); } catch (PDOException $e) {
        $pdo->exec("ALTER TABLE pre_cadastros ADD COLUMN $colDef");
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nome    = trim($_POST['nome']     ?? '');
    $email   = trim($_POST['email']    ?? '');
    $cnpj    = preg_replace('/\D/', '', $_POST['cnpj'] ?? '');
    $razao   = trim($_POST['razao']    ?? '');
    $tel     = trim($_POST['telefone'] ?? '');
    $loginD  = trim($_POST['login_desejado'] ?? '');
    $senha   = $_POST['senha'] ?? '';
    $senha2  = $_POST['senha2'] ?? '';

    // Validações
    if (!$nome || !$email || !$razao || !$loginD || !$senha || !$senha2) {
        $erro = 'Preencha todos os campos obrigatórios.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $erro = 'E-mail inválido.';
    } elseif (strlen($cnpj) < 14) {
        $erro = 'CNPJ inválido. Informe os 14 dígitos.';
    } elseif (!preg_match('/^[a-zA-Z0-9._@-]{3,50}$/', $loginD)) {
        $erro = 'Usuário inválido. Use letras, números, ponto, traço ou @ (3–50 caracteres).';
    } elseif (strtolower($loginD) === strtolower($senha)) {
        $erro = 'O usuário e a senha não podem ser idênticos.';
    } elseif (strlen($senha) < 6) {
        $erro = 'A senha deve ter no mínimo 6 caracteres.';
    } elseif ($senha !== $senha2) {
        $erro = 'As senhas não conferem.';
    } else {
        // Verifica duplicatas em pre_cadastros
        $dup = $pdo->prepare("SELECT id FROM pre_cadastros WHERE cnpj=? OR email=? OR login_desejado=?");
        $dup->execute([$cnpj, $email, $loginD]);
        if ($dup->fetch()) {
            $erro = 'CNPJ, e-mail ou usuário já cadastrado. Aguarde o contato da equipe ou verifique seus dados.';
        } else {
            // Verifica se login já existe em usuarios (tabela do sistema)
            try {
                $dupUsr = $pdo->prepare("SELECT id FROM usuarios WHERE login=?");
                $dupUsr->execute([$loginD]);
                if ($dupUsr->fetch()) {
                    $erro = 'Este nome de usuário já está em uso. Escolha outro.';
                }
            } catch (PDOException $e) { /* tabela ainda não existe, ok */ }
        }

        if (!$erro) {
            $senhaHash = password_hash($senha, PASSWORD_DEFAULT);
            $pdo->prepare("INSERT INTO pre_cadastros (nome, email, cnpj, razao_social, telefone, login_desejado, senha_hash) VALUES (?,?,?,?,?,?,?)")
                ->execute([$nome, $email, $cnpj, $razao, $tel, $loginD, $senhaHash]);

            // Envia e-mail de notificação
            $para      = 'heliomaralves@mns.com';
            $assunto   = '=?UTF-8?B?' . base64_encode('[DFe IA] Novo cadastro aguardando aprovação') . '?=';
            $cnpjFmt   = preg_replace('/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/', '$1.$2.$3/$4-$5', $cnpj);
            $corpo     = "Novo cadastro recebido no DFe IA.\n\n"
                       . "Nome:          $nome\n"
                       . "Razão Social:  $razao\n"
                       . "CNPJ:          $cnpjFmt\n"
                       . "E-mail:        $email\n"
                       . "Telefone:      " . ($tel ?: '—') . "\n"
                       . "Usuário:       $loginD\n"
                       . "Data/Hora:     " . date('d/m/Y H:i:s') . "\n\n"
                       . "Para aprovar, acesse o painel e vincule o empresa_id ao usuário.\n"
                       . "https://esolucoesia.com/dfe/";
            $headers   = "From: noreply@esolucoesia.com\r\n"
                       . "Reply-To: $email\r\n"
                       . "Content-Type: text/plain; charset=UTF-8\r\n"
                       . "X-Mailer: DFe-IA/1.0";
            @mail($para, $assunto, $corpo, $headers);

            $sucesso = true;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitar Acesso — DFe IA</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #1e3a5f 0%, #0f2540 100%);
      padding: 1.5rem 1rem;
    }
    .card {
      background: #fff; border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
      width: 100%; max-width: 460px;
      padding: 2.5rem 2rem;
    }
    .logo { text-align: center; margin-bottom: 1.75rem; }
    .logo svg { width: 46px; height: 46px; color: #2563eb; }
    .logo h1  { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: .4rem; }
    .logo p   { font-size: .82rem; color: #64748b; margin-top: .2rem; }
    .section-title {
      font-size: .7rem; font-weight: 700; letter-spacing: .08em;
      text-transform: uppercase; color: #94a3b8;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: .4rem; margin: 1.4rem 0 .6rem;
    }
    label { display: block; font-size: .83rem; font-weight: 500; color: #374151; margin-bottom: .3rem; margin-top: .9rem; }
    input {
      width: 100%; padding: .62rem .9rem;
      border: 1px solid #d1d5db; border-radius: .5rem;
      font-size: .9rem; color: #111;
      outline: none; transition: border-color .2s, box-shadow .2s;
    }
    input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
    .hint { font-size: .75rem; color: #9ca3af; margin-top: .25rem; }
    .btn {
      display: block; width: 100%;
      margin-top: 1.75rem; padding: .78rem;
      background: #2563eb; color: #fff;
      font-size: .95rem; font-weight: 600;
      border: none; border-radius: .5rem;
      cursor: pointer; transition: background .2s;
    }
    .btn:hover { background: #1d4ed8; }
    .erro {
      background: #fef2f2; border: 1px solid #fca5a5;
      color: #991b1b; padding: .7rem 1rem;
      border-radius: .5rem; font-size: .85rem; margin-top: 1.1rem;
    }
    .sucesso-box { text-align: center; padding: 1rem 0; }
    .sucesso-box .icon { font-size: 3rem; }
    .sucesso-box h2 { font-size: 1.2rem; font-weight: 700; color: #166534; margin: .75rem 0 .5rem; }
    .sucesso-box p  { color: #4b5563; font-size: .88rem; line-height: 1.6; }
    .back { display: block; text-align: center; margin-top: 1.5rem; font-size: .82rem; color: #6b7280; text-decoration: none; }
    .back:hover { color: #2563eb; }
    .req { color: #ef4444; }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
    <h1>DFe IA</h1>
    <p>Solicitar Acesso ao Sistema</p>
  </div>

  <?php if ($sucesso): ?>
    <div class="sucesso-box">
      <div class="icon">&#10003;</div>
      <h2>Cadastro enviado!</h2>
      <p>Recebemos sua solicitação.<br>
         Nossa equipe irá analisar e entrar em contato<br>para liberar seu acesso.</p>
    </div>
    <a href="./index.html" class="back">&#8592; Voltar para o login</a>

  <?php else: ?>
    <form method="POST" novalidate autocomplete="off">

      <div class="section-title">Dados da Empresa</div>

      <label>Razão Social <span class="req">*</span></label>
      <input type="text" name="razao" value="<?= htmlspecialchars($_POST['razao'] ?? '') ?>" placeholder="Nome conforme CNPJ" required>

      <label>CNPJ <span class="req">*</span></label>
      <input type="text" name="cnpj" value="<?= htmlspecialchars($_POST['cnpj'] ?? '') ?>" placeholder="00.000.000/0001-00" maxlength="18" required>

      <div class="section-title">Dados do Responsável</div>

      <label>Nome completo <span class="req">*</span></label>
      <input type="text" name="nome" value="<?= htmlspecialchars($_POST['nome'] ?? '') ?>" placeholder="Seu nome" required>

      <label>E-mail <span class="req">*</span></label>
      <input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" placeholder="contato@empresa.com.br" required>

      <label>Telefone / WhatsApp</label>
      <input type="text" name="telefone" value="<?= htmlspecialchars($_POST['telefone'] ?? '') ?>" placeholder="(00) 00000-0000">

      <div class="section-title">Acesso ao Sistema</div>

      <label>Usuário desejado <span class="req">*</span></label>
      <input type="text" name="login_desejado" value="<?= htmlspecialchars($_POST['login_desejado'] ?? '') ?>"
             placeholder="Ex: joao.silva" autocomplete="off" required>
      <p class="hint">Letras, números, ponto, traço ou @ — 3 a 50 caracteres. Não pode ser igual à senha.</p>

      <label>Senha <span class="req">*</span></label>
      <input type="password" name="senha" placeholder="Mínimo 6 caracteres" autocomplete="new-password" required>

      <label>Confirmar senha <span class="req">*</span></label>
      <input type="password" name="senha2" placeholder="Repita a senha" autocomplete="new-password" required>

      <?php if ($erro): ?>
        <div class="erro"><?= htmlspecialchars($erro) ?></div>
      <?php endif; ?>

      <button type="submit" class="btn">Solicitar Acesso</button>
    </form>
    <a href="./index.html" class="back">&#8592; Já tenho acesso — Entrar</a>
  <?php endif; ?>
</div>
</body>
</html>
