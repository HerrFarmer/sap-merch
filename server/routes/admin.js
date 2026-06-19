const express = require('express');
const router = express.Router();
const db = require('../database');
const ExcelJS = require('exceljs');

// Simple password check middleware
function auth(req, res, next) {
  const pw = req.headers['x-admin-password'];
  const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
  if (!pw || pw !== stored.value) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  const stored = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
  if (password === stored.value) return res.json({ ok: true });
  res.status(401).json({ error: 'Wrong password' });
});

// GET /api/admin/orders
router.get('/orders', auth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY submitted_at DESC').all();
  const result = orders.map(o => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id)
  }));
  res.json(result);
});

// PUT /api/admin/orders/:id — admin edit
router.put('/orders/:id', auth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  const { name, email, notes, items } = req.body;

  const run = db.transaction(() => {
    db.prepare("UPDATE orders SET name = ?, email = ?, notes = ?, updated_at = datetime('now') WHERE id = ?")
      .run(name || order.name, email ?? order.email, notes ?? order.notes, order.id);
    if (items) {
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order.id);
      const insertItem = db.prepare(
        'INSERT INTO order_items (order_id, product_id, product_name, gender, size, quantity) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const item of items) {
        insertItem.run(order.id, item.product_id, item.product_name, item.gender, item.size, item.quantity);
      }
    }
  });
  run();

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  updated.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json(updated);
});

// DELETE /api/admin/orders/:id
router.delete('/orders/:id', auth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// GET /api/admin/settings
router.get('/settings', auth, (req, res) => {
  const open = db.prepare("SELECT value FROM settings WHERE key = 'ordering_open'").get();
  res.json({ ordering_open: open.value === 'true' });
});

// PUT /api/admin/settings
router.put('/settings', auth, (req, res) => {
  const { ordering_open } = req.body;
  if (typeof ordering_open === 'boolean') {
    db.prepare("UPDATE settings SET value = ? WHERE key = 'ordering_open'")
      .run(ordering_open ? 'true' : 'false');
  }
  res.json({ ok: true });
});

// GET /api/admin/export — download Excel
router.get('/export', auth, async (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY name ASC, submitted_at ASC').all();
  const allItems = orders.map(o => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id)
  }));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SAP Merch App';

  // Sheet 1: All orders detail
  const wsDetail = wb.addWorksheet('All Orders');
  wsDetail.columns = [
    { header: 'Order #', key: 'id', width: 10 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Product', key: 'product_name', width: 28 },
    { header: 'Gender', key: 'gender', width: 12 },
    { header: 'Size', key: 'size', width: 10 },
    { header: 'Qty', key: 'quantity', width: 8 },
    { header: 'Submitted', key: 'submitted_at', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  wsDetail.getRow(1).font = { bold: true };
  wsDetail.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
  wsDetail.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  for (const order of allItems) {
    for (const item of order.items) {
      wsDetail.addRow({
        id: order.id,
        name: order.name,
        email: order.email || '',
        product_name: item.product_name,
        gender: item.gender === 'mens' ? 'Mens' : 'Womens',
        size: item.size,
        quantity: item.quantity,
        submitted_at: order.submitted_at,
        notes: order.notes || '',
      });
    }
  }

  // Sheet 2: Summary by product/gender/size
  const wsSummary = wb.addWorksheet('Summary');
  wsSummary.columns = [
    { header: 'Product', key: 'product', width: 28 },
    { header: 'Gender', key: 'gender', width: 12 },
    { header: 'Size', key: 'size', width: 10 },
    { header: 'Total Qty', key: 'total', width: 12 },
  ];
  wsSummary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF217346' } };
  wsSummary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  const summary = db.prepare(`
    SELECT product_name, gender, size, SUM(quantity) as total
    FROM order_items
    GROUP BY product_name, gender, size
    ORDER BY product_name, gender, size
  `).all();

  for (const row of summary) {
    wsSummary.addRow({
      product: row.product_name,
      gender: row.gender === 'mens' ? 'Mens' : 'Womens',
      size: row.size,
      total: row.total,
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="sap-merch-orders-${new Date().toISOString().slice(0,10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

// GET /api/admin/stats
router.get('/stats', auth, (req, res) => {
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const totalItems  = db.prepare('SELECT COALESCE(SUM(quantity),0) as count FROM order_items').get().count;
  const byProduct   = db.prepare(`
    SELECT product_name, SUM(quantity) as total FROM order_items GROUP BY product_name
  `).all();
  res.json({ totalOrders, totalItems, byProduct });
});

module.exports = router;
