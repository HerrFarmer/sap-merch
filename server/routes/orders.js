const express = require('express');
const router = express.Router();
const { query, insert, getSetting } = require('../db');

// GET /api/orders/settings
router.get('/settings', async (req, res) => {
  try {
    const val = await getSetting('ordering_open');
    res.json({ ordering_open: val === 'true' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orders/lookup?email=...  or  ?name=...
router.get('/lookup', async (req, res) => {
  const { name, email } = req.query;
  try {
    let result;
    if (email) {
      result = await query(
        'SELECT * FROM orders WHERE LOWER(email) = LOWER($1) ORDER BY submitted_at DESC',
        [email.trim()]
      );
    } else if (name) {
      result = await query(
        'SELECT * FROM orders WHERE LOWER(name) = LOWER($1) ORDER BY submitted_at DESC',
        [name.trim()]
      );
    } else {
      return res.status(400).json({ error: 'name or email required' });
    }
    const orders = await Promise.all(result.rows.map(async o => ({
      ...o,
      items: (await query('SELECT * FROM order_items WHERE order_id = $1', [o.id])).rows,
    })));
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const order = result.rows[0];
    order.items = (await query('SELECT * FROM order_items WHERE order_id = $1', [order.id])).rows;
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const open = await getSetting('ordering_open');
    if (open !== 'true') return res.status(403).json({ error: 'Ordering is closed' });

    const { name, email, notes, items } = req.body;
    if (!name || !items || items.length === 0)
      return res.status(400).json({ error: 'name and at least one item required' });

    const id = await insert(
      `INSERT INTO orders (name, email, notes, submitted_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
      [name.trim(), email || null, notes || null]
    );
    for (const item of items) {
      await insert(
        `INSERT INTO order_items (order_id, product_id, product_name, gender, size, quantity)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [id, item.product_id, item.product_name, item.gender, item.size, item.quantity]
      );
    }
    const order = (await query('SELECT * FROM orders WHERE id = $1', [id])).rows[0];
    order.items = (await query('SELECT * FROM order_items WHERE order_id = $1', [id])).rows;
    res.status(201).json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  try {
    const open = await getSetting('ordering_open');
    if (open !== 'true') return res.status(403).json({ error: 'Ordering is closed' });

    const existing = (await query('SELECT * FROM orders WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, email, notes, items } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ error: 'At least one item required' });

    await query(
      `UPDATE orders SET name=$1, email=$2, notes=$3, updated_at=NOW() WHERE id=$4`,
      [name || existing.name, email ?? existing.email, notes ?? existing.notes, existing.id]
    );
    await query('DELETE FROM order_items WHERE order_id = $1', [existing.id]);
    for (const item of items) {
      await insert(
        `INSERT INTO order_items (order_id, product_id, product_name, gender, size, quantity)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [existing.id, item.product_id, item.product_name, item.gender, item.size, item.quantity]
      );
    }
    const order = (await query('SELECT * FROM orders WHERE id = $1', [existing.id])).rows[0];
    order.items = (await query('SELECT * FROM order_items WHERE order_id = $1', [existing.id])).rows;
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = (await query('SELECT * FROM orders WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
