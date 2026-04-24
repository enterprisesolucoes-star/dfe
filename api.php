<?php
date_default_timezone_set('America/Sao_Paulo');
// api.php - Ponto de entrada para o Frontend React
// Hospedado em Hostinger (Shared Hosting)

session_start();

ini_set('display_errors', 0);
error_reporting(E_ALL);
set_exception_handler(function($e) {
    if (!headers_sent()) header('Content-Type: application/json');
    echo json_encode(['error' => true, 'message' => $e->getMessage(), 'file' => basename($e->getFile()), 'line' => $e->getLine()]);
    exit;
});
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if ($errno === E_NOTICE || $errno === E_WARNING) return false;
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

// URLs da API SuperTEF — conforme documentação https://supertef.apidog.io/
define('SUPERTEF_URL_BASE', 'https://api.supertef.com.br/api/pagamentos');

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config.php';

// Migração forçada da tabela bandeiras
if (isset($pdo)) {
    try {
        $count = 0;
        try {
            $count = $pdo->query("SELECT COUNT(*) FROM bandeiras")->fetchColumn();
        } catch (Exception $e) { $count = 0; }
        
        if ($count < 15) {
            $pdo->exec("DROP TABLE IF EXISTS bandeiras");
            $pdo->exec("CREATE TABLE IF NOT EXISTS bandeiras (
              id INT PRIMARY KEY AUTO_INCREMENT,
              tpag VARCHAR(2),
              tband_opc VARCHAR(50),
              cnpj_opc VARCHAR(20)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $sql = "INSERT INTO bandeiras (id, tpag, tband_opc, cnpj_opc) VALUES
                (1, '02', 'Mastercard', '05577343000137'),
                (2, '03', 'American Express', '60419645000195'),
                (3, '01', 'Visa', '31551765000143'),
                (4, '99', 'Policard', '00904951000195'),
                (5, '99', 'Sodexo', '69034668000156'),
                (6, '99', 'PagSeguro UOL', '08561701000101'),
                (7, '04', 'Sorocred', '04814563000174'),
                (8, '05', 'Diners Club', '33479023000180'),
                (9, '06', 'Elo', '09227084000175'),
                (10, '07', 'Hipercard', '03012230000169'),
                (11, '08', 'Aura', '22026991000114'),
                (12, '09', 'Cabal', '03766873000106'),
                (13, '99', 'Stone', '16501555000157'),
                (14, '99', 'Cielo', '01027058000191'),
                (15, '99', 'Rede', '01425787000104')
            ON DUPLICATE KEY UPDATE id=id";
            $pdo->exec($sql);
        }
    } catch (Exception $e) {}
}

// Carregador simples de .env
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name ?? '');
        $value = trim($value ?? '');
        if (!defined($name)) define($name, $value);
        $_ENV[$name] = $value;
    }
}

// Fallback: carrega FPDF manualmente se não estiver no vendor (shared hosting)
if (!class_exists('FPDF') && !class_exists('\\Fpdf\\Fpdf')) {
    $fpdfLib = __DIR__ . '/lib/fpdf.php';
    if (file_exists($fpdfLib)) {
        if (!defined('FPDF_FONTPATH')) {
            define('FPDF_FONTPATH', __DIR__ . '/lib/font/');
        }
        
        // Auto-repara fontes caso não tenham sido enviadas ao servidor
        $fontDir = FPDF_FONTPATH;
        if (!file_exists($fontDir . 'helveticab.php')) {
            @mkdir($fontDir, 0755, true);
            $fontes = ['helvetica.php', 'helveticab.php', 'helveticai.php', 'helveticabi.php'];
            $base = 'https://raw.githubusercontent.com/setasign/fpdf/master/font/';
            $ctx = stream_context_create(['http' => ['timeout' => 5]]);
            foreach ($fontes as $font) {
                if (!file_exists($fontDir . $font)) {
                    $fc = @file_get_contents($base . $font, false, $ctx);
                    if ($fc) @file_put_contents($fontDir . $font, $fc);
                }
            }
        }
        require_once $fpdfLib;
    }
}

// SUPERTEF_TOKEN deve ser definido no config.php
// Ex: define('SUPERTEF_TOKEN', 'seu_token_aqui');
if (!defined('SUPERTEF_TOKEN')) {
    define('SUPERTEF_TOKEN', '');
}

