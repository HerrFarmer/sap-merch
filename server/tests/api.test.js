process.env.NODE_ENV = 'test';

const request    = require('supertest');
const app        = require('../server');
const db         = require('../database');

// Seed test settings (in-memory DB starts empty)
beforeAll(() => {
  db.exec(`
    INSERT OR IGNORE INTO settings VALUES ('ordering_open', 'true');
    INSERT OR IGNORE INTO settings VALUES ('admin_password', 'testpass');
  `);
  db.prepare("UPDATE settings SET value='testpass' WHERE key='admin_password'").run();
});

afterAll(() => {
  db.close();
});

const ADMIN_PW     = 'testpass';
const adminHeaders = { 'x-admin-password': ADMIN_PW };

const sampleItem = {
  product_id:   'classic-tee',
  product_name: 'Classic Tee',
  gender:       'mens',
  size:         'L',
  quantity:     2,
};

// ── Health ────────────────────────────────────────────────────────────────
describe('Health', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── Settings ──────────────────────────────────────────────────────────────
describe('Settings', () => {
  test('GET /api/orders/settings returns ordering_open true', async () => {
    const res = await request(app).get('/api/orders/settings');
    expect(res.status).toBe(200);
    expect(res.body.ordering_open).toBe(true);
  });
});

// ── Orders ────────────────────────────────────────────────────────────────
describe('Orders', () => {
  test('POST /api/orders creates an order and returns 201', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ name: 'Alex Bauer', email: 'alex@sap.com', items: [sampleItem] });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Alex Bauer');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].size).toBe('L');
  });

  test('POST /api/orders rejects empty items with 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ name: 'Alex Bauer', email: 'alex@sap.com', items: [] });
    expect(res.status).toBe(400);
  });

  test('POST /api/orders rejects missing name with 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ email: 'alex@sap.com', items: [sampleItem] });
    expect(res.status).toBe(400);
  });

  test('GET /api/orders/lookup finds order by email', async () => {
    await request(app)
      .post('/api/orders')
      .send({ name: 'Sam Jones', email: 'sam@sap.com', items: [sampleItem] });
    const res = await request(app).get('/api/orders/lookup?email=sam@sap.com');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].email).toBe('sam@sap.com');
  });

  test('GET /api/orders/lookup returns empty array for unknown email', async () => {
    const res = await request(app).get('/api/orders/lookup?email=nobody@sap.com');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('PUT /api/orders/:id updates an existing order', async () => {
    const create = await request(app)
      .post('/api/orders')
      .send({ name: 'Pat Lee', email: 'pat@sap.com', items: [sampleItem] });
    const id = create.body.id;
    const res = await request(app)
      .put(`/api/orders/${id}`)
      .send({ name: 'Pat Lee', email: 'pat@sap.com', items: [{ ...sampleItem, size: 'XL', quantity: 1 }] });
    expect(res.status).toBe(200);
    expect(res.body.items[0].size).toBe('XL');
    expect(res.body.items[0].quantity).toBe(1);
  });

  test('PUT /api/orders/:id returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/orders/99999')
      .send({ name: 'Ghost', items: [sampleItem] });
    expect(res.status).toBe(404);
  });

  test('POST /api/orders blocked when ordering is closed', async () => {
    db.prepare("UPDATE settings SET value='false' WHERE key='ordering_open'").run();
    const res = await request(app)
      .post('/api/orders')
      .send({ name: 'Closed User', email: 'closed@sap.com', items: [sampleItem] });
    expect(res.status).toBe(403);
    db.prepare("UPDATE settings SET value='true' WHERE key='ordering_open'").run();
  });
});

// ── Admin ─────────────────────────────────────────────────────────────────
describe('Admin', () => {
  test('POST /api/admin/login succeeds with correct password', async () => {
    const res = await request(app).post('/api/admin/login').send({ password: ADMIN_PW });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('POST /api/admin/login rejects wrong password', async () => {
    const res = await request(app).post('/api/admin/login').send({ password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('GET /api/admin/orders returns all orders', async () => {
    const res = await request(app).get('/api/admin/orders').set(adminHeaders);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/admin/orders rejects missing password with 401', async () => {
    const res = await request(app).get('/api/admin/orders');
    expect(res.status).toBe(401);
  });

  test('DELETE /api/admin/orders/:id removes the order', async () => {
    const create = await request(app)
      .post('/api/orders')
      .send({ name: 'Del User', email: 'del@sap.com', items: [sampleItem] });
    const id = create.body.id;
    const del = await request(app).delete(`/api/admin/orders/${id}`).set(adminHeaders);
    expect(del.status).toBe(200);
    const check = await request(app).get(`/api/orders/${id}`);
    expect(check.status).toBe(404);
  });

  test('PUT /api/admin/settings toggles ordering closed then open', async () => {
    await request(app).put('/api/admin/settings').set(adminHeaders).send({ ordering_open: false });
    const closed = await request(app).get('/api/orders/settings');
    expect(closed.body.ordering_open).toBe(false);
    await request(app).put('/api/admin/settings').set(adminHeaders).send({ ordering_open: true });
    const open = await request(app).get('/api/orders/settings');
    expect(open.body.ordering_open).toBe(true);
  });

  test('GET /api/admin/export returns an Excel file', async () => {
    const res = await request(app).get('/api/admin/export').set(adminHeaders);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  test('GET /api/admin/stats returns totals with value fields', async () => {
    // Create an order so byProduct is populated
    await request(app)
      .post('/api/orders')
      .send({ name: 'Stats User', email: 'stats@sap.com', items: [sampleItem] });

    const res = await request(app).get('/api/admin/stats').set(adminHeaders);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalOrders');
    expect(res.body).toHaveProperty('totalItems');
    expect(res.body).toHaveProperty('totalValue');
    expect(res.body).toHaveProperty('byProduct');
    expect(typeof res.body.totalValue).toBe('number');

    // Each byProduct entry must have unit_price and total_value defined (not undefined)
    res.body.byProduct.forEach(p => {
      expect(p.unit_price).toBeDefined();
      expect(p.total_value).toBeDefined();
      expect(typeof p.unit_price).toBe('number');
      expect(typeof p.total_value).toBe('number');
    });

    // totalValue should equal sum of byProduct total_values
    const expected = res.body.byProduct.reduce((s, p) => s + p.total_value, 0);
    expect(res.body.totalValue).toBeCloseTo(expected, 2);
  });
});
