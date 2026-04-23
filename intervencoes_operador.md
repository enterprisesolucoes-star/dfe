# Intervenções do Operador — Guia de Lançamentos

Este arquivo descreve situações em que o sistema **exige ação manual** ou **exibe alertas** durante a operação. Cada seção indica o tipo de lançamento, o que o sistema faz automaticamente e o que o operador precisa fazer.

---

## 1. Cadastro de Produto — NCM e classificação RTC (CBS/IBS)

**Quando ocorre:** ao digitar um NCM completo (8 dígitos) no cadastro do produto, aba **Fiscal**.

**O que o sistema faz automaticamente:**
- Consulta IBPT → exibe descrição do NCM + alíquotas nacionais/estaduais
- Consulta tabela RTC (`rtc_ncm` via LC 214) → exibe cards de sugestão CBS/IBS

**Três tipos de card exibidos:**

| Card | Cor | Significado |
|------|-----|-------------|
| CST + cClassTrib de anexo especial | 🟣 Roxo | NCM tem tratamento diferenciado em algum anexo da LC 214 |
| CST 000 / cClassTrib 000001 | ⬜ Cinza | NCM não está em nenhum anexo especial → tributação integral padrão |
| cClassTrib 200xxx | 🟡 Âmbar | Benefício restrito a finalidade específica (ex.: cadeia produtiva de alimentos) |

**O que o operador deve fazer:**
1. Ler a descrição de cada card
2. Se houver **múltiplos cards**: escolher o que corresponde ao uso típico do produto na empresa
3. Card âmbar → clicar em **"Verificar"**, ler a descrição do benefício e confirmar se aplica
4. Clicar **"Aplicar"** (roxo/cinza) ou **"Confirmar e Aplicar"** (âmbar)
5. Preencher **cCredPres** manualmente se o produto gerar crédito presumido
6. Salvar — os campos ficam como template para futuras emissões de NF-e

> **Atenção:** o sistema sempre aplica o CST e cClassTrib quando há correspondência, independentemente do percentual de redução ser zero. Um percentual de redução `0` significa tributação integral, não "não aplicar".

---

## 2. NF-e — Produto adicionado sem CBS/IBS cadastrado

**Quando ocorre:** ao adicionar na NF-e um produto cujo cadastro não tem `cbsCst` nem `ibsCst` preenchidos.

**O que o sistema faz automaticamente:**
- Consulta a tabela RTC pelo NCM do produto em tempo real
- Aplica o resultado e exibe banner acima da lista de itens:

| Banner | Cor | O que aconteceu |
|--------|-----|-----------------|
| "CBS/IBS pré-preenchido via NCM (anexo LC 214)" | 🟣 Roxo | NCM encontrado em anexo especial — CST e cClassTrib aplicados |
| "NCM sem enquadramento especial — tributação integral (CST 000 / 000001)" | ⬜ Cinza | NCM não listado em nenhum anexo; sistema aplicou padrão mínimo |
| "Benefício de finalidade específica (200xxx) — confirme antes de emitir" | 🟡 Âmbar | NCM retornou apenas resultado 200xxx; CBS/IBS **não** foram preenchidos automaticamente |

**O que o operador deve fazer:**
1. Clicar no ícone ✏️ do item → aba **REFORMA**
2. Confirmar se o CST e cClassTrib aplicados correspondem à operação
3. Banner cinza: verificar se CST 000 / 000001 está mesmo correto para esse produto
4. Banner âmbar: ver seção 3
5. Preencher **cCredPres** se aplicável → salvar

> **Recomendação:** cadastre CBS/IBS diretamente no produto (Procedimento 1) para não depender do preenchimento automático a cada lançamento.

---

## 3. NF-e — Produto com benefício de finalidade específica (cClassTrib 200xxx)

