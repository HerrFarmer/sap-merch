const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/orders/settings — check if ordering is open
router.get('/settings', (req, res) => {
  const open = db.prepare("SELECT value FROM settings WHERE key = 'ordering_open'").get();
  res.json({ ordering_open: open.value === 'true' });
});

// GET /api/orders/lookup?name=John — find orders by name
router.get('/lookup', (req, res) => {
  const { name, email } = req.query;
  let orders;
  if (email) {
    orders = db.prepare(
      'SELECT * FROM orders WHERE LOWER(email) = LOWER(?) ORDER BY submitted_at DESC'
    ).all(email.trim());
  } else if (name) {
    orders = db.prepare(
      'SELECT * FROM orders WHERE LOWER(name) = LOWER(?) ORDER BY submitted_at DESC'
    ).all(name.trim());
  } else {
    return res.status(400).json({ error: 'name or email required' });
  }
  const result = orders.map(o => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id)
  }));
  res.json(result);
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json(order);
});

// POST /api/orders — create new order
router.post('/', (req, res) => {
  const open = db.prepare("SELECT value FROM settings WHERE key = 'ordering_open'").get();
  if (open.value !== 'true') return res.status(403).json({ error: 'Ordering is closed' });

  const { name, email, notes, items } = req.body;
  if (!name || !items || items.length === 0) {
    return res.status(400).json({ error: 'name and at least one item required' });
  }

  const insertOrder = db.prepare(
    "INSERT INTO orders (name, email, notes, submitted_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))"
  );
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, product_name, gender, size, quantity) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const run = db.transaction(() => {
    const { lastInsertRowid } = insertOrder.run(name.trim(), email || null, notes || null);
    for (const item of items) {
      insertItem.run(lastInsertRowid, item.product_id, item.product_name, item.gender, item.size, item.quantity);
    }
    return lastInsertRowid;
  });

  const id = run();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  res.status(201).json(order);
});

// PUT /api/orders/:id — update order
router.put('/:id', (req, res) => {
  const open = db.prepare("SELECT value FROM settings WHERE key = 'ordering_open'").get();
  if (open.value !== 'true') return res.status(403).json({ error: 'Ordering is closed' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  const { name, email, notes, items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item required' });

  const run = db.transaction(() => {
    db.prepare("UPDATE orders SET name = ?, email = ?, notes = ?, updated_at = datetime('now') WHERE id = ?")
      .run(name || order.name, email ?? order.email, notes ?? order.notes, order.id);
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order.id);
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, gender, size, quantity) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      insertItem.run(order.id, item.product_id, item.product_name, item.gender, item.size, item.quantity);
    }
  });
  run();

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  updated.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json(updated);
});

// DELETE /api/orders/:id
router.delete('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
