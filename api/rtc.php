<?php
switch ($action) {

    case 'rtc_importar':
        // Tabela unificada NCM (LC 214 + IBPT)
        $pdo->exec("CREATE TABLE IF NOT EXISTS rtc_ncm (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tipo ENUM('lc214','ibpt') NOT NULL,
            ncm VARCHAR(20) NOT NULL,
            -- LC 214
            legislacao VARCHAR(50) DEFAULT NULL,
            anexo VARCHAR(20) DEFAULT NULL,
            cst VARCHAR(10) DEFAULT NULL,
            classtrib VARCHAR(20) DEFAULT NULL,
            -- IBPT
            ex VARCHAR(5) DEFAULT NULL,
            tabela CHAR(2) DEFAULT NULL,
            descricao VARCHAR(300) DEFAULT NULL,
            aliq_nacional DECIMAL(8,4) DEFAULT NULL,
            aliq_importados DECIMAL(8,4) DEFAULT NULL,
            aliq_estadual DECIMAL(8,4) DEFAULT NULL,
            aliq_municipal DECIMAL(8,4) DEFAULT NULL,
            vigencia_inicio DATE DEFAULT NULL,
            vigencia_fim DATE DEFAULT NULL,
            chave VARCHAR(100) DEFAULT NULL,
            versao VARCHAR(20) DEFAULT NULL,
            fonte VARCHAR(100) DEFAULT NULL,
            uf CHAR(2) DEFAULT NULL,
            INDEX idx_ncm (ncm),
            INDEX idx_tipo_ncm (tipo, ncm),
            INDEX idx_ncm_uf (ncm, uf)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $pdo->exec("CREATE TABLE IF NOT EXISTS rtc_cst_classtrib (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cst VARCHAR(10) NOT NULL,
            descricao_cst VARCHAR(255) DEFAULT '',
            classtrib VARCHAR(20) NOT NULL,
            nome_classtrib VARCHAR(500) DEFAULT '',
            descricao_classtrib TEXT DEFAULT NULL,
            lc_redacao TEXT DEFAULT NULL,
            lc_referencia VARCHAR(100) DEFAULT '',
            link VARCHAR(300) DEFAULT '',
            tipo_aliquota VARCHAR(50) DEFAULT '',
            pred_ibs DECIMAL(5,2) DEFAULT 0,
            pred_cbs DECIMAL(5,2) DEFAULT 0,
            ind_nfce TINYINT DEFAULT 0,
            ind_nfe  TINYINT DEFAULT 0,
            d_ini_vig DATE DEFAULT NULL,
            d_fim_vig DATE DEFAULT NULL,
            INDEX idx_cst (cst),
            INDEX idx_classtrib (classtrib)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $pdo->exec("CREATE TABLE IF NOT EXISTS rtc_ccredpres (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ccredpres VARCHAR(10) NOT NULL,
            descricao TEXT,
            ind_gcbs TINYINT DEFAULT 0,
            ind_gibs TINYINT DEFAULT 0,
            d_ini_vig DATE DEFAULT NULL,
            d_fim_vig DATE DEFAULT NULL,
            INDEX idx_ccredpres (ccredpres)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Remove tabela legada se existir
        try { $pdo->exec("DROP TABLE IF EXISTS rtc_ncm_anexos"); } catch (Exception $e) {}

        $rtcDir = __DIR__ . '/../rtc/';

        // --- cst_classtrib.json ---
        $cstData = json_decode(file_get_contents($rtcDir . 'cst_classtrib.json'), true);
        // Migrações de colunas
        foreach (['ind_nfe TINYINT DEFAULT 0 AFTER ind_nfce',
                  'descricao_classtrib TEXT DEFAULT NULL AFTER nome_classtrib',
                  'lc_redacao TEXT DEFAULT NULL AFTER descricao_classtrib',
                  'lc_referencia VARCHAR(100) DEFAULT "" AFTER lc_redacao',
                  'link VARCHAR(300) DEFAULT "" AFTER lc_referencia'] as $col) {
            $colName = explode(' ', $col)[0];
            try { $pdo->query("SELECT $colName FROM rtc_cst_classtrib LIMIT 1"); }
            catch (PDOException $e) { $pdo->exec("ALTER TABLE rtc_cst_classtrib ADD COLUMN $col"); }
        }
        $pdo->exec("TRUNCATE TABLE rtc_cst_classtrib");
        $s = $pdo->prepare("INSERT INTO rtc_cst_classtrib
            (cst, descricao_cst, classtrib, nome_classtrib, descricao_classtrib, lc_redacao, lc_referencia, link, tipo_aliquota, pred_ibs, pred_cbs, ind_nfce, ind_nfe, d_ini_vig, d_fim_vig)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        foreach ($cstData as $r) {
            $s->execute([
                $r['CST'] ?? '', $r['Descricao_CST'] ?? '',
                $r['cClassTrib'] ?? '', $r['Nome_cClassTrib'] ?? '',
                $r['Descricao_cClassTrib'] ?? '',
                $r['LC_Redacao'] ?? '',
                $r['LC_214_25'] ?? '',
                $r['Link'] ?? '',
                $r['TipoDeAliquota'] ?? '',
                (float)($r['pRedIBS'] ?? 0), (float)($r['pRedCBS'] ?? 0),
                (int)($r['indNFCe'] ?? 0),
                (int)($r['indNFe']  ?? 0),
                !empty($r['dIniVig']) ? $r['dIniVig'] : null,
                !empty($r['dFimVig']) ? $r['dFimVig'] : null
            ]);
        }

        // --- anexos.json → rtc_ncm (tipo=lc214) ---
        $anexosData = json_decode(file_get_contents($rtcDir . 'anexos.json'), true);
        $pdo->exec("DELETE FROM rtc_ncm WHERE tipo = 'lc214'");
        $s = $pdo->prepare("INSERT INTO rtc_ncm (tipo, ncm, legislacao, anexo, cst, classtrib) VALUES ('lc214',?,?,?,?,?)");
        $countAnexos = 0;
        foreach ($anexosData['Nomenclaturas'] as $ncmRow) {
            $codigoOriginal = $ncmRow['Codigo'] ?? '';
            $codigoLimpo = str_replace(['.', '-', ' '], '', trim($codigoOriginal));
            
            // Ignora NCMs inválidos ou curtos demais para serem categorias fiscais (evita falsos positivos)
            if (strlen($codigoLimpo) < 2) continue;

            if (!empty($ncmRow['Anexos'])) {
                foreach ($ncmRow['Anexos'] as $anx) {
                    $s->execute([
                        $codigoLimpo,
                        $anx['Legislacao'] ?? '',
                        $anx['Anexo'] ?? '',
                        $anx['CST'] ?? '',
                        $anx['cClassTrib'] ?? ''
                    ]);
                    $countAnexos++;
                }
            }
        }

        // --- ccredpres.json ---
        $credData = json_decode(file_get_contents($rtcDir . 'ccredpres.json'), true);
        $pdo->exec("TRUNCATE TABLE rtc_ccredpres");
        $s = $pdo->prepare("INSERT INTO rtc_ccredpres (ccredpres, descricao, ind_gcbs, ind_gibs, d_ini_vig, d_fim_vig) VALUES (?,?,?,?,?,?)");
        foreach ($credData as $r) {
            $s->execute([
                $r['cCredPres'] ?? '', $r['Descricao'] ?? '',
                (int)($r['ind_gCBSCredPres'] ?? 0), (int)($r['ind_gIBSCredPres'] ?? 0),
                !empty($r['dIniVig']) ? $r['dIniVig'] : null,
                !empty($r['dFimVig']) ? $r['dFimVig'] : null
            ]);
        }

        echo json_encode([
            'success'   => true,
            'cst_count' => count($cstData),
            'ncm_count' => $countAnexos,
            'cred_count'=> count($credData)
        ]);
        break;

    case 'rtc_consultar_ncm':
        $ncm    = preg_replace('/[^0-9]/', '', $_GET['ncm'] ?? '');
        $modelo = (int)($_GET['modelo'] ?? 65); // 65=NFC-e, 55=NF-e
        if (!$ncm) { echo json_encode([]); break; }
        $hoje       = date('Y-m-d');
        $indColuna  = ($modelo === 55) ? 'c.ind_nfe' : 'c.ind_nfce';
        try {
            $stmt = $pdo->prepare(
                "SELECT n.*,
                        c.nome_classtrib, c.descricao_classtrib, c.lc_redacao, c.lc_referencia, c.link,
                        c.pred_ibs, c.pred_cbs, c.ind_nfce, c.ind_nfe
                 FROM rtc_ncm n
                 INNER JOIN rtc_cst_classtrib c ON n.classtrib = c.classtrib
                 WHERE n.tipo = 'lc214'
                   AND ? LIKE CONCAT(REPLACE(REPLACE(REPLACE(n.ncm, '.', ''), '-', ''), ' ', ''), '%')
                 ORDER BY LENGTH(n.ncm) DESC LIMIT 5"
            );
            $stmt->execute([$ncm]);
            echo json_encode($stmt->fetchAll());
        } catch (PDOException $e) {
            echo json_encode([]);
        }
        break;

    case 'rtc_cst_classtrib':
        $modelo    = (int)($_GET['modelo'] ?? 65); // 65=NFC-e (padrão), 55=NF-e
        $indColuna = ($modelo === 55) ? 'ind_nfe' : 'ind_nfce';
        $hoje = date('Y-m-d');
        try {
            $stmt = $pdo->prepare(
                "SELECT cst, descricao_cst, classtrib, nome_classtrib, tipo_aliquota, pred_ibs, pred_cbs
                 FROM rtc_cst_classtrib
                 ORDER BY cst, classtrib"
            );
            $stmt->execute();
            echo json_encode($stmt->fetchAll());
        } catch (PDOException $e) {
            echo json_encode([]);
        }
        break;

    case 'rtc_ccredpres':
        try {
            $stmt = $pdo->query("SELECT ccredpres, descricao FROM rtc_ccredpres ORDER BY ccredpres");
            echo json_encode($stmt->fetchAll());
        } catch (PDOException $e) {
            echo json_encode([]);
        }
        break;

    // ── Download automático dos JSONs ──────────────────────────────────────
    case 'rtc_atualizar_online':
        $data    = json_decode(file_get_contents('php://input'), true);
        $rtcDir  = __DIR__ . '/../rtc/';
        $arquivos = [
            'cst_classtrib' => $data['urlCstClasstrib'] ?? '',
            'anexos'        => $data['urlAnexos']       ?? '',
            'ccredpres'     => $data['urlCcredpres']    ?? '',
        ];
        $erros    = [];
        $baixados = 0;
        foreach ($arquivos as $nome => $url) {
            $url = trim($url);
            if (empty($url)) continue;
            $conteudo = false;
            // Tenta file_get_contents
            if (ini_get('allow_url_fopen')) {
                $ctx = stream_context_create(['http' => ['timeout' => 30, 'user_agent' => 'NFCe-Pro/1.0']]);
                $conteudo = @file_get_contents($url, false, $ctx);
            }
            // Fallback curl
            if ($conteudo === false && function_exists('curl_init')) {
                $ch = curl_init($url);
                curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_USERAGENT => 'NFCe-Pro/1.0']);
                $conteudo = curl_exec($ch);
                if (curl_getinfo($ch, CURLINFO_HTTP_CODE) !== 200) $conteudo = false;
                curl_close($ch);
            }
            if (empty($conteudo)) { $erros[] = "Falha ao baixar {$nome}"; continue; }
            json_decode($conteudo);
            if (json_last_error() !== JSON_ERROR_NONE) { $erros[] = "JSON inválido: {$nome}"; continue; }
            file_put_contents($rtcDir . $nome . '.json', $conteudo);
            $baixados++;
        }
        if (!empty($erros)) {
            echo json_encode(['success' => false, 'message' => implode(' | ', $erros)]);
        } else {
            echo json_encode(['success' => true, 'baixados' => $baixados, 'message' => "{$baixados} arquivo(s) atualizado(s). Clique em \"Importar Tabelas RTC\" para aplicar."]);
        }
        break;

    // ── Alíquotas de transição (CBS / IBS) ────────────────────────────────
    case 'rtc_aliquotas_listar':
        $pdo->exec("CREATE TABLE IF NOT EXISTS rtc_aliquotas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            imposto VARCHAR(20) NOT NULL,
            percentual DECIMAL(8,4) NOT NULL DEFAULT 0,
            d_ini_vig DATE NOT NULL,
            d_fim_vig DATE DEFAULT NULL,
            observacao VARCHAR(255) DEFAULT '',
            INDEX idx_imposto (imposto)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        // Dados iniciais 2026 se tabela vazia
        $total = (int)$pdo->query("SELECT COUNT(*) FROM rtc_aliquotas")->fetchColumn();
        if ($total === 0) {
            $ins = $pdo->prepare("INSERT INTO rtc_aliquotas (imposto, percentual, d_ini_vig, d_fim_vig, observacao) VALUES (?,?,?,?,?)");
            $ins->execute(['CBS',           0.9000, '2025-07-01', null,         'Alíquota padrão CBS 2026']);
            $ins->execute(['IBS_UF',        0.1000, '2025-07-01', '2026-12-31', 'IBS UF — período de transição 2026']);
            $ins->execute(['IBS_UF',        0.0500, '2027-01-01', '2028-12-31', 'IBS UF — período de transição 2027-2028']);
            $ins->execute(['IBS_MUNICIPAL', 0.0000, '2025-07-01', '2026-12-31', 'IBS Municipal — período de transição 2026']);
            $ins->execute(['IBS_MUNICIPAL', 0.0500, '2027-01-01', '2028-12-31', 'IBS Municipal — período de transição 2027-2028']);
        }
        $hoje = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
        $rows = $pdo->query("SELECT *, (d_ini_vig <= '{$hoje}' AND (d_fim_vig IS NULL OR d_fim_vig >= '{$hoje}')) AS vigente FROM rtc_aliquotas ORDER BY imposto, d_ini_vig")->fetchAll();
        echo json_encode($rows);
        break;

    case 'rtc_aliquota_salvar':
        $data = json_decode(file_get_contents('php://input'), true);
        $dFim = !empty($data['dFimVig']) ? $data['dFimVig'] : null;
        if (!empty($data['id'])) {
            $pdo->prepare("UPDATE rtc_aliquotas SET imposto=?, percentual=?, d_ini_vig=?, d_fim_vig=?, observacao=? WHERE id=?")
                ->execute([$data['imposto'], (float)$data['percentual'], $data['dIniVig'], $dFim, $data['observacao'] ?? '', $data['id']]);
        } else {
            $pdo->prepare("INSERT INTO rtc_aliquotas (imposto, percentual, d_ini_vig, d_fim_vig, observacao) VALUES (?,?,?,?,?)")
                ->execute([$data['imposto'], (float)$data['percentual'], $data['dIniVig'], $dFim, $data['observacao'] ?? '']);
        }
        echo json_encode(['success' => true]);
        break;

    case 'rtc_aliquota_excluir':
        $id = (int)($_GET['id'] ?? 0);
        $pdo->prepare("DELETE FROM rtc_aliquotas WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
        break;

}
