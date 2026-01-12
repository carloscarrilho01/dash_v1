import { useState, useEffect, useRef } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import './ChatWindow.css'

function ChatWindow({ conversation, onSendMessage }) {
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp)

    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return `Ontem às ${format(date, 'HH:mm')}`
    } else {
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message)
      setMessage('')
    }
  }

  if (!conversation) {
    return (
      <div className="chat-window">
        <div className="chat-empty">
          <div className="chat-empty-content">
            <svg viewBox="0 0 303 172" width="360" height="360" className="empty-icon">
              <path fill="#525252" d="M229.5 0C263.4 0 291 27.6 291 61.5V110.5C291 144.4 263.4 172 229.5 172H64.5C30.6 172 3 144.4 3 110.5V61.5C3 27.6 30.6 0 64.5 0H229.5Z"/>
              <path fill="#3b3b3b" d="M229.5 5C260.5 5 286 30.5 286 61.5V110.5C286 141.5 260.5 167 229.5 167H64.5C33.5 167 8 141.5 8 110.5V61.5C8 30.5 33.5 5 64.5 5H229.5Z"/>
            </svg>
            <h2>n8n Chat Dashboard</h2>
            <p>Selecione uma conversa para visualizar as mensagens</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar">
            <svg viewBox="0 0 24 24" width="40" height="40">
              <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
            </svg>
          </div>
          <div>
            <h3>{conversation.userName}</h3>
            <span className="user-id">ID: {conversation.userId}</span>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        <div className="messages-container">
          {conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.isBot ? 'bot' : msg.isAgent ? 'agent' : 'user'}`}
            >
              <div className="message-bubble">
                <div className="message-text">{msg.text}</div>
                <div className="message-time">
                  {formatMessageTime(msg.timestamp)}
                  {msg.isAgent && (
                    <svg viewBox="0 0 16 15" width="16" height="15" className="message-check">
                      <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="chat-input">
        <form onSubmit={handleSubmit} className="input-container">
          <button type="button" className="icon-button">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-3.505 0-5.388-1.164-5.607-1.959 0 0 5.912 1.055 10.658 0zM11.804 1.011C5.609 1.011.978 6.033.978 12.228s4.826 10.761 11.021 10.761S23.02 18.423 23.02 12.228c.001-6.195-5.021-11.217-11.216-11.217zM12 21.354c-5.273 0-9.381-3.886-9.381-9.159s3.942-9.548 9.215-9.548 9.548 4.275 9.548 9.548c-.001 5.272-4.109 9.159-9.382 9.159zm3.108-9.751c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962z"/>
            </svg>
          </button>

          <input
            type="text"
            placeholder="Digite uma mensagem"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="message-input"
          />

          <button type="submit" className="send-button" disabled={!message.trim()}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatWindow
