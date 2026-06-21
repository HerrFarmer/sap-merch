const express = require('express');
const cors = require('cors');
const path = require('path');
const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://sap-merch-kcy1ta1kj-palz.vercel.app',
      'https://sap-merch.vercel.app',
    ];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());
app.use('/images', express.static(path.join(__dirname, '..', 'images')));
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Only bind to port when run directly (not when imported by tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
