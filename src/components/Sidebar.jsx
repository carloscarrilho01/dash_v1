import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import './Sidebar.css'

function Sidebar({ conversations, selectedConversation, onSelectConversation, loading, onNewConversation, onNavigateToCRM }) {
  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ptBR
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>IA Conversa</h2>
        <div className="sidebar-header-actions">
          <button
            className="icon-button crm-btn"
            onClick={onNavigateToCRM}
            title="CRM Kanban"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M3,3H11V11H3V3M13,3H21V11H13V3M3,13H11V21H3V13M13,13H21V21H13V13Z" />
            </svg>
          </button>
          <button
            className="icon-button new-conversation-btn"
            onClick={onNewConversation}
            title="Nova Conversa"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M11,13H9V11H7V9H9V7H11V9H13V11H11V13Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="sidebar-search">
        <div className="search-box">
          <svg viewBox="0 0 24 24" width="20" height="20" className="search-icon">
            <path fill="currentColor" d="M15.5,14H14.71L14.43,13.73C15.41,12.59 16,11.11 16,9.5C16,5.91 13.09,3 9.5,3C5.91,3 3,5.91 3,9.5C3,13.09 5.91,16 9.5,16C11.11,16 12.59,15.41 13.73,14.43L14,14.71V15.5L19,20.5L20.5,19L15.5,14M9.5,14C7.01,14 5,11.99 5,9.5C5,7.01 7.01,5 9.5,5C11.99,5 14,7.01 14,9.5C14,11.99 11.99,14 9.5,14Z" />
          </svg>
          <input type="text" placeholder="Pesquisar conversas" />
        </div>
      </div>

      <div className="conversations-list">
        {loading ? (
          <div className="loading">Carregando conversas...</div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma conversa ainda</p>
            <small>As conversas do n8n aparecerão aqui</small>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.userId}
              className={`conversation-item ${
                selectedConversation?.userId === conversation.userId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="conversation-avatar">
                <svg viewBox="0 0 24 24" width="40" height="40">
                  <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                </svg>
              </div>

              <div className="conversation-info">
                <div className="conversation-header">
                  <h3 className="conversation-name">{conversation.userName}</h3>
                  <span className="conversation-time">
                    {formatTime(conversation.lastTimestamp)}
                  </span>
                </div>
                <div className="conversation-preview">
                  <p className="last-message">{conversation.lastMessage}</p>
                  {conversation.unread > 0 && (
                    <span className="unread-badge">{conversation.unread}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Sidebar
