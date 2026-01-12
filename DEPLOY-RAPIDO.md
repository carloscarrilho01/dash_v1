# 🚀 Deploy Rápido - Render.com

## Passo a Passo (5 minutos)

### 1. Preparar o Código

```bash
# Na pasta do projeto
git init
git add .
git commit -m "Dashboard n8n pronto para deploy"
```

### 2. Subir para GitHub

1. Crie um novo repositório em [github.com](https://github.com/new)
2. Não inicialize com README, .gitignore ou license
3. Execute:

```bash
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git branch -M main
git push -u origin main
```

### 3. Deploy no Render

1. Acesse [render.com](https://render.com) e faça login/cadastro

2. Clique em **"New +"** → **"Web Service"**

3. Conecte com GitHub e selecione seu repositório

4. Configure:
   - **Name:** `n8n-chat-dashboard` (ou qualquer nome)
   - **Region:** Escolha a mais próxima
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`
   - **Instance Type:** `Free`

5. **Environment Variables:**
   - Clique em "Add Environment Variable"
   - Adicione: `NODE_ENV` = `production`

6. Clique em **"Create Web Service"**

7. Aguarde o deploy (3-5 minutos)

### 4. Pegar a URL

Após o deploy, você verá algo como:
```
https://n8n-chat-dashboard-xxxx.onrender.com
```

### 5. Testar

Abra a URL no navegador. Você deve ver o dashboard!

### 6. Configurar n8n

No seu workflow do n8n, use esta URL no HTTP Request:

```
https://n8n-chat-dashboard-xxxx.onrender.com/api/webhook/message
```

JSON:
```json
{
  "userId": "{{ $json.userId }}",
  "userName": "{{ $json.userName }}",
  "message": "{{ $json.message }}",
  "isBot": true
}
```

## ✅ Pronto!

Seu dashboard está no ar! 🎉

## 🐛 Problemas?

### Build falhou
Veja os logs no Render e verifique se todas as dependências estão no `package.json`

### Dashboard não abre
Aguarde 1-2 minutos após o deploy completar. O Render pode levar um tempo para inicializar.

### WebSocket não conecta
Certifique-se que a URL está correta no `src/App.jsx` (deve usar a variável de ambiente)

### Dados somem ao reiniciar
Normal no plano gratuito. Para resolver, adicione um banco de dados (veja DEPLOY.md)

---

**Documentação completa:** [DEPLOY.md](./DEPLOY.md)
