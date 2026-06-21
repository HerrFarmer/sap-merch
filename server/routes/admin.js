const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { query, insert, getSetting, setSetting } = require('../db');

async function auth(req, res, next) {
  const pw = req.headers['x-admin-password'];
  const stored = await getSetting('admin_password');
  if (!pw || pw !== stored) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const stored = await getSetting('admin_password');
    if (password === stored) return res.json({ ok: true });
    res.status(401).json({ error: 'Wrong password' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/orders
router.get('/orders', auth, async (req, res) => {
  try {
    const orders = (await query('SELECT * FROM orders ORDER BY submitted_at DESC')).rows;
    const result = await Promise.all(orders.map(async o => ({
      ...o,
      items: (await query('SELECT * FROM order_items WHERE order_id = $1', [o.id])).rows,
    })));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/orders/:id
router.put('/orders/:id', auth, async (req, res) => {
  try {
    const existing = (await query('SELECT * FROM orders WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, email, notes, items } = req.body;
    await query(
      `UPDATE orders SET name=$1, email=$2, notes=$3, updated_at=NOW() WHERE id=$4`,
      [name || existing.name, email ?? existing.email, notes ?? existing.notes, existing.id]
    );
    if (items) {
      await query('DELETE FROM order_items WHERE order_id = $1', [existing.id]);
      for (const item of items) {
        await insert(
          `INSERT INTO order_items (order_id, product_id, product_name, gender, size, quantity)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [existing.id, item.product_id, item.product_name, item.gender, item.size, item.quantity]
        );
      }
    }
    const order = (await query('SELECT * FROM orders WHERE id = $1', [existing.id])).rows[0];
    order.items = (await query('SELECT * FROM order_items WHERE order_id = $1', [existing.id])).rows;
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/orders/:id
router.delete('/orders/:id', auth, async (req, res) => {
  try {
    const existing = (await query('SELECT * FROM orders WHERE id = $1', [req.params.id])).rows[0];
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/settings
router.get('/settings', auth, async (req, res) => {
  try {
    const val = await getSetting('ordering_open');
    res.json({ ordering_open: val === 'true' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/settings
router.put('/settings', auth, async (req, res) => {
  try {
    const { ordering_open } = req.body;
    if (typeof ordering_open === 'boolean') {
      await setSetting('ordering_open', ordering_open ? 'true' : 'false');
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const PRICES = { 'Classic Tee': 20.85, 'Neptune Polo': 29.35 };
    const totalOrders = (await query('SELECT COUNT(*) as count FROM orders')).rows[0].count;
    const totalItems  = (await query('SELECT COALESCE(SUM(quantity),0) as count FROM order_items')).rows[0].count;
    const byProductRaw = (await query(
      'SELECT product_name, SUM(quantity) as total FROM order_items GROUP BY product_name'
    )).rows;
    const byProduct = byProductRaw.map(p => ({
      ...p,
      total:       Number(p.total),
      unit_price:  PRICES[p.product_name] ?? 0,
      total_value: (PRICES[p.product_name] ?? 0) * Number(p.total),
    }));
    const totalValue = byProduct.reduce((s, p) => s + p.total_value, 0);
    res.json({ totalOrders: Number(totalOrders), totalItems: Number(totalItems), byProduct, totalValue });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/export
router.get('/export', auth, async (req, res) => {
  try {
    const orders = (await query('SELECT * FROM orders ORDER BY name ASC, submitted_at ASC')).rows;
    const allItems = await Promise.all(orders.map(async o => ({
      ...o,
      items: (await query('SELECT * FROM order_items WHERE order_id = $1', [o.id])).rows,
    })));

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SAP Merch App';

    const wsDetail = wb.addWorksheet('All Orders');
    wsDetail.columns = [
      { header: 'Order #',   key: 'id',           width: 10 },
      { header: 'Email',     key: 'email',         width: 30 },
      { header: 'Name',      key: 'name',          width: 22 },
      { header: 'Product',   key: 'product_name',  width: 28 },
      { header: 'Gender',    key: 'gender',        width: 12 },
      { header: 'Size',      key: 'size',          width: 10 },
      { header: 'Qty',       key: 'quantity',      width: 8  },
      { header: 'Submitted', key: 'submitted_at',  width: 20 },
      { header: 'Notes',     key: 'notes',         width: 30 },
    ];
    wsDetail.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
    wsDetail.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const order of allItems) {
      for (const item of order.items) {
        wsDetail.addRow({
          id: order.id, email: order.email || '', name: order.name,
          product_name: item.product_name,
          gender: item.gender === 'mens' ? 'Mens' : 'Womens',
          size: item.size, quantity: item.quantity,
          submitted_at: order.submitted_at, notes: order.notes || '',
        });
      }
    }

    const wsSummary = wb.addWorksheet('Summary');
    wsSummary.columns = [
      { header: 'Product',   key: 'product',  width: 28 },
      { header: 'Gender',    key: 'gender',   width: 12 },
      { header: 'Size',      key: 'size',     width: 10 },
      { header: 'Total Qty', key: 'total',    width: 12 },
    ];
    wsSummary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF217346' } };
    wsSummary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const summary = (await query(
      `SELECT product_name, gender, size, SUM(quantity) as total
       FROM order_items GROUP BY product_name, gender, size
       ORDER BY product_name, gender, size`
    )).rows;
    for (const row of summary) {
      wsSummary.addRow({
        product: row.product_name,
        gender: row.gender === 'mens' ? 'Mens' : 'Womens',
        size: row.size, total: Number(row.total),
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="sap-merch-orders-${new Date().toISOString().slice(0,10)}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