require_once __DIR__ . '/src/services/NfceService.php';
require_once __DIR__ . '/src/services/NfeService.php';
require_once __DIR__ . '/src/services/PrinterService.php';

use App\Services\NfceService;
use App\Services\NfeService;
use App\Services\PrinterService;

// empresa_id e perfil da sessão PHP — disponíveis em todos os módulos incluídos
$empresaId = (int)($_SESSION['empresa_id'] ?? $_GET['empresa_id'] ?? $_POST['empresa_id'] ?? 0);
$usuarioPerfil  = $_SESSION['usuario_perfil'] ?? 'operador';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

/**
 * Mapeia o nome da bandeira retornado pela SuperTEF para o código numérico da SEFAZ
 */
function mapearBandeiraSefaz($nomeBandeira) {
    $nome = strtoupper(trim($nomeBandeira));
    $mapa = [
        'VISA' => '01', 'MASTERCARD' => '02', 'AMERICAN EXPRESS' => '03',
        'SOROCRED' => '04', 'DINERS CLUB' => '05', 'ELO' => '06',
        'HIPERCARD' => '07', 'AURA' => '08', 'CABAL' => '09'
    ];
    return $mapa[$nome] ?? '99'; // 99 = Outros
}

/**
 * Garante que as tabelas financeiras existam e retorna o ID da conta padrão da empresa.
 * Cria o 'CAIXA GERAL' automaticamente na primeira vez.
 */
function garantirContaFinanceira(PDO $pdo, int $empresaId): ?int
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS contas_financeiras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        nome VARCHAR(100) NOT NULL,
        saldo_inicial DECIMAL(15,2) DEFAULT 0,
        tipo ENUM('Caixa','Banco','Digital') DEFAULT 'Caixa',
        status TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_empresa (empresa_id)
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS financeiro (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        venda_id INT DEFAULT NULL,
        compra_id INT DEFAULT NULL,
        tipo ENUM('R','P') NOT NULL,
        status ENUM('Pendente','Pago','Parcial','Cancelado') DEFAULT 'Pendente',
        entidade_id INT DEFAULT NULL,
        valor_total DECIMAL(15,2) NOT NULL,
        valor_pago DECIMAL(15,2) DEFAULT 0,
        vencimento DATE NOT NULL,
        data_baixa DATE DEFAULT NULL,
        parcela_numero INT DEFAULT 1,
        parcela_total INT DEFAULT 1,
        forma_pagamento_prevista VARCHAR(2) DEFAULT '01',
        categoria VARCHAR(100) DEFAULT 'Geral',
        nosso_numero VARCHAR(50) DEFAULT NULL,
        documento_id VARCHAR(100) DEFAULT NULL,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_empresa_venc (empresa_id, vencimento),
        INDEX idx_status (status),
        INDEX idx_tipo (tipo)
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS caixa_movimentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        financeiro_id INT DEFAULT NULL,
        venda_id INT DEFAULT NULL,
        conta_id INT NOT NULL,
        tipo ENUM('C','D') NOT NULL,
        valor DECIMAL(15,2) NOT NULL,
        data_movimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        forma_pagamento VARCHAR(2) DEFAULT '01',
        historico VARCHAR(255),
        usuario_id INT DEFAULT NULL,
        INDEX idx_empresa_data (empresa_id, data_movimento),
        INDEX idx_conta (conta_id)
    )");

    $contaId = $pdo->prepare("SELECT id FROM contas_financeiras WHERE empresa_id = ? AND status = 1 LIMIT 1");
    $contaId->execute([$empresaId]);
    $id = $contaId->fetchColumn();

    if (!$id) {
        $pdo->prepare("INSERT INTO contas_financeiras (empresa_id, nome, tipo) VALUES (?, 'CAIXA GERAL', 'Caixa')")
            ->execute([$empresaId]);
        $id = (int) $pdo->lastInsertId();
    }

    return $id ?: null;
}

function notificarRejeicaoSefaz($empresa, $venda, $erro, $xml = '') {
    if (!defined('DEVELOPER_EMAIL') || empty(DEVELOPER_EMAIL)) return;
    try {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->isSMTP();
        $mail->Host       = defined('ADMIN_SMTP_HOST') ? ADMIN_SMTP_HOST : '';
        $mail->SMTPAuth   = true;
        $mail->Username   = defined('ADMIN_SMTP_USER') ? ADMIN_SMTP_USER : '';
        $mail->Password   = defined('ADMIN_SMTP_PASS') ? ADMIN_SMTP_PASS : '';
        $mail->SMTPSecure = defined('ADMIN_SMTP_SECURE') ? ADMIN_SMTP_SECURE : 'ssl';
        $mail->Port       = defined('ADMIN_SMTP_PORT') ? ADMIN_SMTP_PORT : 465;
        
        $mail->setFrom($mail->Username, 'Enterprise - Alerta SEFAZ');
        $mail->addAddress(DEVELOPER_EMAIL);
        $mail->Subject = "Rejeicao SEFAZ: " . ($empresa['razao_social'] ?? 'Desconhecida');
        
        $body = "<h2>Alerta de Rejeicao</h2>";
        $body .= "<p><b>Empresa:</b> " . ($empresa['razao_social'] ?? '') . " (" . ($empresa['cnpj'] ?? '') . ")</p>";
        $body .= "<p><b>Documento:</b> " . ($venda['numero'] ?? '') . " / " . ($venda['serie'] ?? '') . "</p>";
        $body .= "<p><b>Erro:</b> " . $erro . "</p>";
        $body .= "<p><b>Data:</b> " . date('d/m/Y H:i:s') . "</p>";
        
        $mail->isHTML(true);
        $mail->Body = $body;
        if ($xml) {
            $mail->addStringAttachment($xml, "rejeicao_{$venda['numero']}.xml", 'base64', 'application/xml');
        }
        $mail->send();
    } catch (\Exception $e) {}
}

$action = $_GET['action'] ?? '';

$modules = [
    'produtos' => 'produtos', 'salvar_produto' => 'produtos', 'excluir_produto' => 'produtos',
    'clientes' => 'clientes', 'salvar_cliente' => 'clientes', 'excluir_cliente' => 'clientes',
    'fornecedores' => 'fornecedores', 'salvar_fornecedor' => 'fornecedores', 'excluir_fornecedor' => 'fornecedores',
    'transportadores' => 'transportadores', 'salvar_transportador' => 'transportadores', 'excluir_transportador' => 'transportadores',
    'empresa' => 'empresa', 'salvar_empresa' => 'empresa', 'upload_logo_empresa' => 'empresa', 'plugnotas_sincronizar' => 'empresa', 'bandeiras' => 'empresa', 'salvar_bandeira' => 'empresa', 'excluir_bandeira' => 'empresa',
    'listar_orcamentos' => 'orcamentos', 'salvar_orcamento' => 'orcamentos',
    'excluir_orcamento' => 'orcamentos', 'orcamento_pdf' => 'orcamentos', 'orcamento_email' => 'orcamentos',
    'listar_os' => 'ordens_servico', 'salvar_os' => 'ordens_servico',
    'excluir_os' => 'ordens_servico', 'os_pdf' => 'ordens_servico', 'os_email' => 'ordens_servico',
    'vendas' => 'vendas', 'emitir' => 'vendas', 'cancelar' => 'vendas', 'excluir_venda' => 'vendas',
    'transmitir_contingencia' => 'vendas', 'danfe' => 'vendas', 'danfe_contingencia' => 'vendas',
    'transmitir_lote_contingencia' => 'vendas', 'baixar_xml_lote' => 'vendas', 'enviar_xml_contador' => 'vendas', 'enviar_email_doc' => 'vendas',
    'salvar_pendente' => 'vendas', 'emitir_pendente' => 'vendas', 'verificar_tef_pendente' => 'vendas',
    'tef_retry' => 'vendas', 'tef_status' => 'vendas', 'tef_cancelar' => 'vendas', 'tef_confirmar' => 'vendas',
    'ibpt_consultar' => 'vendas',
    'tem_smartpos' => 'vendas', 'tef_solicitar' => 'vendas', 'tef_consultar' => 'vendas',
    'listar_smartpos' => 'vendas', 'salvar_smartpos' => 'vendas', 'excluir_smartpos' => 'vendas',
    // NF-e Modelo 55
    'nfe_listar' => 'nfe', 'nfe_emitir' => 'nfe', 'nfe_cancelar' => 'nfe', 'nfe_enviar_cce' => 'nfe', 'nfe_cce_pdf' => 'nfe', 'nfe_listar_cce' => 'nfe', 'nfe_excluir' => 'nfe', 'nfe_download_xml' => 'nfe',
    'nfe_danfe' => 'nfe', 'nfe_baixar_xml_lote' => 'nfe', 'nfe_enviar_xml_contador' => 'nfe', 'nfe_enviar_email_doc' => 'nfe',
    'nfe_devolucao' => 'nfe', 'nfe_buscar_para_devolucao' => 'nfe',
    'nfe_salvar_pendente' => 'nfe', 'nfe_emitir_pendente' => 'nfe',
    'ncm_listar' => 'ncm', 'ncm_ufs' => 'ncm', 'ncm_importar' => 'ncm',
    'login' => 'usuarios', 'logout' => 'usuarios', 'listar_usuarios' => 'usuarios', 'salvar_usuario' => 'usuarios', 'excluir_usuario' => 'usuarios',
    'listar_pre_cadastros' => 'usuarios', 'aprovar_pre_cadastro' => 'usuarios', 'reprovar_pre_cadastro' => 'usuarios',
    'abrir_caixa' => 'caixa', 'fechar_caixa' => 'caixa', 'caixa_atual' => 'caixa', 'relatorio_caixa' => 'caixa', 'relatorio_caixa_pdf' => 'caixa',
    'medidas' => 'medidas', 'salvar_medida' => 'medidas', 'excluir_medida' => 'medidas',
    'listar_compras' => 'compras', 'salvar_compra' => 'compras', 'excluir_compra' => 'compras', 'detalhar_compra' => 'compras', 'importar_xml' => 'compras',
    'dist_dfe' => 'compras', 'dist_download' => 'compras', 'dist_listar_locais' => 'compras', 'dist_manifestar' => 'compras', 'dist_danfe' => 'compras',
    'rtc_importar' => 'rtc', 'rtc_consultar_ncm' => 'rtc', 'rtc_cst_classtrib' => 'rtc', 'rtc_ccredpres' => 'rtc',
    'rtc_atualizar_online' => 'rtc', 'rtc_aliquotas_listar' => 'rtc', 'rtc_aliquota_salvar' => 'rtc', 'rtc_aliquota_excluir' => 'rtc',
    'check_vendor' => 'check_vendor',
    'dashboard_vendas' => 'dashboard', 'dashboard_financeiro' => 'dashboard',
    'system_admin' => 'system_admin', 'login_admin' => 'system_admin', 'alterar_status_empresa' => 'system_admin', 'listar_smartpos_admin' => 'system_admin', 'salvar_smartpos_admin' => 'system_admin', 'excluir_smartpos_admin' => 'system_admin', 'listar_empresas_admin' => 'system_admin', 'salvar_empresa_admin' => 'system_admin', 'excluir_empresa_admin' => 'system_admin', 'salvar_usuario_admin' => 'system_admin',
    'fin_listar_contas' => 'financeiro',
    'fin_listar_titulos' => 'financeiro',
    'fin_baixar_titulo' => 'financeiro',
    'fin_excluir_titulo' => 'financeiro',
    'fin_estornar_titulo' => 'financeiro',
    'fin_resumo_dashboard' => 'financeiro',
    'fin_listar_movimentos' => 'financeiro',
    'fin_salvar_movimento'  => 'financeiro',
    'fin_excluir_movimento' => 'financeiro',
    'status_sefaz' => 'vendas'
];

if (isset($modules[$action])) {
    $mod = $modules[$action];
    if ($mod === 'check_vendor') {
        echo json_encode([
            'autoload_exists' => file_exists(__DIR__ . '/vendor/autoload.php'),
            'sped_common_exists' => file_exists(__DIR__ . '/vendor/nfephp-org/sped-common/src/Standardize.php'),
            'sped_nfe_exists' => file_exists(__DIR__ . '/vendor/nfephp-org/sped-nfe/src/Make.php'),
            'standardize_class' => class_exists('NFePHP\Common\Standardize'),
        ]);
    } else {
        require __DIR__ . '/api/' . $mod . '.php';
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Ação não encontrada']);
}
