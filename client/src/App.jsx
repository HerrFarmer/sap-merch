import { useState } from 'react'
import { PRODUCTS } from './products'
import { api } from './api'
import ProductCard from './components/ProductCard'
import OrderSummary from './components/OrderSummary'

export default function App() {
  const [name, setName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [orderItems, setOrderItems] = useState([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [error, setError] = useState('')
  const [orderingOpen, setOrderingOpen] = useState(true)
  const [step, setStep] = useState('name') // 'name' | 'order' | 'done'
  const [prevOrders, setPrevOrders] = useState([])
  const [loadingLookup, setLoadingLookup] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState(null)

  async function handleNameSubmit(e) {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setName(trimmed)
    setLoadingLookup(true)
    try {
      const [settings, existing] = await Promise.all([
        api.getSettings(),
        api.lookupOrders(trimmed),
      ])
      setOrderingOpen(settings.ordering_open)
      setPrevOrders(existing)
    } catch {}
    setLoadingLookup(false)
    setStep('order')
  }

  function handleLoadOrder(order) {
    setOrderItems(order.items.map(i => ({
      product_id: i.product_id,
      product_name: i.product_name,
      gender: i.gender,
      size: i.size,
      quantity: i.quantity,
    })))
    setNotes(order.notes || '')
    setEditingOrderId(order.id)
    setPrevOrders([])
  }

  function addItem(item) {
    setOrderItems(prev => {
      const existing = prev.findIndex(
        i => i.product_id === item.product_id && i.gender === item.gender && i.size === item.size
      )
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + item.quantity }
        return updated
      }
      return [...prev, item]
    })
  }

  function removeItem(index) {
    setOrderItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (orderItems.length === 0) {
      setError('Please add at least one item to your order.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const payload = { name, notes, items: orderItems }
      let result
      if (editingOrderId) {
        result = await api.updateOrder(editingOrderId, payload)
      } else {
        result = await api.createOrder(payload)
      }
      setSubmitted(result)
      setStep('done')
    } catch (e) {
      setError(e.message)
    }
    setSubmitting(false)
  }

  function startNewOrder() {
    setOrderItems([])
    setNotes('')
    setEditingOrderId(null)
    setSubmitted(null)
    setError('')
    setStep('order')
  }

  function restart() {
    setName(''); setNameInput(''); setOrderItems([]); setNotes('')
    setSubmitted(null); setEditingOrderId(null); setError('')
    setPrevOrders([]); setStep('name')
  }

  return (
    <>
      <header className="header">
        <div className="container">
          <div className="header-inner">
            <div className="sap-logo">SAP</div>
            <div>
              <h1>Team Merch 2026</h1>
              <p>Order your SAP SuccessFactors branded shirt</p>
            </div>
          </div>
        </div>
      </header>

      {!orderingOpen && (
        <div className="closed-banner">
          🔒 Ordering is currently closed. Contact your administrator for more information.
        </div>
      )}

      <main className="main">
        <div className="container">

          {/* Step 1: Enter name */}
          {step === 'name' && (
            <div>
              <div className="name-card">
                <h2>Welcome! Let's get you started.</h2>
                <p>Enter your name to begin your order. You can also use this to look up and edit a previous order.</p>
                <form onSubmit={handleNameSubmit}>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      autoFocus
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={loadingLookup}>
                      {loadingLookup ? 'Loading…' : 'Continue →'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Step 2: Order */}
          {step === 'order' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700 }}>Hi, {name}! 👋</h2>
                  <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                    {editingOrderId ? `Editing Order #${editingOrderId}` : 'Select your items below'}
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={restart}>← Change name</button>
              </div>

              {/* Previous orders lookup */}
              {prevOrders.length > 0 && (
                <div className="lookup-section">
                  <h3>📋 You have {prevOrders.length} existing order{prevOrders.length > 1 ? 's' : ''}</h3>
                  <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                    Click an order to load and edit it, or scroll down to place a new one.
                  </p>
                  {prevOrders.map(o => (
                    <div key={o.id} className="prev-order-card" onClick={() => handleLoadOrder(o)}>
                      <h4>Order #{o.id} — {o.items.length} item type{o.items.length !== 1 ? 's' : ''}</h4>
                      <p>
                        {o.items.map(i => `${i.product_name} (${i.gender === 'mens' ? 'Mens' : 'Womens'} ${i.size} × ${i.quantity})`).join(', ')}
                        {' · '}Submitted {new Date(o.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setPrevOrders([])}>
                    + Place a new order instead
                  </button>
                </div>
              )}

              {!orderingOpen && (
                <div className="error-msg" style={{ marginBottom: 20 }}>
                  Ordering is currently closed. You can view but not submit orders.
                </div>
              )}

              {error && <div className="error-msg">{error}</div>}

              <p className="section-title">Choose your shirts</p>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 20, marginTop: -12 }}>
                You can order one or both shirt types. Select gender, size and quantity, then click "Add to Order".
              </p>

              <div className="products-grid">
                {PRODUCTS.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    orderItems={orderItems}
                    onAddItem={addItem}
                    onRemoveItem={removeItem}
                    disabled={!orderingOpen}
                  />
                ))}
              </div>

              <OrderSummary
                items={orderItems}
                name={name}
                notes={notes}
                onNotesChange={setNotes}
                onRemoveItem={removeItem}
                onSubmit={handleSubmit}
                submitting={submitting}
                disabled={!orderingOpen}
                isEdit={!!editingOrderId}
              />
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && submitted && (
            <div>
              <div className="success-card">
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <h2>{editingOrderId ? 'Order Updated!' : 'Order Submitted!'}</h2>
                <p>Thank you, <strong>{submitted.name}</strong>. Your order has been {editingOrderId ? 'updated' : 'received'}.</p>
                <div className="success-ref">Order #{submitted.id}</div>
                <p style={{ fontSize: 13, marginBottom: 24 }}>
                  Keep this reference number. You can use your name to look up and edit your order later.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" onClick={startNewOrder}>+ Place Another Order</button>
                  <button className="btn btn-primary" onClick={restart}>Back to Start</button>
                </div>
              </div>

              {/* Show order summary */}
              <div style={{ marginTop: 32 }}>
                <p className="section-title">Your Order Summary</p>
                <div className="order-summary">
                  {submitted.items.map((item, i) => (
                    <div key={i} className="summary-row">
                      <span>{item.product_name} — {item.gender === 'mens' ? 'Mens' : 'Womens'} {item.size}</span>
                      <strong>× {item.quantity}</strong>
                    </div>
                  ))}
                  {submitted.notes && (
                    <div className="summary-row">
                      <span style={{ color: '#666', fontStyle: 'italic' }}>Note: {submitted.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
