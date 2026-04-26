<?php
session_start();
require_once __DIR__ . '/config.php';

// ─── Autenticação ────────────────────────────────────────────────────────────
if (isset($_POST['action']) && $_POST['action'] === 'login') {
    $login = trim($_POST['login'] ?? '');
    $senha = trim($_POST['senha'] ?? '');
    $stmt = $pdo->prepare("SELECT * FROM dfe_admins WHERE login = ? AND ativo = 1");
    $stmt->execute([$login]);
    $admin = $stmt->fetch();
    if ($admin && password_verify($senha, $admin['senha_hash'])) {
        $_SESSION['dfe_admin'] = $admin['id'];
        $_SESSION['dfe_admin_nome'] = $admin['nome'];
        header('Location: admin.php');
        exit;
    }
    $erro_login = 'Usuário ou senha inválidos.';
}

if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: admin.php');
    exit;
}

$logado = isset($_SESSION['dfe_admin']);

// ─── API JSON ────────────────────────────────────────────────────────────────
if ($logado && isset($_GET['api'])) {
    header('Content-Type: application/json');
    $api = $_GET['api'];

    if ($api === 'listar_empresas') {
        $stmt = $pdo->query("SELECT id, razao_social, cnpj, nome_fantasia, status, usuario_dfe, uf, municipio, email, telefone, ambiente, created_at FROM empresas ORDER BY razao_social");
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($api === 'get_empresa') {
        $id = (int)$_GET['id'];
        $stmt = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
        $stmt->execute([$id]);
        $emp = $stmt->fetch();
        // SmartPos
        $stmt2 = $pdo->prepare("SELECT * FROM smartpos WHERE empresa_id = ?");
        $stmt2->execute([$id]);
        $emp['smartpos'] = $stmt2->fetchAll();
        echo json_encode($emp);
        exit;
    }

    if ($api === 'salvar_empresa' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $d = json_decode(file_get_contents('php://input'), true);
        $id = (int)($d['id'] ?? 0);
        $campos = ['razao_social','nome_fantasia','cnpj','inscricao_estadual','uf','municipio','cep',
                   'logradouro','numero','bairro','telefone','email','status','usuario_dfe',
                   'ambiente','crt','tem_tef'];
        if ($id > 0) {
            $sets = implode(', ', array_map(fn($c) => "$c = ?", $campos));
            $vals = array_map(fn($c) => $d[$c] ?? null, $campos);
            $vals[] = $id;
            $pdo->prepare("UPDATE empresas SET $sets WHERE id = ?")->execute($vals);
            echo json_encode(['success' => true]);
        } else {
            $cols = implode(', ', $campos);
            $phs  = implode(', ', array_fill(0, count($campos), '?'));
            $vals = array_map(fn($c) => $d[$c] ?? null, $campos);
            $pdo->prepare("INSERT INTO empresas ($cols) VALUES ($phs)")->execute($vals);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        }
        exit;
    }

    if ($api === 'excluir_empresa' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $d = json_decode(file_get_contents('php://input'), true);
        $pdo->prepare("DELETE FROM empresas WHERE id = ?")->execute([(int)$d['id']]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($api === 'bloquear_empresa' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $d = json_decode(file_get_contents('php://input'), true);
        $pdo->prepare("UPDATE empresas SET status = ? WHERE id = ?")->execute([$d['status'], (int)$d['id']]);
    } elseif ($action === 'manutencao_global') {
        $d = json_decode(file_get_contents('php://input'), true);
        $ativar = $d['ativar'] ?? true;
        if ($ativar) {
            // Salva quais estavam Ativo antes de mudar
            $pdo->exec("UPDATE empresas SET status = 'Manutenção' WHERE status = 'Ativo'");
        } else {
            $pdo->exec("UPDATE empresas SET status = 'Ativo' WHERE status = 'Manutenção'");
        }
        echo json_encode(['success' => true]);
        exit;
        echo json_encode(['success' => true]);
        exit;
    }

    if ($api === 'listar_smartpos') {
        $id = (int)$_GET['empresa_id'];
        $stmt = $pdo->prepare("SELECT * FROM smartpos WHERE empresa_id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($api === 'salvar_smartpos' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $d = json_decode(file_get_contents('php://input'), true);
        $id = (int)($d['id'] ?? 0);
        if ($id > 0) {
            $pdo->prepare("UPDATE smartpos SET codigo=?, integradora=?, numero_serie=?, apelido=? WHERE id=?")
                ->execute([$d['codigo'], $d['integradora'], $d['numero_serie'], $d['apelido'], $id]);
        } else {
            $pdo->prepare("INSERT INTO smartpos (empresa_id, codigo, integradora, numero_serie, apelido) VALUES (?,?,?,?,?)")
                ->execute([(int)$d['empresa_id'], $d['codigo'], $d['integradora'], $d['numero_serie'], $d['apelido']]);
        }
        echo json_encode(['success' => true]);
        exit;
    }

    if ($api === 'excluir_smartpos' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $d = json_decode(file_get_contents('php://input'), true);
        $pdo->prepare("DELETE FROM smartpos WHERE id = ?")->execute([(int)$d['id']]);
        echo json_encode(['success' => true]);
        exit;
    }

    echo json_encode(['error' => 'API não encontrada']);
    exit;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DFe IA — Admin</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { font-family: 'Inter', sans-serif; }
  .modal-bg { background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
</style>
</head>
<body class="bg-gray-50 min-h-screen">

<?php if (!$logado): ?>
<!-- ─── TELA DE LOGIN ─────────────────────────────────────────────────────── -->
<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700 p-4">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-800">DFe IA</h1>
      <p class="text-sm text-gray-500 mt-1">Painel Administrativo</p>
      <div class="flex gap-2 mt-3">
        <button onclick="manutencaoGlobal(true)" class="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          Ativar Manutenção Global
        </button>
        <button onclick="manutencaoGlobal(false)" class="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          Reativar Todos
        </button>
      </div>
    </div>
    <?php if (!empty($erro_login)): ?>
    <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4"><?= htmlspecialchars($erro_login) ?></div>
    <?php endif; ?>
    <form method="POST">
      <input type="hidden" name="action" value="login">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
          <input type="text" name="login" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="admin">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <input type="password" name="senha" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="••••••">
        </div>
        <button type="submit" class="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">Entrar</button>
      </div>
    </form>
    <p class="text-center text-xs mt-6 text-gray-400">Enterprise Soluções</p>
  </div>
</div>

<?php else: ?>
<!-- ─── PAINEL ADMIN ──────────────────────────────────────────────────────── -->
<div id="app">
  <!-- Header -->
  <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      </div>
      <div>
        <h1 class="font-bold text-gray-800 text-sm">DFe IA — Admin</h1>
        <p class="text-xs text-gray-400">Olá, <?= htmlspecialchars($_SESSION['dfe_admin_nome']) ?></p>
      </div>
    </div>
    <a href="?logout=1" class="text-xs text-gray-500 hover:text-red-600 font-medium flex items-center gap-1 transition-colors">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
      Sair
    </a>
  </header>

  <main class="max-w-7xl mx-auto px-6 py-8">
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-bold text-gray-800">Empresas Cadastradas</h2>
      <div class="flex items-center gap-3">
        <input type="text" id="busca" placeholder="Buscar empresa..." oninput="filtrar()" class="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 w-64">
        <button onclick="abrirModal(null)" class="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nova Empresa
        </button>
      </div>
    </div>

    <!-- Tabela -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th class="px-6 py-4 font-bold">Empresa</th>
            <th class="px-6 py-4 font-bold">CNPJ</th>
            <th class="px-6 py-4 font-bold">UF</th>
            <th class="px-6 py-4 font-bold">Recurso DFe</th>
            <th class="px-6 py-4 font-bold">Ambiente</th>
            <th class="px-6 py-4 font-bold">Status</th>
            <th class="px-6 py-4 font-bold text-center">Ações</th>
          </tr>
        </thead>
        <tbody id="tabelaEmpresas" class="divide-y divide-gray-100">
          <tr><td colspan="7" class="px-6 py-8 text-center text-gray-400 text-xs">Carregando...</td></tr>
        </tbody>
      </table>
    </div>
  </main>
</div>

<!-- ─── MODAL EMPRESA ────────────────────────────────────────────────────── -->
<div id="modalEmpresa" class="hidden fixed inset-0 modal-bg flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
    <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
      <h3 id="modalTitulo" class="font-bold text-gray-800">Nova Empresa</h3>
      <button onclick="fecharModal()" class="p-2 hover:bg-gray-200 rounded-lg transition-colors">
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-100">
      <button onclick="setTab('dados')" id="tab-dados" class="px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-blue-600 text-blue-600">Dados</button>
      <button onclick="setTab('dfe')" id="tab-dfe" class="px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-400 hover:text-gray-600">DFe / Recursos</button>
      <button onclick="setTab('smartpos')" id="tab-smartpos" class="px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent text-gray-400 hover:text-gray-600">SmartPOS / TEF</button>
    </div>

    <div class="flex-1 overflow-y-auto p-6">
      <!-- Tab Dados -->
      <div id="panel-dados" class="space-y-4">
        <input type="hidden" id="f-id">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2"><label class="label">Razão Social</label><input id="f-razao_social" class="input" type="text"></div>
          <div><label class="label">Nome Fantasia</label><input id="f-nome_fantasia" class="input" type="text"></div>
          <div><label class="label">CNPJ</label><input id="f-cnpj" class="input" type="text" maxlength="18"></div>
          <div><label class="label">Inscrição Estadual</label><input id="f-inscricao_estadual" class="input" type="text"></div>
          <div><label class="label">UF</label>
            <select id="f-uf" class="input">
              <?php foreach(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as $uf): ?>
              <option value="<?=$uf?>"><?=$uf?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div><label class="label">Município</label><input id="f-municipio" class="input" type="text"></div>
          <div><label class="label">CEP</label><input id="f-cep" class="input" type="text"></div>
          <div><label class="label">Logradouro</label><input id="f-logradouro" class="input" type="text"></div>
          <div><label class="label">Número</label><input id="f-numero" class="input" type="text"></div>
          <div><label class="label">Bairro</label><input id="f-bairro" class="input" type="text"></div>
          <div><label class="label">Telefone</label><input id="f-telefone" class="input" type="text"></div>
          <div><label class="label">E-mail</label><input id="f-email" class="input" type="email"></div>
        </div>
      </div>

      <!-- Tab DFe -->
      <div id="panel-dfe" class="hidden space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div><label class="label">Recurso DFe</label>
            <select id="f-usuario_dfe" class="input">
              <option value="0">S/ Recurso Fiscal</option>
              <option value="1">NFe</option>
              <option value="2">NFe + NFCe</option>
              <option value="3">PDV Offline</option>
              <option value="4">DFe BLOQUEADO</option>
            </select>
          </div>
          <div><label class="label">Ambiente NFCe</label>
            <select id="f-ambiente" class="input">
              <option value="2">Homologação</option>
              <option value="1">Produção</option>
            </select>
          </div>
          <div><label class="label">CRT</label>
            <select id="f-crt" class="input">
              <option value="1">1 – Simples Nacional</option>
              <option value="2">2 – Simples Nacional – Excesso</option>
              <option value="3">3 – Regime Normal</option>
            </select>
          </div>
          <div><label class="label">Status</label>
            <select id="f-status" class="input">
              <option value="Ativo">Ativo</option>
              <option value="Bloqueado">Bloqueado (Inadimplente)</option>
              <option value="Suspenso">Suspenso</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tab SmartPOS -->
      <div id="panel-smartpos" class="hidden space-y-6">
        <div class="border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 class="text-xs font-bold text-gray-500 uppercase">Integração TEF</h4>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="f-tem_tef" class="w-4 h-4 rounded text-blue-600">
            <span class="text-sm font-medium text-gray-700">Empresa utiliza TEF (SmartPOS)</span>
          </label>
        </div>

        <div>
          <h4 class="text-xs font-bold text-gray-500 uppercase mb-3">Máquinas SmartPOS</h4>
          <div class="grid grid-cols-4 gap-3 mb-3">
            <input id="sp-codigo" placeholder="ID *" class="input text-xs">
            <input id="sp-numero_serie" placeholder="Nº Série *" class="input text-xs">
            <input id="sp-integradora" placeholder="Integradora *" class="input text-xs">
            <input id="sp-apelido" placeholder="Apelido *" class="input text-xs">
          </div>
          <button onclick="adicionarSmartPos()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">+ Adicionar Máquina</button>
          <div class="mt-4 overflow-hidden rounded-xl border border-gray-100">
            <table class="w-full text-xs text-left">
              <thead class="bg-gray-50 text-gray-500">
                <tr>
                  <th class="px-4 py-3 font-bold uppercase">ID</th>
                  <th class="px-4 py-3 font-bold uppercase">Nº Série</th>
                  <th class="px-4 py-3 font-bold uppercase">Integradora</th>
                  <th class="px-4 py-3 font-bold uppercase">Apelido</th>
                  <th class="px-4 py-3 font-bold uppercase text-center">Ações</th>
                </tr>
              </thead>
              <tbody id="tabelaSmartPos" class="divide-y divide-gray-100">
                <tr><td colspan="5" class="px-4 py-4 text-center text-gray-400">Nenhuma máquina cadastrada.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
      <button onclick="fecharModal()" class="px-6 py-2.5 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
      <button onclick="salvarEmpresa()" class="px-8 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">Salvar</button>
    </div>
  </div>
</div>

<style>
.label { display: block; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px; }
.input { width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px 12px; font-size: 14px; outline: none; }
.input:focus { ring: 2px solid #3b82f6; border-color: #3b82f6; }
</style>

<script>
let empresas = [];
let empresaAtual = null;
let smartPosList = [];

const RECURSOS = {0:'S/ Recurso',1:'NFe',2:'NFe+NFCe',3:'PDV Offline',4:'BLOQUEADO'};

async function api(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('admin.php?api=' + endpoint, opts);
  return res.json();
}

async function carregarEmpresas() {
  empresas = await api('listar_empresas');
  renderTabela(empresas);
}

function renderTabela(lista) {
  const tbody = document.getElementById('tabelaEmpresas');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-400 text-xs">Nenhuma empresa encontrada.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(e => `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4">
        <p class="font-bold text-gray-800 text-xs">${e.razao_social || '-'}</p>
        <p class="text-gray-400 text-[10px]">${e.nome_fantasia || ''}</p>
      </td>
      <td class="px-6 py-4 text-xs text-gray-600">${formatCNPJ(e.cnpj)}</td>
      <td class="px-6 py-4 text-xs text-gray-600">${e.uf || '-'}</td>
      <td class="px-6 py-4">
        <span class="px-2 py-1 rounded-full text-[10px] font-bold ${e.usuario_dfe == 4 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}">${RECURSOS[e.usuario_dfe] || '-'}</span>
      </td>
      <td class="px-6 py-4">
        <span class="px-2 py-1 rounded-full text-[10px] font-bold ${e.ambiente == 1 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${e.ambiente == 1 ? 'Produção' : 'Homologação'}</span>
      </td>
      <td class="px-6 py-4">
        <span class="px-2 py-1 rounded-full text-[10px] font-bold ${e.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${e.status || 'Ativo'}</span>
      </td>
      <td class="px-6 py-4 text-center">
        <div class="flex items-center justify-center gap-2">
          <button onclick="abrirModal(${e.id})" class="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="bloquear(${e.id}, '${e.status}')" class="p-1.5 transition-colors ${e.status === 'Bloqueado' ? 'text-green-500 hover:text-green-700' : 'text-orange-400 hover:text-orange-600'}" title="${e.status === 'Bloqueado' ? 'Desbloquear' : 'Bloquear'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${e.status === 'Bloqueado' ? 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z' : 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'}"/></svg>
          </button>
          <button onclick="excluirEmpresa(${e.id})" class="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Excluir">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filtrar() {
  const q = document.getElementById('busca').value.toLowerCase();
  renderTabela(empresas.filter(e => 
    (e.razao_social||'').toLowerCase().includes(q) || 
    (e.cnpj||'').includes(q) ||
    (e.nome_fantasia||'').toLowerCase().includes(q)
  ));
}

async function abrirModal(id) {
  empresaAtual = id;
  smartPosList = [];
  document.getElementById('modalTitulo').textContent = id ? 'Editar Empresa' : 'Nova Empresa';
  setTab('dados');

  if (id) {
    const emp = await api('get_empresa&id=' + id);
    document.getElementById('f-id').value = emp.id || '';
    document.getElementById('f-razao_social').value = emp.razao_social || '';
    document.getElementById('f-nome_fantasia').value = emp.nome_fantasia || '';
    document.getElementById('f-cnpj').value = emp.cnpj || '';
    document.getElementById('f-inscricao_estadual').value = emp.inscricao_estadual || '';
    document.getElementById('f-uf').value = emp.uf || 'GO';
    document.getElementById('f-municipio').value = emp.municipio || '';
    document.getElementById('f-cep').value = emp.cep || '';
    document.getElementById('f-logradouro').value = emp.logradouro || '';
    document.getElementById('f-numero').value = emp.numero || '';
    document.getElementById('f-bairro').value = emp.bairro || '';
    document.getElementById('f-telefone').value = emp.telefone || '';
    document.getElementById('f-email').value = emp.email || '';
    document.getElementById('f-usuario_dfe').value = emp.usuario_dfe || 0;
    document.getElementById('f-ambiente').value = emp.ambiente || 2;
    document.getElementById('f-crt').value = emp.crt || 1;
    document.getElementById('f-status').value = emp.status || 'Ativo';
    document.getElementById('f-tem_tef').checked = emp.tem_tef == 1;
    smartPosList = emp.smartpos || [];
    renderSmartPos();
  } else {
    ['f-id','f-razao_social','f-nome_fantasia','f-cnpj','f-inscricao_estadual','f-municipio','f-cep','f-logradouro','f-numero','f-bairro','f-telefone','f-email'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-usuario_dfe').value = 2;
    document.getElementById('f-ambiente').value = 2;
    document.getElementById('f-crt').value = 1;
    document.getElementById('f-status').value = 'Ativo';
    document.getElementById('f-tem_tef').checked = false;
    renderSmartPos();
  }
  document.getElementById('modalEmpresa').classList.remove('hidden');
}

function fecharModal() {
  document.getElementById('modalEmpresa').classList.add('hidden');
}

function setTab(tab) {
  ['dados','dfe','smartpos'].forEach(t => {
    document.getElementById('panel-' + t).classList.toggle('hidden', t !== tab);
    const btn = document.getElementById('tab-' + t);
    btn.className = `px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 ${t === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`;
  });
}

async function salvarEmpresa() {
  const dados = {
    id: document.getElementById('f-id').value,
    razao_social: document.getElementById('f-razao_social').value,
    nome_fantasia: document.getElementById('f-nome_fantasia').value,
    cnpj: document.getElementById('f-cnpj').value,
    inscricao_estadual: document.getElementById('f-inscricao_estadual').value,
    uf: document.getElementById('f-uf').value,
    municipio: document.getElementById('f-municipio').value,
    cep: document.getElementById('f-cep').value,
    logradouro: document.getElementById('f-logradouro').value,
    numero: document.getElementById('f-numero').value,
    bairro: document.getElementById('f-bairro').value,
    telefone: document.getElementById('f-telefone').value,
    email: document.getElementById('f-email').value,
    usuario_dfe: document.getElementById('f-usuario_dfe').value,
    ambiente: document.getElementById('f-ambiente').value,
    crt: document.getElementById('f-crt').value,
    status: document.getElementById('f-status').value,
    tem_tef: document.getElementById('f-tem_tef').checked ? 1 : 0,
  };
  const res = await api('salvar_empresa', 'POST', dados);
  if (res.success) { fecharModal(); carregarEmpresas(); }
  else alert('Erro ao salvar: ' + (res.error || 'Tente novamente.'));
}

async function excluirEmpresa(id) {
  if (!confirm('Excluir esta empresa? Esta ação não pode ser desfeita.')) return;
  await api('excluir_empresa', 'POST', { id });
  carregarEmpresas();
}

async function manutencaoGlobal(ativar) {
  const msg = ativar ? 'Ativar manutenção para TODAS as empresas ativas?' : 'Reativar TODAS as empresas em manutenção?';
  if (!confirm(msg)) return;
  await api('manutencao_global', 'POST', { ativar });
  alert(ativar ? 'Sistema em manutenção ativado!' : 'Empresas reativadas!');
  listar();
}
async function bloquear(id, statusAtual) {
  const novoStatus = statusAtual === 'Bloqueado' ? 'Ativo' : 'Bloqueado';
  const msg = novoStatus === 'Bloqueado' ? 'Bloquear esta empresa por inadimplência?' : 'Desbloquear esta empresa?';
  if (!confirm(msg)) return;
  await api('bloquear_empresa', 'POST', { id, status: novoStatus });
  carregarEmpresas();
}

function renderSmartPos() {
  const tbody = document.getElementById('tabelaSmartPos');
  if (!smartPosList.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-center text-gray-400">Nenhuma máquina cadastrada.</td></tr>';
    return;
  }
  tbody.innerHTML = smartPosList.map((sp, i) => `
    <tr class="hover:bg-gray-50">
      <td class="px-4 py-3">${sp.codigo}</td>
      <td class="px-4 py-3">${sp.numero_serie}</td>
      <td class="px-4 py-3">${sp.integradora}</td>
      <td class="px-4 py-3">${sp.apelido}</td>
      <td class="px-4 py-3 text-center">
        <button onclick="removerSmartPos(${i})" class="text-red-400 hover:text-red-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

async function adicionarSmartPos() {
  const codigo = document.getElementById('sp-codigo').value.trim();
  const serie = document.getElementById('sp-numero_serie').value.trim();
  const integ = document.getElementById('sp-integradora').value.trim();
  const apelido = document.getElementById('sp-apelido').value.trim();
  if (!codigo || !serie || !integ) { alert('Preencha ID, Nº Série e Integradora.'); return; }
  
  if (empresaAtual) {
    const res = await api('salvar_smartpos', 'POST', {
      empresa_id: empresaAtual, codigo, numero_serie: serie, integradora: integ, apelido
    });
    if (res.success) {
      const sps = await api('listar_smartpos&empresa_id=' + empresaAtual);
      smartPosList = sps;
    }
  } else {
    smartPosList.push({ codigo, numero_serie: serie, integradora: integ, apelido });
  }
  renderSmartPos();
  ['sp-codigo','sp-numero_serie','sp-integradora','sp-apelido'].forEach(id => document.getElementById(id).value = '');
}

async function removerSmartPos(idx) {
  if (!confirm('Remover esta máquina?')) return;
  const sp = smartPosList[idx];
  if (sp.id) await api('excluir_smartpos', 'POST', { id: sp.id });
  smartPosList.splice(idx, 1);
  renderSmartPos();
}

function formatCNPJ(v) {
  if (!v) return '-';
  v = v.replace(/\D/g, '');
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

carregarEmpresas();
</script>
<?php endif; ?>
</body>
</html>
