-- ============================================================
-- Script de migração: código interno por empresa (6 dígitos)
-- Executar UMA VEZ no banco de dados de produção.
-- Após execução, os códigos serão no formato 000001, 000002...
-- por empresa, garantindo isolamento entre clientes.
-- ============================================================

-- 1) Garante que a coluna suporte 6 caracteres
ALTER TABLE produtos MODIFY COLUMN codigo_interno VARCHAR(10) DEFAULT NULL;

-- 2) Zera temporariamente os códigos para reatribuição sequencial
--    Salva o ID original como referência para manter a ordenação
UPDATE produtos p
JOIN (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY id ASC) AS seq
    FROM produtos
) ranked ON p.id = ranked.id
SET p.codigo_interno = LPAD(ranked.seq, 6, '0');

-- 3) Verifica resultado
SELECT empresa_id, codigo_interno, descricao
FROM produtos
ORDER BY empresa_id, codigo_interno;
