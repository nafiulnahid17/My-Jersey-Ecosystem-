import { createSupabaseDatabase } from '../server/supabase-db.js';
import {
  normalizeProduct,
  schemas,
  validate,
  ValidationError,
} from '../server/validation.js';

const bodyLimitBytes = 256 * 1024;
const rateBuckets = new Map();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      const assetResponse = await env.ASSETS.fetch(request);
      return withSecurityHeaders(assetResponse);
    }

    try {
      const response = await handleApi(request, env, url);
      return withSecurityHeaders(response);
    } catch (error) {
      if (error instanceof ValidationError) {
        return withSecurityHeaders(json(422, {
          error: error.message,
          fields: error.fields,
        }));
      }

      if (error?.code === '23505') {
        return withSecurityHeaders(json(409, {
          error: 'A product with that slug already exists.',
        }));
      }

      console.error('Worker request failed', error);
      return withSecurityHeaders(json(500, {
        error: 'An unexpected server error occurred.',
      }));
    }
  },
};

async function handleApi(request, env, url) {
  const method = request.method.toUpperCase();
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    return json(503, {
      error: 'The database connection is not configured.',
    });
  }

  const db = createSupabaseDatabase(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

  if (method === 'GET' && pathname === '/api/health') {
    await db.health();
    return json(200, {
      status: 'ok',
      database: 'supabase',
      admin_configured: Boolean(env.ADMIN_API_KEY),
    });
  }

  if (method === 'GET' && pathname === '/api/products') {
    const products = await db.listProducts({
      category: cleanQuery(url.searchParams.get('category'), 60),
      search: cleanQuery(url.searchParams.get('search'), 100),
    });
    return json(200, { products });
  }

  if (method === 'GET' && pathname.startsWith('/api/products/')) {
    const slug = decodeURIComponent(pathname.slice('/api/products/'.length));
    const product = await db.getProductBySlug(slug);
    return product
      ? json(200, { product })
      : json(404, { error: 'Product not found.' });
  }

  const publicSubmissions = {
    '/api/custom-requests': ['custom_requests', schemas.customRequest],
    '/api/team-orders': ['team_orders', schemas.teamOrder],
    '/api/contact': ['contact_messages', schemas.contact],
  };

  if (method === 'POST' && publicSubmissions[pathname]) {
    if (!allowRequest(request, 10, 60_000)) {
      return json(429, {
        error: 'Too many requests. Please wait and try again.',
      });
    }

    const [table, schema] = publicSubmissions[pathname];
    const payload = validate(schema, await readJson(request));
    const result = await db.createSubmission(table, payload);
    return json(201, {
      id: result.id,
      created_at: result.created_at,
      message: 'Your request was received.',
    });
  }

  if (pathname.startsWith('/api/admin')) {
    if (!env.ADMIN_API_KEY) {
      return json(503, {
        error: 'Admin access is disabled until ADMIN_API_KEY is configured.',
      });
    }

    if (!(await hasValidAdminKey(request, env.ADMIN_API_KEY))) {
      return json(401, { error: 'A valid admin API key is required.' });
    }

    if (method === 'GET' && pathname === '/api/admin/products') {
      return json(200, {
        products: await db.listProducts({ includeInactive: true }),
      });
    }

    if (method === 'POST' && pathname === '/api/admin/products') {
      const product = await db.createProduct(
        normalizeProduct(await readJson(request)),
      );
      return json(201, { product });
    }

    if (method === 'GET' && pathname === '/api/admin/submissions') {
      return json(200, await db.listSubmissions());
    }

    const productMatch = pathname.match(
      /^\/api\/admin\/products\/([0-9a-f-]+)$/i,
    );

    if (productMatch && method === 'PATCH') {
      const product = await db.updateProduct(
        productMatch[1],
        normalizeProduct(await readJson(request), true),
      );
      return product
        ? json(200, { product })
        : json(404, { error: 'Product not found.' });
    }

    if (productMatch && method === 'DELETE') {
      const deleted = await db.deleteProduct(productMatch[1]);
      return deleted
        ? json(200, { deleted: true })
        : json(404, { error: 'Product not found.' });
    }
  }

  return json(404, { error: 'API route not found.' });
}

async function readJson(request) {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    throw new ValidationError({
      request: 'Content-Type must be application/json.',
    });
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > bodyLimitBytes) {
    throw new ValidationError({ request: 'Request body is too large.' });
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new ValidationError({ request: 'Request body must be valid JSON.' });
  }
}

async function hasValidAdminKey(request, expected) {
  const received = request.headers.get('x-admin-key');
  if (!received) return false;

  const encoder = new TextEncoder();
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(received)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);

  const receivedBytes = new Uint8Array(receivedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= receivedBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

function allowRequest(request, limit, windowMs) {
  const key = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const current = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || current > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: current + windowMs });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

function cleanQuery(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function withSecurityHeaders(response) {
  const secured = new Response(response.body, response);
  secured.headers.set('X-Content-Type-Options', 'nosniff');
  secured.headers.set('X-Frame-Options', 'DENY');
  secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  secured.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  secured.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
  return secured;
}
