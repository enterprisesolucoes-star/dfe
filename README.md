<div align="center">

# 🧾 DFe IA ERP

**Sistema ERP completo para emissão de NF-e e NFC-e com integração SEFAZ**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?logo=node.js)](https://nodejs.org)
[![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?logo=php)](https://www.php.net)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)](https://www.mysql.com)

</div>

---

## 📋 Sobre o Sistema

O **DFe IA ERP** é um sistema de gestão empresarial completo, desenvolvido para empresas brasileiras que precisam emitir **NF-e (Modelo 55)** e **NFC-e (Modelo 65)** com integração direta à **SEFAZ**. Conta com assistente de IA integrado (Google Gemini), suporte a TEF (maquininhas), boletos bancários (Sicoob) e multi-tenancy nativo.

### Módulos incluídos

| Módulo | Funcionalidades |
|---|---|
| **Dashboard** | KPIs em tempo real, gráficos de vendas NFe/NFCe, donut de status |
| **PDV / Vendas** | Emissão NFC-e em tempo real, TEF (SuperTEF), contingência offline |
| **NF-e Modelo 55** | Emissão, cancelamento, CC-e, inutilização, DANFE PDF |
| **Fiscal** | Transmissão SEFAZ, consulta de status, contingência, lote |
| **Compras** | Importação XML, DFe distribuição, manifesto do destinatário |
| **Orçamentos** | Versionamento, conversão para OS/Pedido, envio por e-mail |
| **Ordens de Serviço** | Gestão de OS, técnico responsável, histórico |
| **Pedidos** | Gestão de pedidos, PDF, e-mail |
| **Financeiro** | Contas a pagar/receber, caixa, parcelamentos, relatórios |
| **Cobrança** | Boletos Sicoob, remessa/retorno bancário |
| **Comissões** | Cálculo por vendedor, aprovação, relatório |
| **Cadastros** | Produtos, clientes, fornecedores, transportadores, NCM, medidas |
| **Usuários** | Multi-usuário com perfis (admin/operador), pré-cadastro |
| **Empresa** | Configurações fiscais, certificado digital A1, régime tributário |
| **Reforma Tributária** | IBS/CBS, LC 214, importação RTC |
| **TEF** | Relatório de transações TEF, Smart POS |

---

## 🖥️ Requisitos do Servidor

> O sistema foi projetado para rodar em **VPS Linux**. Recomendamos a Hostinger VPS (plano KVM 2 ou superior).

| Componente | Versão mínima |
|---|---|
| Ubuntu Server | 22.04 LTS ou 24.04 LTS |
| Node.js | 20.x LTS |
| PHP | 8.2 ou 8.3 |
| MySQL | 8.0+ |
| Nginx | 1.20+ |
| Composer | 2.x |
| RAM | 2 GB |
| Disco | 20 GB |

---

## 🚀 Instalação Passo a Passo

### 1. Preparar o servidor

```bash
# Atualizar o sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PHP 8.3 e extensões necessárias
sudo apt install -y php8.3 php8.3-cli php8.3-curl php8.3-mbstring \
  php8.3-xml php8.3-zip php8.3-mysql php8.3-fpm php8.3-soap php8.3-gd

# Instalar MySQL
sudo apt install -y mysql-server

# Instalar Nginx
sudo apt install -y nginx

# Instalar Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### 2. Clonar o repositório

```bash
cd /var/www
git clone https://github.com/SEU_USUARIO/dfe.git
cd dfe
```

### 3. Instalar dependências

```bash
# Dependências Node.js
npm install

# Gerar o Prisma Client
npx prisma generate

# Dependências PHP (biblioteca NF-e/NFC-e)
composer install
```

### 4. Criar o banco de dados

```bash
# Acessar o MySQL
sudo mysql -u root

# Dentro do MySQL:
CREATE DATABASE dfe_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dfe_user'@'localhost' IDENTIFIED BY 'SUA_SENHA_FORTE';
GRANT ALL PRIVILEGES ON dfe_db.* TO 'dfe_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Executar as migrations do Prisma
DATABASE_URL="mysql://dfe_user:SUA_SENHA_FORTE@localhost:3306/dfe_db" npx prisma migrate deploy
```

### 5. Configurar variáveis de ambiente

**5.1 — Configuração do PHP** (fora do webroot, por segurança):

```bash
sudo mkdir -p /etc/dfe
sudo nano /etc/dfe/.env
```

Cole o conteúdo abaixo, preenchendo com seus dados:

```env
DB_HOST=127.0.0.1
DB_NAME=dfe_db
DB_USER=dfe_user
DB_PASS=SUA_SENHA_FORTE

# Token interno (gere um aleatório com: openssl rand -hex 32)
INTERNAL_API_TOKEN=SEU_TOKEN_INTERNO_256BIT

# SuperTEF (opcional — apenas se usar maquininha TEF)
SUPERTEF_TOKEN=

# IBPT — consulta de alíquotas NCM (opcional)
IBPT_TOKEN=
IBPT_CNPJ=
```

```bash
# Restringir permissões do arquivo
sudo chmod 600 /etc/dfe/.env
sudo chown www-data:www-data /etc/dfe/.env
```

**5.2 — Configuração do Node.js:**

```bash
cp .env.example .env
nano .env
```

```env
# URL de conexão com o banco (mesmo banco do PHP)
DATABASE_URL="mysql://dfe_user:SUA_SENHA_FORTE@127.0.0.1:3306/dfe_db"

# Chave JWT — gere com: openssl rand -hex 64
JWT_SECRET=SUA_CHAVE_JWT_MINIMO_64_CARACTERES

# Deve ser igual ao INTERNAL_API_TOKEN do /etc/dfe/.env
INTERNAL_API_TOKEN=SEU_TOKEN_INTERNO_256BIT

# URL do backend PHP (não alterar em instalação padrão)
PHP_BACKEND_URL=http://127.0.0.1:8080

# Porta do servidor Node
PORT=3001
```

### 6. Configurar o Nginx

```bash
sudo nano /etc/nginx/sites-available/dfe
```

Cole a configuração abaixo, substituindo `SEU_DOMINIO.com.br` pelo seu domínio:

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com.br;
    root /var/www/dfe/dist;
    index index.html;

    server_tokens off;

    # Bloquear acesso a arquivos sensíveis
    location ~* \.(log|xml|env|sql|bak|sh)$ {
        deny all;
        return 404;
    }

    # SPA — redirecionar todas as rotas para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para a API Node.js
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dfe /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 7. Iniciar o servidor PHP built-in (backend de negócios)

```bash
# Iniciar o PHP na interface interna (não exposta externamente)
php8.3 -S 127.0.0.1:8080 -t /var/www/dfe &

# Para manter rodando permanentemente, use um serviço systemd:
sudo nano /etc/systemd/system/dfe-php.service
```

```ini
[Unit]
Description=DFe ERP PHP Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/dfe
ExecStart=/usr/bin/php8.3 -S 127.0.0.1:8080 -t /var/www/dfe
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable dfe-php
sudo systemctl start dfe-php
```

### 8. Iniciar o servidor Node.js

```bash
# Compilar o frontend
npm run build

# Iniciar o Node.js
node --import tsx/esm server.ts

# Para produção permanente, use PM2:
npm install -g pm2
pm2 start --name dfe "npx tsx server.ts"
pm2 save
pm2 startup
```

### 9. Configurar SSL (HTTPS) — Recomendado

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SEU_DOMINIO.com.br
```

---

## 🔑 Primeiro Acesso

Após a instalação, acesse `http://SEU_DOMINIO.com.br` no navegador.

Na primeira utilização, será necessário:

1. Criar o **usuário administrador** pelo endpoint de cadastro inicial
2. Em **Empresa → Configurações**, preencher:
   - Dados da empresa (CNPJ, IE, endereço)
   - Regime tributário (Simples Nacional ou Regime Normal)
   - **Certificado Digital A1** (arquivo `.pfx` e senha)
   - Ambiente SEFAZ (Homologação para testes / Produção para emissão real)
3. Em **Cadastros**, importar a tabela NCM/IBPT para cálculo de impostos

> ⚠️ **Importante:** Antes de emitir documentos fiscais reais, teste sempre em **ambiente de homologação** da SEFAZ.

---

## 🔐 Segurança

- Autenticação via **JWT** em cookie `httpOnly; SameSite=Strict; Secure`
- Senhas com **bcrypt** (hash + salt)
- PHP não exposto diretamente — só aceita conexões via `127.0.0.1:8080`
- **Token interno de 256 bits** validado em cada requisição ao PHP
- Rate limiting: 120 req/min (geral), 10 tentativas/15min (login)
- Multi-tenancy com `empresa_id` em todas as tabelas
- Headers de segurança: CSP, HSTS, X-Frame-Options, etc.

---

## 🔧 Integrações Opcionais

| Integração | Como configurar |
|---|---|
| **Google Gemini AI** | Adicionar `GEMINI_API_KEY` no `.env` do Node |
| **Firebase** | Configurar `firebase.ts` com as credenciais do projeto Firebase |
| **SuperTEF** | Inserir `SUPERTEF_TOKEN` no `/etc/dfe/.env` |
| **Sicoob Boletos** | Configurar em **Empresa → Cobrança** com certificado e credenciais da API |
| **IBPT/NCM** | Inserir `IBPT_TOKEN` e `IBPT_CNPJ` no `/etc/dfe/.env` |

---

## 🗃️ Estrutura do Projeto

```
dfe/
├── src/
│   ├── components/     # Módulos React (Dashboard, Vendas, Fiscal, etc.)
│   ├── contexts/       # AppDataContext, ThemeContext, ToastContext
│   ├── services/       # NfeService, NfceService, PrinterService
│   ├── routes/         # Rotas Node.js (auth)
│   ├── middlewares/    # Validação JWT
│   └── lib/            # Prisma, Firebase, utils
├── api/                # Backend PHP por módulo
├── prisma/             # Schema e migrations do banco
├── dist/               # Build do frontend (gerado por npm run build)
├── server.ts           # Servidor Node.js / proxy autenticado
├── api.php             # Entry point do backend PHP
└── config.php          # Configuração PHP (lê /etc/dfe/.env)
```

---

## 📦 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 4 |
| Backend Proxy | Node.js 20 LTS + Express 4 |
| Backend Negócios | PHP 8.3 + PDO + nfephp-org/sped-nfe |
| Banco de Dados | MySQL 8.0 + Prisma ORM |
| Fiscal | NF-e v4.00 + DANFE PDF + QR Code NFC-e |
| Infraestrutura | Nginx 1.24 + Ubuntu Server 24.04 |

---

## 🆘 Suporte

Dúvidas, problemas na instalação ou sugestões de melhorias:

- Abra uma **Issue** neste repositório
- Entre em contato: **enterprisesolucoes@gmail.com**

---

<div align="center">
  <sub>Desenvolvido com ❤️ para o mercado brasileiro</sub>
</div>
