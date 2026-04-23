# Mapa de Funções — NfceDashboard.tsx

> Arquivo único com **4.424 linhas**. Candidato a desmembramento em módulos separados.

---

## Resumo por módulo

| Módulo | Funções/Componentes | Linhas est. | Candidato a separar? |
|--------|--------------------|--------------|-----------------------|
| Vendas / NFC-e | 8 | ~400 | ✅ Sim |
| Produtos | 3 | ~150 | ✅ Sim |
| Clientes | 3 | ~150 | ✅ Sim |
| Fornecedores | 3 | ~150 | ✅ Sim |
| Transportadores | 3 | ~120 | ✅ Sim |
| Medidas | 3 | ~100 | ✅ Sim |
| Bandeiras (TEF) | 3 | ~100 | ⚠️ Pequeno, pode ficar junto com Config |
| Empresa / Config DFe | 5 componentes | ~700 | ✅ Sim |
| Orçamentos | 2 componentes | ~600 | ✅ Sim |
| Usuários / Caixa | 4 componentes | ~350 | ✅ Sim |
| Dashboard (gráficos) | 1 componente | ~250 | ✅ Sim |
| Reforma Tributária (RTC) | 3 funções + 1 componente | ~200 | ✅ Sim |
| SEFAZ Consulta / DFe | 1 componente | ~220 | ✅ Sim |
| Devolução | 1 modal | ~180 | ⚠️ Pode ficar junto com Vendas |
| SmartPOS | 1 componente | ~80 | ⚠️ Pode ficar junto com Config |

---

## Detalhamento por módulo

### 🛒 Vendas / NFC-e
| Função | Linha | Descrição |
|--------|-------|-----------|
| `fetchVendas` | 386 | Busca lista de vendas do dia |
| `fetchNfeList` | 408 | Busca lista de NF-e do mês |
| `handleNovaVenda` | 467 | Callback após nova venda criada |
| `handleCancelar` | 472 | Cancelamento de NFC-e na SEFAZ |
| `handleCancelarNfe` | 510 | Cancelamento de NF-e na SEFAZ |
| `handleExcluirNfe` | 533 | Exclusão de NF-e |
| `handleExcluirVenda` | 597 | Exclusão de NFC-e |
| `handleSincronizarContingencia` | 582 | Retransmite NFC-e em contingência |
| `handleRetryNfeTef` | 614 | Retenta emissão NF-e com TEF |
| `handleRetryTef` | 630 | Retenta pagamento TEF pendente |
| `handleEmailDoc` | 640 | Envia DANFE/NFC-e por e-mail |
| `handleDevolucao` | 661 | Abre modal de devolução |
| `DevolucaoModal` | 1350 | Modal completo de devolução (NF-e/NFC-e) |

---

### 📦 Produtos
| Função | Linha | Descrição |
|--------|-------|-----------|
| `fetchProdutos` | 188 | Carrega lista de produtos |
| `handleSalvarProduto` | 791 | Salva produto (novo ou edição) |
| `handleExcluirProduto` | 806 | Exclui produto |

---

### 👥 Clientes
| Função | Linha | Descrição |
|--------|-------|-----------|
| `fetchClientes` | 221 | Carrega lista de clientes |
| `handleSalvarCliente` | 818 | Salva cliente |
| `handleExcluirCliente` | 833 | Exclui cliente |

---

### 🏭 Fornecedores
| Função | Linha | Descrição |
|--------|-------|-----------|
| `fetchFornecedores` | 250 | Carrega lista de fornecedores |
| `handleSalvarFornecedor` | 845 | Salva fornecedor |
| `handleExcluirFornecedor` | 860 | Exclui fornecedor |

---

### 🚚 Transportadores
| Função | Linha | Descrição |
|--------|-------|-----------|
| `fetchTransportadores` | 275 | Carrega lista de transportadores |
| `handleSalvarTransportador` | 872 | Salva transportador |
| `handleExcluirTransportador` | 887 | Exclui transportador |

---

### 📏 Medidas (Unidades)
| Função | Linha | Descrição |
|--------|-------|-----------|
| `fetchMedidas` | 300 | Carrega unidades de medida |
| `handleSalvarMedida` | 899 | Salva unidade de medida |
| `handleExcluirMedida` | 914 | Exclui unidade de medida |

---

### 💳 Bandeiras TEF
| Função | Linha | Descrição |
|--------|-------|-----------|
| `fetchBandeiras` | 317 | Carrega bandeiras de cartão |
| `handleSalvarBandeira` | 926 | Salva bandeira |
| `handleExcluirBandeira` | 941 | Exclui bandeira |

---

