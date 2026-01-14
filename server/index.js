import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, ConversationDB, QuickMessageDB, LeadDB } from './database.js';

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

// Aumenta o limite do body para 50MB (para suportar arquivos em base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

    // Verifica se o agente está travado (apenas para mensagens de usuários)
    if (!isBot) {
      const isTravado = await LeadDB.getTravaStatus(userId);
      if (isTravado) {
        console.log(`🔒 Agente TRAVADO para ${userId} - mensagem do usuário ignorada pelo bot`);
        // Retorna sucesso mas não processa a mensagem para o bot
        // A mensagem ainda é salva e exibida no dashboard
      }
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

// ============================================
// ENDPOINTS PARA QUICK MESSAGES
// ============================================

// GET /api/quick-messages - Lista todas as mensagens rápidas
app.get('/api/quick-messages', async (req, res) => {
  try {
    const quickMessages = await QuickMessageDB.findAll();
    res.json(quickMessages);
  } catch (error) {
    console.error('Erro ao buscar quick messages:', error);
    res.status(500).json({ error: 'Erro ao buscar quick messages' });
  }
});

// GET /api/quick-messages/:id - Busca uma mensagem rápida específica
app.get('/api/quick-messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quickMessage = await QuickMessageDB.findById(id);

    if (!quickMessage) {
      return res.status(404).json({ error: 'Quick message não encontrada' });
    }

    res.json(quickMessage);
  } catch (error) {
    console.error('Erro ao buscar quick message:', error);
    res.status(500).json({ error: 'Erro ao buscar quick message' });
  }
});

// POST /api/quick-messages - Cria nova mensagem rápida
app.post('/api/quick-messages', async (req, res) => {
  try {
    const { text, emoji, category, shortcut, order, enabled } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'O campo "text" é obrigatório' });
    }

    const quickMessage = await QuickMessageDB.create({
      text,
      emoji,
      category,
      shortcut,
      order,
      enabled
    });

    if (!quickMessage) {
      return res.status(500).json({ error: 'Erro ao criar quick message' });
    }

    // Emite evento WebSocket para atualizar todos os clientes
    io.emit('quick-messages-updated');

    res.status(201).json(quickMessage);
  } catch (error) {
    console.error('Erro ao criar quick message:', error);
    res.status(500).json({ error: 'Erro ao criar quick message' });
  }
});

// PUT /api/quick-messages/:id - Atualiza mensagem rápida
app.put('/api/quick-messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, emoji, category, shortcut, order, enabled } = req.body;

    const quickMessage = await QuickMessageDB.update(id, {
      text,
      emoji,
      category,
      shortcut,
      order,
      enabled
    });

    if (!quickMessage) {
      return res.status(404).json({ error: 'Quick message não encontrada' });
    }

    // Emite evento WebSocket para atualizar todos os clientes
    io.emit('quick-messages-updated');

    res.json(quickMessage);
  } catch (error) {
    console.error('Erro ao atualizar quick message:', error);
    res.status(500).json({ error: 'Erro ao atualizar quick message' });
  }
});

// DELETE /api/quick-messages/:id - Remove mensagem rápida
app.delete('/api/quick-messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await QuickMessageDB.delete(id);

    if (!success) {
      return res.status(404).json({ error: 'Quick message não encontrada' });
    }

    // Emite evento WebSocket para atualizar todos os clientes
    io.emit('quick-messages-updated');

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar quick message:', error);
    res.status(500).json({ error: 'Erro ao deletar quick message' });
  }
});

// POST /api/quick-messages/reorder - Reordena mensagens rápidas
app.post('/api/quick-messages/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds deve ser um array' });
    }

    const success = await QuickMessageDB.reorder(orderedIds);

    if (!success) {
      return res.status(500).json({ error: 'Erro ao reordenar quick messages' });
    }

    // Emite evento WebSocket para atualizar todos os clientes
    io.emit('quick-messages-updated');

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao reordenar quick messages:', error);
    res.status(500).json({ error: 'Erro ao reordenar quick messages' });
  }
});

// ============================================
// ENDPOINTS PARA CONVERSAS
// ============================================

