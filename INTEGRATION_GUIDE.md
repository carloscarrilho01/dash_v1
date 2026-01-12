# Guia de Integração com n8n

Este guia mostra como integrar o Dashboard com diferentes cenários de uso no n8n.

## 📱 Cenário 1: Bot do WhatsApp com n8n

### Workflow Completo

```
1. WhatsApp Trigger
   ↓
2. Extract Data (Set Node)
   - userId: {{ $json.from }}
   - userName: {{ $json.name }}
   - message: {{ $json.body }}
   - isBot: false
   ↓
3. Send to Dashboard
   HTTP Request: POST http://localhost:3001/api/webhook/message
   ↓
4. AI Agent (OpenAI/Anthropic/etc)
   ↓
5. Send Response to Dashboard
   HTTP Request: POST http://localhost:3001/api/webhook/message
   Body: { userId, userName, message: {{ $json.response }}, isBot: true }
   ↓
6. Reply WhatsApp
```

### Configuração Detalhada

#### Node 1: WhatsApp Trigger
- Configure seu trigger do WhatsApp (Business API ou biblioteca)

#### Node 2: Extract Data
```javascript
// Code Node ou Set Node
return [{
  json: {
    userId: $input.first().json.from,
    userName: $input.first().json.pushName || $input.first().json.from,
    message: $input.first().json.body,
    isBot: false,
    timestamp: new Date().toISOString()
  }
}];
```

#### Node 3: Send to Dashboard (User Message)
**HTTP Request Node:**
- Method: POST
- URL: `http://localhost:3001/api/webhook/message`
- Body:
```json
{
  "userId": "{{ $json.userId }}",
  "userName": "{{ $json.userName }}",
  "message": "{{ $json.message }}",
  "isBot": false,
  "timestamp": "{{ $json.timestamp }}"
}
```

#### Node 4: AI Agent
Configure seu agente de IA (OpenAI, Claude, etc)

#### Node 5: Send to Dashboard (Bot Response)
**HTTP Request Node:**
- Method: POST
- URL: `http://localhost:3001/api/webhook/message`
- Body:
```json
{
  "userId": "{{ $('Extract Data').item.json.userId }}",
  "userName": "{{ $('Extract Data').item.json.userName }}",
  "message": "{{ $json.output }}",
  "isBot": true,
  "timestamp": "{{ $now.toISO() }}"
}
```

## 💬 Cenário 2: Chatbot em Website

### Workflow

```
1. Webhook Trigger (do seu site)
   ↓
2. Process Message
   ↓
3. Send to Dashboard
   ↓
4. AI Response
   ↓
5. Send Response to Dashboard
   ↓
6. Return to Website
```

### Configuração

#### Webhook Trigger
- Crie um webhook que seu site pode chamar
- Espera receber: `{ userId, userName, message }`

#### JavaScript no seu site

```html
<script>
// Enviar mensagem do usuário
async function sendMessage(message) {
  const userId = getUserId(); // Implementar função para obter ID único
  const userName = getUserName();

  // Envia para n8n
  const response = await fetch('https://seu-n8n-webhook-url.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      userName,
      message
    })
  });

  const data = await response.json();
  return data.response;
}

function getUserId() {
  // Gera ou recupera ID do usuário
  let userId = localStorage.getItem('chatUserId');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatUserId', userId);
  }
  return userId;
}
</script>
```

## 📧 Cenário 3: Bot de Email com n8n

### Workflow

```
1. Email Trigger (IMAP)
   ↓
2. Extract Email Data
   ↓
3. Send to Dashboard
   ↓
4. AI Process Email
   ↓
5. Send Response to Dashboard
   ↓
6. Send Email Response (SMTP)
```

### Node 2: Extract Email Data

```javascript
return [{
  json: {
    userId: $input.first().json.from.email,
    userName: $input.first().json.from.name || $input.first().json.from.email,
    message: $input.first().json.text || $input.first().json.html,
    isBot: false,
    timestamp: new Date().toISOString()
  }
}];
```

## 🔄 Cenário 4: Multi-Canal (WhatsApp + Telegram + Site)

### Estratégia

Use um campo adicional para identificar o canal:

```json
{
  "userId": "user_123",
  "userName": "João Silva",
  "message": "Olá!",
  "isBot": false,
  "channel": "whatsapp", // ou "telegram", "website", etc
  "timestamp": "2025-01-12T10:30:00Z"
}
```

### Modificação no Backend

Edite `server/index.js` para incluir o canal:

```javascript
app.post('/api/webhook/message', (req, res) => {
  const { userId, userName, message, isBot, timestamp, channel } = req.body;

  // ... resto do código

  const newMessage = {
    id: Date.now().toString(),
    text: message,
    isBot: isBot !== undefined ? isBot : true,
    channel: channel || 'unknown', // Adicione esta linha
    timestamp: timestamp || new Date().toISOString()
  };

  // ... resto do código
});
```

### Frontend Modificado

Mostre um badge do canal em `ChatWindow.jsx`:

```jsx
<div className="message-text">
  {msg.channel && <span className="channel-badge">{msg.channel}</span>}
  {msg.text}
</div>
```

## 🔐 Cenário 5: Bot com Autenticação

Se seu bot requer autenticação, adicione um header:

```javascript
// No n8n HTTP Request Node
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer SEU_TOKEN_AQUI"
}
```

### Adicione validação no backend

```javascript
// server/index.js
app.post('/api/webhook/message', (req, res) => {
  const authToken = req.headers.authorization;

  if (authToken !== 'Bearer SEU_TOKEN_AQUI') {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // ... resto do código
});
```

## 📊 Cenário 6: Analytics e Métricas

### Adicione tags e metadata

```json
{
  "userId": "user_123",
  "userName": "João Silva",
  "message": "Olá!",
  "isBot": false,
  "metadata": {
    "sentiment": "positive",
    "intent": "greeting",
    "confidence": 0.95
  }
}
```

## 🛠️ Dicas Avançadas

### 1. Retry Logic no n8n

Adicione um nó **Error Trigger** após o HTTP Request para retentar em caso de falha:

```
HTTP Request → [Error] → Wait (5s) → HTTP Request (retry)
```

### 2. Batch Messages

Se você precisa enviar múltiplas mensagens:

```javascript
// Code Node
const messages = [
  "Olá! Como posso ajudar?",
  "Tenho algumas sugestões para você:"
];

return messages.map((msg, index) => ({
  json: {
    userId: $input.first().json.userId,
    userName: $input.first().json.userName,
    message: msg,
    isBot: true,
    timestamp: new Date(Date.now() + index * 1000).toISOString()
  }
}));
```

### 3. Typing Indicator

Adicione um indicador visual de digitação:

```json
{
  "userId": "user_123",
  "message": "...",
  "isBot": true,
  "isTyping": true
}
```

## 🐛 Debug

### Ative logs detalhados

No backend (`server/index.js`), adicione logs:

```javascript
app.post('/api/webhook/message', (req, res) => {
  console.log('📥 Webhook recebido:', {
    userId: req.body.userId,
    message: req.body.message,
    timestamp: new Date().toISOString()
  });

  // ... resto do código
});
```

### Teste com curl

```bash
# Teste rápido de mensagem
curl -X POST http://localhost:3001/api/webhook/message \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "userName": "Usuário Teste",
    "message": "Esta é uma mensagem de teste",
    "isBot": false
  }'
```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Teste o webhook manualmente com curl/Postman
3. Verifique se as portas 3000 e 3001 estão livres
4. Confirme que o n8n pode acessar localhost:3001

---

Para mais informações, consulte o [README.md](./README.md)