### 🏢 Empresa / Configurações DFe
| Componente/Função | Linha | Descrição |
|-------------------|-------|-----------|
| `fetchEmpresa` | 329 | Carrega dados da empresa |
| `handleSalvarEmpresa` | 550 | Salva configurações da empresa |
| `EmpresaPage` | 4160 | Página de dados cadastrais da empresa |
| `IntegracaoPage` | 4182 | Página de integração fiscal |
| `DfeConfigPage` | 4255 | Página de certificado digital + contingência |
| `ConfigTab` | 2542 | Aba de configurações NFC-e/NF-e (CSC, série, etc.) |
| `LogoUploadSection` | 2773 | Upload do logotipo da empresa |
| `SmartPosSection` | 2461 | Configuração SmartPOS/TEF |

---

### 📊 Dashboard
| Componente | Linha | Descrição |
|------------|-------|-----------|
| `DashboardTab` | 3908 | Gráficos e totais do período |
| `fetchDashboard` (interno) | 3919 | Busca dados para o dashboard |

---

### 📝 Orçamentos
| Componente/Função | Linha | Descrição |
|-------------------|-------|-----------|
| `OrcamentosTab` | 2843 | Tab principal de orçamentos |
| `fetchOrcamentos` | 2897 | Carrega lista de orçamentos |
| `handleSalvar` | 2986 | Salva orçamento |
| `handleExcluir` | 2918 | Exclui orçamento |
| `handlePrint` | 2925 | Gera PDF do orçamento |
| `handleWhatsApp` | 2998 | Compartilha orçamento via WhatsApp |
| `handleEnviarEmail` | 3011 | Envia orçamento por e-mail |
| `handleExportarNFCe` | 3021 | Converte orçamento em NFC-e |
| `OrcamentoModal` | 3373 | Modal de criação/edição de orçamento |

---

### 👤 Usuários
| Componente/Função | Linha | Descrição |
|-------------------|-------|-----------|
| `UsuariosTab` | 2035 | Tab de gestão de usuários |
| `handleExcluir` | 2050 | Exclui usuário |
| `handleAprovar` | 2057 | Aprova solicitação de acesso |
| `handleReprovar` | 2066 | Reprova solicitação de acesso |
| `UsuarioModal` | 2199 | Modal de criação/edição de usuário |

---

### 🏦 Caixa
| Componente/Função | Linha | Descrição |
|-------------------|-------|-----------|
| `AbrirCaixaModal` | 1885 | Modal de abertura de caixa |
| `FecharCaixaModal` | 1927 | Modal de fechamento de caixa |

---

### 🧾 Reforma Tributária (RTC / IBS / CBS)
| Componente/Função | Linha | Descrição |
|-------------------|-------|-----------|
| `RtcImportButton` | 2283 | Importa alíquotas RTC do IBPT |
| `fetchAliquotas` | 2292 | Carrega alíquotas salvas |
| `handleImport` | 2300 | Importa alíquotas de arquivo |
| `handleAtualizarOnline` | 2311 | Busca alíquotas online |
| `handleSalvarAliq` | 2323 | Salva alíquota editada |
| `handleExcluirAliq` | 2330 | Exclui alíquota |
| `ReformaTributariaTab` | 2453 | Tab completa da Reforma Tributária |

---

### 📡 SEFAZ / Consulta DFe
| Componente/Função | Linha | Descrição |
|-------------------|-------|-----------|
| `SefazConsultModal` | 3691 | Modal de consulta de documentos na SEFAZ |
| `fetchLocalDocs` | 3703 | Busca documentos locais (XML) |
| `handleConsultar` | 3716 | Consulta manifesto SEFAZ |
| `handleManifestar` | 3749 | Manifesta ciência/confirmação da operação |
| `handlePrintDanfe` | 3764 | Imprime DANFE da nota consultada |
| `handleDownload` | 3768 | Baixa XML da nota |

---

### 🔀 Importação XML
| Função | Linha | Descrição |
|--------|-------|-----------|
| `handleImportXmlFile` | 162 | Importa XML de nota de compra |

---

## Sugestão de desmembramento

```
src/
  components/
    NfceDashboard.tsx          ← orquestrador principal (routing de abas + estado global)
    modules/
      ProdutosModule.tsx        ← fetch + CRUD Produtos
      ClientesModule.tsx        ← fetch + CRUD Clientes
      FornecedoresModule.tsx    ← fetch + CRUD Fornecedores
      TransportadoresModule.tsx ← fetch + CRUD Transportadores
      MedidasModule.tsx         ← fetch + CRUD Medidas
      VendasModule.tsx          ← listagem, cancelamento, email, devolução
      OrcamentosModule.tsx      ← Tab + Modal de orçamentos
      UsuariosModule.tsx        ← Tab + Modal de usuários
      CaixaModule.tsx           ← Modais abertura/fechamento
      DashboardModule.tsx       ← gráficos e totais
      RtcModule.tsx             ← Reforma tributária + alíquotas
      SefazModule.tsx           ← Consulta SEFAZ + manifestação
      ConfigModule.tsx          ← Empresa + DFe + SmartPOS + Logo
```

> **Nota:** `CadastrosModule.tsx` já existe separado para alguns cadastros — vale unificar o padrão.
