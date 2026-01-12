# 🚀 Guia de Deploy

Este guia mostra como fazer deploy do dashboard em produção.

## ⚠️ IMPORTANTE: Vercel NÃO funciona

A Vercel não suporta:
- Servidores Node.js persistentes
- WebSocket
- Armazenamento em memória

**Use uma das opções abaixo:**

---

## ✅ Opção 1: Render.com (RECOMENDADO - Gratuito)

### Vantagens
- ✅ Plano gratuito generoso
- ✅ Suporte a WebSocket
- ✅ Deploy automático via Git
- ✅ SSL gratuito
- ✅ Fácil de configurar

### Passo a Passo

1. **Crie uma conta** em [render.com](https://render.com)

2. **Suba seu código para o GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main
```

3. **No Render:**
   - Clique em "New +" → "Web Service"
   - Conecte seu repositório GitHub
   - Configure:
     - **Name:** n8n-chat-dashboard
     - **Environment:** Node
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `node server/index.js`
     - **Instance Type:** Free

4. **Adicione Variáveis de Ambiente:**
   - `NODE_ENV` = `production`
   - `PORT` = `3001` (ou deixe vazio para usar a porta do Render)

5. **Deploy!** Clique em "Create Web Service"

6. **Anote a URL** gerada (ex: `https://n8n-chat-dashboard.onrender.com`)

7. **Configure o n8n** para enviar para:
```
https://n8n-chat-dashboard.onrender.com/api/webhook/message
```

### ⚠️ Limitações do Plano Gratuito
- O servidor "hiberna" após 15 minutos de inatividade
- Primeira requisição após hibernação pode levar 30-60 segundos
- Dados são perdidos ao reiniciar (armazenamento em memória)

**Solução:** Use um banco de dados (ver abaixo)

---

## ✅ Opção 2: Railway.app (Pago após trial)

### Vantagens
- ✅ $5 de crédito grátis
- ✅ Não hiberna
- ✅ Deploy via Git
- ✅ Melhor performance que Render

### Passo a Passo

1. **Crie uma conta** em [railway.app](https://railway.app)

2. **Suba código no GitHub** (se ainda não fez)

3. **No Railway:**
   - New Project → Deploy from GitHub
   - Selecione seu repositório
   - Configure:
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `node server/index.js`

4. **Adicione Variáveis:**
   - `NODE_ENV` = `production`

5. **Deploy automático!**

6. **Gere uma URL pública:** Settings → Generate Domain

---

## ✅ Opção 3: Fly.io (Gratuito com limites)

### Vantagens
- ✅ Plano gratuito
- ✅ Melhor latência (edge computing)
- ✅ Não hiberna

### Passo a Passo

1. **Instale o Fly CLI:**
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Mac/Linux
curl -L https://fly.io/install.sh | sh
```

2. **Login:**
```bash
fly auth login
```

3. **Na pasta do projeto:**
```bash
fly launch
```

4. **Siga o wizard:**
   - Nome: n8n-chat-dashboard
   - Região: escolha a mais próxima
   - PostgreSQL: No (por enquanto)
   - Redis: No

5. **Deploy:**
```bash
fly deploy
```

6. **Abra:**
```bash
fly open
```

---

## ✅ Opção 4: VPS (Digital Ocean, Linode, AWS)

### Para servidores próprios

1. **Conecte via SSH**

2. **Instale Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Clone o repositório:**
```bash
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo
```

4. **Instale e build:**
```bash
npm install
npm run build
```

5. **Configure PM2 (gerenciador de processos):**
```bash
sudo npm install -g pm2
pm2 start server/index.js --name n8n-dashboard
pm2 startup
pm2 save
```

6. **Configure Nginx como reverse proxy:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. **SSL com Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

---

## 💾 Adicionar Banco de Dados (RECOMENDADO)

Para não perder conversas ao reiniciar, adicione um banco de dados.

### Opção A: MongoDB Atlas (Gratuito)

1. **Crie conta** em [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

2. **Crie um cluster gratuito**

3. **Pegue a connection string:**
```
mongodb+srv://usuario:senha@cluster.mongodb.net/chatdb
```

4. **Instale Mongoose:**
```bash
npm install mongoose
```

5. **Adicione variável de ambiente:**
```
MONGODB_URI=mongodb+srv://...
```

### Opção B: PostgreSQL (Render/Railway)

Ambos oferecem PostgreSQL gratuito integrado.

---

## 🔧 Checklist Pós-Deploy

- [ ] Dashboard abre no navegador
- [ ] URL do webhook anotada
- [ ] n8n configurado com nova URL
- [ ] Teste enviando mensagem do n8n
- [ ] WebSocket funcionando (mensagens aparecem em tempo real)
- [ ] SSL ativo (HTTPS)
- [ ] Variáveis de ambiente configuradas

---

## 🐛 Troubleshooting

### Dashboard não abre
```bash
# Verifique logs
render logs
# ou
fly logs
```

### WebSocket não conecta
Certifique-se que o serviço suporta WebSocket (Render e Railway suportam).

### "Cold Start" muito lento (Render gratuito)
Use um serviço de "ping" como:
- [UptimeRobot](https://uptimerobot.com)
- [Cron-job.org](https://cron-job.org)

Configure para fazer ping a cada 10 minutos em:
```
https://seu-app.onrender.com/api/conversations
```

### Dados perdidos ao reiniciar
Adicione um banco de dados (MongoDB/PostgreSQL).

---

## 📊 Custos Estimados

| Serviço | Custo | Limites |
|---------|-------|---------|
| **Render (Free)** | $0/mês | Hiberna após 15min |
| **Render (Starter)** | $7/mês | Sempre ativo |
| **Railway** | ~$5/mês | 500h/mês |
| **Fly.io** | $0-5/mês | 3GB RAM grátis |
| **VPS** | $5-10/mês | Total controle |

---

## 🎯 Recomendação

Para começar: **Render.com (Free)**
- Fácil, gratuito, funciona bem para testes

Para produção: **Railway ou Render Starter**
- Não hiberna, melhor performance

---

Precisa de ajuda? Consulte a documentação do serviço escolhido.
