# Apuração da Reforma Tributária (IBS/CBS) — LC 214/2025

## Procedimento 1 — Cadastro de Produto: ao digitar o NCM

### O que o sistema faz

**Gatilho:** campo NCM atinge 8 dígitos (`handleNcmChange` em `CadastrosModule.tsx`).

**Passo 1 — Consulta paralela à API:**
```
GET api.php?action=ncm_listar&q={ncm}&limit=5            → tabela IBPT (alíquotas nacionais/estaduais)
GET api.php?action=rtc_consultar_ncm&ncm={ncm}&modelo=55 → tabela rtc_ncm (enquadramentos IBS/CBS)
```

**Passo 2 — O backend (`rtc_consultar_ncm`) faz:**
- Busca na tabela `rtc_ncm` (tipo = 'lc214') pelo NCM exato ou por prefixo (capítulo/posição)
- Faz `INNER JOIN rtc_cst_classtrib ON classtrib` para trazer `pred_cbs`, `pred_ibs`, indicadores
- Retorna array com campos: `cst`, `classtrib`, `nome_classtrib`, `pred_cbs`, `pred_ibs`, `legislacao`, `anexo`
- Pode retornar múltiplos enquadramentos para o mesmo NCM

> **Nota:** `pred_cbs` e `pred_ibs` são **percentuais de redução** (0 = sem redução = tributação integral). Não são flags booleanos de aplicabilidade — o sistema aplica o CST independentemente do valor ser zero.

**Passo 3 — Frontend classifica cada resultado:**
```typescript
isRtcContextSpecific(r) = String(r.classtrib ?? '').startsWith('2')
  → TRUE  = benefício de finalidade específica (cClassTrib 200xxx)
  → FALSE = tributação padrão ou especial não restrita
```

**Passo 4 — Se `rtc` retorna vazio (NCM não está em nenhum anexo especial da LC 214):**
```typescript
// Sistema injeta entrada sintética de tributação integral padrão
rtc = [{
  cst: '000', classtrib: '000001',
  nome_classtrib: 'Tributação integral — sem enquadramento especial nos anexos LC 214',
  pred_cbs: 1, pred_ibs: 1,
  legislacao: 'LC 214/2025 Art. 4º',
  _padrao: true
}]
```

**Passo 5 — Exibição dos cards ao usuário:**

| Card | Cor | Quando aparece | Botão |
|------|-----|----------------|-------|
| CST + cClassTrib do anexo LC 214 | 🟣 Roxo | NCM listado em anexo especial | "Aplicar" → aplica diretamente |
| CST 000 / cClassTrib 000001 | ⬜ Cinza | NCM sem enquadramento especial | "Aplicar" → aplica tributação integral |
| cClassTrib 200xxx | 🟡 Âmbar | Benefício de finalidade específica | "Verificar" → painel de confirmação |

**Passo 6 — `applyRtcSugestao(idx)` aplica no cadastro:**
```typescript
// Sempre aplica CST e classtrib — pred_cbs/pred_ibs não bloqueiam mais
cbsCst       = hit.cst       || p.cbsCst;
cbsClasstrib = hit.classtrib || p.cbsClasstrib;
ibsCst       = hit.cst       || p.ibsCst;
ibsClasstrib = hit.classtrib || p.ibsClasstrib;
```
- Para card âmbar: abre painel inline de confirmação antes de aplicar
- `cCredPres` → preenchimento manual (varia por operação e emitente)

**Passo 7 — Gravação:**
- Valores salvos na tabela `produtos` — servem de template para emissões de NF-e

---

## Procedimento 2 — Emissão de NF-e: ao lançar um produto

### O que o sistema analisa e faz

**Gatilho:** usuário seleciona produto → `adicionarProduto(p)` em `NfeDashboard.tsx` (função `async`).

**Passo 1 — Copia classificação gravada no produto:**
```typescript
cbsCst, cbsClasstrib, ibsCst, ibsClasstrib, cCredPres
```

**Passo 2 — Se CBS/IBS estiver vazio no produto → lookup automático em tempo real:**
```
GET api.php?action=rtc_consultar_ncm&ncm={ncm}&modelo=55
```
Três cenários possíveis:

| Resultado | Ação do sistema | Banner exibido |
|-----------|----------------|----------------|
| Enquadramento padrão encontrado (não 200xxx) | Aplica CST e classtrib automaticamente | 🟣 Roxo: "CBS/IBS pré-preenchido via NCM (anexo LC 214)" |
| Enquadramento 200xxx encontrado | **Não aplica** — aguarda confirmação do operador | 🟡 Âmbar: "Benefício de finalidade específica — confirme antes de emitir" |
| Nenhum enquadramento (NCM sem anexo especial) | Aplica CST 000 / cClassTrib 000001 automaticamente | ⬜ Cinza: "NCM sem enquadramento especial — tributação integral (CST 000 / 000001)" |

