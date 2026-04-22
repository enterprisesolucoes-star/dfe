<?php
switch ($action) {

    case 'empresa':
        // Migrações de colunas de controle administrativo
        try {
            $pdo->query("SELECT status FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN status ENUM('Ativo', 'Inativo', 'Bloqueado') DEFAULT 'Ativo'");
            $pdo->exec("ALTER TABLE empresas ADD COLUMN usuario_dfe TINYINT DEFAULT 2 COMMENT '0=Não, 1=NFe, 2=NFe+NFCe, 3=PDV Não Fiscal'");
        }
        
        // Criação da tabela dfe_admins para o portal administrativo
        $pdo->exec("CREATE TABLE IF NOT EXISTS dfe_admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            login VARCHAR(50) NOT NULL UNIQUE,
            senha_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Admin padrão se não houver registros
        $cntAdmins = (int)$pdo->query("SELECT COUNT(*) FROM dfe_admins")->fetchColumn();
        if ($cntAdmins === 0) {
            $pdo->prepare("INSERT INTO dfe_admins (nome, login, senha_hash) VALUES (?, ?, ?)")
                ->execute(['Super Admin', 'admin', password_hash('admin123', PASSWORD_DEFAULT)]);
        }

        // Migrações de colunas que podem não existir
        try {
            $pdo->query("SELECT numero_nfce FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN numero_nfce INT DEFAULT 0, ADD COLUMN serie_nfce INT DEFAULT 1");
        }
        try {
            $pdo->query("SELECT emissao_contingencia, contingencia_automatica FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN emissao_contingencia INT DEFAULT 0, ADD COLUMN contingencia_automatica INT DEFAULT 1");
        }
        try {
            $pdo->query("SELECT logradouro FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN logradouro VARCHAR(255), ADD COLUMN numero VARCHAR(20), ADD COLUMN bairro VARCHAR(100), ADD COLUMN municipio VARCHAR(100), ADD COLUMN cep VARCHAR(20), ADD COLUMN telefone VARCHAR(20), ADD COLUMN crt CHAR(1) DEFAULT '1'");
        }
        try {
            $pdo->query("SELECT valor_desconto FROM vendas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN valor_desconto DECIMAL(10,2) DEFAULT 0");
        }
        try {
            $pdo->query("SELECT valor_troco FROM vendas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE vendas ADD COLUMN valor_troco DECIMAL(10,2) DEFAULT 0");
        }
        // Remover colunas obsoletas
        $obsoleteColumns = ['plugnotas_certificado_id', 'cosmos_token', 'plugnotas_api_key', 'fiscal_api'];
        foreach ($obsoleteColumns as $col) {
            try {
                $pdo->query("SELECT $col FROM empresas LIMIT 1");
                $pdo->exec("ALTER TABLE empresas DROP COLUMN $col");
            } catch (PDOException $e) {
            }
        }

        try {
            $pdo->query("SELECT codigo_barras FROM produtos LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE produtos ADD COLUMN codigo_barras VARCHAR(20) DEFAULT NULL");
        }
        try {
            $pdo->query("SELECT certificado_file_name FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN certificado_file_name VARCHAR(255) DEFAULT NULL");
        }
        try {
            $pdo->query("SELECT numero_nfe FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN numero_nfe INT DEFAULT 0, ADD COLUMN serie_nfe INT DEFAULT 1, ADD COLUMN ambiente_nfe TINYINT DEFAULT 2");
        }
        try {
            $pdo->query("SELECT email_contador FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN email_contador VARCHAR(100) DEFAULT NULL, ADD COLUMN smtp_host VARCHAR(100) DEFAULT NULL, ADD COLUMN smtp_port INT DEFAULT 587, ADD COLUMN smtp_user VARCHAR(100) DEFAULT NULL, ADD COLUMN smtp_pass VARCHAR(100) DEFAULT NULL, ADD COLUMN smtp_secure VARCHAR(20) DEFAULT 'tls'");
        }
        try {
            $pdo->query("SELECT logo_path FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN logo_path VARCHAR(255) DEFAULT NULL");
        }
        try {
            $pdo->query("SELECT gerar_credito_simples FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN gerar_credito_simples TINYINT DEFAULT 0");
        }
        try {
            $pdo->query("SELECT aliquota_credito_simples FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN aliquota_credito_simples DECIMAL(10,2) DEFAULT 0");
        }
        try {
            $pdo->query("SELECT data_ultima_consulta_dfe FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN data_ultima_consulta_dfe DATETIME DEFAULT NULL");
        }
        try {
            $pdo->query("SELECT ultimo_nsu FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN ultimo_nsu VARCHAR(15) DEFAULT '0'");
        }
        try {
            $pdo->query("SELECT multa_receber FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN multa_receber DECIMAL(10,2) DEFAULT 0");
        }
        try {
            $pdo->query("SELECT juros_dia_receber FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN juros_dia_receber DECIMAL(10,2) DEFAULT 0");
        }
        try {
            $pdo->query("SELECT carencia_dias_receber FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN carencia_dias_receber INT DEFAULT 0");
        }
        try {
            $pdo->query("SELECT recolhe_ibscbs_fora FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN recolhe_ibscbs_fora TINYINT DEFAULT 0");
        }

        // Criação/migração tabela SmartPOS
        $pdo->exec("CREATE TABLE IF NOT EXISTS smartpos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            empresa_id INT NOT NULL,
            codigo VARCHAR(50) NOT NULL,
            integradora VARCHAR(100) NOT NULL,
            apelido VARCHAR(100) NOT NULL,
            numero_serie VARCHAR(100) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )");
        try {
            $pdo->query("SELECT numero_serie FROM smartpos LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE smartpos ADD COLUMN numero_serie VARCHAR(100) NOT NULL DEFAULT ''");
        }

        // Migração tabela vendas_pagamentos — colunas TEF
        $pdo->exec("CREATE TABLE IF NOT EXISTS vendas_pagamentos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            venda_id INT NOT NULL,
            forma_pagamento VARCHAR(2) NOT NULL,
            valor_pagamento DECIMAL(10,2) NOT NULL,
            tp_integra TINYINT DEFAULT 2,
            t_band VARCHAR(50) DEFAULT NULL,
            c_aut VARCHAR(50) DEFAULT NULL,
            tef_json_retorno LONGTEXT DEFAULT NULL
        )");
        // Migrações individuais para instalações antigas
        $tefCols = ['status_pagamento TINYINT DEFAULT NULL', 'payment_uniqueid VARCHAR(100) DEFAULT NULL', 'tef_nsu VARCHAR(50) DEFAULT NULL', 'tef_autorizacao VARCHAR(50) DEFAULT NULL', 'tef_bandeira_id VARCHAR(5) DEFAULT NULL', 'tef_bandeira_nome VARCHAR(50) DEFAULT NULL', 'tef_cnpj_credenciadora VARCHAR(20) DEFAULT NULL', 'tef_json_retorno LONGTEXT DEFAULT NULL', 'tp_integra TINYINT DEFAULT 2', 't_band VARCHAR(50) DEFAULT NULL', 'c_aut VARCHAR(50) DEFAULT NULL'];
        foreach ($tefCols as $col) {
            $colName = explode(' ', $col)[0];
            try {
                $pdo->query("SELECT $colName FROM vendas_pagamentos LIMIT 1");
            } catch (PDOException $e) {
                $pdo->exec("ALTER TABLE vendas_pagamentos ADD COLUMN $col");
            }
        }

        // Tabela de Bandeiras (SEFAZ)
        $pdo->exec("DROP TABLE IF EXISTS bandeiras");
        $pdo->exec("CREATE TABLE IF NOT EXISTS bandeiras (
          id INT PRIMARY KEY AUTO_INCREMENT,
          tpag VARCHAR(2),
          tband_opc VARCHAR(50),
          cnpj_opc VARCHAR(20)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $countBands = $pdo->query("SELECT COUNT(*) FROM bandeiras")->fetchColumn();
        if ($countBands == 0) {
            $sqlBands = "INSERT INTO bandeiras (id, tpag, tband_opc, cnpj_opc) VALUES
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
                (15, '99', 'Rede', '01425787000104')";
            $pdo->exec($sqlBands);
        }

        // Criação das tabelas de vendas e itens (se não existirem)
        $pdo->exec("CREATE TABLE IF NOT EXISTS vendas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            empresa_id INT DEFAULT NULL,
            numero INT NOT NULL,
            serie INT DEFAULT 1,
            valor_total DECIMAL(10,2) NOT NULL,
            valor_desconto DECIMAL(10,2) DEFAULT 0,
            valor_troco DECIMAL(10,2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'Pendente',
            chave_acesso VARCHAR(44),
            protocolo VARCHAR(20),
            xml_autorizado MEDIUMTEXT DEFAULT NULL,
            xml_cancelamento MEDIUMTEXT DEFAULT NULL,
            protocolo_cancelamento VARCHAR(20) DEFAULT NULL,
            justificativa_cancelamento VARCHAR(255) DEFAULT NULL,
            data_cancelamento DATETIME DEFAULT NULL,
            xml_path VARCHAR(255),
            pdf_path VARCHAR(255),
            data_emissao DATETIME,
            cliente_id INT,
            usuario_id INT DEFAULT NULL,
            caixa_id INT DEFAULT NULL,
            venda_id_origem INT
        )");
        // Migrações para instalações antigas sem estas colunas
        $vendasCols = [
            'xml_autorizado MEDIUMTEXT DEFAULT NULL',
            'xml_cancelamento MEDIUMTEXT DEFAULT NULL',
            'protocolo_cancelamento VARCHAR(20) DEFAULT NULL',
            'justificativa_cancelamento VARCHAR(255) DEFAULT NULL',
            'data_cancelamento DATETIME DEFAULT NULL',
            'empresa_id INT DEFAULT NULL',
            'usuario_id INT DEFAULT NULL',
            'caixa_id INT DEFAULT NULL',
        ];
        foreach ($vendasCols as $col) {
            $colName = explode(' ', $col)[0];
            try {
                $pdo->query("SELECT $colName FROM vendas LIMIT 1");
            } catch (PDOException $e) {
                $pdo->exec("ALTER TABLE vendas ADD COLUMN $col");
            }
        }

        $pdo->exec("CREATE TABLE IF NOT EXISTS vendas_itens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            venda_id INT NOT NULL,
            produto_id INT NOT NULL,
            quantidade DECIMAL(10,3) NOT NULL,
            valor_unitario DECIMAL(10,2) NOT NULL,
            valor_total DECIMAL(10,2) NOT NULL
        )");

        // Migração: external_id para multi-tenant
        try {
            $pdo->query("SELECT external_id FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN external_id INT DEFAULT NULL");
        }

        if ($empresaId) {
            $stmt = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
            $stmt->execute([$empresaId]);
        } else {
            // Fallback: primeiro admin sem empresa_id definida
            $stmt = $pdo->query("SELECT * FROM empresas LIMIT 1");
        }
        $empresa = $stmt->fetch();
        if ($empresa) {
            if (!empty($empresa['certificado_pfx']) && empty($empresa['certificado_file_name'])) {
                $empresa['certificado_file_name'] = 'certificado.pfx';
            }
            unset($empresa['certificado_pfx']);
            // Garante URL pública da logo na Hostinger
            if (!empty($empresa['logo_path'])) {
                $empresa['logo_url'] = '/dfe/' . ltrim($empresa['logo_path'], '/');
            }
            $empresa['tef_required_states'] = $_ENV['TEF_REQUIRED_STATES'] ?? (defined('TEF_REQUIRED_STATES') ? TEF_REQUIRED_STATES : 'GO,MT');
            echo json_encode($empresa);
        } else {
            echo json_encode(['id' => 0]);
        }
        break;

    case 'bandeiras':
        $stmt = $pdo->query("SELECT * FROM bandeiras ORDER BY tband_opc ASC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'salvar_bandeira':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['tband_opc'])) {
            echo json_encode(['error' => true, 'message' => 'Nome da bandeira é obrigatório']);
            exit;
        }
        if (isset($data['id']) && $data['id'] > 0) {
            $stmt = $pdo->prepare("UPDATE bandeiras SET tpag = ?, tband_opc = ?, cnpj_opc = ? WHERE id = ?");
            $stmt->execute([$data['tpag'] ?? '99', $data['tband_opc'], $data['cnpj_opc'] ?? null, $data['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO bandeiras (tpag, tband_opc, cnpj_opc) VALUES (?, ?, ?)");
            $stmt->execute([$data['tpag'] ?? '99', $data['tband_opc'], $data['cnpj_opc'] ?? null]);
        }
        echo json_encode(['success' => true]);
        break;

    case 'excluir_bandeira':
        $id = (int) ($_GET['id'] ?? 0);
        if ($id > 0) {
            $stmt = $pdo->prepare("DELETE FROM bandeiras WHERE id = ?");
            $stmt->execute([$id]);
        }
        echo json_encode(['success' => true]);
        break;


    case 'salvar_empresa':
        $data = json_decode(file_get_contents('php://input'), true);

        // Garantir colunas existentes antes de salvar
        try {
            $pdo->query("SELECT numero_nfce FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN numero_nfce INT DEFAULT 0, ADD COLUMN serie_nfce INT DEFAULT 1");
        }
        try {
            $pdo->query("SELECT numero_nfe FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN numero_nfe INT DEFAULT 0, ADD COLUMN serie_nfe INT DEFAULT 1, ADD COLUMN ambiente_nfe TINYINT DEFAULT 2");
        }
        try {
            $pdo->query("SELECT cosmos_token FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN cosmos_token VARCHAR(255) DEFAULT NULL");
        }
        try {
            $pdo->query("SELECT emissao_contingencia FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN emissao_contingencia INT DEFAULT 0, ADD COLUMN contingencia_automatica INT DEFAULT 1");
        }
        try {
            $pdo->query("SELECT logradouro FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN logradouro VARCHAR(255), ADD COLUMN numero VARCHAR(20), ADD COLUMN bairro VARCHAR(100), ADD COLUMN municipio VARCHAR(100), ADD COLUMN cep VARCHAR(20), ADD COLUMN telefone VARCHAR(20), ADD COLUMN crt CHAR(1) DEFAULT '1'");
        }
        try {
            $pdo->query("SELECT certificado_file_name FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN certificado_file_name VARCHAR(255) DEFAULT NULL");
        }
        try {
            $pdo->query("SELECT ultimo_nsu FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN ultimo_nsu VARCHAR(20) DEFAULT '0'");
        }
        try {
            $pdo->query("SELECT plugnotas_api_key FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            // Se cair aqui a coluna já não existe, ignorar
        }
        // Tentativa de dropar colunas redundantes
        try {
            $pdo->exec("ALTER TABLE empresas DROP COLUMN plugnotas_api_key, DROP COLUMN cosmos_token, DROP COLUMN fiscal_api");
        } catch (PDOException $e) {
        }

        try {
            $pdo->query("SELECT email_contador FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN email_contador VARCHAR(100) DEFAULT NULL, ADD COLUMN smtp_host VARCHAR(100) DEFAULT NULL, ADD COLUMN smtp_port INT DEFAULT 587, ADD COLUMN smtp_user VARCHAR(100) DEFAULT NULL, ADD COLUMN smtp_pass VARCHAR(100) DEFAULT NULL, ADD COLUMN smtp_secure VARCHAR(20) DEFAULT 'tls'");
        }
        try {
            $pdo->query("SELECT recolhe_ibscbs_fora FROM empresas LIMIT 1");
        } catch (PDOException $e) {
            $pdo->exec("ALTER TABLE empresas ADD COLUMN recolhe_ibscbs_fora TINYINT DEFAULT 0");
        }

        $certPfxSql = "";
        $certSenhaSql = "";
        $numero = (int) ($data['numeroNfce'] ?? 0);
        $serie = (int) ($data['serieNfce'] ?? 1);
        $numeroNfe = (int) ($data['numeroNfe'] ?? 0);
        $serieNfe = (int) ($data['serieNfe'] ?? 1);
        $ambienteNfe = (int) ($data['ambienteNfe'] ?? 2);
        $emissaoContingencia = (int) ($data['emissaoContingencia'] ?? 0);
        $contingenciaAutomatica = (int) ($data['contingenciaAutomatica'] ?? 1);
        $gerarCreditoSimples = (int) ($data['gerarCreditoSimples'] ?? 0);
        $aliquotaCreditoSimples = (float) ($data['aliquotaCreditoSimples'] ?? 0);
        $recolheIbsCbsFora = (int) ($data['recolhe_ibscbs_fora'] ?? 0);

        $paramsUpdate = [
            $data['razaoSocial'] ?? '',
            $data['cnpj'] ?? '',
            $data['inscricaoEstadual'] ?? '',
            $data['cscToken'] ?? '',
            $data['cscId'] ?? '',
            (int) ($data['ambiente'] ?? 2),
            $data['uf'] ?? '',
            $data['codigoMunicipio'] ?? '',
            $numero,
            $serie,
            $numeroNfe,
            $serieNfe,
            $ambienteNfe,
            $emissaoContingencia,
            $contingenciaAutomatica,
            $data['logradouro'] ?? '',
            $data['numero'] ?? '',
            $data['bairro'] ?? '',
            $data['municipio'] ?? '',
            $data['cep'] ?? '',
            $data['telefone'] ?? '',
            $data['crt'] ?? '1',
            $data['emailContador'] ?? null,
            $data['smtpHost'] ?? null,
            $data['smtpPort'] ?? 587,
            $data['smtpUser'] ?? null,
            $data['smtpPass'] ?? null,
            $data['smtpSecure'] ?? 'tls',
            $gerarCreditoSimples,
            $aliquotaCreditoSimples,
            $data['ultimoNsu'] ?? '0',
            (float)($data['multa_receber'] ?? 0),
            (float)($data['juros_dia_receber'] ?? 0),
            (int)($data['carencia_dias_receber'] ?? 0),
            $recolheIbsCbsFora
        ];
        $paramsInsert = $paramsUpdate;

        $pfxData = null;
        if (!empty($data['certificadoPfx'])) {
            $pfxData = $data['certificadoPfx'];
            // Se vier como data:application/x-pkcs12;base64,.... removemos o prefixo e decodificamos
            if (strpos($pfxData, 'base64,') !== false) {
                $pfxData = base64_decode(explode('base64,', $pfxData)[1]);
            }

            $certPfxSql = ", certificado_pfx=?";
            $paramsUpdate[] = $pfxData;
            $paramsInsert[] = $pfxData;
            if (!empty($data['certificadoFileName'])) {
                $certFileNameSql = ", certificado_file_name=?";
                $paramsUpdate[] = $data['certificadoFileName'];
                $paramsInsert[] = $data['certificadoFileName'];
            }
        } else {
            $paramsInsert[] = null;
        }

        if (!empty($data['certificadoSenha'])) {
            $certSenhaSql = ", certificado_senha=?";
            $paramsUpdate[] = $data['certificadoSenha'];
            $paramsInsert[] = $data['certificadoSenha'];
        } else {
            $paramsInsert[] = null;
        }

        if (isset($data['id']) && $data['id'] > 0) {
            $paramsUpdate[] = $data['id'];
            $stmt = $pdo->prepare("UPDATE empresas SET razao_social=?, cnpj=?, inscricao_estadual=?, csc_token=?, csc_id=?, ambiente=?, uf=?, codigo_municipio=?, numero_nfce=?, serie_nfce=?, numero_nfe=?, serie_nfe=?, ambiente_nfe=?, emissao_contingencia=?, contingencia_automatica=?, logradouro=?, numero=?, bairro=?, municipio=?, cep=?, telefone=?, crt=?, email_contador=?, smtp_host=?, smtp_port=?, smtp_user=?, smtp_pass=?, smtp_secure=?, gerar_credito_simples=?, aliquota_credito_simples=?, ultimo_nsu=?, multa_receber=?, juros_dia_receber=?, carencia_dias_receber=?, recolhe_ibscbs_fora=? {$certPfxSql} {$certFileNameSql} {$certSenhaSql} WHERE id=?");
            try {
                $stmt->execute($paramsUpdate);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
        } else {
            // No INSERT, garantimos que todos os campos de certificado sejam incluídos na ordem correta dos parâmetros (38 placeholders agora)
            $stmt = $pdo->prepare("INSERT INTO empresas (razao_social, cnpj, inscricao_estadual, csc_token, csc_id, ambiente, uf, codigo_municipio, numero_nfce, serie_nfce, numero_nfe, serie_nfe, ambiente_nfe, emissao_contingencia, contingencia_automatica, logradouro, numero, bairro, municipio, cep, telefone, crt, email_contador, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, gerar_credito_simples, aliquota_credito_simples, ultimo_nsu, multa_receber, juros_dia_receber, carencia_dias_receber, recolhe_ibscbs_fora, certificado_pfx, certificado_file_name, certificado_senha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            // Reconstruindo params para o INSERT para garantir compatibilidade com os ? da query acima (35 campos base + 3 de certificado)
            $paramsFixed = array_slice($paramsInsert, 0, 35);
            $paramsFixed[] = $pfxData;
            $paramsFixed[] = $data['certificadoFileName'] ?? null;
            $paramsFixed[] = $data['certificadoSenha'] ?? null;

            try {
                $stmt->execute($paramsFixed);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
        }
        break;

    case 'upload_logo_empresa':
        if (empty($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(['success' => false, 'message' => 'Arquivo não recebido.']);
            break;
        }
        $file = $_FILES['logo'];
        $mime = mime_content_type($file['tmp_name']);
        $ext = in_array($mime, ['image/jpeg', 'image/jpg']) ? 'jpg' : (($mime === 'image/png') ? 'png' : '');
        if (!$ext) {
            echo json_encode(['success' => false, 'message' => 'Formato inválido. Use PNG ou JPG.']);
            break;
        }

        $dir = __DIR__ . '/../uploads/logos/';
        if (!is_dir($dir))
            mkdir($dir, 0755, true);

        // Remove logo anterior desta empresa
        if ($empresaId) {
            $old = $pdo->prepare("SELECT logo_path FROM empresas WHERE id=?");
            $old->execute([$empresaId]);
            $oldPath = $old->fetchColumn();
            if ($oldPath && file_exists(__DIR__ . '/../' . $oldPath))
                @unlink(__DIR__ . '/../' . $oldPath);
        }

        $filename = 'empresa_' . ($empresaId ?: 'default') . '_' . time() . '.' . $ext;
        $dest = $dir . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            echo json_encode(['success' => false, 'message' => 'Falha ao salvar arquivo.']);
            break;
        }
        $logoPath = 'uploads/logos/' . $filename;

        try {
            if ($empresaId) {
                $pdo->prepare("UPDATE empresas SET logo_path=? WHERE id=?")->execute([$logoPath, $empresaId]);
            } else {
                $pdo->prepare("UPDATE empresas SET logo_path=? ORDER BY id LIMIT 1")->execute([$logoPath]);
            }
            echo json_encode(['success' => true, 'logo_url' => '/dfe/' . $logoPath]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

}
