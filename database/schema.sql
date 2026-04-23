-- Schema SQL para Sistema de Emissão de NFC-e (Modelo 65)
-- Projetado para PostgreSQL ou MySQL
-- Foco em integridade referencial e precisão tributária conforme nfephp-org/sped-nfe

-- 1. Tabela de Empresas (Emitentes)
CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    inscricao_estadual VARCHAR(15),
    inscricao_municipal VARCHAR(15),
    crt CHAR(1) NOT NULL, -- 1-Simples Nacional, 2-Simples Nacional (Excesso), 3-Regime Normal
    
    -- Endereço
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(60) NOT NULL,
    complemento VARCHAR(255),
    bairro VARCHAR(60) NOT NULL,
    codigo_municipio CHAR(7) NOT NULL, -- Código IBGE
    municipio VARCHAR(60) NOT NULL,
    uf CHAR(2) NOT NULL,
    cep CHAR(8) NOT NULL,
    telefone VARCHAR(20),
    
    -- Configurações Técnicas
    certificado_caminho TEXT, -- Caminho do arquivo .pfx/.p12
    certificado_senha VARCHAR(255),
    csc_token VARCHAR(255), -- Token de autenticação NFC-e
    csc_id VARCHAR(10),     -- Identificador do Token (ex: 000001)
    ambiente CHAR(1) DEFAULT '2', -- 1-Produção, 2-Homologação
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Clientes (Destinatários)
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(14), -- CPF ou CNPJ (Opcional para NFC-e de baixo valor)
    email VARCHAR(255),
    
    -- Endereço (Opcional para NFC-e)
    logradouro VARCHAR(255),
    numero VARCHAR(60),
    bairro VARCHAR(60),
    codigo_municipio CHAR(7),
    municipio VARCHAR(60),
    uf CHAR(2),
    cep CHAR(8),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Produtos e Regras Tributárias
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    codigo_interno VARCHAR(60) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    ean VARCHAR(14), -- GTIN/EAN
    ncm CHAR(8) NOT NULL,
    cest CHAR(7),
    unidade_comercial VARCHAR(6) NOT NULL, -- UN, KG, PC, etc
    valor_unitario DECIMAL(15,4) NOT NULL,
    
    -- Tributação Base
    cfop CHAR(4) NOT NULL,
    origem_mercadoria CHAR(1) NOT NULL, -- 0-Nacional, 1-Estrangeira, etc
    
    -- ICMS
    icms_cst_csosn VARCHAR(3) NOT NULL, -- CST ou CSOSN
    icms_aliquota DECIMAL(15,4) DEFAULT 0.0000,
    
    -- PIS
    pis_cst VARCHAR(2) NOT NULL,
    pis_aliquota DECIMAL(15,4) DEFAULT 0.0000,
    
    -- COFINS
    cofins_cst VARCHAR(2) NOT NULL,
    cofins_aliquota DECIMAL(15,4) DEFAULT 0.0000,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Vendas (Cabeçalho da NFC-e)
CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id),
    cliente_id INTEGER REFERENCES clientes(id),
    
    serie INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    data_emissao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    valor_total DECIMAL(15,4) NOT NULL,
    valor_desconto DECIMAL(15,4) DEFAULT 0.0000,
    
    -- Status e Retorno SEFAZ
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente', -- Pendente, Autorizada, Cancelada, Rejeitada
    chave_acesso CHAR(44),
    protocolo VARCHAR(20),
    xml_envio TEXT,
    xml_retorno TEXT,
    qrcode_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Itens da Venda
CREATE TABLE venda_itens (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    
    quantidade DECIMAL(15,4) NOT NULL,
    valor_unitario DECIMAL(15,4) NOT NULL,
    valor_total DECIMAL(15,4) NOT NULL,
    valor_desconto DECIMAL(15,4) DEFAULT 0.0000,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Formas de Pagamento (Conforme Tabela SEFAZ)
CREATE TABLE venda_pagamentos (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    
    -- 01-Dinheiro, 02-Cheque, 03-Cartão, 04-Cartão Débito, 15-Boleto, 17-PIX
    forma_pagamento CHAR(2) NOT NULL, 
    valor_pagamento DECIMAL(15,4) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Logs e Auditoria SEFAZ
CREATE TABLE logs_sefaz (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER REFERENCES vendas(id),
    c_stat VARCHAR(5),
    x_motivo TEXT,
    xml_request TEXT,
    xml_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Inutilização de Numeração
CREATE TABLE inutilizacoes (
    id SERIAL PRIMARY KEY,
    serie INTEGER NOT NULL,
    numero_inicial INTEGER NOT NULL,
    numero_final INTEGER NOT NULL,
    justificativa TEXT NOT NULL,
    protocolo VARCHAR(20),
    xml_request TEXT,
    xml_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vendas ADD COLUMN justificativa_cancelamento TEXT;
ALTER TABLE vendas ADD COLUMN xml_cancelamento TEXT;

-- Índices para performance
CREATE INDEX idx_vendas_data ON vendas(data_emissao);
CREATE INDEX idx_vendas_chave ON vendas(chave_acesso);
CREATE INDEX idx_produtos_codigo ON produtos(codigo_interno);
