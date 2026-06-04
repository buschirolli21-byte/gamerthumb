# 🎮 GamerThumb

> O único gerador de thumbnails feito para criadores de games brasileiros.

---

## 🚀 Como colocar no ar em 15 minutos

### PASSO 1 — Criar conta no Supabase (grátis)

1. Acesse https://supabase.com e clique em **Start for free**
2. Crie um projeto (ex: `gamerthumb`)
3. Aguarde ~2 minutos para o projeto subir
4. Vá em **Settings → API** e copie:
   - `Project URL` → vai para `SUPABASE_URL`
   - `anon public` → vai para `SUPABASE_ANON_KEY`
   - `service_role` → vai para `SUPABASE_SERVICE_KEY`

### PASSO 2 — Criar o banco de dados

1. No Supabase, clique em **SQL Editor → New Query**
2. Cole TODO o conteúdo do arquivo `supabase/schema.sql`
3. Clique em **Run** (▶)
4. Deve aparecer: *"Success. No rows returned"*

### PASSO 3 — Configurar o projeto

```bash
# No terminal, dentro da pasta gamerthumb:

# Copiar o arquivo de configuração
cp .env.example .env

# Abrir o .env e preencher com suas chaves
nano .env   # ou abra no VS Code
```

Preencha no `.env`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

### PASSO 4 — Rodar o servidor

```bash
# Instalar dependências (só na primeira vez)
npm install

# Iniciar o servidor
npm run dev
```

Acesse: **http://localhost:3000**

---

## 🗂️ Estrutura do projeto

```
gamerthumb/
├── server.js              ← Servidor Express (backend completo)
├── .env.example           ← Copie para .env e preencha
├── package.json
│
├── public/                ← Frontend (servido pelo Express)
│   ├── index.html         ← Login / Registro
│   ├── dashboard.html     ← Painel do usuário
│   ├── editor.html        ← Editor de thumbnails
│   └── landing.html       ← Página de vendas
│
├── src/
│   └── lib/
│       └── supabase.js    ← Cliente Supabase
│
└── supabase/
    └── schema.sql         ← Cole no SQL Editor do Supabase
```

---

## 🔌 Rotas da API

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Criar conta |
| POST | `/api/auth/login` | Login → retorna token |
| POST | `/api/auth/logout` | Logout |

### Perfil
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/profile` | Buscar perfil |
| PUT | `/api/profile` | Atualizar perfil |

### Thumbnails
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/thumbnails` | Listar thumbnails |
| GET | `/api/thumbnails/:id` | Buscar uma |
| POST | `/api/thumbnails` | Criar (respeita limite do plano) |
| PUT | `/api/thumbnails/:id` | Atualizar |
| DELETE | `/api/thumbnails/:id` | Deletar |
| POST | `/api/thumbnails/upload` | Upload de imagem para Storage |

### Analytics e IA
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/analytics/summary` | Stats do dashboard |
| POST | `/api/ai/suggest` | Sugestão de texto via IA |

---

## 🤖 Ativar IA de sugestão de texto

1. Acesse https://platform.openai.com/api-keys
2. Crie uma API Key
3. Adicione no `.env`:
```
OPENAI_API_KEY=sk-...
```

> **Sem a chave**, o sistema usa sugestões pré-definidas por jogo (funciona normalmente).

---

## 💳 Ativar pagamentos (Stripe)

1. Acesse https://dashboard.stripe.com
2. Crie dois produtos: **Criador** (R$29/mês) e **Pro** (R$59/mês)
3. Copie os Price IDs
4. Adicione no `.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_CRIADOR=price_...
STRIPE_PRICE_PRO=price_...
```

---

## ☁️ Publicar na internet (Render — grátis)

1. Acesse https://render.com e crie conta
2. Clique em **New → Web Service**
3. Conecte seu GitHub (suba o projeto primeiro)
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Adicione as variáveis de ambiente (.env) no painel do Render
6. Clique em **Deploy** — em ~3 minutos está no ar!

---

## 📊 Planos e limites

| Plano | Thumbs/mês | Templates | IA | Remoção fundo | Preço |
|-------|-----------|-----------|-----|----------------|-------|
| Grátis | 5 | 10 | ✕ | ✕ | R$ 0 |
| Criador | 50 | 100+ | ✓ | ✓ | R$ 29 |
| Pro | ∞ | Todos + exclusivos | ✓ | ✓ | R$ 59 |

---

## 🛠️ Tecnologias

- **Backend:** Node.js + Express
- **Banco:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **IA:** OpenAI GPT-4o mini
- **Pagamentos:** Stripe
- **Frontend:** HTML/CSS/JS puro (zero framework)

---

## ❓ Dúvidas comuns

**O servidor não inicia:**
```bash
# Verifique se o .env foi criado
ls -la | grep .env

# Verifique se as dependências estão instaladas
npm install
```

**Erro "Invalid API Key" no Supabase:**
- Confirme que copiou as chaves corretas (URL + anon + service)
- Verifique se não há espaços extras no `.env`

**Não consigo criar conta:**
- No Supabase, vá em **Authentication → Settings**
- Certifique-se que **Enable email confirmations** está desativado (para teste)

---

Feito com 🎮 para criadores brasileiros de games.
