import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const now = () => new Date().toISOString();

export function createDatabase(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      base_price INTEGER,
      currency TEXT NOT NULL DEFAULT 'BDT',
      image_url TEXT,
      stock_status TEXT NOT NULL DEFAULT 'made_to_order'
        CHECK (stock_status IN ('made_to_order', 'in_stock', 'out_of_stock')),
      active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_requests (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      sport TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      preferred_colors TEXT,
      reference_url TEXT,
      details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_orders (
      id TEXT PRIMARY KEY,
      contact_name TEXT NOT NULL,
      organization TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      target_date TEXT,
      details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(active, category);
    CREATE INDEX IF NOT EXISTS idx_custom_requests_created_at ON custom_requests(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_team_orders_created_at ON team_orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
  `);

  return {
    close: () => db.close(),

    health() {
      db.prepare('SELECT 1').get();
      return true;
    },

    listProducts({ includeInactive = false, category = '', search = '' } = {}) {
      const filters = [];
      const params = {};
      if (!includeInactive) filters.push('active = 1');
      if (category) {
        filters.push('category = $category');
        params.$category = category;
      }
      if (search) {
        filters.push('(name LIKE $search OR description LIKE $search)');
        params.$search = `%${search}%`;
      }
      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      return db.prepare(`SELECT * FROM products ${where} ORDER BY created_at DESC`).all(params).map(mapProduct);
    },

    getProductBySlug(slug, includeInactive = false) {
      const sql = `SELECT * FROM products WHERE slug = ?${includeInactive ? '' : ' AND active = 1'}`;
      return mapProduct(db.prepare(sql).get(slug));
    },

    createProduct(input) {
      const product = { id: randomUUID(), ...input, created_at: now(), updated_at: now() };
      db.prepare(`
        INSERT INTO products (
          id, slug, name, description, category, base_price, currency,
          image_url, stock_status, active, created_at, updated_at
        ) VALUES (
          $id, $slug, $name, $description, $category, $base_price, $currency,
          $image_url, $stock_status, $active, $created_at, $updated_at
        )
      `).run(toProductParams(product));
      return this.getProductBySlug(product.slug, true);
    },

    updateProduct(id, input) {
      const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!existing) return null;
      const product = { ...existing, ...input, updated_at: now() };
      db.prepare(`
        UPDATE products SET slug=$slug, name=$name, description=$description,
          category=$category, base_price=$base_price, currency=$currency,
          image_url=$image_url, stock_status=$stock_status, active=$active,
          updated_at=$updated_at WHERE id=$id
      `).run(toProductParams(product));
      return mapProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
    },

    deleteProduct(id) {
      return db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0;
    },

    createSubmission(table, input) {
      const id = randomUUID();
      const createdAt = now();
      const definitions = {
        custom_requests: ['customer_name', 'email', 'phone', 'sport', 'quantity', 'preferred_colors', 'reference_url', 'details'],
        team_orders: ['contact_name', 'organization', 'email', 'phone', 'quantity', 'target_date', 'details'],
        contact_messages: ['name', 'email', 'subject', 'message'],
      };
      const columns = definitions[table];
      if (!columns) throw new Error('Unknown submission table');
      const names = ['id', ...columns, 'created_at'];
      const placeholders = names.map((name) => `$${name}`).join(', ');
      db.prepare(`INSERT INTO ${table} (${names.join(', ')}) VALUES (${placeholders})`).run({
        $id: id,
        ...Object.fromEntries(columns.map((key) => [`$${key}`, input[key] ?? null])),
        $created_at: createdAt,
      });
      return { id, created_at: createdAt };
    },

    listSubmissions() {
      return {
        custom_requests: db.prepare('SELECT * FROM custom_requests ORDER BY created_at DESC').all(),
        team_orders: db.prepare('SELECT * FROM team_orders ORDER BY created_at DESC').all(),
        contact_messages: db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all(),
      };
    },
  };
}

function mapProduct(row) {
  if (!row) return null;
  return { ...row, active: Boolean(row.active) };
}

function toProductParams(product) {
  return Object.fromEntries(Object.entries({
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    base_price: product.base_price,
    currency: product.currency,
    image_url: product.image_url,
    stock_status: product.stock_status,
    active: product.active ? 1 : 0,
    created_at: product.created_at,
    updated_at: product.updated_at,
  }).map(([key, value]) => [`$${key}`, value ?? null]));
}