> A mesma lógica de `applyRtcSugestao` do Procedimento 1 se aplica aqui: CST e classtrib são aplicados independentemente do valor de `pred_cbs`/`pred_ibs`.

**Passo 3 — Define `tipoOperacao` pela `naturezaOperacao` da NF-e:**
```typescript
tipoOperacao = NATUREZAS_OPTIONS.find(o => o.value === form.naturezaOperacao)?.tipo || 'onerosa'
```

| naturezaOperacao | tipoOperacao |
|------------------|-------------|
| VENDA, VENDA DE PRODUÇÃO PRÓPRIA | `onerosa` |
| REMESSA, BONIFICAÇÃO, BRINDE, DOAÇÃO, TRANSFERÊNCIA INTERNA, AUTOCONSUMO, USO PESSOAL | `naoOnerosa` |

**Passo 4 — Sincronização automática de `tipoOperacao`:**
- Se `naturezaOperacao` mudar após itens já adicionados → `tipoOperacao` de **todos os itens** é atualizado imediatamente
- Código: `setItens(prev => prev.map(it => ({ ...it, tipoOperacao: opt?.tipo || 'onerosa' })))`

**Passo 5 — Verificação 200xxx antes de emitir:**
- `emitirNfe()` varre todos os itens buscando `cbsClasstrib` ou `ibsClasstrib` que começa com `'2'`
- Se encontrado e ainda não confirmado → `showConfirm` com lista dos itens, redireciona para aba PRODUTOS
- Segunda tentativa de emissão (`rtcEmitirAviso = true`) → prossegue normalmente

**Passo 6 — Variáveis contextuais analisadas:**

| Variável | Origem | Impacto na apuração |
|----------|--------|---------------------|
| `tipoOperacao` | `naturezaOperacao` da NF-e | Obrigatoriedade CBS/IBS (não onerosa → imunidade/não incidência) |
| `crt` do emitente | `Emitente.crt` (1=SN, 2=Presumido, 3=Real) | Simples Nacional tem regra diferente de apuração CBS |
| `consumidorFinal` | campo da NF-e (auto por tipo de doc) | PF pode ter alíquotas diferenciadas |
| `indIEDest` | tributação do destinatário | B2B vs B2C afeta base de cálculo |
| `finalidade` da NF-e | form.finalidade | Devolução/Complementar → CST específico |

**Passo 7 — Envio ao PHP (por item):**
```
cbsCst, cbsClasstrib, ibsCst, ibsClasstrib, cCredPres, tipoOperacao
```
O backend PHP usa esses campos para montar `<imposto><CBS>` e `<imposto><IBS>` no XML da NF-e.

---

## Bugs corrigidos nesta implementação

| Bug | Causa raiz | Correção |
|-----|-----------|----------|
| CBS/IBS nunca aplicados no "Aplicar" do cadastro | `pred_cbs`/`pred_ibs` tratados como booleanos; valor 0 = falsy | Removida a condição — CST sempre aplicado quando há match |
| Nenhum card RTC exibido para NCM sem anexo especial | `rtc = []` → condição `rtc.length > 0` bloqueava tudo | Entrada sintética CST 000/000001 injetada quando array vazio |
| Nenhum banner na NF-e para produto sem CBS/IBS | Mesma lógica `pred_cbs` falsy + nenhum fallback para NCM não listado | Fallback para CST 000/000001 + banner cinza adicionado |

---

## Status de implementação

| Funcionalidade | Status |
|----------------|--------|
| Lookup automático RTC ao adicionar produto sem CBS/IBS na NF-e | ✅ Implementado |
| Fallback tributação integral (CST 000/000001) quando NCM sem anexo | ✅ Implementado |
| Três tipos de banner (roxo / cinza / âmbar) na lista de itens | ✅ Implementado |
| Card cinza no cadastro de produto para NCM sem anexo especial | ✅ Implementado |
| Alerta 200xxx antes de emitir + confirmação obrigatória | ✅ Implementado |
| tipoOperacao sincronizado ao mudar naturezaOperacao | ✅ Implementado |
| cCredPres sugerido automaticamente por NCM | ⏳ Pendente (depende de enriquecimento da tabela rtc_ccredpres com dados por NCM) |
