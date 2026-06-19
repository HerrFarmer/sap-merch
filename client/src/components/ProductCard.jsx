import { useState } from 'react'

export default function ProductCard({ product, orderItems, onAddItem, onRemoveItem, disabled }) {
  const [gender, setGender] = useState('mens')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [showBranded, setShowBranded] = useState(true)

  const sizes = gender === 'mens' ? product.sizesMens : product.sizesWomens
  const productItems = orderItems.filter(i => i.product_id === product.id)

  function handleAdd() {
    if (!size) return
    onAddItem({
      product_id: product.id,
      product_name: product.name,
      gender,
      size,
      quantity: qty,
    })
    setSize('')
    setQty(1)
  }

  // Reset size when gender changes
  function handleGenderChange(g) {
    setGender(g)
    setSize('')
  }

  const currentImage = showBranded
    ? product.imageBranded
    : gender === 'mens' ? product.imageMens : product.imageWomens

  return (
    <div className={`product-card ${productItems.length > 0 ? 'has-items' : ''}`}>
      <div className="product-image-wrap">
        <span className="product-badge">{product.type}</span>
        <img src={currentImage} alt={product.name} />
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
          <button
            className={`btn btn-sm ${showBranded ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowBranded(true)}
          >With Logo</button>
          <button
            className={`btn btn-sm ${!showBranded ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowBranded(false)}
          >Garment</button>
        </div>
      </div>

      <div className="product-body">
        <div className="product-name">{product.name}</div>
        <div className="product-brand">{product.brand} · {product.color}</div>
        <div className="product-desc">{product.description}</div>
        <div style={{ fontSize: 12, color: '#0070c0', marginBottom: 12, fontWeight: 500 }}>
          ✓ {product.logo}
        </div>
        <div className="product-price">
          ${product.price.toFixed(2)} <span>per shirt (ex GST)</span>
        </div>

        {/* Gender */}
        <div className="selector-section">
          <div className="selector-label">Gender</div>
          <div className="gender-tabs">
            <button
              className={`gender-tab ${gender === 'mens' ? 'active' : ''}`}
              onClick={() => handleGenderChange('mens')}
            >Men's</button>
            <button
              className={`gender-tab ${gender === 'womens' ? 'active' : ''}`}
              onClick={() => handleGenderChange('womens')}
            >Women's</button>
          </div>
        </div>

        {/* Size */}
        <div className="selector-section">
          <div className="selector-label">Size</div>
          <div className="size-grid">
            {sizes.map(s => (
              <button
                key={s}
                className={`size-btn ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Quantity + Add */}
        <div className="qty-row">
          <div className="qty-ctrl">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(q => q + 1)}>+</button>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!size || disabled}
            style={{ flex: 1 }}
          >
            {size ? `Add ${gender === 'mens' ? "Men's" : "Women's"} ${size} × ${qty}` : 'Select a size'}
          </button>
        </div>

        {/* Items added for this product */}
        {productItems.length > 0 && (
          <div className="items-list">
            <div className="items-list-title">Added to order</div>
            {productItems.map((item, i) => {
              const globalIndex = orderItems.findIndex(
                o => o.product_id === item.product_id && o.gender === item.gender && o.size === item.size
              )
              return (
                <div key={i} className="item-row">
                  <span className="item-info">
                    {item.gender === 'mens' ? "Men's" : "Women's"} {item.size} × {item.quantity}
                  </span>
                  <div className="item-actions">
                    <button
                      className="remove-btn"
                      onClick={() => onRemoveItem(globalIndex)}
                      title="Remove"
                    >×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
