import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, ConversationDB } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.RENDER_EXTERNAL_URL,
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

// Log de todas as requisições para debug
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// Conecta ao banco de dados
let useDatabase = false;
const conversations = new Map(); // Fallback para memória

(async () => {
  useDatabase = await connectDatabase();
  if (useDatabase) {
    console.log('💾 Usando MongoDB para persistência');
  } else {
    console.log('💭 Usando armazenamento em memória (dados serão perdidos ao reiniciar)');
  }
})();

// Helper: Salvar conversa (DB ou memória)
async function saveConversation(userId, data) {
  if (useDatabase) {
    return await ConversationDB.createOrUpdate(userId, data);
  } else {
    conversations.set(userId, data);
    return data;
  }
}

// Helper: Buscar conversa (DB ou memória)
async function getConversation(userId) {
  if (useDatabase) {
    return await ConversationDB.findByUserId(userId);
  } else {
    return conversations.get(userId);
  }
}

// Helper: Buscar todas as conversas (DB ou memória)
async function getAllConversations() {
  if (useDatabase) {
    return await ConversationDB.findAll();
  } else {
    return Array.from(conversations.values())
      .sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
  }
}

// Helper: Adicionar mensagem (DB ou memória)
async function addMessage(userId, message) {
  if (useDatabase) {
    return await ConversationDB.addMessage(userId, message);
  } else {
    const conversation = conversations.get(userId);
    if (conversation) {
      conversation.messages.push(message);

      // Define a mensagem de preview baseado no tipo
      if (message.type === 'audio') {
        conversation.lastMessage = '🎤 Áudio';
      } else if (message.type === 'file') {
        conversation.lastMessage = `📎 ${message.fileName || 'Arquivo'}`;
      } else {
        conversation.lastMessage = message.text;
      }

      conversation.lastTimestamp = message.timestamp;
      conversations.set(userId, conversation);
    }
    return conversation;
  }
}

// Endpoint para receber webhooks do n8n
app.post('/api/webhook/message', async (req, res) => {
  try {
    const { userId, userName, message, isBot, timestamp } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId e message são obrigatórios' });
    }

    // Busca ou cria conversa
    let conversation = await getConversation(userId);

    if (!conversation) {
      conversation = {
        userId,
        userName: userName || `Usuário ${userId}`,
        messages: [],
        lastMessage: message,
        lastTimestamp: timestamp || new Date().toISOString(),
        unread: 0
      };
    }

    // Adiciona a mensagem
    const newMessage = {
      text: message,
      isBot: isBot !== undefined ? isBot : true,
      timestamp: timestamp || new Date().toISOString()
    };

    conversation.messages.push(newMessage);
    conversation.lastMessage = message;
    conversation.lastTimestamp = newMessage.timestamp;

    if (!isBot) {
      conversation.unread = (conversation.unread || 0) + 1;
    }

    // Salva no banco ou memória
    await saveConversation(userId, conversation);

    // Emite a atualização via WebSocket
    io.emit('message', {
      userId,
      conversation
    });

    res.json({ success: true, messageId: Date.now().toString() });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para obter todas as conversas
app.get('/api/conversations', async (req, res) => {
  try {
    const conversationsList = await getAllConversations();
    res.json(conversationsList);
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ error: 'Erro ao buscar conversas' });
  }
});

// Endpoint para obter uma conversa específica
app.get('/api/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const conversation = await getConversation(userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Marca como lida
    if (useDatabase) {
      await ConversationDB.markAsRead(userId);
    } else {
      conversation.unread = 0;
      conversations.set(userId, conversation);
    }

    res.json(conversation);
  } catch (error) {
    console.error('Erro ao buscar conversa:', error);
    res.status(500).json({ error: 'Erro ao buscar conversa' });
  }
});

// Endpoint para enviar mensagem (intervenção manual)
app.post('/api/conversations/:userId/send', async (req, res) => {
  try {
    const { userId } = req.params;
    const { message, type = 'text', duration, fileName, fileSize, fileType, fileCategory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    const conversation = await getConversation(userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    const newMessage = {
      text: message,
      type,
      duration,
      audioUrl: type === 'audio' ? message : undefined,
      fileUrl: type === 'file' ? message : undefined,
      fileName,
      fileSize,
      fileType,
      fileCategory,
      isBot: false,
      isAgent: true,
      timestamp: new Date().toISOString()
    };

    // Adiciona mensagem
    const updatedConversation = await addMessage(userId, newMessage);

    // Emite a atualização via WebSocket
    io.emit('message', {
      userId,
      conversation: updatedConversation || conversation
    });

    // Envia webhook para n8n quando atendente envia mensagem
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://webhookworkflow.carrilhodev.com/webhook/agentteste';

    try {
      const webhookPayload = {
        userId,
        userName: conversation.userName,
        message,
        type,
        duration,
        fileName,
        fileSize,
        fileType,
        fileCategory,
        isAgent: true,
        messageId: Date.now().toString(),
        timestamp: newMessage.timestamp,
        source: 'dashboard'
      };

      console.log('📤 Enviando webhook para n8n:', N8N_WEBHOOK_URL);
      console.log('📦 Payload:', JSON.stringify(webhookPayload, null, 2));

      const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      const responseText = await webhookResponse.text();
      console.log('📥 Resposta do webhook:', webhookResponse.status, responseText);

      if (webhookResponse.ok) {
        console.log('✅ Webhook enviado com sucesso para n8n');
      } else {
        console.error('❌ Erro ao enviar webhook para n8n:', webhookResponse.status, responseText);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar webhook para n8n:', error.message);
      console.error('Stack trace:', error.stack);
    }

    res.json({ success: true, messageId: newMessage.timestamp });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// WebSocket connection
io.on('connection', async (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Envia todas as conversas quando um cliente se conecta
  const allConversations = await getAllConversations();
  socket.emit('init', allConversations);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Serve static files DEPOIS das rotas de API (production)
if (process.env.NODE_ENV === 'production') {
  // Serve arquivos estáticos (CSS, JS, imagens, etc)
  app.use(express.static(path.join(__dirname, '../dist')));

  // Serve index.html apenas para rotas GET que NÃO são de API (SPA routing)
  app.get('*', (req, res, next) => {
    // Se começar com /api/, não serve o index.html
    if (req.path.startsWith('/api/')) {
      return next(); // Passa para o próximo handler (404)
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhook/message`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
