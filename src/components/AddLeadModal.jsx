import { useState } from 'react'
import './AddLeadModal.css'

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.MODE === 'production'
    ? window.location.origin
    : 'http://localhost:3001'
);

function AddLeadModal({ onClose, onLeadCreated }) {
  const [formData, setFormData] = useState({
    telefone: '',
    nome: '',
    email: '',
    status: 'novo'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.telefone.trim()) {
      setError('Telefone é obrigatório')
      return
    }

    if (!formData.nome.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telefone: formData.telefone.trim(),
          nome: formData.nome.trim(),
          email: formData.email.trim() || null,
          status: formData.status
        })
      })

      if (response.ok) {
        const newLead = await response.json()
        onLeadCreated(newLead)
        onClose()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao criar lead')
      }
    } catch (error) {
      console.error('Erro ao criar lead:', error)
      setError('Erro ao criar lead. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar Novo Lead</h2>
          <button className="close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="telefone">
              Telefone <span className="required">*</span>
            </label>
            <input
              type="tel"
              id="telefone"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              placeholder="Ex: 5511999999999"
              disabled={isSubmitting}
              autoFocus
            />
            <small className="form-hint">
              Formato: código do país + DDD + número (sem espaços ou caracteres especiais)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="nome">
              Nome <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              placeholder="Nome do lead"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@exemplo.com"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status Inicial</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="novo">Novo</option>
              <option value="contato">Em Contato</option>
              <option value="negociacao">Negociação</option>
              <option value="convertido">Convertido</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Criando...' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddLeadModal
