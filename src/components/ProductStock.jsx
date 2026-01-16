import { useState, useEffect } from 'react'
import './ProductStock.css'

function ProductStock() {
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    description: '',
    supplier: ''
  })

  // Carregar produtos do localStorage
  useEffect(() => {
    const savedProducts = localStorage.getItem('products')
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts))
    }
  }, [])

  // Salvar produtos no localStorage
  const saveProducts = (newProducts) => {
    localStorage.setItem('products', JSON.stringify(newProducts))
    setProducts(newProducts)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (editingProduct) {
      // Editar produto existente
      const updatedProducts = products.map(p =>
        p.id === editingProduct.id
          ? { ...formData, id: p.id, updatedAt: new Date().toISOString() }
          : p
      )
      saveProducts(updatedProducts)
    } else {
      // Adicionar novo produto
      const newProduct = {
        ...formData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      saveProducts([...products, newProduct])
    }

    resetForm()
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      minStock: product.minStock,
      description: product.description,
      supplier: product.supplier
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      saveProducts(products.filter(p => p.id !== id))
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      price: '',
      cost: '',
      stock: '',
      minStock: '',
      description: '',
      supplier: ''
    })
    setEditingProduct(null)
    setShowModal(false)
  }

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Categorias únicas
  const categories = [...new Set(products.map(p => p.category))].filter(Boolean)

  // Estatísticas
  const stats = {
    total: products.length,
    lowStock: products.filter(p => parseInt(p.stock) <= parseInt(p.minStock)).length,
    outOfStock: products.filter(p => parseInt(p.stock) === 0).length,
    totalValue: products.reduce((sum, p) => sum + (parseFloat(p.price) * parseInt(p.stock)), 0)
  }

  return (
    <div className="product-stock-container">
      <div className="stock-header">
        <div className="header-top">
          <h1>Estoque de Produtos</h1>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
            Novo Produto
          </button>
        </div>

        {/* Estatísticas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(138, 43, 226, 0.1)' }}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="var(--accent-primary)" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Total de Produtos</span>
              <span className="stat-value">{stats.total}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(255, 193, 7, 0.1)' }}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="#ffc107" d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M11,4H6V20H11L18,20V11H11V4Z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Estoque Baixo</span>
              <span className="stat-value" style={{ color: '#ffc107' }}>{stats.lowStock}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(244, 67, 54, 0.1)' }}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="#f44336" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Sem Estoque</span>
              <span className="stat-value" style={{ color: '#f44336' }}>{stats.outOfStock}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="#4caf50" d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Valor Total</span>
              <span className="stat-value" style={{ color: '#4caf50' }}>
                R$ {stats.totalValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="filters-bar">
          <div className="search-box">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M15.5,14H14.71L14.43,13.73C15.41,12.59 16,11.11 16,9.5C16,5.91 13.09,3 9.5,3C5.91,3 3,5.91 3,9.5C3,13.09 5.91,16 9.5,16C11.11,16 12.59,15.41 13.73,14.43L14,14.71V15.5L19,20.5L20.5,19L15.5,14M9.5,14C7.01,14 5,11.99 5,9.5C5,7.01 7.01,5 9.5,5C11.99,5 14,7.01 14,9.5C14,11.99 11.99,14 9.5,14Z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="products-table-container">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path fill="var(--text-secondary)" d="M19,18H6V8H19M19,6H6V4H19M3,14H4V20H20V14H21V20A1,1 0 0,1 20,21H4A1,1 0 0,1 3,20V14M16,8V10H14V12H12V10H10V8H12V6H14V8H16Z" />
            </svg>
            <p>Nenhum produto encontrado</p>
            <small>Adicione seu primeiro produto ao estoque</small>
          </div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Estoque</th>
                <th>Est. Mín.</th>
                <th>Custo</th>
                <th>Preço</th>
                <th>Margem</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const margin = ((parseFloat(product.price) - parseFloat(product.cost)) / parseFloat(product.price) * 100).toFixed(1)
                const isLowStock = parseInt(product.stock) <= parseInt(product.minStock)

                return (
                  <tr key={product.id} className={isLowStock ? 'low-stock' : ''}>
                    <td>
                      <span className="sku-badge">{product.sku}</span>
                    </td>
                    <td>
                      <div className="product-name-cell">
                        <strong>{product.name}</strong>
                        {product.supplier && (
                          <small>Fornecedor: {product.supplier}</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">{product.category}</span>
                    </td>
                    <td>
                      <span className={`stock-badge ${isLowStock ? 'low' : ''}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td>{product.minStock}</td>
                    <td>R$ {parseFloat(product.cost).toFixed(2)}</td>
                    <td>R$ {parseFloat(product.price).toFixed(2)}</td>
                    <td>
                      <span className="margin-badge">{margin}%</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(product)}
                          title="Editar"
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(product.id)}
                          title="Excluir"
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button className="btn-close" onClick={resetForm}>
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome do Produto *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: Notebook Dell"
                  />
                </div>

                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: NB-001"
                  />
                </div>

                <div className="form-group">
                  <label>Categoria *</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: Eletrônicos"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label>Fornecedor</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    placeholder="Ex: Dell Inc."
                  />
                </div>

                <div className="form-group">
                  <label>Custo (R$) *</label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Quantidade em Estoque *</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Estoque Mínimo *</label>
                  <input
                    type="number"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleInputChange}
                    required
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Descrição</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Descreva o produto..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductStock
