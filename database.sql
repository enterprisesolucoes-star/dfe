-- Criação do Banco de Dados para ERP NFC-e
-- Compatível com MySQL/MariaDB (Hostinger)

CREATE TABLE IF NOT EXISTS empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    razao_social VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) NOT NULL,
    inscricao_estadual VARCHAR(20),
    csc_token VARCHAR(100),
    csc_id VARCHAR(10),
    ambiente TINYINT DEFAULT 2, -- 1: Produção, 2: Homologação
    uf CHAR(2) DEFAULT 'GO',
    codigo_municipio VARCHAR(10) DEFAULT '5208707',
    numero_nfce INT DEFAULT 0,
    serie_nfce INT DEFAULT 1,
    certificado_pfx LONGBLOB,
    certificado_senha VARCHAR(255),
    gerar_credito_simples TINYINT DEFAULT 0,
    aliquota_credito_simples DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_interno VARCHAR(50),
    descricao VARCHAR(255) NOT NULL,
    ncm VARCHAR(10) NOT NULL,
    unidade_comercial VARCHAR(10) DEFAULT 'UN',
    valor_unitario DECIMAL(10,2) NOT NULL,
    cfop VARCHAR(4) DEFAULT '5102',
    icms_cst_csosn VARCHAR(3) DEFAULT '102',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(18), -- CPF ou CNPJ
    email VARCHAR(255),
    telefone VARCHAR(20),
    logradouro VARCHAR(255),
    numero VARCHAR(10),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    municipio VARCHAR(100),
    codigo_municipio VARCHAR(10),
    uf CHAR(2),
    cep VARCHAR(10),
    regime_tributario CHAR(1) DEFAULT '1' COMMENT '1=Simples, 2=Presumido, 3=Real',
    entidade_governamental CHAR(1) DEFAULT '0' COMMENT '0=Nao, 1=Uniao, 2=Estado, 3=DF, 4=Mun',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT,
    numero INT NOT NULL,
    serie INT DEFAULT 1,
    finalidade_compra TINYINT DEFAULT 1 COMMENT '1=Revenda/Ind, 2=Uso/Cons',
    data_emissao DATETIME DEFAULT CURRENT_TIMESTAMP,
    valor_total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pendente', -- Pendente, Autorizada, Cancelada, Rejeitada
    chave_acesso VARCHAR(44),
    protocolo VARCHAR(20),
    xml_autorizado LONGTEXT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS itens_venda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venda_id INT,
    produto_id INT,
    quantidade DECIMAL(10,3) NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (venda_id) REFERENCES vendas(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL,
    descricao VARCHAR(100) NOT NULL,
    fator DECIMAL(10,3) DEFAULT 1.000,
    pesavel TINYINT DEFAULT 0,
    ativo TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO medidas (codigo, descricao, fator, pesavel) VALUES
('UN', 'Unidade', 1.000, 0),
('CX', 'Caixa', 1.000, 0),
('KG', 'Quilograma', 1.000, 1),
('LT', 'Litro', 1.000, 0),
('MT', 'Metro', 1.000, 0),
('PC', 'Pacote', 1.000, 0);

-- Inserção de dados iniciais para teste
CREATE TABLE IF NOT EXISTS bandeiras (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tpag VARCHAR(2),
  tband_opc VARCHAR(50),
  cnpj_opc VARCHAR(20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO bandeiras (id, tpag, tband_opc, cnpj_opc) VALUES
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
ON DUPLICATE KEY UPDATE id=id;

-- Inserção de dados iniciais para teste
INSERT INTO produtos (codigo_interno, descricao, ncm, valor_unitario, cfop) VALUES 
('001', 'Café Espresso', '21011110', 5.50, '5102'),
('002', 'Pão de Queijo', '19059090', 4.00, '5102')
ON DUPLICATE KEY UPDATE id=id;
