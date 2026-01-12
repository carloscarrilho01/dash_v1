# 🚀 Guia de Início Rápido

Este guia vai te ajudar a colocar o painel funcionando em menos de 5 minutos!

## ⚡ Passo a Passo

### 1. Instalar Dependências

Abra o terminal nesta pasta e execute:

```bash
npm install
```

> ⏱️ Isso pode levar 1-2 minutos dependendo da sua conexão.

### 2. Iniciar o Projeto

```bash
npm run dev
```

Você verá algo assim:

```
🚀 Servidor rodando na porta 3001
📡 Webhook endpoint: http://localhost:3001/api/webhook/message

VITE v5.0.12  ready in 500 ms

➜  Local:   http://localhost:3000/
```

### 3. Testar o Dashboard

Abra seu navegador e acesse:

**Dashboard:** http://localhost:3000

Você verá a tela inicial vazia (normal, ainda não há conversas).

### 4. Enviar Mensagem de Teste

Você tem 3 opções:

#### Opção A: Usar a página de teste (RECOMENDADO)

1. Abra o arquivo `test-webhook.html` no seu navegador
2. Clique em "Enviar Webhook"
3. Volte para http://localhost:3000 e veja a mensagem aparecer!

#### Opção B: Usar curl no terminal

```bash
curl -X POST http://localhost:3001/api/webhook/message \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"user_123\",\"userName\":\"João Silva\",\"message\":\"Olá, testando o dashboard!\",\"isBot\":false}"
```

#### Opção C: Usar Postman/Insomnia

- **URL:** `http://localhost:3001/api/webhook/message`
- **Método:** POST
- **Body (JSON):**
```json
{
  "userId": "user_123",
  "userName": "João Silva",
  "message": "Olá, testando o dashboard!",
  "isBot": false
}
```

### 5. Ver a Conversa

Volte para http://localhost:3000 e você verá:
- ✅ Uma nova conversa na sidebar
- ✅ A mensagem aparecendo no chat
- ✅ Atualizações em tempo real via WebSocket

### 6. Enviar uma Resposta do Bot

Envie outra mensagem, mas agora com `"isBot": true`:

```bash
curl -X POST http://localhost:3001/api/webhook/message \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"user_123\",\"userName\":\"João Silva\",\"message\":\"Olá! Como posso ajudar você hoje?\",\"isBot\":true}"
```

Você verá a resposta do bot aparecer do lado direito! 🎉

## 🔗 Conectar com n8n

### Opção 1: Importar Workflow Pronto

1. Abra seu n8n
2. Clique em "Import from File"
3. Selecione o arquivo `n8n-workflow-example.json`
4. Configure suas credenciais do OpenAI (ou outro modelo)
5. Ative o workflow
6. Use a URL do webhook gerada

### Opção 2: Criar Manualmente

No seu workflow do n8n, adicione um nó **HTTP Request**:

```
Configuração:
- Method: POST
- URL: http://localhost:3001/api/webhook/message
- Body Type: JSON
- Body:
{
  "userId": "{{ $json.userId }}",
  "userName": "{{ $json.userName }}",
  "message": "{{ $json.message }}",
  "isBot": true
}
```

## 📱 Testando o Fluxo Completo

### Simular uma Conversa

Execute estes comandos em sequência:

```bash
# Mensagem do usuário
curl -X POST http://localhost:3001/api/webhook/message \
  -H "Content-Type: application/json" \
  -d '{"userId":"maria_456","userName":"Maria Santos","message":"Preciso de ajuda com meu pedido","isBot":false}'

# Espere 2 segundos (simula processamento)
sleep 2

# Resposta do bot
curl -X POST http://localhost:3001/api/webhook/message \
  -H "Content-Type: application/json" \
  -d '{"userId":"maria_456","userName":"Maria Santos","message":"Claro! Me informe o número do seu pedido.","isBot":true}'

# Mensagem do usuário
sleep 2
curl -X POST http://localhost:3001/api/webhook/message \
  -H "Content-Type: application/json" \
  -d '{"userId":"maria_456","userName":"Maria Santos","message":"Pedido #12345","isBot":false}'

# Resposta do bot
sleep 2
curl -X POST http://localhost:3001/api/webhook/message \
  -H "Content-Type: application/json" \
  -d '{"userId":"maria_456","userName":"Maria Santos","message":"Encontrei seu pedido! Status: Em trânsito","isBot":true}'
```

Acompanhe a conversa acontecendo em tempo real no dashboard! 🎭

## 🎯 Próximos Passos

Agora que está funcionando:

1. **Conecte com n8n**: Siga o [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
2. **Personalize**: Edite as cores e estilos nos arquivos CSS
3. **Adicione features**: Veja sugestões no [README.md](./README.md)

## ❓ Problemas Comuns

### Erro: "Address already in use"

As portas 3000 ou 3001 já estão em uso. Solução:

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill
```

### Dashboard não atualiza

1. Verifique o console do navegador (F12)
2. Confirme que o backend está rodando
3. Limpe o cache e recarregue (Ctrl+Shift+R)

### Webhook retorna 404

Verifique se o backend está rodando na porta 3001:

```bash
curl http://localhost:3001/api/conversations
```

Deve retornar `[]` (lista vazia).

## 🎉 Pronto!

Seu dashboard está funcionando!

Para mais informações:
- 📖 [README.md](./README.md) - Documentação completa
- 🔌 [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Guia de integração com n8n
- 🐛 [test-webhook.html](./test-webhook.html) - Ferramenta de teste

---

Precisa de ajuda? Abra uma issue no GitHub ou consulte a documentação do n8n.
