import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { createDatabase } from './db.js';
import { createSupabaseDatabase } from './supabase-db.js';
import { normalizeProduct, schemas, validate, ValidationError } from './validation.js';

const db = config.databaseProvider === 'supabase'
  ? createSupabaseDatabase(config.supabaseUrl, config.supabaseSecretKey)
  : createDatabase(config.databasePath);
const buckets = new Map();
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(res, url.pathname);
  } catch (error) {
    if (error instanceof ValidationError) {
      sendJson(res, 422, { error: error.message, fields: error.fields });
      return;
    }
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.code === '23505') {
      sendJson(res, 409, { error: 'A product with that slug already exists.' });
      return;
    }
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: 'An unexpected server error occurred.' });
  }
});

async function handleApi(req, res, url) {
  const method = req.method ?? 'GET';
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (method === 'GET' && pathname === '/api/health') {
    await db.health();
    return sendJson(res, 200, {
      status: 'ok',
      database: config.databaseProvider,
      admin_configured: Boolean(config.adminApiKey),
    });
  }

  if (method === 'GET' && pathname === '/api/products') {
    return sendJson(res, 200, {
      products: await db.listProducts({
        category: cleanQuery(url.searchParams.get('category'), 60),
        search: cleanQuery(url.searchParams.get('search'), 100),
      }),
    });
  }

  if (method === 'GET' && pathname.startsWith('/api/products/')) {
    const product = await db.getProductBySlug(decodeURIComponent(pathname.slice('/api/products/'.length)));
    return product ? sendJson(res, 200, { product }) : sendJson(res, 404, { error: 'Product not found.' });
  }

  const publicSubmissions = {
    '/api/custom-requests': ['custom_requests', schemas.customRequest],
    '/api/team-orders': ['team_orders', schemas.teamOrder],
    '/api/contact': ['contact_messages', schemas.contact],
  };
  if (method === 'POST' && publicSubmissions[pathname]) {
    if (!allowRequest(req, 10, 60_000)) return sendJson(res, 429, { error: 'Too many requests. Please wait and try again.' });
    const [table, schema] = publicSubmissions[pathname];
    const payload = validate(schema, await readJson(req));
    const result = await db.createSubmission(table, payload);
    return sendJson(res, 201, { id: result.id, created_at: result.created_at, message: 'Your request was received.' });
  }

  if (pathname.startsWith('/api/admin')) {
    if (!isAdmin(req)) return sendJson(res, config.adminApiKey ? 401 : 503, {
      error: config.adminApiKey ? 'A valid admin API key is required.' : 'Admin access is disabled until ADMIN_API_KEY is configured.',
    });

    if (method === 'GET' && pathname === '/api/admin/products') {
      return sendJson(res, 200, { products: await db.listProducts({ includeInactive: true }) });
    }
    if (method === 'POST' && pathname === '/api/admin/products') {
      const product = await db.createProduct(normalizeProduct(await readJson(req)));
      return sendJson(res, 201, { product });
    }
    if (method === 'GET' && pathname === '/api/admin/submissions') {
      return sendJson(res, 200, await db.listSubmissions());
    }
    const match = pathname.match(/^\/api\/admin\/products\/([0-9a-f-]+)$/i);
    if (match && method === 'PATCH') {
      const product = await db.updateProduct(match[1], normalizeProduct(await readJson(req), true));
      return product ? sendJson(res, 200, { product }) : sendJson(res, 404, { error: 'Product not found.' });
    }
    if (match && method === 'DELETE') {
      return await db.deleteProduct(match[1]) ? sendJson(res, 200, { deleted: true }) : sendJson(res, 404, { error: 'Product not found.' });
    }
  }

  sendJson(res, 404, { error: 'API route not found.' });
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
}

function serveStatic(res, requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const requested = decoded === '/' ? '/index.html' : decoded;
  let filePath = path.resolve(config.publicPath, `.${requested}`);
  if (!filePath.startsWith(config.publicPath)) return sendText(res, 403, 'Forbidden');
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(config.publicPath, 'index.html');
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=86400' });
  res.end(content);
}

function sendJson(res, status, body) {
  const content = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(content), 'Cache-Control': 'no-store' });
  res.end(content);
}

function sendText(res, status, content) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(content);
}

async function readJson(req) {
  if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    throw new ValidationError({ request: 'Content-Type must be application/json.' });
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > config.bodyLimitBytes) throw new ValidationError({ request: 'Request body is too large.' });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ValidationError({ request: 'Request body must be valid JSON.' });
  }
}

function isAdmin(req) {
  if (!config.adminApiKey) return false;
  const received = req.headers['x-admin-key'];
  if (typeof received !== 'string') return false;
  const expectedBuffer = Buffer.from(config.adminApiKey);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function cleanQuery(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function allowRequest(req, limit, windowMs) {
  const forwarded = config.trustProxy ? req.headers['x-forwarded-for']?.split(',')[0].trim() : '';
  const key = forwarded || req.socket.remoteAddress || 'unknown';
  const current = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || current > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: current + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

server.listen(config.port, config.host, () => {
  console.log(`My Jersey is running at http://${config.host}:${config.port}`);
  if (!config.adminApiKey) console.log('Admin API is disabled. Set ADMIN_API_KEY to enable it.');
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { server };
