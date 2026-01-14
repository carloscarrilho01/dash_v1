import { useState, useEffect } from 'react'
import './EditLeadModal.css'

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.MODE === 'production'
    ? window.location.origin
    : 'http://localhost:3001'
);

function EditLeadModal({ lead, onClose, onLeadUpdated, onLeadDeleted }) {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    status: 'novo',
    observacoes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (lead) {
      setFormData({
        nome: lead.nome || '',
        telefone: lead.telefone || '',
        email: lead.email || '',
        status: lead.status || 'novo',
        observacoes: lead.observacoes || ''
      })
    }
  }, [lead])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Valida se os campos obrigatórios estão preenchidos
    const nomeValido = formData.nome && formData.nome.trim().length > 0
    const telefoneValido = formData.telefone && formData.telefone.trim().length > 0

    if (!nomeValido || !telefoneValido) {
      setError('Nome e telefone são obrigatórios')
      return
    }

    setLoading(true)

    try {
      const identifier = lead.uuid || lead.telefone

      console.log('📤 Enviando atualização de lead')
      console.log('📦 Lead original:', lead)
      console.log('🔑 Identificador usado:', identifier)
      console.log('📝 Dados do formulário:', formData)

      const response = await fetch(`${API_URL}/api/leads/${identifier}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const updatedLead = await response.json()
        onLeadUpdated(updatedLead)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao atualizar lead')
      }
    } catch (error) {
      console.error('Erro ao atualizar lead:', error)
      setError('Erro ao atualizar lead')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) {
      return
    }

    setLoading(true)

    try {
      const identifier = lead.uuid || lead.telefone

      const response = await fetch(`${API_URL}/api/leads/${identifier}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onLeadDeleted(lead)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao excluir lead')
      }
    } catch (error) {
      console.error('Erro ao excluir lead:', error)
      setError('Erro ao excluir lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Lead</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="nome">Nome *</label>
            <input
              type="text"
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefone">Telefone *</label>
            <input
              type="tel"
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="+55 11 99999-9999"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="novo">Novo</option>
              <option value="contato">Em Contato</option>
              <option value="negociacao">Negociação</option>
              <option value="convertido">Convertido</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="observacoes">Observações / Comentários</label>
            <textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Adicione observações, anotações ou comentários sobre este lead..."
              rows="4"
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-delete"
              onClick={handleDelete}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
              </svg>
              Excluir
            </button>
            <div className="modal-actions-right">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditLeadModal
