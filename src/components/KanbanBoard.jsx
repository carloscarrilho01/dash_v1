import { useState, useEffect } from 'react'
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

  useEffect(() => {
    fetchLeads()

    // Escuta atualizações de leads via WebSocket
    if (socket) {
      socket.on('lead-updated', (updatedLead) => {
        setLeads(prev => prev.map(lead =>
          lead.uuid === updatedLead.uuid ? updatedLead : lead
        ))
      })

      return () => {
        socket.off('lead-updated')
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

    try {
      const response = await fetch(`${API_URL}/api/leads/${draggedLead.uuid}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const updatedLead = await response.json()
        setLeads(prev => prev.map(lead =>
          lead.uuid === updatedLead.uuid ? updatedLead : lead
        ))
      }
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error)
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
        <div className="kanban-stats">
          <span className="stat-item">
            <strong>{leads.length}</strong> Leads
          </span>
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
                      key={lead.uuid}
                      className={`lead-card ${draggedLead?.uuid === lead.uuid ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
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
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default KanbanBoard