**Quando ocorre:**
- Produto já tem `cbsClasstrib` ou `ibsClasstrib` começando com `2` (ex.: 201001, 200500)
- Ou lookup automático retorna apenas enquadramentos 200xxx

**O que o sistema faz:**
- Exibe **banner âmbar** por item — CBS/IBS **não** são preenchidos automaticamente
- Ao tentar emitir → abre modal de **confirmação obrigatória** com a lista dos itens afetados e redireciona para aba PRODUTOS
- Só prossegue na **segunda tentativa** de emissão, após o operador confirmar no modal

**O que o operador deve fazer:**
1. Verificar se destinatário, finalidade e uso do produto realmente se enquadram no benefício descrito
2. Se enquadra → confirmar no modal e tentar emitir novamente
3. Se não enquadra → abrir ✏️ do item → aba **REFORMA** → corrigir o cClassTrib para o código adequado

> **Exemplo de risco:** refrigerador (NCM 8418) com cClassTrib de bem da cadeia produtiva de alimentos (200xxx) vendido para escritório de advocacia. O benefício é exclusivo para a cadeia de alimentos — usar fora desse contexto sujeita a autuação fiscal.

---

## 4. NF-e — Destinatário Pessoa Jurídica (CNPJ)

**Quando ocorre:** ao selecionar um cliente com CNPJ (14 dígitos).

**O que o sistema faz automaticamente:**
- `consumidorFinal` → `'0'` (Não é Consumidor Final)
- `indIEDest` → `'1'` se tiver IE com inscrição; `'2'` se ISENTO; `'9'` se sem IE

**O que o operador deve verificar:**
1. **Tipo de Tributação** (campo no card do destinatário):
   - `1` = Contribuinte ICMS → destaca ICMS na apuração própria
   - `2` = Contribuinte Isento → tem IE mas não recolhe
   - `9` = Não Contribuinte → sem IE (MEI sem IE, profissional liberal, etc.)
2. **Finalidade da Compra** (canto superior direito da seção Destinatário):
   - `Revenda / Industrialização` → cliente vai revender ou industrializar
   - `Uso e Consumo` → cliente vai consumir (não gera crédito de ICMS para ele)

> ⚠️ O sistema **não define automaticamente** a Finalidade da Compra — o operador escolhe conforme a negociação.

---

## 5. NF-e — Destinatário Pessoa Física (CPF)

**Quando ocorre:** ao selecionar um cliente com CPF (11 dígitos).

**O que o sistema faz automaticamente:**
- `consumidorFinal` → `'1'` (Consumidor Final PF)
- `indIEDest` → `'9'` (Não Contribuinte)

**O que o operador deve verificar:**
1. Operação com entrega em domicílio ou presença no estabelecimento → ajustar **Indicador de Presença** (aba Identificação)
2. Operações de alto valor → considerar informar o CPF nas Informações Adicionais para fins fiscais

---

## 6. NF-e — Operação Não Onerosa (Bonificação, Brinde, Doação, Remessa)

**Quando ocorre:** ao selecionar Natureza da Operação como REMESSA, BONIFICAÇÃO, BRINDE, DOAÇÃO, TRANSFERÊNCIA INTERNA, AUTOCONSUMO ou USO PESSOAL.

**O que o sistema faz automaticamente:**
- `tipoOperacao` de **todos os itens** → `'naoOnerosa'` (inclusive itens já adicionados antes da mudança)

**O que o operador deve verificar:**
1. Aba **REFORMA** de cada item → CST de CBS/IBS deve refletir imunidade ou não incidência:
   - CST `05` = Imune
   - CST `07` = Não incidência
2. **CFOP** dos itens (operações não onerosas usam CFOPs distintos de venda):
   - Remessa: 5.949 / 6.949
   - Bonificação / Brinde / Doação: 5.910 / 6.910
3. Forma de pagamento → usar **"Sem Pagamento" (código 90)**

---

## 7. NF-e — Devolução de Mercadoria (Finalidade 4)

