export default function Lightbox({ src, alt, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out',
      }}
      onClick={onClose}
    >
      <div
        style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: '80vw', maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: 10,
            boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
            display: 'block',
          }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -16, right: -16,
            width: 36, height: 36, borderRadius: '50%',
            background: '#333', color: '#fff', border: 'none',
            fontSize: 20, lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
          aria-label="Close"
        >×</button>
        <p style={{ textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 10 }}>
          {alt} — click anywhere to close
        </p>
      </div>
    </div>
  )
}
