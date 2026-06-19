const API = import.meta.env.VITE_API_URL || ''

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  getSettings:    ()         => apiFetch('/api/orders/settings'),
  lookupOrders:   (name)     => apiFetch(`/api/orders/lookup?name=${encodeURIComponent(name)}`),
  getOrder:       (id)       => apiFetch(`/api/orders/${id}`),
  createOrder:    (data)     => apiFetch('/api/orders', { method: 'POST', body: data }),
  updateOrder:    (id, data) => apiFetch(`/api/orders/${id}`, { method: 'PUT', body: data }),

  adminLogin:     (pw)       => apiFetch('/api/admin/login', { method: 'POST', body: { password: pw } }),
  adminOrders:    (pw)       => apiFetch('/api/admin/orders', { headers: { 'x-admin-password': pw } }),
  adminStats:     (pw)       => apiFetch('/api/admin/stats',  { headers: { 'x-admin-password': pw } }),
  adminUpdate:    (id, data, pw) => apiFetch(`/api/admin/orders/${id}`, { method: 'PUT', body: data, headers: { 'x-admin-password': pw } }),
  adminDelete:    (id, pw)   => apiFetch(`/api/admin/orders/${id}`, { method: 'DELETE', headers: { 'x-admin-password': pw } }),
  adminSettings:  (data, pw) => apiFetch('/api/admin/settings', { method: 'PUT', body: data, headers: { 'x-admin-password': pw } }),
  adminExport:    (pw)       => {
    const API_BASE = import.meta.env.VITE_API_URL || ''
    window.open(`${API_BASE}/api/admin/export?_pw=${encodeURIComponent(pw)}`, '_blank')
  },
}
