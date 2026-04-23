-- Exclui colunas IBPT defasadas armazenadas estaticamente na tabela produtos.
-- Emissão continuará funcionando com consulta em rede (Passo 2). 

ALTER TABLE `produtos`
DROP COLUMN `percentual_tributos`,
DROP COLUMN `percentual_tributos_nacional`,
DROP COLUMN `percentual_tributos_estadual`;
