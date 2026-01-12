import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Serve static files from the React app (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Armazena conversas em memória (em produção, use um banco de dados)
const conversations = new Map();

// Endpoint para receber webhooks do n8n
app.post('/api/webhook/message', (req, res) => {
  try {
    const { userId, userName, message, isBot, timestamp } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId e message são obrigatórios' });
    }

    // Cria ou atualiza a conversa
    if (!conversations.has(userId)) {
      conversations.set(userId, {
        userId,
        userName: userName || `Usuário ${userId}`,
        messages: [],
        lastMessage: message,
        lastTimestamp: timestamp || new Date().toISOString(),
        unread: 0
      });
    }

    const conversation = conversations.get(userId);

    // Adiciona a mensagem
    const newMessage = {
      id: Date.now().toString(),
      text: message,
      isBot: isBot !== undefined ? isBot : true,
      timestamp: timestamp || new Date().toISOString()
    };

    conversation.messages.push(newMessage);
    conversation.lastMessage = message;
    conversation.lastTimestamp = newMessage.timestamp;

    if (!isBot) {
      conversation.unread++;
    }

    // Emite a atualização via WebSocket para todos os clientes conectados
    io.emit('message', {
      userId,
      conversation: conversations.get(userId)
    });

    res.json({ success: true, messageId: newMessage.id });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para obter todas as conversas
app.get('/api/conversations', (req, res) => {
  const conversationsList = Array.from(conversations.values())
    .sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));

  res.json(conversationsList);
});

// Endpoint para obter uma conversa específica
app.get('/api/conversations/:userId', (req, res) => {
  const { userId } = req.params;
  const conversation = conversations.get(userId);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversa não encontrada' });
  }

  // Marca como lida
  conversation.unread = 0;

  res.json(conversation);
});

// Endpoint para enviar mensagem (intervenção manual)
app.post('/api/conversations/:userId/send', (req, res) => {
  const { userId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensagem é obrigatória' });
  }

  const conversation = conversations.get(userId);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversa não encontrada' });
  }

  const newMessage = {
    id: Date.now().toString(),
    text: message,
    isBot: false,
    isAgent: true, // Mensagem do atendente
    timestamp: new Date().toISOString()
  };

  conversation.messages.push(newMessage);
  conversation.lastMessage = message;
  conversation.lastTimestamp = newMessage.timestamp;

  // Emite a atualização via WebSocket
  io.emit('message', {
    userId,
    conversation: conversations.get(userId)
  });

  res.json({ success: true, messageId: newMessage.id });
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Envia todas as conversas quando um cliente se conecta
  socket.emit('init', Array.from(conversations.values()));

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Serve React app for any other route (production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhook/message`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
