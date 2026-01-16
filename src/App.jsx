import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import ChatWindow from './components/ChatWindow'
import KanbanBoard from './components/KanbanBoard'
import Analytics from './components/Analytics'
import WhatsAppConnection from './components/WhatsAppConnection'
import ProductStock from './components/ProductStock'
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
  const { user, loading: authLoading } = useAuth()
  const [currentView, setCurrentView] = useState('chat') // 'chat', 'crm', 'analytics', 'whatsapp' ou 'stock'
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)

  // Carrega conversas iniciais - só executa se usuário estiver autenticado
  useEffect(() => {
    if (!user) return

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
  }, [user, selectedConversation?.userId])

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
      // Carrega apenas as últimas 50 mensagens inicialmente
      const response = await fetch(`${API_URL}/api/conversations/${conversation.userId}?limit=50&offset=0`)
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

  const handleLoadMoreMessages = async () => {
    if (!selectedConversation || !selectedConversation.hasMore) return

    try {
      const currentMessageCount = selectedConversation.messages.length
      const response = await fetch(
        `${API_URL}/api/conversations/${selectedConversation.userId}?limit=50&offset=${currentMessageCount}`
      )
      const data = await response.json()

      // Adiciona as mensagens mais antigas ao início do array
      setSelectedConversation(prev => ({
        ...prev,
        messages: [...data.messages, ...prev.messages],
        hasMore: data.hasMore,
        totalMessages: data.totalMessages
      }))

      return data.messages.length
    } catch (error) {
      console.error('Erro ao carregar mais mensagens:', error)
      return 0
    }
  }

  // Mostra tela de loading durante autenticação
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="spinner-large"></div>
      </div>
    )
  }

  // Mostra tela de login se não estiver autenticado
  if (!user) {
    return <Login onLogin={() => {}} />
  }

  return (
    <div className="app">
      {/* Menu Mobile - visível apenas em mobile */}
      <MobileNav
        currentView={currentView}
        onNavigate={setCurrentView}
        onNavigateToWhatsApp={() => setCurrentView('whatsapp')}
        onNewConversation={handleNewConversation}
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={handleSelectConversation}
        loading={loading}
      />

      {currentView === 'chat' ? (
        <>
          <Sidebar
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onNavigateToCRM={() => setCurrentView('crm')}
            onNavigateToAnalytics={() => setCurrentView('analytics')}
            onNavigateToWhatsApp={() => setCurrentView('whatsapp')}
            onNavigateToStock={() => setCurrentView('stock')}
            loading={loading}
          />
          <ChatWindow
            conversation={selectedConversation}
            onSendMessage={handleSendMessage}
            onLoadMoreMessages={handleLoadMoreMessages}
            socket={socket}
            conversations={conversations}
            onSelectConversation={handleSelectConversation}
          />
        </>
      ) : currentView === 'crm' ? (
        <div className="crm-view">
          <div className="crm-nav">
            <button className="back-button" onClick={() => setCurrentView('chat')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
              </svg>
              Voltar para Chat
            </button>
            <button className="nav-button" onClick={() => setCurrentView('analytics')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z" />
              </svg>
              Analytics
            </button>
            <button className="nav-button" onClick={() => setCurrentView('whatsapp')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z" />
              </svg>
              WhatsApp
            </button>
          </div>
          <KanbanBoard socket={socket} />
        </div>
      ) : currentView === 'analytics' ? (
        <div className="analytics-view">
          <div className="analytics-nav">
            <button className="back-button" onClick={() => setCurrentView('chat')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
              </svg>
              Voltar para Chat
            </button>
            <button className="nav-button" onClick={() => setCurrentView('crm')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" />
              </svg>
              CRM
            </button>
            <button className="nav-button" onClick={() => setCurrentView('whatsapp')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z" />
              </svg>
              WhatsApp
            </button>
          </div>
          <Analytics socket={socket} />
        </div>
      ) : currentView === 'whatsapp' ? (
        <div className="whatsapp-view">
          <div className="whatsapp-nav">
            <button className="back-button" onClick={() => setCurrentView('chat')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
              </svg>
              Voltar para Chat
            </button>
            <button className="nav-button" onClick={() => setCurrentView('crm')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" />
              </svg>
              CRM
            </button>
            <button className="nav-button" onClick={() => setCurrentView('analytics')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z" />
              </svg>
              Analytics
            </button>
          </div>
          <WhatsAppConnection socket={socket} />
        </div>
      ) : (
        <div className="stock-view">
          <div className="stock-nav">
            <button className="back-button" onClick={() => setCurrentView('chat')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
              </svg>
              Voltar para Chat
            </button>
            <button className="nav-button" onClick={() => setCurrentView('crm')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" />
              </svg>
              CRM
            </button>
            <button className="nav-button" onClick={() => setCurrentView('analytics')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z" />
              </svg>
              Analytics
            </button>
            <button className="nav-button" onClick={() => setCurrentView('whatsapp')}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z" />
              </svg>
              WhatsApp
            </button>
          </div>
          <ProductStock />
        </div>
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
