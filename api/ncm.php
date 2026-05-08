<?php
switch ($action) {

    case 'ncm_listar':
        $q      = trim($_GET['q'] ?? '');
        $uf     = strtoupper(trim($_GET['uf'] ?? ''));
        $limit  = min((int)($_GET['limit'] ?? 50), 200);
        $offset = (int)($_GET['offset'] ?? 0);
        $where  = ["tipo = 'ibpt'"];
        $params = [];
        if ($q !== '') {
            $where[] = '(ncm LIKE ? OR descricao LIKE ?)';
            $params[] = "%{$q}%";
            $params[] = "%{$q}%";
        }
        if ($uf !== '') {
            $where[] = 'uf = ?';
            $params[] = $uf;
        }
        $whereStr = implode(' AND ', $where);
        $sql = "SELECT id, ncm AS codigo, ex, tabela, descricao,
                       aliq_nacional AS aliquota_nacional,
                       aliq_estadual AS aliquota_estadual,
                       uf, vigencia_fim
                FROM rtc_ncm WHERE {$whereStr}
                ORDER BY ncm, uf LIMIT {$limit} OFFSET {$offset}";
        $sqlTotal = "SELECT COUNT(*) FROM rtc_ncm WHERE {$whereStr}";
        try {
            $stmtT = $pdo->prepare($sqlTotal); $stmtT->execute($params);
            $total = (int)$stmtT->fetchColumn();
            $stmtL = $pdo->prepare($sql); $stmtL->execute($params);
            echo json_encode(['total' => $total, 'data' => $stmtL->fetchAll()]);
        } catch (PDOException $e) {
            echo json_encode(['total' => 0, 'data' => []]);
        }
        break;

    case 'ncm_ufs':
        try {
            $rows = $pdo->query("SELECT uf, COUNT(*) as total FROM rtc_ncm WHERE tipo = 'ibpt' AND uf IS NOT NULL GROUP BY uf ORDER BY uf")->fetchAll();
            echo json_encode($rows);
        } catch (PDOException $e) {
            echo json_encode([]);
        }
        break;

    case 'ncm_importar':
        if (empty($_FILES['csv']) || $_FILES['csv']['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(['success' => false, 'message' => 'Arquivo não recebido.']); break;
        }
        $_csvMime = mime_content_type($_FILES['csv']['tmp_name']);
        if (!$_csvMime || !in_array($_csvMime, ['text/plain','text/csv','application/csv','application/vnd.ms-excel'])) {
            echo json_encode(['success' => false, 'message' => 'Formato inválido. Envie um arquivo CSV.']); break;
        }
        if (strtolower(pathinfo($_FILES['csv']['name'], PATHINFO_EXTENSION)) !== 'csv') {
            echo json_encode(['success' => false, 'message' => 'Extensão inválida. Use .csv']); break;
        }
        $uf = strtoupper(trim($_POST['uf'] ?? ''));
        if (strlen($uf) !== 2) { echo json_encode(['success' => false, 'message' => 'UF inválida.']); break; }

        // Garante que a tabela unificada existe
        $pdo->exec("CREATE TABLE IF NOT EXISTS rtc_ncm (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tipo ENUM('lc214','ibpt') NOT NULL,
            ncm VARCHAR(20) NOT NULL,
            legislacao VARCHAR(50) DEFAULT NULL,
            anexo VARCHAR(20) DEFAULT NULL,
            cst VARCHAR(10) DEFAULT NULL,
            classtrib VARCHAR(20) DEFAULT NULL,
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

        // Remove entradas IBPT desta UF antes de reimportar
        $pdo->prepare("DELETE FROM rtc_ncm WHERE tipo = 'ibpt' AND uf = ?")->execute([$uf]);

        $handle = fopen($_FILES['csv']['tmp_name'], 'r');
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") rewind($handle);
        fgetcsv($handle, 2000, ';'); // pula cabeçalho

        $stmt = $pdo->prepare("INSERT INTO rtc_ncm
            (tipo, ncm, ex, tabela, descricao, aliq_nacional, aliq_importados,
             aliq_estadual, aliq_municipal, vigencia_inicio, vigencia_fim, chave, versao, fonte, uf)
            VALUES ('ibpt',?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

        $toFloat = fn($v) => (float)str_replace(',', '.', trim($v ?? '0'));
        $toDate  = function($v) {
            $v = trim($v ?? '');
            if (preg_match('#(\d{2})/(\d{2})/(\d{4})#', $v, $m)) return "{$m[3]}-{$m[2]}-{$m[1]}";
            return null;
        };

        $linhas = 0;
        $pdo->beginTransaction();
        try {
            while (($col = fgetcsv($handle, 2000, ';')) !== false) {
                if (count($col) < 10) continue;
                $ncmCodigo = preg_replace('/[^0-9]/', '', $col[0]);
                if (strlen($ncmCodigo) !== 8) continue; // ignora NCMs que não sejam de 8 dígitos
                $stmt->execute([
                    $ncmCodigo,
                    trim($col[1] ?? '0'),
                    strtoupper(trim($col[2] ?? 'II')),
                    mb_substr(trim($col[3] ?? ''), 0, 300),
                    $toFloat($col[4]), $toFloat($col[5]), $toFloat($col[6]), $toFloat($col[7]),
                    $toDate($col[8]), $toDate($col[9]),
                    trim($col[10] ?? ''), trim($col[11] ?? ''), trim($col[12] ?? ''), $uf
                ]);
                $linhas++;
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => "{$linhas} registros importados para UF {$uf}."]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Erro: ' . $e->getMessage()]);
        }
        fclose($handle);
        break;

    // IBPT Online: consulta NCM na API De Olho no Imposto + cache em rtc_ncm
    case 'ibpt_buscar_online':
         = preg_replace('/[^0-9]/', '', ['ncm'] ?? '');
        if (strlen() !== 8) { echo json_encode(['success' => false, 'message' => 'NCM deve ter 8 digitos.']); break; }
         = ['IBPT_TOKEN'] ?? '';
          = ['IBPT_CNPJ']  ?? '';
        if (empty() || empty()) {
            echo json_encode(['success' => false, 'message' => 'Token IBPT nao configurado.']); break;
        }
         = ->prepare(SELECT uf FROM empresas WHERE id = ?);
        ->execute([ ?: 1]);
         = strtoupper(->fetchColumn() ?: 'GO');
         = 'https://apidoni.ibpt.org.br/api/v1/produtos?' . http_build_query([
            'token' => , 'cnpj' => , 'codigo' => ,
            'uf' => , 'ex' => 0, 'descricao' => 'Produto',
            'unidadeMedida' => 'UN', 'valor' => 1, 'gtin' => 'SEM GTIN',
        ]);
         = false;  = 0;
        if (function_exists('curl_init')) {
             = curl_init();
            curl_setopt_array(, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
                CURLOPT_SSL_VERIFYPEER => false, CURLOPT_USERAGENT => 'DFeIA/1.0',
                CURLOPT_HTTPHEADER => ['Accept: application/json']]);
             = curl_exec();
             = curl_getinfo(, CURLINFO_HTTP_CODE);
            curl_close();
            if ( !== 200)  = false;
        }
        if ( === false && ini_get('allow_url_fopen')) {
             = stream_context_create(['http' => ['timeout' => 15, 'header' => 'Accept: application/json', 'user_agent' => 'DFeIA/1.0']]);
             = @file_get_contents(, false, );
        }
         =  ? json_decode(, true) : null;
        if (! || !is_array() || empty() || isset(['Message'])) {
             = isset(['Message']) ? ['Message'] : 'NCM nao encontrado na API IBPT.';
            echo json_encode(['success' => false, 'message' => ]); break;
        }
         = [0];
          = (float)(['Nacional']  ?? 0);
          = (float)(['Estadual']  ?? 0);
         = (float)(['Importado'] ?? 0);
         = (float)(['Municipal'] ?? 0);
         = ['Descricao'] ?? '';
         = ['VigenciaInicio'] ?? null;
         = ['VigenciaFim']    ?? null;
          = ['Chave']  ?? null;
         = ['Versao'] ?? null;
          = ['Fonte']  ?? null;
        // Upsert cache em rtc_ncm
         = ->prepare("SELECT id FROM rtc_ncm WHERE tipo='ibpt' AND ncm=? AND uf=? AND (ex='0' OR ex='') LIMIT 1");
        ->execute([, ]);
        if (->fetchColumn()) {
            ->prepare("UPDATE rtc_ncm SET descricao=?, aliq_nacional=?, aliq_importados=?, aliq_estadual=?,
                aliq_municipal=?, vigencia_inicio=?, vigencia_fim=?, chave=?, versao=?, fonte=?
                WHERE tipo='ibpt' AND ncm=? AND uf=? AND (ex='0' OR ex='')")
                ->execute([, , , , ,
                    , , , , , , ]);
        } else {
            ->prepare("INSERT INTO rtc_ncm (tipo,ncm,ex,tabela,descricao,aliq_nacional,aliq_importados,
                aliq_estadual,aliq_municipal,vigencia_inicio,vigencia_fim,chave,versao,fonte,uf)
                VALUES ('ibpt',?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([,'0','II',,,,,,
                    ,,,,,]);
        }
        echo json_encode(['success'=>true,'codigo'=>,'uf'=>,'descricao'=>,
            'nacional'=>,'estadual'=>,'importado'=>,'municipal'=>,
            'versao'=>,'fonte'=>]);
        break;


}