// POST /api/conversations/new - Criar nova conversa
app.post('/api/conversations/new', async (req, res) => {
  try {
    const { userId, userName, initialMessage } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ error: 'userId e userName são obrigatórios' });
    }

    // Verifica se já existe uma conversa com este userId
    const existingConversation = await getConversation(userId);
    if (existingConversation) {
      return res.status(409).json({ error: 'Já existe uma conversa com este usuário' });
    }

    // Cria nova conversa
    const newConversation = {
      userId,
      userName,
      messages: [],
      lastMessage: initialMessage || 'Conversa iniciada',
      lastTimestamp: new Date().toISOString(),
      unread: 0
    };

    // Se há mensagem inicial, adiciona como primeira mensagem do bot/agente
    if (initialMessage) {
      newConversation.messages.push({
        text: initialMessage,
        type: 'text',
        isBot: true,
        isAgent: true,
        timestamp: new Date().toISOString()
      });
    }

    // Salva a conversa
    await saveConversation(userId, newConversation);

    // Emite via WebSocket para todos os clientes
    io.emit('message', {
      userId,
      conversation: newConversation
    });

    // Envia webhook para n8n se houver mensagem inicial
    if (initialMessage) {
      const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://webhookworkflow.carrilhodev.com/webhook/agentteste';

      try {
        const webhookPayload = {
          userId,
          userName,
          message: initialMessage,
          type: 'text',
          isAgent: true,
          messageId: Date.now().toString(),
          timestamp: new Date().toISOString(),
          source: 'dashboard',
          isNewConversation: true
        };

        console.log('📤 Enviando webhook para n8n (nova conversa):', N8N_WEBHOOK_URL);
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
    }

    res.status(201).json(newConversation);
  } catch (error) {
    console.error('Erro ao criar nova conversa:', error);
    res.status(500).json({ error: 'Erro ao criar nova conversa' });
  }
});

// ============================================
// ENDPOINTS PARA CONTROLE DE TRAVA (LEADS)
// ============================================

// GET /api/leads/:userId/trava - Verifica status da trava
app.get('/api/leads/:userId/trava', async (req, res) => {
  try {
    const { userId } = req.params;
    const travaStatus = await LeadDB.getTravaStatus(userId);

    res.json({ userId, trava: travaStatus });
  } catch (error) {
    console.error('Erro ao buscar status de trava:', error);
    res.status(500).json({ error: 'Erro ao buscar status de trava' });
  }
});

// POST /api/leads/:userId/toggle-trava - Alterna status da trava
app.post('/api/leads/:userId/toggle-trava', async (req, res) => {
  try {
    const { userId } = req.params;
    const newStatus = await LeadDB.toggleTrava(userId);

    if (newStatus === null) {
      return res.status(500).json({ error: 'Erro ao alternar trava' });
    }

    // Emite evento WebSocket para notificar todos os clientes
    io.emit('trava-updated', { userId, trava: newStatus });

    console.log(`🔒 Trava ${newStatus ? 'ATIVADA' : 'DESATIVADA'} para ${userId}`);

    res.json({ userId, trava: newStatus });
  } catch (error) {
    console.error('Erro ao alternar trava:', error);
    res.status(500).json({ error: 'Erro ao alternar trava' });
  }
});

// GET /api/leads - Lista todos os leads
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await LeadDB.findAll();
    res.json(leads);
  } catch (error) {
    console.error('Erro ao buscar leads:', error);
    res.status(500).json({ error: 'Erro ao buscar leads' });
  }
});

// GET /api/leads/:uuid - Busca um lead específico
app.get('/api/leads/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const lead = await LeadDB.findByUuid(uuid);

    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Erro ao buscar lead:', error);
    res.status(500).json({ error: 'Erro ao buscar lead' });
  }
});

// PUT /api/leads/:uuid/status - Atualiza o status de um lead
app.put('/api/leads/:uuid/status', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const updatedLead = await LeadDB.updateStatus(uuid, status);

    if (!updatedLead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    // Emite evento WebSocket para atualizar todos os clientes
    io.emit('lead-updated', updatedLead);

    console.log(`📊 Status do lead ${uuid} atualizado para: ${status}`);

    res.json(updatedLead);
  } catch (error) {
    console.error('Erro ao atualizar status do lead:', error);
    res.status(500).json({ error: 'Erro ao atualizar status do lead' });
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
  // Serve arquivos estáticos (CSS, JS, imagens, etc) com cache curto
  app.use(express.static(path.join(__dirname, '../dist'), {
    maxAge: '1h', // Cache de 1 hora
    etag: true
  }));

  // Serve index.html apenas para rotas GET que NÃO são de API (SPA routing)
  app.get('*', (req, res, next) => {
    // Se começar com /api/, não serve o index.html
    if (req.path.startsWith('/api/')) {
      return next(); // Passa para o próximo handler (404)
    }

    // Sem cache para o index.html (força reload)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhook/message`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
