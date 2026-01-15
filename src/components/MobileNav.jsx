import { useState } from 'react'
import './MobileNav.css'

function MobileNav({ currentView, onNavigate, onNavigateToWhatsApp, onNewConversation }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleNavigate = (view) => {
    onNavigate(view)
    setIsMenuOpen(false)
  }

  return (
    <>
      {/* Header Mobile */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={toggleMenu}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
          </svg>
        </button>

        <h1 className="mobile-title">
          {currentView === 'chat' && 'IA Conversa'}
          {currentView === 'crm' && 'CRM Kanban'}
          {currentView === 'analytics' && 'Analytics'}
          {currentView === 'whatsapp' && 'WhatsApp'}
        </h1>

        {currentView === 'chat' && (
          <button className="mobile-new-chat" onClick={onNewConversation}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M11,13H9V11H7V9H9V7H11V9H13V11H11V13Z" />
            </svg>
          </button>
        )}
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
            className={`menu-item ${currentView === 'whatsapp' ? 'active' : ''}`}
            onClick={() => handleNavigate('whatsapp')}
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z" />
            </svg>
            <span>WhatsApp</span>
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
        </nav>

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

export default MobileNav
