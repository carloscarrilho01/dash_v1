import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { API_URL } from '../config/api'
import { formatMessageTime, formatFileSize } from '../utils/dateFormatters'
import AudioRecorder from './AudioRecorder'
import FileUploader from './FileUploader'
import QuickMessagesBar from './QuickMessagesBar'
import QuickMessagesManager from './QuickMessagesManager'
import SignatureManager from './SignatureManager'
import CustomAudioPlayer from './CustomAudioPlayer'
import './ChatWindow.css'
import './FileUploader.css'

// Componente para preview de imagem com tratamento de erro
function ImagePreview({ src, alt }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  // Log inicial para debug
  useEffect(() => {
    console.group('🖼️ ImagePreview iniciado');
    console.log('Src recebido:', src ? 'SIM' : 'NÃO');
    console.log('Src length:', src?.length);
    console.log('Src prefix (60 chars):', src?.substring(0, 60));
    console.log('Começa com data:image:', src?.startsWith('data:image/'));

    if (src?.startsWith('data:')) {
      const mimeMatch = src.match(/data:([^;]+);/);
      console.log('MIME type detectado:', mimeMatch?.[1]);
    } else {
      console.warn('⚠️ SRC NÃO COMEÇA COM data:');
    }
    console.groupEnd();
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    console.log('✅ Imagem carregada com sucesso');
  };

  const handleError = (e) => {
    console.group('❌ Erro ao carregar imagem');
    console.error('Event:', e);
    console.error('Tipo do erro:', e.type);
    console.error('Src length:', src?.length);
    console.error('Src prefix:', src?.substring(0, 80));

    // Verifica se é base64 válido
    if (src?.startsWith('data:image/')) {
      const parts = src.split(',');
      console.error('MIME type:', src.match(/data:([^;]+);/)?.[1]);
      console.error('Has base64 data:', parts.length > 1);
      if (parts.length > 1) {
        console.error('Base64 length:', parts[1]?.length);
        // Testa se base64 é válido
        try {
          atob(parts[1].substring(0, 100));
          console.error('✅ Base64 parece válido');
        } catch (err) {
          console.error('❌ Base64 inválido:', err.message);
        }
      }
    } else {
      console.error('⚠️ PROBLEMA: Imagem não começa com data:image/');
      console.error('Começa com:', src?.substring(0, 20));
    }
    console.groupEnd();

    setIsLoading(false);
    setHasError(true);
  };

  const handleClick = () => {
    if (!hasError) {
      window.open(imageSrc, '_blank');
    }
  };

  return (
    <div className={`message-file-image-container ${isLoading ? 'image-loading' : ''} ${hasError ? 'image-error' : ''}`}>
      {isLoading && (
        <div className="image-loading-spinner">
          <div className="spinner"></div>
        </div>
      )}
      {hasError ? (
        <div className="image-error-placeholder" onClick={() => window.open(src, '_blank')}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M21,19V5c0,-1.1 -0.9,-2 -2,-2H5c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2zM8.5,13.5l2.5,3.01L14.5,12l4.5,6H5l3.5,-4.5z"/>
            <path d="M12,2L12,2c5.52,0 10,4.48 10,10v0c0,5.52 -4.48,10 -10,10h0C6.48,22 2,17.52 2,12v0C2,6.48 6.48,2 12,2z" fill="none" stroke="currentColor" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <p>Erro ao carregar imagem</p>
          <small>Clique para abrir em nova aba</small>
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          className="message-file-image"
          onClick={handleClick}
          onLoad={handleLoad}
          onError={handleError}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      )}
    </div>
  );
}

function ChatWindow({ conversation, onSendMessage, onLoadMoreMessages, socket, conversations, onSelectConversation }) {
  const [message, setMessage] = useState('')
  const [showManager, setShowManager] = useState(false)
  const [showSignatureManager, setShowSignatureManager] = useState(false)
  const [showConversationsList, setShowConversationsList] = useState(false)
  const [isTravado, setIsTravado] = useState(false)
  const [isTogglingTrava, setIsTogglingTrava] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [agentName, setAgentName] = useState('')
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  // Carrega nome do agente do localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('agentName')
    if (savedName) {
      setAgentName(savedName)
    }
  }, [])

  // Carrega status da trava quando a conversa muda
  useEffect(() => {
    if (conversation?.userId) {
      fetchTravaStatus()
    }
  }, [conversation?.userId])

  // Escuta atualizações de trava via WebSocket
  useEffect(() => {
    if (!socket) return

    const handleTravaUpdate = (data) => {
      if (data.userId === conversation?.userId) {
        setIsTravado(data.trava)
      }
    }

    socket.on('trava-updated', handleTravaUpdate)

    return () => {
      socket.off('trava-updated', handleTravaUpdate)
    }
  }, [socket, conversation?.userId])

  // Lazy loading: carrega mais mensagens ao rolar para o topo
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || !onLoadMoreMessages) return

    const handleScroll = async () => {
      // Se está no topo (scrollTop < 100px) e tem mais mensagens para carregar
      if (container.scrollTop < 100 && conversation?.hasMore && !isLoadingMore) {
        setIsLoadingMore(true)

        // Salva a posição de scroll atual e a altura do container
        const previousScrollHeight = container.scrollHeight
        const previousScrollTop = container.scrollTop

        // Carrega mais mensagens
        const loadedCount = await onLoadMoreMessages()

        // Após carregar, mantém a posição visual (não pula para o topo)
        if (loadedCount > 0) {
          setTimeout(() => {
            const newScrollHeight = container.scrollHeight
            const scrollDifference = newScrollHeight - previousScrollHeight
            container.scrollTop = previousScrollTop + scrollDifference
          }, 0)
        }

        setIsLoadingMore(false)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [conversation?.hasMore, conversation?.userId, isLoadingMore, onLoadMoreMessages])

  const fetchTravaStatus = useCallback(async () => {
    if (!conversation?.userId) return

    try {
      const response = await fetch(`${API_URL}/api/leads/${conversation.userId}/trava`)
      const data = await response.json()
      setIsTravado(data.trava)
    } catch (error) {
      console.error('Erro ao buscar status de trava:', error)
    }
  }, [conversation?.userId])

  const toggleTrava = useCallback(async () => {
    if (isTogglingTrava || !conversation?.userId) return

    setIsTogglingTrava(true)
    try {
      const response = await fetch(`${API_URL}/api/leads/${conversation.userId}/toggle-trava`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setIsTravado(data.trava)
    } catch (error) {
      console.error('Erro ao alternar trava:', error)
    } finally {
      setIsTogglingTrava(false)
    }
  }, [isTogglingTrava, conversation?.userId])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage({ type: 'text', content: message })
      setMessage('')
    }
  }, [message, onSendMessage])

  const handleSendAudio = useCallback((audioData, duration) => {
    onSendMessage({
      type: 'audio',
      content: audioData,
      duration
    })
  }, [onSendMessage])

  const handleSendFile = useCallback((fileData) => {
    onSendMessage({
      type: 'file',
      content: fileData.fileData,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      fileType: fileData.fileType,
      fileCategory: fileData.type
    })
  }, [onSendMessage])

  if (!conversation) {
    return (
      <div className="chat-window">
        <div className="chat-empty">
          <div className="chat-empty-content">
            <svg viewBox="0 0 303 172" width="360" height="360" className="empty-icon">
              <path fill="#525252" d="M229.5 0C263.4 0 291 27.6 291 61.5V110.5C291 144.4 263.4 172 229.5 172H64.5C30.6 172 3 144.4 3 110.5V61.5C3 27.6 30.6 0 64.5 0H229.5Z"/>
              <path fill="#3b3b3b" d="M229.5 5C260.5 5 286 30.5 286 61.5V110.5C286 141.5 260.5 167 229.5 167H64.5C33.5 167 8 141.5 8 110.5V61.5C8 30.5 33.5 5 64.5 5H229.5Z"/>
            </svg>
            <h2>IA Conversa</h2>
            <p>Selecione uma conversa para visualizar as mensagens</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button
          className="conversations-toggle-button"
          onClick={() => setShowConversationsList(true)}
          title="Ver conversas"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
          </svg>
        </button>
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
        <div className="chat-header-actions">
          <button
            className={`icon-button trava-button ${isTravado ? 'travado' : ''}`}
            onClick={toggleTrava}
            disabled={isTogglingTrava}
            title={isTravado ? 'Agente pausado - Clique para retomar' : 'Agente ativo - Clique para pausar'}
          >
            {isTravado ? (
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="chat-messages" ref={messagesContainerRef}>
        <div className="messages-container">
          {isLoadingMore && (
            <div className="loading-more-messages">
              <div className="loading-spinner-small"></div>
              <span>Carregando mensagens anteriores...</span>
            </div>
          )}
          {conversation.messages.map((msg) => {
            // Debug: log mensagem para verificar tipo
            if (msg.type && msg.type !== 'text') {
              console.group('🔍 Renderizando mensagem ' + msg.type);
              console.log('Tipo:', msg.type);
              console.log('fileCategory:', msg.fileCategory);
              console.log('fileUrl:', msg.fileUrl ? 'EXISTE (length: ' + msg.fileUrl?.length + ')' : 'NÃO EXISTE');
              console.log('text:', msg.text ? 'EXISTE (length: ' + msg.text?.length + ')' : 'NÃO EXISTE');
              console.log('audioUrl:', msg.audioUrl ? 'EXISTE' : 'NÃO EXISTE');
              console.log('fileName:', msg.fileName);
              console.log('Mensagem completa:', JSON.stringify(msg).substring(0, 200));
              console.groupEnd();
            }

            return (
            <div
              key={msg.id}
              className={`message ${msg.isBot ? 'bot' : msg.isAgent ? 'agent' : 'user'}`}
            >
              {msg.isAgent && agentName && (
                <div className="agent-name-label">{agentName}</div>
              )}
              <div className="message-bubble">
                {msg.type === 'audio' ? (
                  <CustomAudioPlayer
                    src={msg.audioUrl || msg.text}
                    duration={msg.duration}
                  />
                ) : msg.type === 'file' ? (
                  <div className="message-file">
                    {msg.fileCategory === 'image' ? (
                      <ImagePreview
                        src={msg.fileUrl || msg.text}
                        alt={msg.fileName || 'Imagem'}
                      />
                    ) : (
                      <div className="message-file-document" onClick={() => window.open(msg.fileUrl || msg.text, '_blank')}>
                        <svg viewBox="0 0 24 24" width="32" height="32">
                          <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                        <div className="message-file-info">
                          <span className="message-file-name">{msg.fileName}</span>
                          <span className="message-file-size">{formatFileSize(msg.fileSize || 0)}</span>
                        </div>
                        <svg viewBox="0 0 24 24" width="24" height="24" className="message-file-download">
                          <path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="message-text">{msg.text}</div>
                )}
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
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <QuickMessagesBar
        onSelectMessage={onSendMessage}
        onManage={() => setShowManager(true)}
      />

      <div className="chat-input">
        <form onSubmit={handleSubmit} className="input-container">
          <button type="button" className="icon-button">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-3.505 0-5.388-1.164-5.607-1.959 0 0 5.912 1.055 10.658 0zM11.804 1.011C5.609 1.011.978 6.033.978 12.228s4.826 10.761 11.021 10.761S23.02 18.423 23.02 12.228c.001-6.195-5.021-11.217-11.216-11.217zM12 21.354c-5.273 0-9.381-3.886-9.381-9.159s3.942-9.548 9.215-9.548 9.548 4.275 9.548 9.548c-.001 5.272-4.109 9.159-9.382 9.159zm3.108-9.751c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962z"/>
            </svg>
          </button>

          <FileUploader onSendFile={handleSendFile} />

          <AudioRecorder onSendAudio={handleSendAudio} />

          <button
            type="button"
            className="icon-button"
            onClick={() => setShowSignatureManager(true)}
            title="Adicionar assinatura"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z"/>
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

      {showManager && (
        <QuickMessagesManager onClose={() => setShowManager(false)} />
      )}

      {showSignatureManager && (
        <SignatureManager
          onClose={() => {
            setShowSignatureManager(false)
            // Recarrega o nome do agente após fechar o modal
            const savedName = localStorage.getItem('agentName')
            if (savedName) {
              setAgentName(savedName)
            }
          }}
        />
      )}

      {showConversationsList && (
        <div className="mobile-conversations-modal" onClick={() => setShowConversationsList(false)}>
          <div className="mobile-conversations-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-conversations-header">
              <h3>Conversas</h3>
              <button
                className="close-conversations-button"
                onClick={() => setShowConversationsList(false)}
              >
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
              </button>
            </div>
            <div className="mobile-conversations-list">
              {conversations && conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div
                    key={conv.userId}
                    className={`mobile-conversation-item ${conversation?.userId === conv.userId ? 'active' : ''}`}
                    onClick={() => {
                      onSelectConversation(conv)
                      setShowConversationsList(false)
                    }}
                  >
                    <div className="mobile-conversation-avatar">
                      {conv.userName ? conv.userName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="mobile-conversation-info">
                      <div className="mobile-conversation-header">
                        <span className="mobile-conversation-name">{conv.userName || 'Sem nome'}</span>
                        {conv.unread > 0 && (
                          <span className="mobile-unread-badge">{conv.unread}</span>
                        )}
                      </div>
                      <p className="mobile-conversation-preview">{conv.lastMessage || 'Sem mensagens'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="mobile-empty-conversations">
                  <p>Nenhuma conversa disponível</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(ChatWindow)
