# My Jersey

A clean full-stack foundation for a custom sportswear storefront. The source intentionally contains **no demo products, invented prices, fake reviews, customer counts, addresses, or delivery claims**.

The storefront reads real published products from the API. Until an administrator adds and publishes inventory, visitors see a clear empty state and can submit a custom jersey request, team order request, or contact message.

## What is included

- Responsive storefront based on the supplied green, blue, and stadium visual direction
- Home, catalog, custom jersey, team order, about, contact, and admin routes
- Real API-backed forms with server-side validation
- Empty SQLite database created on first launch
- Draft and published product management
- Protected admin endpoints using a server-side API key
- Stored custom requests, team orders, and contact messages
- Search and category filtering for published products
- Security headers, request-size limits, constant-time admin key checks, and basic rate limiting
- No runtime packages to install; Node.js supplies the web server and SQLite driver

## Requirements

- Node.js 22.5 or newer (Node.js 24 LTS is recommended)

## Start locally

1. Copy `.env.example` to `.env` if your hosting platform loads env files automatically, or set the variables in your shell/deployment dashboard.
2. Set a long, random `ADMIN_API_KEY`. Admin access remains disabled when this is empty.
3. Start the website:

```bash
npm start
```

Open `http://127.0.0.1:3000`.

No install command is required because the project has no third-party runtime dependencies. For development with automatic restarts:

```bash
npm run dev
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `127.0.0.1` | Bind address; use `0.0.0.0` in a container |
| `ADMIN_API_KEY` | empty | Enables and protects admin API access |
| `DATABASE_PATH` | `./data/my-jersey.sqlite` | SQLite database file |
| `TRUST_PROXY` | `false` | Trust the first `X-Forwarded-For` value for rate limiting |
| `SUPABASE_URL` | empty | Supabase project URL; enables Supabase when paired with the secret key |
| `SUPABASE_SECRET_KEY` | empty | Server-only Supabase secret key; never expose or commit it |

The start scripts use Node's built-in `.env` loading. The `.env` file is ignored by Git and must never be committed. Deployment platforms should inject the same values through their encrypted secret settings.

## Admin workflow

1. Configure `ADMIN_API_KEY` on the server.
2. Open `/admin`.
3. Enter the same key. It is kept in `sessionStorage`, so it is cleared when the browser tab session ends.
4. Add a verified product. New products are drafts by default unless you explicitly publish them.
5. Review customer requests from the same admin page.

For public production use, replace the single admin key with a proper identity provider and role-based access before giving access to multiple staff members.

## API overview

Public endpoints:

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:slug`
- `POST /api/custom-requests`
- `POST /api/team-orders`
- `POST /api/contact`

Admin endpoints require the `X-Admin-Key` header:

- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `DELETE /api/admin/products/:id`
- `GET /api/admin/submissions`

## Product price storage

Prices are stored as integers in the smallest currency unit. For example, BDT 1,250 is stored as `125000`. This avoids floating-point rounding errors.

## Tests

```bash
npm test
```

## Production roadmap

This foundation deliberately does not pretend that unconfigured services are active. Before launch, connect the real business services you choose:

- Move SQLite to managed PostgreSQL when multi-instance deployment is required.
- Add Supabase Auth or another identity provider for customer and staff accounts.
- Add object storage for product images and uploaded artwork.
- Add the chosen payment provider only after merchant credentials and checkout rules are available.
- Add courier integration after delivery areas and rates are confirmed.
- Configure transactional email or SMS for verified notifications.
- Add audit logs and role-based permissions for a multi-user admin team.
- Add legal pages using approved business policies and contact details.

## Source layout

```text
public/
  assets/               Supplied brand artwork used by the storefront
  app.js                Client-side routes, API calls, forms, catalog, admin UI
  index.html            Shared application shell
  styles.css            Responsive design system and page styling
server/
  config.js             Environment configuration
  db.js                 SQLite schema and data access
  server.js             HTTP server, API routes, security and static files
  validation.js         Server-side request validation
tests/
  validation.test.js    Validation tests
design-references/      Original supplied visual and architecture references
```
