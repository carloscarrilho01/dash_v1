import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { API_URL } from '../config/api'
import AddLeadModal from './AddLeadModal'
import EditLeadModal from './EditLeadModal'
import './KanbanBoard.css'

const COLUMNS = [
  { id: 'novo', title: 'Novo', colorVar: '--kanban-novo' },
  { id: 'agendado', title: 'Agendado', colorVar: '--kanban-agendado' },
  { id: 'compareceu', title: 'Compareceu', colorVar: '--kanban-compareceu' },
  { id: 'nao_compareceu', title: 'Não compareceu', colorVar: '--kanban-nao-compareceu' },
  { id: 'servico_finalizado', title: 'Serviço finalizado', colorVar: '--kanban-servico-finalizado' },
  { id: 'fechado', title: 'Fechado', colorVar: '--kanban-fechado' },
  { id: 'perdido', title: 'Perdido', colorVar: '--kanban-perdido' }
];

function KanbanBoard({ socket }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [draggedLead, setDraggedLead] = useState(null)
  const [showAddLeadModal, setShowAddLeadModal] = useState(false)
  const [showEditLeadModal, setShowEditLeadModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [touchStartY, setTouchStartY] = useState(null)
  const [touchStartX, setTouchStartX] = useState(null)
  const [isDraggingTouch, setIsDraggingTouch] = useState(false)
  const [currentTouchX, setCurrentTouchX] = useState(null)
  const [currentTouchY, setCurrentTouchY] = useState(null)

  const fetchLeads = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/leads`)
      const data = await response.json()
      setLeads(data)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
      setLoading(false)
    }
  }, [])

  const handleLeadUpdated = useCallback((updatedLead) => {
    setLeads(prev => prev.map(lead =>
      lead.uuid === updatedLead.uuid ? updatedLead : lead
    ))
  }, [])

  const handleLeadCreatedSocket = useCallback((newLead) => {
    setLeads(prev => [newLead, ...prev])
  }, [])

  const handleLeadDeletedSocket = useCallback(({ uuid }) => {
    setLeads(prev => prev.filter(lead => lead.uuid !== uuid))
  }, [])

  useEffect(() => {
    fetchLeads()

    // Escuta atualizações de leads via WebSocket
    if (socket) {
      socket.on('lead-updated', handleLeadUpdated)
      socket.on('lead-created', handleLeadCreatedSocket)
      socket.on('lead-deleted', handleLeadDeletedSocket)

      return () => {
        socket.off('lead-updated', handleLeadUpdated)
        socket.off('lead-created', handleLeadCreatedSocket)
        socket.off('lead-deleted', handleLeadDeletedSocket)
      }
    }
  }, [socket, fetchLeads, handleLeadUpdated, handleLeadCreatedSocket, handleLeadDeletedSocket])

  const handleDragStart = useCallback((e, lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(async (e, newStatus) => {
    e.preventDefault()

    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null)
      return
    }

    // Usa uuid se existir, senão usa telefone
    const identifier = draggedLead.uuid || draggedLead.telefone

    if (!identifier) {
      console.error('❌ Lead sem identificador:', draggedLead)
      alert('Erro: Lead sem identificador válido')
      setDraggedLead(null)
      return
    }

    try {
      console.log('📤 Atualizando lead:', identifier, 'para status:', newStatus)
      console.log('📦 Lead completo:', draggedLead)

      const response = await fetch(`${API_URL}/api/leads/${identifier}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const updatedLead = await response.json()
        console.log('✅ Lead atualizado:', updatedLead)
        setLeads(prev => prev.map(lead => {
          const leadId = lead.uuid || lead.telefone
          const updatedId = updatedLead.uuid || updatedLead.telefone
          return leadId === updatedId ? updatedLead : lead
        }))
      } else {
        const errorData = await response.json()
        console.error('❌ Erro na resposta:', response.status, errorData)
        alert(`Erro ao atualizar lead: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status do lead:', error)
      alert(`Erro ao atualizar lead: ${error.message}`)
    }

    setDraggedLead(null)
  }, [draggedLead])

  // Touch handlers for mobile drag and drop
  const handleTouchStart = useCallback((e, lead) => {
    const touch = e.touches[0]
    setTouchStartY(touch.clientY)
    setTouchStartX(touch.clientX)
    setDraggedLead(lead)
    setIsDraggingTouch(false)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!draggedLead || touchStartY === null) return

    const touch = e.touches[0]
    const deltaY = Math.abs(touch.clientY - touchStartY)
    const deltaX = Math.abs(touch.clientX - touchStartX)

    // Só considera drag se mover mais de 10px (vertical ou horizontal)
    if (deltaY > 10 || deltaX > 10) {
      setIsDraggingTouch(true)
      setCurrentTouchX(touch.clientX)
      setCurrentTouchY(touch.clientY)
      e.preventDefault() // Previne scroll enquanto arrasta
    }
  }, [draggedLead, touchStartY, touchStartX])

  const handleTouchEnd = useCallback(async (e) => {
    if (!draggedLead || !isDraggingTouch) {
      // Se não estava arrastando, pode ser um click
      setDraggedLead(null)
      setIsDraggingTouch(false)
      setTouchStartY(null)
      setTouchStartX(null)
      setCurrentTouchX(null)
      setCurrentTouchY(null)
      return
    }

    // Detecta sobre qual coluna o toque terminou
    const columns = document.querySelectorAll('.kanban-column')
    let targetColumn = null

    columns.forEach(column => {
      const rect = column.getBoundingClientRect()
      if (currentTouchX >= rect.left && currentTouchX <= rect.right &&
          currentTouchY >= rect.top && currentTouchY <= rect.bottom) {
        targetColumn = column
      }
    })

    if (!targetColumn) {
      // Não soltou sobre nenhuma coluna
      setDraggedLead(null)
      setIsDraggingTouch(false)
      setTouchStartY(null)
      setTouchStartX(null)
      setCurrentTouchX(null)
      setCurrentTouchY(null)
      return
    }

    // Pega o status da coluna alvo
    const newStatus = targetColumn.getAttribute('data-status')

    // Mesmo código do handleDrop
    if (draggedLead.status === newStatus) {
      setDraggedLead(null)
      setIsDraggingTouch(false)
      setTouchStartY(null)
      setTouchStartX(null)
      setCurrentTouchX(null)
      setCurrentTouchY(null)
      return
    }

    const identifier = draggedLead.uuid || draggedLead.telefone

    if (!identifier) {
      console.error('❌ Lead sem identificador:', draggedLead)
      alert('Erro: Lead sem identificador válido')
      setDraggedLead(null)
      setIsDraggingTouch(false)
      setTouchStartY(null)
      setTouchStartX(null)
      setCurrentTouchX(null)
      setCurrentTouchY(null)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/leads/${identifier}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const updatedLead = await response.json()
        setLeads(prev => prev.map(lead =>
          (lead.uuid || lead.telefone) === identifier ? updatedLead : lead
        ))
      } else {
        const errorData = await response.json()
        alert(`Erro ao atualizar lead: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status do lead:', error)
      alert(`Erro ao atualizar lead: ${error.message}`)
    }

    setDraggedLead(null)
    setIsDraggingTouch(false)
    setTouchStartY(null)
    setTouchStartX(null)
    setCurrentTouchX(null)
    setCurrentTouchY(null)
  }, [draggedLead, isDraggingTouch, currentTouchX, currentTouchY])

  const getLeadsByStatus = useCallback((status) => {
    return leads.filter(lead => (lead.status || 'novo') === status)
  }, [leads])

  const formatPhoneNumber = useCallback((phone) => {
    if (!phone) return 'Sem telefone'
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
    }
    return phone
  }, [])

  const handleLeadCreated = useCallback((newLead) => {
    setLeads(prev => [newLead, ...prev])
    setShowAddLeadModal(false)
  }, [])

  const handleLeadClick = useCallback((lead) => {
    setSelectedLead(lead)
    setShowEditLeadModal(true)
  }, [])

  const handleLeadUpdatedModal = useCallback((updatedLead) => {
    setLeads(prev => prev.map(lead =>
      lead.uuid === updatedLead.uuid ? updatedLead : lead
    ))
    setShowEditLeadModal(false)
    setSelectedLead(null)
  }, [])

  const handleLeadDeleted = useCallback((deletedLead) => {
    setLeads(prev => prev.filter(lead => lead.uuid !== deletedLead.uuid))
    setShowEditLeadModal(false)
    setSelectedLead(null)
  }, [])

  // Calcula estatísticas
  const getStatistics = useMemo(() => {
    const total = leads.length
    const emAndamento = leads.filter(lead =>
      ['agendado', 'compareceu', 'servico_finalizado'].includes(lead.status)
    ).length
    const fechados = leads.filter(lead => lead.status === 'fechado').length
    const taxaConversao = total > 0 ? ((fechados / total) * 100).toFixed(1) : '0.0'

    return { total, emAndamento, fechados, taxaConversao }
  }, [leads])

  const stats = getStatistics

  if (loading) {
    return (
      <div className="kanban-loading">
        <div className="loading-spinner"></div>
        <p>Carregando leads...</p>
      </div>
    )
  }

  return (
    <div className="kanban-board">
      <div className="kanban-header">
        <h1>CRM - Kanban</h1>
        <button className="add-lead-button" onClick={() => setShowAddLeadModal(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
          </svg>
          Adicionar Lead
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total de Leads</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon yellow">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M13,2.05V5.08C16.39,5.57 19,8.47 19,12C19,12.9 18.82,13.75 18.5,14.54L21.12,16.07C21.68,14.83 22,13.45 22,12C22,6.82 18.05,2.55 13,2.05M12,19C8.13,19 5,15.87 5,12C5,8.47 7.61,5.57 11,5.08V2.05C5.94,2.55 2,6.81 2,12A10,10 0 0,0 12,22C15.3,22 18.23,20.39 20.05,17.91L17.45,16.38C16.17,18 14.21,19 12,19Z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Em Andamento</div>
            <div className="stat-value">{stats.emAndamento}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Fechados</div>
            <div className="stat-value">{stats.fechados}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className={`stat-icon ${parseFloat(stats.taxaConversao) > 0 ? 'green' : 'red'}`}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Taxa de Conversão</div>
            <div className="stat-value">{stats.taxaConversao}%</div>
          </div>
        </div>
      </div>

      <div className="kanban-columns">
        {COLUMNS.map(column => {
          const columnLeads = getLeadsByStatus(column.id)

          return (
            <div
              key={column.id}
              className="kanban-column"
              data-status={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="column-header" style={{ borderTopColor: `var(${column.colorVar})` }}>
                <h3>{column.title}</h3>
                <span className="column-count">{columnLeads.length}</span>
              </div>

              <div className="column-cards">
                {columnLeads.length === 0 ? (
                  <div className="empty-column">
                    <p>Nenhum lead</p>
                  </div>
                ) : (
                  columnLeads.map(lead => (
                    <div
                      key={lead.uuid || lead.telefone}
                      className={`lead-card ${(draggedLead?.uuid || draggedLead?.telefone) === (lead.uuid || lead.telefone) ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onTouchStart={(e) => handleTouchStart(e, lead)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={() => !isDraggingTouch && handleLeadClick(lead)}
                    >
                      <div className="lead-card-header">
                        <div className="lead-name">
                          {lead.nome || 'Sem nome'}
                        </div>
                        {lead.trava && (
                          <div className="lead-badge paused">
                            <svg viewBox="0 0 24 24" width="12" height="12">
                              <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                            </svg>
                            Pausado
                          </div>
                        )}
                      </div>

                      <div className="lead-phone">
                        <svg viewBox="0 0 24 24" width="14" height="14">
                          <path fill="currentColor" d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                        </svg>
                        {formatPhoneNumber(lead.telefone)}
                      </div>

                      {lead.email && (
                        <div className="lead-email">
                          <svg viewBox="0 0 24 24" width="14" height="14">
                            <path fill="currentColor" d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
                          </svg>
                          {lead.email}
                        </div>
                      )}

                      {lead.observacoes && lead.observacoes.trim() !== '' && (
                        <div className="lead-observacoes">
                          <svg viewBox="0 0 24 24" width="14" height="14">
                            <path fill="currentColor" d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9M10,16V19.08L13.08,16H20V4H4V16H10Z" />
                          </svg>
                          {lead.observacoes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAddLeadModal && (
        <AddLeadModal
          onClose={() => setShowAddLeadModal(false)}
          onLeadCreated={handleLeadCreated}
        />
      )}

      {showEditLeadModal && selectedLead && (
        <EditLeadModal
          lead={selectedLead}
          onClose={() => {
            setShowEditLeadModal(false)
            setSelectedLead(null)
          }}
          onLeadUpdated={handleLeadUpdatedModal}
          onLeadDeleted={handleLeadDeleted}
        />
      )}
    </div>
  )
}

export default memo(KanbanBoard)
