import { useState, useCallback, memo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import './MobileNav.css'

function MobileNav({
  currentView,
  onNavigate,
  onNewConversation,
  conversations = [],
  selectedConversation = null,
  onSelectConversation = () => {},
  loading = false
}) {
  const { signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuTab, setMenuTab] = useState('conversations') // 'conversations' ou 'navigation'

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(!isMenuOpen)
    // Quando abrir o menu, mostra conversas se estiver no chat, senão mostra navegação
    if (!isMenuOpen) {
      setMenuTab(currentView === 'chat' ? 'conversations' : 'navigation')
    }
  }, [isMenuOpen, currentView])

  const handleNavigate = useCallback((view) => {
    onNavigate(view)
    setIsMenuOpen(false)
  }, [onNavigate])

  const handleSelectConversation = useCallback((conversation) => {
    onSelectConversation(conversation)
    // Se não estiver na view de chat, navega para lá
    if (currentView !== 'chat') {
      onNavigate('chat')
    }
    setIsMenuOpen(false)
  }, [onSelectConversation, currentView, onNavigate])

  const formatTime = useCallback((timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else if (hours < 48) {
      return 'Ontem'
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }
  }, [])

  const getInitials = useCallback((name) => {
    if (!name) return '?'
    return name.substring(0, 2).toUpperCase()
  }, [])

  return (
    <>
      {/* Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <button
          className={`nav-button ${currentView === 'chat' ? 'active' : ''}`}
          onClick={() => handleNavigate('chat')}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6M14,14H6V12H14M18,8H6V6H18" />
          </svg>
          <span>Chat</span>
        </button>

        <button
          className={`nav-button ${currentView === 'crm' ? 'active' : ''}`}
          onClick={() => handleNavigate('crm')}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" />
          </svg>
          <span>CRM</span>
        </button>

        <button
          className={`nav-button ${currentView === 'os' ? 'active' : ''}`}
          onClick={() => handleNavigate('os')}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M9,13V18H7V13H9M15,15V18H13V15H15M11,11V18H13V11H11Z" />
          </svg>
          <span>OS</span>
        </button>

        <button
          className={`nav-button ${currentView === 'analytics' ? 'active' : ''}`}
          onClick={() => handleNavigate('analytics')}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z" />
          </svg>
          <span>Analytics</span>
        </button>
      </div>

      {/* Overlay */}
      {isMenuOpen && (
        <div className="menu-overlay" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Menu Lateral */}
      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <h2>Menu</h2>
          <button className="menu-close" onClick={toggleMenu}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>

        {/* Tabs de alternância */}
        <div className="menu-tabs">
          <button
            className={`menu-tab ${menuTab === 'conversations' ? 'active' : ''}`}
            onClick={() => setMenuTab('conversations')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6M14,14H6V12H14M18,8H6V6H18" />
            </svg>
            <span>Conversas</span>
          </button>
          <button
            className={`menu-tab ${menuTab === 'navigation' ? 'active' : ''}`}
            onClick={() => setMenuTab('navigation')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
            </svg>
            <span>Navegação</span>
          </button>
        </div>

        {menuTab === 'conversations' ? (
          /* Lista de Conversas */
          <div className="mobile-conversations">
            {loading ? (
              <div className="loading">Carregando conversas...</div>
            ) : conversations.length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma conversa ainda</p>
                <small>Clique em + para criar uma nova conversa</small>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.userId}
                  className={`conversation-item ${selectedConversation?.userId === conv.userId ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="conversation-avatar">
                    {getInitials(conv.userName)}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <span className="conversation-name">{conv.userName}</span>
                      <span className="conversation-time">
                        {formatTime(conv.lastTimestamp)}
                      </span>
                    </div>
                    <div className="conversation-preview">
                      <span className="last-message">{conv.lastMessage}</span>
                      {conv.unread > 0 && (
                        <span className="unread-badge">{conv.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Menu de Navegação */
          <nav className="menu-items">
            <button
              className={`menu-item ${currentView === 'chat' ? 'active' : ''}`}
              onClick={() => handleNavigate('chat')}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6M14,14H6V12H14M18,8H6V6H18" />
              </svg>
              <span>Chat</span>
            </button>

            <button
              className={`menu-item ${currentView === 'crm' ? 'active' : ''}`}
              onClick={() => handleNavigate('crm')}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" />
              </svg>
              <span>CRM</span>
            </button>

            <button
              className={`menu-item ${currentView === 'analytics' ? 'active' : ''}`}
              onClick={() => handleNavigate('analytics')}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z" />
              </svg>
              <span>Analytics</span>
            </button>

            <button
              className={`menu-item ${currentView === 'os' ? 'active' : ''}`}
              onClick={() => handleNavigate('os')}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M9,13V18H7V13H9M15,15V18H13V15H15M11,11V18H13V11H11Z" />
              </svg>
              <span>Ordens de Servico</span>
            </button>

            <div className="menu-divider"></div>

            <button
              className="menu-item"
              onClick={() => {
                onNewConversation()
                setIsMenuOpen(false)
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M11,13H9V11H7V9H9V7H11V9H13V11H11V13Z" />
              </svg>
              <span>Nova Conversa</span>
            </button>

            <button
              className="menu-item theme-item"
              onClick={toggleTheme}
            >
              {isDark ? (
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z" />
                </svg>
              )}
              <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>

            <button
              className="menu-item logout-item"
              onClick={signOut}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
              </svg>
              <span>Sair</span>
            </button>
          </nav>
        )}

        <div className="menu-footer">
          <div className="menu-user">
            <div className="user-avatar">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
              </svg>
            </div>
            <div className="user-info">
              <span className="user-name">Admin</span>
              <span className="user-status">Online</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default memo(MobileNav)
