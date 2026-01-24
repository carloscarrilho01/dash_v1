# Como Enviar Áudio e Imagem via Webhook n8n

## 📋 Resumo das Alterações

O backend agora detecta **automaticamente** o tipo de mensagem baseado no conteúdo em base64. Não é necessário enviar campos adicionais como `type`, `duration`, etc.

## ✅ O que foi corrigido

### Problema Anterior
- O endpoint `/api/webhook/message` recebia áudios/imagens em base64 mas não detectava o tipo
- Todas as mensagens eram tratadas como texto simples
- Áudios e imagens não apareciam corretamente no painel

### Solução Implementada
- Função `detectMessageType()` identifica automaticamente o tipo baseado no prefixo base64
- Áudios detectados: `data:audio/webm;base64,...` → tipo `audio`
- Imagens detectadas: `data:image/jpeg;base64,...` → tipo `file` com categoria `image`
- Outros arquivos: `data:application/pdf;base64,...` → tipo `file` com categoria apropriada

## 🔧 Como Configurar no n8n

### Formato do Webhook (POST `/api/webhook/message`)

```json
{
  "userId": "5521987654321",
  "userName": "João Silva",
  "message": "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUm...",
  "isBot": true,
  "timestamp": "2025-01-24T10:30:00Z"
}
```

### Campos do Payload

| Campo | Obrigatório | Tipo | Descrição |
|-------|-------------|------|-----------|
| `userId` | ✅ Sim | string | ID único do usuário (telefone, email, etc.) |
| `userName` | ⚠️ Recomendado | string | Nome do usuário para exibição |
| `message` | ✅ Sim | string | Conteúdo da mensagem (texto ou base64) |
| `isBot` | ❌ Opcional | boolean | `true` = bot, `false` = usuário (padrão: `true`) |
| `timestamp` | ❌ Opcional | ISO8601 | Data/hora da mensagem (padrão: agora) |

## 📤 Exemplos de Envio

### 1. Enviar Áudio (WhatsApp → n8n → Dashboard)

**Exemplo de Fluxo n8n:**

```
[WhatsApp Trigger]
  ↓
[Code Node - Converter Áudio para Base64]
  const audioBuffer = items[0].binary.audio.data;
  const base64Audio = audioBuffer.toString('base64');
  const mimeType = items[0].binary.audio.mimeType || 'audio/webm';

  return [{
    json: {
      userId: items[0].json.from,
      userName: items[0].json.contact?.name || items[0].json.from,
      message: `data:${mimeType};base64,${base64Audio}`,
      isBot: true,
      timestamp: new Date().toISOString()
    }
  }];
  ↓
[HTTP Request - POST para /api/webhook/message]
```

**Resultado no Dashboard:**
- Mensagem aparece como player de áudio 🎤
- Preview mostra "🎤 Áudio" na lista de conversas
- Áudio pode ser reproduzido diretamente no painel

### 2. Enviar Imagem (WhatsApp → n8n → Dashboard)

**Exemplo de Fluxo n8n:**

```
[WhatsApp Trigger]
  ↓
[Code Node - Converter Imagem para Base64]
  const imageBuffer = items[0].binary.image.data;
  const base64Image = imageBuffer.toString('base64');
  const mimeType = items[0].binary.image.mimeType || 'image/jpeg';

  return [{
    json: {
      userId: items[0].json.from,
      userName: items[0].json.contact?.name || items[0].json.from,
      message: `data:${mimeType};base64,${base64Image}`,
      isBot: true,
      timestamp: new Date().toISOString()
    }
  }];
  ↓
[HTTP Request - POST para /api/webhook/message]
```

**Resultado no Dashboard:**
- Imagem aparece inline na conversa 📷
- Preview mostra "📎 imagem.jpeg" na lista
- Clique na imagem abre em nova aba

### 3. Enviar Texto Simples

```json
{
  "userId": "5521987654321",
  "userName": "João Silva",
  "message": "Olá! Como posso ajudar?",
  "isBot": true
}
```

**Resultado no Dashboard:**
- Mensagem de texto normal
- Preview mostra o texto completo

## 🎯 Tipos de Mídia Suportados

### Áudios
- `audio/webm` - WebM (padrão navegador)
- `audio/mpeg` - MP3
- `audio/ogg` - OGG
- `audio/wav` - WAV
- `audio/aac` - AAC

