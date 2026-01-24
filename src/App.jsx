import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useAuth } from './contexts/AuthContext'
import { API_URL } from './config/api'
import { useSocket } from './hooks/useSocket'
import { preloadComponents } from './utils/preloadComponents'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import ChatWindow from './components/ChatWindow'
import NewConversationModal from './components/NewConversationModal'
import './App.css'

// Lazy loading de componentes pesados com preload
const kanbanLoader = () => import('./components/KanbanBoard')
const analyticsLoader = () => import('./components/Analytics')
const stockLoader = () => import('./components/ProductStock')

const KanbanBoard = lazy(kanbanLoader)
const Analytics = lazy(analyticsLoader)
const ProductStock = lazy(stockLoader)

// Loading component para Suspense
const LoadingFallback = () => (
  <div className="app-loading">
    <div className="spinner-large"></div>
  </div>
)

function App() {
  const { user, loading: authLoading } = useAuth()
  const { socket, on, off } = useSocket()
  const [currentView, setCurrentView] = useState('chat')
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)

  // Callbacks estabilizados com useCallback
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/conversations`)
      const data = await response.json()
      setConversations(data)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      setLoading(false)
    }
  }, [])

  // Handler de init estabilizado
  const handleInit = useCallback((data) => {
    const sortedData = data.sort((a, b) =>
      new Date(b.lastTimestamp) - new Date(a.lastTimestamp)
    )
    setConversations(sortedData)
    setLoading(false)
  }, [])

  // Handler de message estabilizado
  const handleMessage = useCallback(({ userId, conversation }) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.userId !== userId)
      return [conversation, ...filtered]
    })

    setSelectedConversation(prev => {
      if (prev?.userId === userId) {
        return conversation
      }
      return prev
    })
  }, [])

  // Carrega conversas iniciais - só executa se usuário estiver autenticado
  useEffect(() => {
    if (!user || !socket) return

    // Só faz fetch se não houver listener socket ainda
    if (conversations.length === 0) {
      fetchConversations()
    }

    // Escuta mensagens via WebSocket
    on('init', handleInit)
    on('message', handleMessage)

    return () => {
      off('init', handleInit)
      off('message', handleMessage)
    }
  }, [user, socket, on, off, fetchConversations, handleInit, handleMessage])

  // Preload de componentes lazy quando usuário está autenticado
  useEffect(() => {
    if (user) {
      preloadComponents([
        { loader: kanbanLoader, name: 'KanbanBoard' },
        { loader: analyticsLoader, name: 'Analytics' },
        { loader: stockLoader, name: 'ProductStock' }
      ])
    }
  }, [user])

  const handleSelectConversation = useCallback(async (conversation) => {
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
  }, [])

  const handleSendMessage = useCallback(async (messageData) => {
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
  }, [selectedConversation])

  const handleNewConversation = useCallback(() => {
    setShowNewConversationModal(true)
  }, [])

  const handleConversationCreated = useCallback((newConversation) => {
    setConversations(prev => [newConversation, ...prev])
    setSelectedConversation(newConversation)
  }, [])

  const handleLoadMoreMessages = useCallback(async () => {
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
  }, [selectedConversation])

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
          </div>
          <Suspense fallback={<LoadingFallback />}>
            <KanbanBoard socket={socket} />
          </Suspense>
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
          </div>
          <Suspense fallback={<LoadingFallback />}>
            <Analytics socket={socket} />
          </Suspense>
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
          </div>
          <Suspense fallback={<LoadingFallback />}>
            <ProductStock />
          </Suspense>
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
