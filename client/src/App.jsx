import { useState } from 'react'
import { PRODUCTS } from './products'
import { api } from './api'
import ProductCard from './components/ProductCard'
import OrderSummary from './components/OrderSummary'

export default function App() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState('')
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
    const trimmedName  = nameInput.trim()
    const trimmedEmail = emailInput.trim().toLowerCase()
    if (!trimmedName) return

    // Validate @sap.com
    if (!trimmedEmail.endsWith('@sap.com')) {
      setEmailError('Email address must end with @sap.com')
      return
    }
    // Basic format check
    const emailRegex = /^[^\s@]+@sap\.com$/
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid @sap.com email address')
      return
    }

    setEmailError('')
    setLoadingLookup(true)
    try {
      const [settings, existingByEmail] = await Promise.all([
        api.getSettings(),
        api.lookupOrders(null, trimmedEmail),
      ])
      setOrderingOpen(settings.ordering_open)
      setName(trimmedName)
      setEmail(trimmedEmail)

      if (existingByEmail.length > 0) {
        // Existing user — auto-load their most recent order into the cart
        const latest = existingByEmail[0]
        setOrderItems(latest.items.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          gender: i.gender,
          size: i.size,
          quantity: i.quantity,
        })))
        setNotes(latest.notes || '')
        setEditingOrderId(latest.id)
        setPrevOrders(existingByEmail.length > 1 ? existingByEmail.slice(1) : [])
      } else {
        // New user
        setOrderItems([])
        setNotes('')
        setEditingOrderId(null)
        setPrevOrders([])
      }
    } catch (err) {
      setEmailError('Something went wrong. Please try again.')
      setLoadingLookup(false)
      return
    }
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
    setEmail(order.email || '')
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
      const payload = { name, email, notes, items: orderItems }
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
    setName(''); setNameInput(''); setEmail(''); setEmailInput(''); setEmailError('')
    setOrderItems([]); setNotes('')
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
              <p>Order your SAP branded shirt</p>
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
                <p>Enter your name and SAP email to begin your order.</p>
                <form onSubmit={handleNameSubmit}>
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      autoFocus
                      required
                      style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #dde2ea', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="email"
                      placeholder="your.name@sap.com"
                      value={emailInput}
                      onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                      required
                      style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${emailError ? '#dc3545' : '#dde2ea'}`, borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none' }}
                    />
                    {emailError && <p style={{ color: '#dc3545', fontSize: 13, marginTop: 5 }}>{emailError}</p>}
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingLookup}>
                    {loadingLookup ? 'Loading…' : 'Continue →'}
                  </button>
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
                  <p style={{ fontSize: 14, color: '#666', marginTop: 2 }}>{email}</p>
                  <p style={{ fontSize: 14, color: editingOrderId ? '#0070c0' : '#666', marginTop: 2, fontWeight: editingOrderId ? 600 : 400 }}>
                    {editingOrderId ? `✏️ Editing your existing order #${editingOrderId}` : 'New order — select your items below'}
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={restart}>← Back</button>
              </div>

              {/* Welcome back notice for existing users */}
              {editingOrderId && (
                <div style={{ background: '#e8f0fe', border: '1.5px solid #c3d4fb', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
                  <p style={{ fontSize: 14, color: '#1a56db', fontWeight: 600, marginBottom: 4 }}>
                    👋 Welcome back! Your previous order has been loaded.
                  </p>
                  <p style={{ fontSize: 13, color: '#3a5fc8' }}>
                    You can update your selections below. Your changes will replace your existing order when you click Save.
                  </p>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
                <div>
                  <div className="products-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
                </div>

                {/* Sticky cart */}
                <div style={{ position: 'sticky', top: 20 }}>
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
              </div>
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
