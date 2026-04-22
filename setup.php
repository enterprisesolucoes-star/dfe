<?php
// setup.php - Instalador de Dependências Automático para Hostinger
set_time_limit(300);
ini_set('memory_limit', '512M');

echo "<pre style='background:#1e1e1e;color:#10B981;padding:20px;border-radius:10px;'>";
echo "🔄 Iniciando setup do SPED NFePHP...\n\n";

if (!file_exists('composer.phar')) {
    echo "📥 Baixando composer.phar...\n";
    copy('https://getcomposer.org/download/latest-stable/composer.phar', 'composer.phar');
}

echo "📦 Instalando pasta vendor (nfephp-org/sped-nfe e sped-da)...\n";
echo "⏳ Isso pode levar cerca de 1 a 2 minutos...\n\n";

// Força o diretório home do composer para evitar erros de permissão na Hostinger
putenv('COMPOSER_HOME=' . __DIR__ . '/.composer');

// Executa o install
$output = shell_exec('php composer.phar install 2>&1');
echo $output;

echo "\n\n✅ Processo Concluído! Se não houver erros vermelhos acima, a pasta 'vendor' foi gerada.\n";
echo "⚠️ IMPORTANTE: Exclua este arquivo (setup.php) após o uso por segurança.</pre>";
