# O que subir após o build

## Após executar `npm run build`

A pasta `dist/` é gerada com os arquivos estáticos otimizados do frontend.

### Para produção, você precisa subir:

1. **Pasta `dist/`** - contém os arquivos React built (HTML, CSS, JS otimizados)
2. **Arquivo `server.ts`** - servidor Express que roda a aplicação
3. **Pasta `prisma/`** - contém o schema do banco de dados (necessário para migrations)
4. **Arquivo `.env`** - variáveis de ambiente (NÃO versionar se contém secrets)

### Comando para build:
```bash
npm run build
```

### Estrutura mínima para deploy:
```
/dist          (built do frontend)
/server.ts     (servidor)
/prisma/       (schema do banco)
/.env          (variáveis de ambiente)
```

### Não subir:
- `node_modules/`
- `src/`
- arquivos de desenvolvimento (`.gitignore`, `tsconfig.json`, etc)