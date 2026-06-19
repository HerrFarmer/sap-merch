import { useState, useEffect } from 'react'
import { api } from '../api'
import AdminOrderModal from '../components/AdminOrderModal'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [orderingOpen, setOrderingOpen] = useState(true)
  const [togglingOpen, setTogglingOpen] = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [search, setSearch] = useState('')
  const [pw, setPw] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    try {
      await api.adminLogin(password)
      setPw(password)
      setAuthed(true)
      loadData(password)
    } catch {
      setAuthError('Incorrect password. Please try again.')
    }
  }

  async function loadData(p) {
    setLoading(true)
    try {
      const [ordersData, statsData, settingsData] = await Promise.all([
        api.adminOrders(p),
        api.adminStats(p),
        api.getSettings(),
      ])
      setOrders(ordersData)
      setStats(statsData)
      setOrderingOpen(settingsData.ordering_open)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handleToggleOpen() {
    setTogglingOpen(true)
    try {
      await api.adminSettings({ ordering_open: !orderingOpen }, pw)
      setOrderingOpen(o => !o)
    } catch (e) { alert(e.message) }
    setTogglingOpen(false)
  }

  async function handleDelete(id) {
    if (!confirm(`Delete Order #${id}? This cannot be undone.`)) return
    try {
      await api.adminDelete(id, pw)
      setOrders(prev => prev.filter(o => o.id !== id))
      setStats(s => s ? { ...s, totalOrders: s.totalOrders - 1 } : s)
    } catch (e) { alert(e.message) }
  }

  async function handleSaveEdit(id, data) {
    try {
      const updated = await api.adminUpdate(id, data, pw)
      setOrders(prev => prev.map(o => o.id === id ? updated : o))
      setEditOrder(null)
    } catch (e) { alert(e.message) }
  }

  const filtered = orders.filter(o =>
    !search || o.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalQty = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0)

  if (!authed) {
    return (
      <>
        <header className="admin-header">
          <div className="container">
            <h1>🔐 Admin — SAP Merch</h1>
            <p>Order management dashboard</p>
          </div>
        </header>
        <div className="container">
          <div className="admin-login">
            <h2>Admin Login</h2>
            <p>Enter your admin password to access the dashboard.</p>
            {authError && <div className="error-msg">{authError}</div>}
            <form onSubmit={handleLogin}>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Sign In
              </button>
            </form>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="admin-header">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1>Admin Dashboard — SAP Merch</h1>
              <p>Manage orders and export to Excel</p>
            </div>
            <a href="#/" className="btn btn-secondary btn-sm">← View Order Page</a>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {loading ? (
            <div className="loading">Loading…</div>
          ) : (
            <>
              {/* Stats */}
              {stats && (
                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-num">{stats.totalOrders}</div>
                    <div className="stat-label">Total Orders</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num">{totalQty}</div>
                    <div className="stat-label">Total Shirts</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num" style={{ fontSize: 18, paddingTop: 6 }}>
                      {stats.byProduct.map(p => (
                        <div key={p.product_name} style={{ fontSize: 13, marginBottom: 2 }}>
                          <strong>{p.total}</strong> × {p.product_name}
                        </div>
                      ))}
                      {stats.byProduct.length === 0 && '—'}
                    </div>
                    <div className="stat-label">By Product</div>
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="admin-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <h2>All Orders</h2>
                  <span className={orderingOpen ? 'tag-open' : 'tag-closed'}>
                    {orderingOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    className="form-input"
                    style={{ width: 200 }}
                    placeholder="Search by name…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {/* Toggle ordering open/close */}
                  <label className="toggle-switch">
                    <span>{orderingOpen ? 'Ordering Open' : 'Ordering Closed'}</span>
                    <div className="switch">
                      <input
                        type="checkbox"
                        checked={orderingOpen}
                        onChange={handleToggleOpen}
                        disabled={togglingOpen}
                      />
                      <div className="switch-track" onClick={handleToggleOpen} style={{ cursor: 'pointer' }} />
                    </div>
                  </label>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      // Export needs password in header — open via fetch
                      const API_BASE = import.meta.env.VITE_API_URL || ''
                      fetch(`${API_BASE}/api/admin/export`, {
                        headers: { 'x-admin-password': pw }
                      })
                        .then(r => r.blob())
                        .then(blob => {
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `sap-merch-orders-${new Date().toISOString().slice(0,10)}.xlsx`
                          a.click()
                          URL.revokeObjectURL(url)
                        })
                    }}
                  >
                    ⬇ Export Excel
                  </button>
                  <button className="btn btn-secondary" onClick={() => loadData(pw)}>↻ Refresh</button>
                </div>
              </div>

              {/* Orders table */}
              {filtered.length === 0 ? (
                <div className="empty-state">
                  <h3>{search ? 'No orders match your search.' : 'No orders yet.'}</h3>
                  <p>Orders will appear here once people start submitting.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Items</th>
                        <th>Total Qty</th>
                        <th>Submitted</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(order => (
                        <tr key={order.id}>
                          <td><strong>{order.id}</strong></td>
                          <td><strong>{order.name}</strong>{order.email && <><br/><span style={{fontSize:12,color:'#888'}}>{order.email}</span></>}</td>
                          <td>
                            <div className="items-chips">
                              {order.items.map((item, i) => (
                                <span key={i} className="item-chip">
                                  {item.product_name} {item.gender === 'mens' ? 'M' : 'W'} {item.size} ×{item.quantity}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {order.items.reduce((s, i) => s + i.quantity, 0)}
                          </td>
                          <td style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>
                            {new Date(order.submitted_at).toLocaleDateString()}<br/>
                            {new Date(order.submitted_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                          </td>
                          <td style={{ fontSize: 12, color: '#666', maxWidth: 160 }}>{order.notes || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditOrder(order)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(order.id)}>Del</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {editOrder && (
        <AdminOrderModal
          order={editOrder}
          onSave={handleSaveEdit}
          onClose={() => setEditOrder(null)}
        />
      )}
    </>
  )
}
