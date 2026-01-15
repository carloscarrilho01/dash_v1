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
    const { limit = 50, offset = 0 } = req.query; // Paginação: últimas 50 mensagens por padrão

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

    // Aplica paginação nas mensagens (mais recentes primeiro)
    const totalMessages = conversation.messages.length;
    const startIndex = Math.max(0, totalMessages - parseInt(offset) - parseInt(limit));
    const endIndex = totalMessages - parseInt(offset);

    const paginatedConversation = {
      ...conversation,
      messages: conversation.messages.slice(startIndex, endIndex),
      totalMessages,
      hasMore: startIndex > 0
    };

    res.json(paginatedConversation);
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

// GET /api/metrics - Retorna métricas do sistema
app.get('/api/metrics', async (req, res) => {
  try {
    const { period = 'week' } = req.query;

    // Calcula datas baseadas no período
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        startDate = new Date(0);
        break;
    }

    // Busca dados
    const allConversations = useDatabase ? await ConversationDB.findAll() : Array.from(conversations.values());
    const allLeads = await LeadDB.findAll();

    // Filtra por período
    const filteredConversations = allConversations.filter(conv => {
      const lastTime = new Date(conv.lastTimestamp);
      return lastTime >= startDate;
    });

    // Calcula métricas de conversas
    const totalConversations = allConversations.length;
    const activeConversations = filteredConversations.length;
    const unansweredChats = filteredConversations.filter(conv => conv.unread > 0).length;

    // Calcula métricas de mensagens
    let messagesReceived = 0;
    let messagesSent = 0;
    let totalResponseTime = 0;
    let responseTimes = [];
    let maxWaitingTime = 0;

    const messagesBySource = [
      { source: 'whatsapp-lite', count: 0, sent: 0 },
      { source: 'whatsapp-cloud', count: 0, sent: 0 },
      { source: 'web-chat', count: 0, sent: 0 },
      { source: 'outros', count: 0, sent: 0 }
    ];

    filteredConversations.forEach(conv => {
      const messages = conv.messages || [];
      messages.forEach(msg => {
        if (msg.isAgent) {
          messagesSent++;
        } else {
          messagesReceived++;
        }

        // Simula distribuição por fonte (pode ser melhorado com dados reais)
        const sourceIndex = Math.floor(Math.random() * 3);
        if (msg.isAgent) {
          messagesBySource[sourceIndex].sent++;
        } else {
          messagesBySource[sourceIndex].count++;
        }
      });

      // Calcula tempos de resposta (simulado)
      if (messages.length > 1) {
        for (let i = 1; i < messages.length; i++) {
          if (!messages[i].isAgent && messages[i - 1].isAgent) {
            const responseTime = Math.random() * 300 + 30; // 30s a 5min
            responseTimes.push(responseTime);
            totalResponseTime += responseTime;
            maxWaitingTime = Math.max(maxWaitingTime, responseTime);
          }
        }
      }
    });

    const avgResponseTime = responseTimes.length > 0 ? totalResponseTime / responseTimes.length : 0;

    // Calcula mediana
    responseTimes.sort((a, b) => a - b);
    const medianResponseTime = responseTimes.length > 0
      ? responseTimes[Math.floor(responseTimes.length / 2)]
      : 0;

    // Calcula métricas de leads
    const leadsWon = allLeads.filter(lead => lead.status === 'fechado').length;
    const leadsActive = allLeads.filter(lead =>
      ['agendado', 'compareceu', 'servico_finalizado'].includes(lead.status)
    ).length;
    const leadsLost = allLeads.filter(lead => lead.status === 'perdido').length;
    const leadsTasks = 0; // Implementar quando tiver sistema de tarefas
    const leadsWithoutTasks = allLeads.length;

    // Calcula estatísticas da semana passada para comparação
    const lastWeekStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekConversations = allConversations.filter(conv => {
      const lastTime = new Date(conv.lastTimestamp);
      return lastTime >= lastWeekStart && lastTime < startDate;
    });

    const lastWeekLeads = allLeads.filter(lead => {
      const createdAt = new Date(lead.createdAt);
      return createdAt >= lastWeekStart && createdAt < startDate;
    });

    let lastWeekMessages = 0;
    lastWeekConversations.forEach(conv => {
      lastWeekMessages += (conv.messages || []).length;
    });

    const metrics = {
      totalConversations,
      activeConversations,
      unansweredChats,
      messagesReceived,
      messagesSent,
      avgResponseTime,
      maxWaitingTime,
      medianResponseTime,
      leadsWon,
      leadsActive,
      leadsLost,
      leadsTasks,
      leadsWithoutTasks,
      messagesBySource,
      thisWeek: {
        conversations: activeConversations,
        messages: messagesReceived + messagesSent,
        leads: allLeads.length
      },
      lastWeek: {
        conversations: lastWeekConversations.length,
        messages: lastWeekMessages,
        leads: lastWeekLeads.length
      }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas' });
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

// POST /api/leads - Cria um novo lead
app.post('/api/leads', async (req, res) => {
  try {
    const { telefone, nome, email, status, observacoes } = req.body;

    if (!telefone || !nome) {
      return res.status(400).json({ error: 'Telefone e nome são obrigatórios' });
    }

    // Verifica se já existe um lead com este telefone
    const cleanPhone = String(telefone).replace(/\D/g, '');
    const leads = await LeadDB.findAll();
    const existingLead = leads.find(lead => {
      const leadPhone = String(lead.telefone).replace(/\D/g, '');
      return leadPhone === cleanPhone;
    });

    if (existingLead) {
      return res.status(409).json({ error: 'Já existe um lead com este telefone' });
    }

    const newLead = await LeadDB.create({
      telefone,
      nome,
      email: email || null,
      status: status || 'novo',
      observacoes: observacoes || ''
    });

    if (!newLead) {
      return res.status(500).json({ error: 'Erro ao criar lead' });
    }

    // Emite evento WebSocket para atualizar todos os clientes
    io.emit('lead-created', newLead);

    console.log(`✅ Lead criado com sucesso: ${nome} (${telefone})`);

    res.status(201).json(newLead);
  } catch (error) {
    console.error('Erro ao criar lead:', error);
    res.status(500).json({ error: 'Erro ao criar lead' });
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

// PUT /api/leads/:uuid - Atualiza um lead completo
app.put('/api/leads/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { nome, telefone, email, status, observacoes } = req.body;

    console.log('📥 Recebendo atualização de lead:', { uuid, nome, telefone, email, status, observacoes });

    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    const updatedLead = await LeadDB.update(uuid, { nome, telefone, email, status, observacoes });

    if (!updatedLead) {
      console.error('❌ Lead não encontrado:', uuid);
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    // Emite evento WebSocket para atualizar todos os clientes
    io.emit('lead-updated', updatedLead);

    console.log(`✅ Lead ${uuid} atualizado com sucesso`);

    res.json(updatedLead);
  } catch (error) {
    console.error('❌ Erro ao atualizar lead:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Erro ao atualizar lead',
      details: error.message
    });
  }
});

// DELETE /api/leads/:uuid - Deleta um lead
app.delete('/api/leads/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;

    console.log('📥 Recebendo requisição de exclusão:', { uuid });

    const success = await LeadDB.delete(uuid);

    if (!success) {
      console.error('❌ Lead não encontrado:', uuid);
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    // Emite evento WebSocket para atualizar todos os clientes
    io.emit('lead-deleted', { uuid });

    console.log(`✅ Lead ${uuid} excluído com sucesso`);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao excluir lead:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Erro ao excluir lead',
      details: error.message
    });
  }
});

// PUT /api/leads/:uuid/status - Atualiza o status de um lead
app.put('/api/leads/:uuid/status', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status } = req.body;

    console.log('📥 Recebendo atualização de status:', { uuid, status });

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    // Busca o lead antes da atualização para ter o status anterior
    const previousLead = await LeadDB.findByUuid(uuid);
    const previousStatus = previousLead?.status;

    const updatedLead = await LeadDB.updateStatus(uuid, status);

    if (!updatedLead) {
      console.error('❌ Lead não encontrado:', uuid);
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    // Emite evento WebSocket para atualizar todos os clientes
    io.emit('lead-updated', updatedLead);

    console.log(`✅ Status do lead ${uuid} atualizado para: ${status}`);

    // Envia webhook para n8n quando o status do lead mudar
    const LEAD_STATUS_WEBHOOK_URL = process.env.LEAD_STATUS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;

    if (LEAD_STATUS_WEBHOOK_URL) {
      try {
        const webhookPayload = {
          event: 'lead_status_changed',
          lead: {
            uuid: updatedLead.uuid,
            id: updatedLead.id,
            nome: updatedLead.nome,
            telefone: updatedLead.telefone,
            email: updatedLead.email,
            previousStatus: previousStatus,
            newStatus: status,
            trava: updatedLead.trava
          },
          timestamp: new Date().toISOString(),
          source: 'dashboard'
        };

        console.log('📤 Enviando webhook de mudança de status:', LEAD_STATUS_WEBHOOK_URL);
        console.log('📦 Payload:', JSON.stringify(webhookPayload, null, 2));

        const webhookResponse = await fetch(LEAD_STATUS_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        });

        const responseText = await webhookResponse.text();
        console.log('📥 Resposta do webhook:', webhookResponse.status, responseText);

        if (webhookResponse.ok) {
          console.log('✅ Webhook de status enviado com sucesso');
        } else {
          console.error('❌ Erro ao enviar webhook de status:', webhookResponse.status, responseText);
        }
      } catch (error) {
        console.error('❌ Erro ao enviar webhook de status:', error.message);
        // Não falha a requisição se o webhook falhar
      }
    }

    res.json(updatedLead);
  } catch (error) {
    console.error('❌ Erro ao atualizar status do lead:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Erro ao atualizar status do lead',
      details: error.message
    });
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

// ====================================
// EVOLUTION API - WhatsApp Integration
// ====================================

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// Helper: Faz requisição para Evolution API
async function evolutionApiRequest(endpoint, method = 'GET', body = null) {
  const url = `${EVOLUTION_API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    }
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  console.log(`🌐 Evolution API: ${method} ${endpoint}`);

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Evolution API Error:', data);
      throw new Error(data.message || 'Evolution API request failed');
    }

    console.log('✅ Evolution API Response:', data);
    return data;
  } catch (error) {
    console.error('❌ Erro ao chamar Evolution API:', error.message);
    throw error;
  }
}

// GET /api/whatsapp/instances - Lista todas as instâncias
app.get('/api/whatsapp/instances', async (req, res) => {
  try {
    const data = await evolutionApiRequest('/instance/fetchInstances');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whatsapp/instance/create - Cria nova instância
app.post('/api/whatsapp/instance/create', async (req, res) => {
  try {
    const { instanceName, qrcode = true, integration = 'WHATSAPP-BAILEYS' } = req.body;

    if (!instanceName || !instanceName.trim()) {
      return res.status(400).json({ error: 'Nome da instância é obrigatório' });
    }

    const payload = {
      instanceName: instanceName.trim(),
      qrcode,
      integration
    };

    const data = await evolutionApiRequest('/instance/create', 'POST', payload);

    // Se QR code foi gerado, emite via WebSocket
    if (data.qrcode) {
      io.emit('whatsapp-qr', {
        instance: instanceName,
        qr: data.qrcode.code || data.qrcode
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/whatsapp/instance/:name/connect - Conecta instância e retorna QR code
app.get('/api/whatsapp/instance/:name/connect', async (req, res) => {
  try {
    const { name } = req.params;
    const data = await evolutionApiRequest(`/instance/connect/${name}`);

    // Emite QR code via WebSocket
    if (data.qrcode) {
      io.emit('whatsapp-qr', {
        instance: name,
        qr: data.qrcode.code || data.qrcode
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/whatsapp/instance/:name/status - Verifica status da instância
app.get('/api/whatsapp/instance/:name/status', async (req, res) => {
  try {
    const { name } = req.params;
    const data = await evolutionApiRequest(`/instance/connectionState/${name}`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/whatsapp/instance/:name/logout - Desconecta instância
app.delete('/api/whatsapp/instance/:name/logout', async (req, res) => {
  try {
    const { name } = req.params;
    const data = await evolutionApiRequest(`/instance/logout/${name}`, 'DELETE');

    // Emite status via WebSocket
    io.emit('whatsapp-status', {
      instance: name,
      status: 'disconnected'
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/whatsapp/instance/:name - Deleta instância
app.delete('/api/whatsapp/instance/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const data = await evolutionApiRequest(`/instance/delete/${name}`, 'DELETE');

    // Emite remoção via WebSocket
    io.emit('whatsapp-instance-deleted', {
      instance: name
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
