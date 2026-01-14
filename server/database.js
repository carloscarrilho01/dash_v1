import { createClient } from '@supabase/supabase-js';

let supabase = null;
let isConnected = false;

// Conecta ao Supabase
export async function connectDatabase() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('⚠️  SUPABASE_URL ou SUPABASE_KEY não configurados. Usando armazenamento em memória.');
    return false;
  }

  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Testa a conexão
    const { error } = await supabase.from('conversations').select('count', { count: 'exact', head: true });

    if (error && error.code === '42P01') {
      // Tabela não existe
      console.log('⚠️  Tabela "conversations" não existe. Crie-a no Supabase Dashboard.');
      console.log('SQL: Ver instruções no console');
      return false;
    } else if (error) {
      throw error;
    }

    console.log('✅ Supabase conectado com sucesso!');
    isConnected = true;
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar no Supabase:', error.message);
    console.warn('⚠️  Continuando com armazenamento em memória.');
    return false;
  }
}

// Funções do banco de dados
export const ConversationDB = {
  async findAll() {
    if (!isConnected) return [];

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_timestamp', { ascending: false });

      if (error) throw error;

      return data.map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        messages: row.messages || [],
        lastMessage: row.last_message,
        lastTimestamp: row.last_timestamp,
        unread: row.unread || 0
      }));
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      return [];
    }
  },

  async findByUserId(userId) {
    if (!isConnected) return null;

    try {
      const { data, error} = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        userId: data.user_id,
        userName: data.user_name,
        messages: data.messages || [],
        lastMessage: data.last_message,
        lastTimestamp: data.last_timestamp,
        unread: data.unread || 0
      };
    } catch (error) {
      console.error('Erro ao buscar conversa:', error);
      return null;
    }
  },

  async createOrUpdate(userId, conversation) {
    if (!isConnected) return conversation;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .upsert({
          user_id: userId,
          user_name: conversation.userName,
          messages: conversation.messages || [],
          last_message: conversation.lastMessage,
          last_timestamp: conversation.lastTimestamp,
          unread: conversation.unread || 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        userId: data.user_id,
        userName: data.user_name,
        messages: data.messages || [],
        lastMessage: data.last_message,
        lastTimestamp: data.last_timestamp,
        unread: data.unread || 0
      };
    } catch (error) {
      console.error('Erro ao salvar conversa:', error);
      return conversation;
    }
  },

  async addMessage(userId, message) {
    if (!isConnected) return null;

    try {
      const conversation = await this.findByUserId(userId);
      if (!conversation) return null;

      const messages = [...conversation.messages, message];

      // Define a mensagem de preview baseado no tipo
      let lastMessage = message.text;
      if (message.type === 'audio') {
        lastMessage = '🎤 Áudio';
      } else if (message.type === 'file') {
        lastMessage = `📎 ${message.fileName || 'Arquivo'}`;
      }

      return await this.createOrUpdate(userId, {
        ...conversation,
        messages,
        lastMessage,
        lastTimestamp: message.timestamp
      });
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error);
      return null;
    }
  },

  async markAsRead(userId) {
    if (!isConnected) return;

    try {
      await supabase
        .from('conversations')
        .update({ unread: 0 })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  }
};

// Funções para Quick Messages
export const QuickMessageDB = {
  async findAll() {
    if (!isConnected) return [];

    try {
      const { data, error } = await supabase
        .from('quick_messages')
        .select('*')
        .eq('enabled', true)
        .order('order', { ascending: true });

      if (error) throw error;

      return data.map(row => ({
        id: row.id,
        text: row.text,
        emoji: row.emoji,
        category: row.category,
        shortcut: row.shortcut,
        order: row.order,
        enabled: row.enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Erro ao buscar quick messages:', error);
      return [];
    }
  },

  async findById(id) {
    if (!isConnected) return null;

    try {
      const { data, error } = await supabase
        .from('quick_messages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        id: data.id,
        text: data.text,
        emoji: data.emoji,
        category: data.category,
        shortcut: data.shortcut,
        order: data.order,
        enabled: data.enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Erro ao buscar quick message:', error);
      return null;
    }
  },

  async create(quickMessage) {
    if (!isConnected) return null;

    try {
      const { data, error } = await supabase
        .from('quick_messages')
        .insert({
          text: quickMessage.text,
          emoji: quickMessage.emoji || null,
          category: quickMessage.category || 'general',
          shortcut: quickMessage.shortcut || null,
          order: quickMessage.order || 0,
          enabled: quickMessage.enabled !== undefined ? quickMessage.enabled : true
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        text: data.text,
        emoji: data.emoji,
        category: data.category,
        shortcut: data.shortcut,
        order: data.order,
        enabled: data.enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Erro ao criar quick message:', error);
      return null;
    }
  },

  async update(id, quickMessage) {
    if (!isConnected) return null;

    try {
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (quickMessage.text !== undefined) updateData.text = quickMessage.text;
      if (quickMessage.emoji !== undefined) updateData.emoji = quickMessage.emoji;
      if (quickMessage.category !== undefined) updateData.category = quickMessage.category;
      if (quickMessage.shortcut !== undefined) updateData.shortcut = quickMessage.shortcut;
      if (quickMessage.order !== undefined) updateData.order = quickMessage.order;
      if (quickMessage.enabled !== undefined) updateData.enabled = quickMessage.enabled;

      const { data, error } = await supabase
        .from('quick_messages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        text: data.text,
        emoji: data.emoji,
        category: data.category,
        shortcut: data.shortcut,
        order: data.order,
        enabled: data.enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Erro ao atualizar quick message:', error);
      return null;
    }
  },

  async delete(id) {
    if (!isConnected) return false;

    try {
      const { error } = await supabase
        .from('quick_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro ao deletar quick message:', error);
      return false;
    }
  },

  async reorder(orderedIds) {
    if (!isConnected) return false;

    try {
      // Atualiza a ordem de cada mensagem
      for (let i = 0; i < orderedIds.length; i++) {
        await supabase
          .from('quick_messages')
          .update({ order: i, updated_at: new Date().toISOString() })
          .eq('id', orderedIds[i]);
      }

      return true;
    } catch (error) {
      console.error('Erro ao reordenar quick messages:', error);
      return false;
    }
  }
};

// Funções para Leads (controle de trava)
export const LeadDB = {
  async getTravaStatus(userId) {
    if (!isConnected) return false;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('trava')
        .eq('telefone', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false; // Lead não existe, considera não travado
        throw error;
      }

      return data.trava || false;
    } catch (error) {
      console.error('Erro ao buscar status de trava:', error);
      return false;
    }
  },

  async setTrava(userId, travaValue) {
    if (!isConnected) return false;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ trava: travaValue })
        .eq('telefone', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro ao atualizar trava:', error);
      return false;
    }
  },

  async toggleTrava(userId) {
    if (!isConnected) return null;

    try {
      const currentStatus = await this.getTravaStatus(userId);
      const newStatus = !currentStatus;

      const success = await this.setTrava(userId, newStatus);

      if (success) {
        return newStatus;
      }

      return null;
    } catch (error) {
      console.error('Erro ao alternar trava:', error);
      return null;
    }
  },

  async findAll() {
    if (!isConnected) return [];

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(row => ({
        uuid: row.id,
        telefone: row.telefone,
        nome: row.nome,
        email: row.email,
        status: row.status || 'novo',
        trava: row.trava || false,
        observacoes: row.observacoes || '',
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      return [];
    }
  },

  async findByUuid(uuid) {
    if (!isConnected) return null;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', uuid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        uuid: data.id,
        telefone: data.telefone,
        nome: data.nome,
        email: data.email,
        status: data.status || 'novo',
        trava: data.trava || false,
        observacoes: data.observacoes || '',
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Erro ao buscar lead:', error);
      return null;
    }
  },

  async updateStatus(identifier, status) {
    if (!isConnected) return null;

    try {
      console.log('🔍 Buscando lead com identificador:', identifier);
      console.log('🔍 Tipo do identificador:', typeof identifier);

      // Limpa o telefone de caracteres especiais se for telefone
      const cleanIdentifier = String(identifier).replace(/\D/g, '');
      console.log('🔍 Identificador limpo (sem caracteres especiais):', cleanIdentifier);

      // Tenta buscar por UUID primeiro, depois por telefone
      let query = supabase.from('leads').select('*');

      // Se o identificador parece ser um UUID (tem hífens e letras), busca por uuid
      if (identifier.includes('-') && /[a-f]/.test(String(identifier).toLowerCase())) {
        console.log('🔍 Buscando por UUID');
        query = query.eq('id', identifier);
      } else {
        // Caso contrário, busca por telefone
        console.log('🔍 Buscando por telefone');
        // Tenta com o valor original e com o valor limpo
        query = query.or(`telefone.eq.${identifier},telefone.eq.${cleanIdentifier}`);
      }

      const { data: existingLead, error: findError } = await query.maybeSingle();

      if (findError) {
        console.error('❌ Erro ao buscar lead:', findError);
        return null;
      }

      if (!existingLead) {
        console.error('❌ Lead não encontrado no Supabase');
        console.error('❌ Identificador buscado:', identifier);
        console.error('❌ Identificador limpo:', cleanIdentifier);

        // Lista todos os leads para debug
        const { data: allLeads } = await supabase
          .from('leads')
          .select('id, telefone, nome')
          .limit(10);
        console.log('📋 Primeiros leads no banco:', allLeads);

        return null;
      }

      console.log('✅ Lead encontrado:', existingLead);

      // Atualiza o status usando o uuid encontrado
      const { data, error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar status:', error);
        throw error;
      }

      console.log('✅ Status atualizado com sucesso:', data);

      return {
        uuid: data.id,
        telefone: data.telefone,
        nome: data.nome,
        email: data.email,
        status: data.status || 'novo',
        trava: data.trava || false,
        observacoes: data.observacoes || '',
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('❌ Erro ao atualizar status do lead:', error);
      console.error('Stack trace:', error.stack);
      return null;
    }
  },

  async create(leadData) {
    if (!isConnected) return null;

    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          telefone: leadData.telefone,
          nome: leadData.nome,
          email: leadData.email || null,
          status: leadData.status || 'novo',
          trava: false,
          observacoes: leadData.observacoes || ''
        })
        .select()
        .single();

      if (error) throw error;

      return {
        uuid: data.id,
        telefone: data.telefone,
        nome: data.nome,
        email: data.email,
        status: data.status || 'novo',
        trava: data.trava || false,
        observacoes: data.observacoes || '',
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      return null;
    }
  },

  async update(identifier, leadData) {
    if (!isConnected) return null;

    try {
      console.log('🔍 Atualizando lead com identificador:', identifier);
      console.log('🔍 Tipo do identificador:', typeof identifier);
      console.log('🔍 Dados para atualizar:', leadData);

      const identifierStr = String(identifier);

      // Limpa o telefone de caracteres especiais se for telefone
      const cleanIdentifier = identifierStr.replace(/\D/g, '');

      // Tenta buscar por UUID primeiro, depois por telefone
      let query = supabase.from('leads').select('*');

      // UUID tem formato: 8-4-4-4-12 caracteres hexadecimais separados por hífen
      const isUUID = identifierStr.includes('-') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifierStr);

      if (isUUID) {
        console.log('🔍 Detectado como UUID, buscando por id');
        query = query.eq('id', identifier);
      } else {
        // Caso contrário, busca por telefone
        console.log('🔍 Detectado como telefone, buscando por telefone');
        console.log('🔍 Telefone original:', identifier);
        console.log('🔍 Telefone limpo:', cleanIdentifier);
        query = query.or(`telefone.eq.${identifier},telefone.eq.${cleanIdentifier}`);
      }

      console.log('🔍 Executando busca no Supabase...');
      const { data: existingLead, error: findError } = await query.maybeSingle();

      if (findError) {
        console.error('❌ Erro ao buscar lead:', findError);
        console.error('❌ Código do erro:', findError.code);
        console.error('❌ Mensagem do erro:', findError.message);
        return null;
      }

      if (!existingLead) {
        console.error('❌ Lead não encontrado no banco de dados');
        console.error('❌ Identificador usado:', identifier);
        console.error('❌ É UUID?', isUUID);

        // Debug: Lista alguns leads para verificar
        const { data: allLeads } = await supabase
          .from('leads')
          .select('id, telefone, nome')
          .limit(5);
        console.log('📋 Primeiros 5 leads no banco:', allLeads);

        return null;
      }

      console.log('✅ Lead encontrado:', existingLead);

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (leadData.nome !== undefined) updateData.nome = leadData.nome;
      if (leadData.telefone !== undefined) updateData.telefone = leadData.telefone;
      if (leadData.email !== undefined) updateData.email = leadData.email;
      if (leadData.status !== undefined) updateData.status = leadData.status;
      if (leadData.observacoes !== undefined) updateData.observacoes = leadData.observacoes;

      console.log('🔄 Dados que serão atualizados:', updateData);
      console.log('🔄 Atualizando lead com ID:', existingLead.id);

      const { data, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', existingLead.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao executar UPDATE no Supabase:', error);
        console.error('❌ Código do erro:', error.code);
        console.error('❌ Mensagem do erro:', error.message);
        console.error('❌ Detalhes do erro:', error.details);
        throw error;
      }

      console.log('✅ Lead atualizado com sucesso:', data);

      return {
        uuid: data.id,
        telefone: data.telefone,
        nome: data.nome,
        email: data.email,
        status: data.status || 'novo',
        trava: data.trava || false,
        observacoes: data.observacoes || '',
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('❌ ERRO GERAL ao atualizar lead:', error);
      console.error('❌ Stack trace:', error.stack);
      return null;
    }
  },

  async delete(identifier) {
    if (!isConnected) return false;

    try {
      console.log('🔍 Deletando lead com identificador:', identifier);

      const identifierStr = String(identifier);

      // Limpa o telefone de caracteres especiais se for telefone
      const cleanIdentifier = identifierStr.replace(/\D/g, '');

      // Tenta buscar por UUID primeiro, depois por telefone
      let query = supabase.from('leads').select('*');

      // UUID tem formato: 8-4-4-4-12 caracteres hexadecimais separados por hífen
      const isUUID = identifierStr.includes('-') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifierStr);

      if (isUUID) {
        console.log('🔍 Detectado como UUID, buscando por id');
        query = query.eq('id', identifier);
      } else {
        // Caso contrário, busca por telefone
        console.log('🔍 Detectado como telefone, buscando por telefone');
        query = query.or(`telefone.eq.${identifier},telefone.eq.${cleanIdentifier}`);
      }

      const { data: existingLead, error: findError } = await query.maybeSingle();

      if (findError) {
        console.error('❌ Erro ao buscar lead:', findError);
        return false;
      }

      if (!existingLead) {
        console.error('❌ Lead não encontrado');
        return false;
      }

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', existingLead.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro ao deletar lead:', error);
      return false;
    }
  }
};
