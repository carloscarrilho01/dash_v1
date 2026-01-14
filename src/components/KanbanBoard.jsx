import { useState, useEffect } from 'react'
import AddLeadModal from './AddLeadModal'
import EditLeadModal from './EditLeadModal'
import './KanbanBoard.css'

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.MODE === 'production'
    ? window.location.origin
    : 'http://localhost:3001'
);

const COLUMNS = [
  { id: 'novo', title: 'Novo', color: '#6c757d' },
  { id: 'contato', title: 'Em Contato', color: '#0dcaf0' },
  { id: 'negociacao', title: 'Negociação', color: '#ffc107' },
  { id: 'convertido', title: 'Convertido', color: '#198754' },
  { id: 'perdido', title: 'Perdido', color: '#dc3545' }
];

function KanbanBoard({ socket }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [draggedLead, setDraggedLead] = useState(null)
  const [showAddLeadModal, setShowAddLeadModal] = useState(false)
  const [showEditLeadModal, setShowEditLeadModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)

  useEffect(() => {
    fetchLeads()

    // Escuta atualizações de leads via WebSocket
    if (socket) {
      socket.on('lead-updated', (updatedLead) => {
        setLeads(prev => prev.map(lead =>
          lead.uuid === updatedLead.uuid ? updatedLead : lead
        ))
      })

      socket.on('lead-created', (newLead) => {
        setLeads(prev => [newLead, ...prev])
      })

      socket.on('lead-deleted', ({ uuid }) => {
        setLeads(prev => prev.filter(lead => lead.uuid !== uuid))
      })

      return () => {
        socket.off('lead-updated')
        socket.off('lead-created')
        socket.off('lead-deleted')
      }
    }
  }, [socket])

  const fetchLeads = async () => {
    try {
      const response = await fetch(`${API_URL}/api/leads`)
      const data = await response.json()
      setLeads(data)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
      setLoading(false)
    }
  }

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, newStatus) => {
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
  }

  const getLeadsByStatus = (status) => {
    return leads.filter(lead => (lead.status || 'novo') === status)
  }

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Sem telefone'
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
    }
    return phone
  }

  const handleLeadCreated = (newLead) => {
    setLeads(prev => [newLead, ...prev])
    setShowAddLeadModal(false)
  }

  const handleLeadClick = (lead) => {
    setSelectedLead(lead)
    setShowEditLeadModal(true)
  }

  const handleLeadUpdated = (updatedLead) => {
    setLeads(prev => prev.map(lead =>
      lead.uuid === updatedLead.uuid ? updatedLead : lead
    ))
    setShowEditLeadModal(false)
    setSelectedLead(null)
  }

  const handleLeadDeleted = (deletedLead) => {
    setLeads(prev => prev.filter(lead => lead.uuid !== deletedLead.uuid))
    setShowEditLeadModal(false)
    setSelectedLead(null)
  }

  // Calcula estatísticas
  const getStatistics = () => {
    const total = leads.length
    const emAndamento = leads.filter(lead =>
      ['contato', 'negociacao'].includes(lead.status)
    ).length
    const fechados = leads.filter(lead => lead.status === 'convertido').length
    const taxaConversao = total > 0 ? ((fechados / total) * 100).toFixed(1) : '0.0'

    return { total, emAndamento, fechados, taxaConversao }
  }

  const stats = getStatistics()

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
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="column-header" style={{ borderTopColor: column.color }}>
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
                      onClick={() => handleLeadClick(lead)}
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
          onLeadUpdated={handleLeadUpdated}
          onLeadDeleted={handleLeadDeleted}
        />
      )}
    </div>
  )
}

export default KanbanBoard