**Quando ocorre:** ao emitir NF-e com Finalidade `4 – Devolução de Mercadoria`.

**O que o sistema NÃO faz automaticamente:**
- Não busca a NF-e de origem
- Não espelha CFOPs nem alíquotas da nota original

**O que o operador deve fazer obrigatoriamente:**
1. **Natureza da Operação** → "DEVOLUÇÃO DE COMPRA" ou similar
2. **CFOP** de cada item → CFOP de devolução correspondente:
   - Dentro do estado: 5.201 / 5.202
   - Fora do estado: 6.201 / 6.202
3. **Informações Adicionais** → incluir a chave de acesso da nota original:
   > `Em devolução à NF-e chave: 35xxxxxx...`
4. Alíquotas ICMS, PIS, COFINS → devem espelhar exatamente a nota original

---

## 8. NF-e — Nota Complementar (Finalidade 2)

**Quando ocorre:** ao emitir NF-e com Finalidade `2 – NF-e Complementar`.

**O que o operador deve fazer:**
1. **Informações Adicionais** → referenciar a chave de acesso da nota original
2. Lançar apenas a **diferença** de valor — não o total da operação original
3. Verificar se CBS/IBS também precisam ser complementados → ajustar na aba **REFORMA** de cada item

---

## 9. NF-e — Desconto e Outras Despesas (Totais e Bases)

**Quando ocorre:** sempre que houver desconto comercial ou acréscimos na nota.

**Comportamento:**
- **(-) Desconto** → campo editável diretamente no painel "Totais e Bases"; afeta o Total da Nota em tempo real
- **Outras Desp.** → campo editável (`valorOutras`); use para embalagem, seguros ou acréscimos fora do frete
- **Frete e Seguro** → editáveis na aba **Transporte** (não aparecem no painel Totais)

**O que o operador deve saber:**
- O desconto do painel Totais é o **desconto global da nota** (`vDesc` do XML) — descontos individuais por item são acumulados separadamente
- A **BC ICMS** exibida reflete apenas itens com alíquota de ICMS > 0; itens isentos (CSOSN 500, CST 40 etc.) não entram na base

---

## 10. NF-e — Emissão em Contingência

**Quando ocorre:** `emissaoContingencia = true` nas configurações da empresa.

**O que o operador deve saber:**
- A NF-e é gerada com status `Contingencia` — **não autorizada pela SEFAZ**
- O DANFE pode ser impresso e entregue
- Transmitir manualmente quando a conectividade retornar: aba **NF-e Geral** → reenviar
- Prazo máximo para regularização: **168 horas** após o retorno

---

## Resumo rápido — Checklist por tipo de lançamento

| Tipo de lançamento | Intervenções obrigatórias |
|--------------------|--------------------------|
| Cadastro de produto (novo NCM) | Clicar "Aplicar" no card RTC (roxo/cinza/âmbar) + preencher cCredPres se houver |
| Venda NF-e — PJ com IE | Verificar indIEDest (1/2/9) + definir Finalidade da Compra |
| Venda NF-e — PF | Confirmar consumidorFinal = 1 + Indicador de Presença |
| Produto sem CBS/IBS na NF-e | Revisar aba REFORMA do item após banner aparecer |
| Banner cinza (CST 000/000001) | Confirmar se tributação integral está correta para o produto |
| Banner âmbar (200xxx) | Confirmar enquadramento no modal obrigatório antes de emitir |
| Operação não onerosa | Ajustar CFOP + CST CBS/IBS (imunidade/não incidência) + pagamento 90 |
| Devolução (finalidade 4) | Informar chave original + CFOP devolução + espelhar alíquotas |
| Complementar (finalidade 2) | Referenciar chave original + lançar só a diferença |
| Desconto global na nota | Informar no painel Totais (≠ desconto por item) |
| Contingência | Retransmitir em até 168h quando SEFAZ retornar |