**Formato do base64:**
```
data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC...
```

### Imagens
- `image/jpeg` - JPEG/JPG
- `image/png` - PNG
- `image/gif` - GIF
- `image/webp` - WebP
- `image/svg+xml` - SVG

**Formato do base64:**
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...
```

### Documentos
- `application/pdf` - PDF
- `application/msword` - DOC
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - DOCX
- `application/vnd.ms-excel` - XLS
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` - XLSX

**Formato do base64:**
```
data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAw...
```

## 🔍 Como Testar

### 1. Testar com cURL (Áudio)

```bash
curl -X POST http://localhost:3000/api/webhook/message \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "teste123",
    "userName": "Usuário Teste",
    "message": "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua7+uvdeBAXPFh1WVwdYCvggECGRuAacBAAAAAAACVhJO"
  }'
```

### 2. Testar com cURL (Imagem)

```bash
curl -X POST http://localhost:3000/api/webhook/message \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "teste123",
    "userName": "Usuário Teste",
    "message": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AH//Z"
  }'
```

### 3. Verificar Logs do Servidor

Quando um áudio for recebido, você verá no console:
```
🎤 Áudio detectado para teste123 - Tipo: audio/webm
```

Quando uma imagem for recebida:
```
📎 Arquivo detectado para teste123 - Categoria: image, Tipo: image/jpeg
```

## 🐛 Troubleshooting

### Problema: Áudio não aparece no painel
**Possíveis causas:**
1. Base64 não tem o prefixo `data:audio/...;base64,`
2. Formato de áudio não é suportado pelo navegador
3. Base64 está corrompido ou incompleto

**Solução:**
- Verifique se o base64 começa com `data:audio/[tipo];base64,`
- Use formatos web-safe: `webm`, `mp3`, `ogg`
- Valide o base64 antes de enviar

### Problema: Imagem não aparece no painel
**Possíveis causas:**
1. Base64 não tem o prefixo `data:image/...;base64,`
2. Arquivo muito grande (limite: 50MB no JSON)
3. Base64 está corrompido

**Solução:**
- Verifique se o base64 começa com `data:image/[tipo];base64,`
- Reduza tamanho de imagens grandes antes de enviar
- Teste com imagem pequena primeiro

### Problema: Preview mostra texto ao invés de ícone
**Causa:**
- Tipo não foi detectado corretamente

**Solução:**
- Verifique os logs do servidor
- Confirme que o prefixo `data:...;base64,` está correto
- Teste com exemplo fornecido acima

## 📊 Estrutura Interna da Mensagem

Quando você envia um áudio, o backend cria automaticamente:

```javascript
{
  text: "data:audio/webm;base64,GkXfo...",
  type: "audio",
  audioUrl: "data:audio/webm;base64,GkXfo...",
  fileType: "audio/webm",
  isBot: true,
  timestamp: "2025-01-24T10:30:00Z"
}
```

Quando você envia uma imagem:

```javascript
{
  text: "data:image/jpeg;base64,/9j/4AA...",
  type: "file",
  fileUrl: "data:image/jpeg;base64,/9j/4AA...",
  fileType: "image/jpeg",
  fileCategory: "image",
  fileName: "imagem.jpeg",
  fileSize: 45678,
  isBot: true,
  timestamp: "2025-01-24T10:30:00Z"
}
```

## 🚀 Próximos Passos

1. **Configure seu fluxo n8n** para converter áudios/imagens do WhatsApp para base64
2. **Teste com mensagens pequenas** primeiro (áudio de 5s, imagem de 100KB)
3. **Monitore os logs** do servidor para verificar detecção
4. **Verifique o painel** para confirmar renderização correta
5. **Ajuste conforme necessário** baseado nos logs e comportamento

## 💡 Dicas

- **Sempre inclua o prefixo MIME completo** no base64 (`data:audio/webm;base64,`)
- **Use formatos web-safe** para melhor compatibilidade (WebM para áudio, JPEG/PNG para imagem)
- **Teste com arquivos pequenos** primeiro antes de enviar arquivos grandes
- **Monitore os logs** do servidor para debug
- **O campo `timestamp` é opcional** - se não enviar, será usado o horário atual

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor (console)
2. Teste com os exemplos cURL fornecidos
3. Confirme que o base64 está no formato correto
4. Verifique se o servidor está rodando na porta correta
