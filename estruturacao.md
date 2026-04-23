# Estruturação do Banco de Dados - Multi-Tenant

## Contexto
- Sistema em fase inicial
- Alto volume de registros
- Até 100 empresas (tenants)

---

## Abordagem: Schema por Tenant

| Abordagem | Escalabilidade | Complexidade | Isolamento |
|-----------|---------------|--------------|------------|
| **Banco único** (coluna `empresa_id`) | ❌ Ruim | ✅ Baixa | ❌ Fraco |
| **Schema por tenant** | ✅ Boa | ⚠️ Média | ✅ Bom |
| **Banco por tenant** | ✅✅ Ótima | ❌ Alta | ✅✅ Total |

### Por que Schema por Tenant?

- 100 empresas é um número ideal para essa abordagem
- Cada empresa tem seu schema no mesmo banco (ex: `empresa_001`, `empresa_002`)
- Tabelas com mesma estrutura, dados isolados
- Facilita backup por empresa, LGPD e manutenção
- Escala bem até ~500 tenants

---

## Estrutura do Banco

```
nfe_db/
├── public/                    (tabela de tenants, config global)
│   ├── tenants                (id, schema_name, nome, ativo, plano...)
│   ├── usuarios_auth          (login global, schema_referencia)
│
├── empresa_001/               (schema)
│   ├── nfes
│   ├── produtos
│   ├── clientes
│   ├── config
│   └── ...
│
├── empresa_002/
│   └── ...
```

---

## Tabela Global - Controle de Tenants

```sql
CREATE TABLE public.tenants (
    id SERIAL PRIMARY KEY,
    schema_name VARCHAR(50) UNIQUE NOT NULL,
    razao_social VARCHAR(255),
    cnpj VARCHAR(14) UNIQUE,
    ativo BOOLEAN DEFAULT true,
    plano VARCHAR(20),
    criado_em TIMESTAMP DEFAULT NOW()
);
```

---

## Implementação na Aplicação

- Middleware identifica o tenant (via subdomínio, token JWT ou header)
- Define o `search_path` do PostgreSQL para o schema correto:

```sql
SET search_path TO empresa_001, public;
```

- Ou usa conexão dinâmica com o schema correto

---

## Cuidados Essenciais

- **Nunca** misturar dados de tenants sem `search_path` correto
- **Migrations** devem rodar em todos os schemas
- Índices por schema (evita concorrência entre tenants)
- **Connection pooling** com PgBouncer para otimizar conexões

---

## Alternativa Simplificada (Banco Único)

Se preferir banco único com `empresa_id` por simplicidade inicial:

- Use particionamento de tabela por `empresa_id`
- Índices compostos: `(empresa_id, id)`, `(empresa_id, created_at)`
- RLS (Row-Level Security) do PostgreSQL para isolamento

```sql
-- Exemplo de índice composto
CREATE INDEX idx_nfes_empresa ON nfes (empresa_id, id);
CREATE INDEX idx_nfes_empresa_data ON nfes (empresa_id, created_at);

-- Exemplo de RLS
ALTER TABLE nfes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON nfes
    USING (empresa_id = current_setting('app.current_tenant')::INT);
```

---

## Resumo

Para 100 empresas com muitos registros, **schema por tenant** é o sweet spot entre simplicidade e performance.
