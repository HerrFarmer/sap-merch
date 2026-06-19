import { PRODUCTS } from '../products'

export default function OrderSummary({ items, name, notes, onNotesChange, onRemoveItem, onSubmit, submitting, disabled, isEdit }) {
  const total = items.reduce((sum, i) => {
    const product = PRODUCTS.find(p => p.id === i.product_id)
    return sum + (product ? product.price * i.quantity : 0)
  }, 0)

  return (
    <div className="order-summary">
      <h3 className="section-title" style={{ marginBottom: 16 }}>
        {isEdit ? 'Edit Order' : 'Your Order'}
      </h3>

      {items.length === 0 ? (
        <p style={{ color: '#999', fontSize: 14, marginBottom: 20 }}>
          No items added yet. Select a shirt above to get started.
        </p>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {items.map((item, i) => {
            const product = PRODUCTS.find(p => p.id === item.product_id)
            const lineTotal = product ? product.price * item.quantity : 0
            return (
              <div key={i} className="summary-row">
                <div>
                  <strong>{item.product_name}</strong>
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    {item.gender === 'mens' ? "Men's" : "Women's"} · {item.size} · ×{item.quantity}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 600 }}>${lineTotal.toFixed(2)}</span>
                  <button className="remove-btn" onClick={() => onRemoveItem(i)} title="Remove">×</button>
                </div>
              </div>
            )
          })}
          <div className="summary-row" style={{ borderTop: '2px solid #e8edf2', marginTop: 4, paddingTop: 12 }}>
            <strong>Estimated Total (ex GST)</strong>
            <strong style={{ color: '#0070c0', fontSize: 18 }}>${total.toFixed(2)}</strong>
          </div>
          <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
            * Final pricing subject to supplier confirmation. Does not include GST or delivery.
          </p>
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>
          Notes (optional)
        </label>
        <textarea
          placeholder="Any special requests or questions…"
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
        />
      </div>

      <button
        className="btn btn-primary btn-lg"
        onClick={onSubmit}
        disabled={submitting || disabled || items.length === 0}
        style={{ width: '100%' }}
      >
        {submitting
          ? 'Submitting…'
          : disabled
          ? 'Ordering is closed'
          : isEdit
          ? '✓ Update Order'
          : '✓ Submit Order'}
      </button>
    </div>
  )
}
