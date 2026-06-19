import { useState } from 'react'
import { PRODUCTS } from '../products'

export default function AdminOrderModal({ order, onSave, onClose }) {
  const [name, setName] = useState(order.name)
  const [email, setEmail] = useState(order.email || '')
  const [notes, setNotes] = useState(order.notes || '')
  const [items, setItems] = useState(order.items.map(i => ({ ...i })))
  const [saving, setSaving] = useState(false)

  // Add item state
  const [addProduct, setAddProduct] = useState(PRODUCTS[0].id)
  const [addGender, setAddGender] = useState('mens')
  const [addSize, setAddSize] = useState('')
  const [addQty, setAddQty] = useState(1)

  const product = PRODUCTS.find(p => p.id === addProduct)
  const sizes = addGender === 'mens' ? product.sizesMens : product.sizesWomens

  function handleAddItem() {
    if (!addSize) return
    const existing = items.findIndex(
      i => i.product_id === addProduct && i.gender === addGender && i.size === addSize
    )
    if (existing >= 0) {
      const updated = [...items]
      updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + addQty }
      setItems(updated)
    } else {
      setItems(prev => [...prev, {
        product_id: addProduct,
        product_name: product.name,
        gender: addGender,
        size: addSize,
        quantity: addQty,
      }])
    }
    setAddSize('')
    setAddQty(1)
  }

  function updateQty(index, qty) {
    if (qty < 1) return
    const updated = [...items]
    updated[index] = { ...updated[index], quantity: qty }
    setItems(updated)
  }

  function removeItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (items.length === 0) { alert('At least one item required.'); return }
    setSaving(true)
    await onSave(order.id, { name, email, notes, items })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Edit Order #{order.id}</h3>

        <div className="form-row">
          <label className="form-label">Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="form-label">Email (optional)</label>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        {/* Current items */}
        <div className="form-row">
          <label className="form-label">Order Items</label>
          {items.length === 0 && <p style={{ fontSize: 13, color: '#999' }}>No items.</p>}
          {items.map((item, i) => (
            <div key={i} className="item-row" style={{ marginBottom: 6 }}>
              <span className="item-info">
                {item.product_name} — {item.gender === 'mens' ? "Men's" : "Women's"} {item.size}
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div className="qty-ctrl">
                  <button onClick={() => updateQty(i, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQty(i, item.quantity + 1)}>+</button>
                </div>
                <button className="remove-btn" onClick={() => removeItem(i)}>×</button>
              </div>
            </div>
          ))}
        </div>

        {/* Add item */}
        <div className="form-row" style={{ background: '#f8f9fa', borderRadius: 8, padding: '14px' }}>
          <label className="form-label" style={{ marginBottom: 10 }}>Add Item</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <select
              className="form-input"
              style={{ width: 140 }}
              value={addProduct}
              onChange={e => { setAddProduct(e.target.value); setAddSize('') }}
            >
              {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              className="form-input"
              style={{ width: 100 }}
              value={addGender}
              onChange={e => { setAddGender(e.target.value); setAddSize('') }}
            >
              <option value="mens">Men's</option>
              <option value="womens">Women's</option>
            </select>
            <select
              className="form-input"
              style={{ width: 80 }}
              value={addSize}
              onChange={e => setAddSize(e.target.value)}
            >
              <option value="">Size</option>
              {sizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="qty-ctrl">
              <button onClick={() => setAddQty(q => Math.max(1, q - 1))}>−</button>
              <span>{addQty}</span>
              <button onClick={() => setAddQty(q => q + 1)}>+</button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAddItem} disabled={!addSize}>
              Add
            </button>
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: 60 }} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
