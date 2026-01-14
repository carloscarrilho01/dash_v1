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
        uuid: row.uuid,
        telefone: row.telefone,
        nome: row.nome,
        email: row.email,
        status: row.status || 'novo',
        trava: row.trava || false,
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
        .eq('uuid', uuid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        uuid: data.uuid,
        telefone: data.telefone,
        nome: data.nome,
        email: data.email,
        status: data.status || 'novo',
        trava: data.trava || false,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Erro ao buscar lead:', error);
      return null;
    }
  },

  async updateStatus(uuid, status) {
    if (!isConnected) return null;

    try {
      console.log('🔍 Buscando lead com uuid:', uuid);

      // Primeiro verifica se o lead existe
      const { data: existingLead, error: findError } = await supabase
        .from('leads')
        .select('*')
        .eq('uuid', uuid)
        .single();

      if (findError) {
        console.error('❌ Erro ao buscar lead:', findError);
        if (findError.code === 'PGRST116') {
          console.error('Lead não encontrado no Supabase');
        }
        return null;
      }

      console.log('✅ Lead encontrado:', existingLead);

      // Atualiza o status
      const { data, error } = await supabase
        .from('leads')
        .update({ status })
        .eq('uuid', uuid)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar status:', error);
        throw error;
      }

      console.log('✅ Status atualizado com sucesso:', data);

      return {
        uuid: data.uuid,
        telefone: data.telefone,
        nome: data.nome,
        email: data.email,
        status: data.status || 'novo',
        trava: data.trava || false,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('❌ Erro ao atualizar status do lead:', error);
      return null;
    }
  }
};
