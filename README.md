# n8n Chat Dashboard

Painel tipo WhatsApp para acompanhar conversas do seu agente de IA criado no n8n em tempo real.

## 🚀 Características

- ✅ Interface tipo WhatsApp moderna e responsiva
- ✅ Lista de conversas em tempo real
- ✅ Visualização de mensagens do bot e usuários
- ✅ WebSocket para atualizações instantâneas
- ✅ Endpoint webhook para receber mensagens do n8n
- ✅ Possibilidade de intervenção manual (envio de mensagens)
- ✅ Contador de mensagens não lidas
- ✅ Timestamps formatados em português

## 📋 Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

## 🔧 Instalação

1. **Instale as dependências:**

```bash
npm install
```

2. **Inicie o projeto:**

```bash
npm run dev
```

Isso iniciará:
- Backend na porta **3001** (http://localhost:3001)
- Frontend na porta **3000** (http://localhost:3000)

## 🔗 Integrando com n8n

### Passo 1: Configure o Webhook no n8n

No seu workflow do n8n, adicione um nó **HTTP Request** após o agente de IA processar uma mensagem:

**Configurações do HTTP Request:**
- **Method**: POST
- **URL**: `http://localhost:3001/api/webhook/message`
- **Body**: JSON

**Exemplo de Body JSON:**

```json
{
  "userId": "{{ $json.userId }}",
  "userName": "{{ $json.userName }}",
  "message": "{{ $json.message }}",
  "isBot": true,
  "timestamp": "{{ $now }}"
}
```

### Passo 2: Estrutura dos Dados

#### Campos do Webhook

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `userId` | string | ✅ Sim | ID único do usuário/conversa |
| `userName` | string | ❌ Não | Nome do usuário (padrão: "Usuário {userId}") |
| `message` | string | ✅ Sim | Conteúdo da mensagem |
| `isBot` | boolean | ❌ Não | `true` para mensagens do bot, `false` para usuário (padrão: true) |
| `timestamp` | string | ❌ Não | ISO 8601 timestamp (padrão: timestamp atual) |

#### Exemplo Completo

Mensagem do usuário:
```json
{
  "userId": "user_12345",
  "userName": "João Silva",
  "message": "Olá, preciso de ajuda!",
  "isBot": false,
  "timestamp": "2025-01-12T10:30:00Z"
}
```

Resposta do bot:
```json
{
  "userId": "user_12345",
  "userName": "João Silva",
  "message": "Olá! Como posso ajudá-lo hoje?",
  "isBot": true,
  "timestamp": "2025-01-12T10:30:05Z"
}
```

### Passo 3: Workflow Exemplo no n8n

```
1. [Trigger] → Webhook ou Chat Trigger
   ↓
2. [Process] → Seu Agent de IA
   ↓
3. [HTTP Request] → Enviar para Dashboard
   URL: http://localhost:3001/api/webhook/message
   Body: { userId, userName, message, isBot }
```

## 🌐 API Endpoints

### POST `/api/webhook/message`
Recebe mensagens do n8n.

**Request:**
```json
{
  "userId": "user_123",
  "userName": "Maria",
  "message": "Olá!",
  "isBot": false
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "1673520000000"
}
```

### GET `/api/conversations`
Retorna todas as conversas ordenadas por data.

**Response:**
```json
[
  {
    "userId": "user_123",
    "userName": "Maria",
    "messages": [...],
    "lastMessage": "Olá!",
    "lastTimestamp": "2025-01-12T10:30:00Z",
    "unread": 2
  }
]
```

### GET `/api/conversations/:userId`
Retorna uma conversa específica.

**Response:**
```json
{
  "userId": "user_123",
  "userName": "Maria",
  "messages": [
    {
      "id": "1673520000000",
      "text": "Olá!",
      "isBot": false,
      "timestamp": "2025-01-12T10:30:00Z"
    }
  ],
  "lastMessage": "Olá!",
  "lastTimestamp": "2025-01-12T10:30:00Z",
  "unread": 0
}
```

### POST `/api/conversations/:userId/send`
Envia mensagem manual (intervenção do atendente).

**Request:**
```json
{
  "message": "Posso ajudar você com isso!"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "1673520000001"
}
```

## 🔌 WebSocket

O dashboard usa WebSocket para atualizações em tempo real:

**Eventos:**
- `init` - Recebe todas as conversas ao conectar
- `message` - Recebe nova mensagem/conversa atualizada

## 🎨 Personalização

### Alterar Cores

Edite `src/index.css` e os arquivos CSS dos componentes para personalizar as cores do tema.

### Adicionar Funcionalidades

- **Busca de conversas**: Implemente filtro no `Sidebar.jsx`
- **Notificações**: Adicione som/notificação no navegador
- **Banco de dados**: Substitua o `Map` em memória por MongoDB/PostgreSQL
- **Autenticação**: Adicione login/autenticação no backend

## 📁 Estrutura do Projeto

```
Dash.v1/
├── server/
│   └── index.js          # Backend Express + Socket.IO
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx   # Lista de conversas
│   │   ├── Sidebar.css
│   │   ├── ChatWindow.jsx # Visualização de mensagens
│   │   └── ChatWindow.css
│   ├── App.jsx           # Componente principal
│   ├── App.css
│   ├── main.jsx          # Entry point
│   └── index.css         # Estilos globais
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## 🚨 Troubleshooting

### Mensagens não aparecem no dashboard

1. Verifique se o backend está rodando na porta 3001
2. Confirme que o n8n está enviando para o endpoint correto
3. Verifique os logs do servidor (terminal onde rodou `npm run dev`)
4. Use ferramentas como Postman para testar o webhook manualmente

### WebSocket não conecta

1. Verifique se não há firewall bloqueando a porta 3001
2. Confirme que o backend está rodando
3. Verifique o console do navegador para erros

### Exemplo de teste manual (Postman/curl)

```bash
curl -X POST http://localhost:3001/api/webhook/message \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_123",
    "userName": "Teste",
    "message": "Mensagem de teste",
    "isBot": false
  }'
```

## 📝 Próximos Passos

- [ ] Adicionar autenticação de usuários
- [ ] Implementar busca e filtros
- [ ] Adicionar banco de dados persistente
- [ ] Criar sistema de notificações
- [ ] Adicionar suporte a arquivos/imagens
- [ ] Implementar métricas e analytics
- [ ] Deploy em produção

## 📄 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

---

Desenvolvido com ❤️ para integração com n8n
