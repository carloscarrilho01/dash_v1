import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import KanbanBoard from './components/KanbanBoard'
import NewConversationModal from './components/NewConversationModal'
import './App.css'

// Em produção, usa a mesma URL do site. Em desenvolvimento, usa localhost
const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.MODE === 'production'
    ? window.location.origin
    : 'http://localhost:3001'
)
const socket = io(API_URL)

// Tornar socket disponível globalmente para os componentes
window.socket = socket

function App() {
  const [currentView, setCurrentView] = useState('chat') // 'chat' ou 'crm'
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)

  // Carrega conversas iniciais
  useEffect(() => {
    fetchConversations()

    // Escuta mensagens via WebSocket
    socket.on('init', (data) => {
      setConversations(data.sort((a, b) =>
        new Date(b.lastTimestamp) - new Date(a.lastTimestamp)
      ))
      setLoading(false)
    })

    socket.on('message', ({ userId, conversation }) => {
      setConversations(prev => {
        const filtered = prev.filter(c => c.userId !== userId)
        return [conversation, ...filtered]
      })

      // Atualiza conversa selecionada se for a mesma
      if (selectedConversation?.userId === userId) {
        setSelectedConversation(conversation)
      }
    })

    return () => {
      socket.off('init')
      socket.off('message')
    }
  }, [selectedConversation?.userId])

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/conversations`)
      const data = await response.json()
      setConversations(data)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      setLoading(false)
    }
  }

  const handleSelectConversation = async (conversation) => {
    try {
      const response = await fetch(`${API_URL}/api/conversations/${conversation.userId}`)
      const data = await response.json()
      setSelectedConversation(data)

      // Atualiza o contador de não lidas
      setConversations(prev =>
        prev.map(c => c.userId === conversation.userId ? { ...c, unread: 0 } : c)
      )
    } catch (error) {
      console.error('Erro ao carregar conversa:', error)
    }
  }

  const handleSendMessage = async (messageData) => {
    if (!selectedConversation) return

    console.log('📤 handleSendMessage chamado com:', messageData)

    // Suporta tanto string quanto objeto { type, content, duration, fileName, etc }
    const payload = typeof messageData === 'string'
      ? { message: messageData, type: 'text' }
      : {
          message: messageData.content,
          type: messageData.type || 'text',
          duration: messageData.duration,
          fileName: messageData.fileName,
          fileSize: messageData.fileSize,
          fileType: messageData.fileType,
          fileCategory: messageData.fileCategory
        }

    console.log('📦 Payload montado:', payload)

    // Valida apenas mensagens de texto vazias
    if (payload.type === 'text' && (!payload.message || !payload.message.trim())) {
      console.log('⚠️ Mensagem de texto vazia, ignorando')
      return
    }

    // Para arquivos e áudios, só precisa ter conteúdo
    if (!payload.message) {
      console.log('⚠️ Payload sem mensagem, ignorando')
      return
    }

    try {
      console.log('🚀 Enviando para:', `${API_URL}/api/conversations/${selectedConversation.userId}/send`)
      const response = await fetch(`${API_URL}/api/conversations/${selectedConversation.userId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      console.log('✅ Resposta do servidor:', result)
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error)
    }
  }

  const handleNewConversation = () => {
    setShowNewConversationModal(true)
  }

  const handleConversationCreated = (newConversation) => {
    // Adiciona a nova conversa na lista
    setConversations(prev => [newConversation, ...prev])

    // Seleciona automaticamente a nova conversa
    setSelectedConversation(newConversation)
  }

  return (
    <div className="app">
      {currentView === 'chat' ? (
        <>
          <Sidebar
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onNavigateToCRM={() => setCurrentView('crm')}
            loading={loading}
          />
          <ChatWindow
            conversation={selectedConversation}
            onSendMessage={handleSendMessage}
            socket={socket}
          />
        </>
      ) : (
        <>
          <div className="crm-nav">
            <button className="back-button" onClick={() => setCurrentView('chat')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
              </svg>
              Voltar para Chat
            </button>
          </div>
          <KanbanBoard socket={socket} />
        </>
      )}

      {showNewConversationModal && (
        <NewConversationModal
          onClose={() => setShowNewConversationModal(false)}
          onConversationCreated={handleConversationCreated}
        />
      )}
    </div>
  )
}

export default App
