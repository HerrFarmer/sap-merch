-- Run this once in the Supabase SQL Editor to create the schema

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL,
  product_name TEXT NOT NULL,
  gender       TEXT NOT NULL,
  size         TEXT NOT NULL,
  quantity     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES ('ordering_open',  'true')     ON CONFLICT DO NOTHING;
INSERT INTO settings (key, value) VALUES ('admin_password', 'admin123') ON CONFLICT DO NOTHING;
