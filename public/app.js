const main = document.querySelector('#main');
const nav = document.querySelector('#primary-nav');
const menuButton = document.querySelector('#menu-button');
const toast = document.querySelector('#toast');
document.querySelector('#year').textContent = new Date().getFullYear();

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
})[char]);

const routes = {
  '/': homePage,
  '/shop': shopPage,
  '/custom-jersey': customPage,
  '/team-order': teamPage,
  '/about': aboutPage,
  '/contact': contactPage,
  '/admin': adminPage,
};

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-link]');
  if (!link || link.origin !== location.origin) return;
  event.preventDefault();
  navigate(link.pathname);
});

window.addEventListener('popstate', renderRoute);
menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
});

function navigate(path) {
  history.pushState({}, '', path);
  renderRoute();
}

async function renderRoute() {
  closeMenu();
  const path = location.pathname.replace(/\/$/, '') || '/';
  const render = routes[path] ?? notFoundPage;
  main.innerHTML = '<div class="loading">Loading…</div>';
  main.innerHTML = await render();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  updateNav(path);
  bindPage(path);
}

function closeMenu() {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
}

function updateNav(path) {
  document.querySelectorAll('.primary-nav a').forEach((link) => link.classList.toggle('active', link.pathname === path));
}

function bindPage(path) {
  if (path === '/' || path === '/shop') bindShop(path === '/' ? '#featured-products' : '#shop-products');
  if (path === '/custom-jersey') bindForm('#custom-form', '/api/custom-requests');
  if (path === '/team-order') bindForm('#team-form', '/api/team-orders');
  if (path === '/contact') bindForm('#contact-form', '/api/contact');
  if (path === '/shop') bindShopFilters();
  if (path === '/admin') bindAdmin();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  let payload = {};
  try { payload = await response.json(); } catch { /* Ignore non-JSON response. */ }
  if (!response.ok) {
    const error = new Error(payload.error ?? 'The request could not be completed.');
    error.fields = payload.fields ?? {};
    error.status = response.status;
    throw error;
  }
  return payload;
}

function homePage() {
  return `
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">Play · Wear · Belong</span>
          <h1>Your team. <em>Your jersey.</em></h1>
          <p>Create sportswear around your colors, identity and needs. Start a custom brief or explore products when the official catalog goes live.</p>
          <div class="hero-actions">
            <a class="button" href="/custom-jersey" data-link>Start your jersey <span>→</span></a>
            <a class="button secondary" href="/shop" data-link>View catalog</a>
          </div>
        </div>
        <div class="hero-art"><img src="/assets/my-jersey-hero.png" alt="My Jersey artwork featuring football and cricket players" /></div>
        <div class="hero-card"><div class="mini-line"></div><strong>Made around your brief</strong><span>Colors, names, numbers and team identity.</span></div>
      </div>
    </section>

    <section class="section compact">
      <div class="container">
        <div class="section-head">
          <div><span class="kicker">Choose your game</span><h2>One identity, every arena.</h2></div>
          <p>A clear starting point for players, teams and clubs. Product availability is shown only when real inventory has been published.</p>
        </div>
        <div class="category-grid">
          ${categoryCard('⚽', 'Football kits', 'Match kits, training wear and club orders.')}
          ${categoryCard('🏏', 'Cricket jerseys', 'Team colors shaped for cricket squads.')}
          ${categoryCard('◆', 'Clubs & communities', 'Unified teamwear for groups and events.')}
        </div>
      </div>
    </section>

    <section class="section white">
      <div class="container">
        <div class="section-head">
          <div><span class="kicker">Official catalog</span><h2>Published products</h2></div>
          <a class="text-link" href="/shop" data-link>View catalog <span>→</span></a>
        </div>
        <div class="product-grid" id="featured-products"><div class="loading">Checking the catalog…</div></div>
      </div>
    </section>

    <section class="section">
      <div class="container custom-band">
        <div class="custom-copy"><span class="eyebrow">Make it yours</span><h2>Build from your team’s identity.</h2><p>Share the sport, colors, quantity and design direction. Your request is saved securely for a real follow-up—no fake configurator result.</p><a class="button" href="/custom-jersey" data-link>Send a design brief <span>→</span></a></div>
        <div class="design-panel" aria-label="Custom jersey preview illustration"><div class="jersey-shape"></div><div class="color-dots" aria-hidden="true"><i></i><i></i><i></i></div></div>
      </div>
    </section>

    <section class="section white">
      <div class="container">
        <div class="section-head"><div><span class="kicker">A clear process</span><h2>From idea to confirmed order.</h2></div><p>Each step is designed to capture real requirements before production or payment commitments are made.</p></div>
        <div class="process-grid">
          ${processCard('Share your brief', 'Tell us the sport, quantity, colors and design direction.')}
          ${processCard('Review the scope', 'Your requirements can be checked before a quote is prepared.')}
          ${processCard('Confirm the design', 'Production should begin only after the final artwork is approved.')}
          ${processCard('Arrange fulfillment', 'Payment and delivery details can be confirmed for the actual order.')}
        </div>
      </div>
    </section>`;
}

function categoryCard(icon, title, text) {
  return `<a class="category-card" href="/custom-jersey" data-link><span class="arrow">↗</span><div class="category-icon">${icon}</div><h3>${title}</h3><p>${text}</p></a>`;
}

function processCard(title, text) { return `<article class="process-card"><h3>${title}</h3><p>${text}</p></article>`; }

function pageHero(title, copy, label = 'My Jersey') {
  return `<section class="page-hero"><div class="container content-header"><div class="breadcrumbs">${escapeHtml(label)} / ${escapeHtml(title)}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p></div></section>`;
}

function shopPage() {
  return `${pageHero('Shop', 'Only products published by the store appear here. The catalog starts empty—there are no sample products, invented prices or false stock levels.')}
    <section class="section"><div class="container">
      <div class="shop-tools"><input class="search-input" id="product-search" type="search" placeholder="Search published products" aria-label="Search products" /><select class="filter-select" id="category-filter" aria-label="Filter by category"><option value="">All categories</option></select></div>
      <div class="product-grid" id="shop-products"><div class="loading">Checking the catalog…</div></div>
    </div></section>`;
}

function customPage() {
  return `${pageHero('Custom Jersey', 'Send a structured design brief. This form creates a real request in the backend for review and follow-up.')}
    <section class="section"><div class="container form-layout">
      ${formAside('A useful first brief', [
        ['Choose the sport', 'This helps frame the jersey format and use.'],
        ['Set the quantity', 'Add the honest quantity you are considering.'],
        ['Describe the look', 'Share colors, names, numbers and visual direction.'],
      ])}
      <form class="form-card" id="custom-form" novalidate>
        <h2>Design request</h2><p>Required fields are marked. You can add a public reference link if you have one.</p>
        <div class="form-grid">
          ${field('customer_name', 'Your name', 'text', true)}
          ${field('email', 'Email address', 'email', true)}
          ${field('phone', 'Phone number', 'tel')}
          ${selectField('sport', 'Sport', ['Football', 'Cricket', 'Esports', 'Other'], true)}
          ${field('quantity', 'Estimated quantity', 'number', true, 'min="1" max="10000"')}
          ${field('preferred_colors', 'Preferred colors', 'text')}
          ${field('reference_url', 'Reference link', 'url', false, 'placeholder="https://"')}
          ${textareaField('details', 'Design details', true, 'Describe the style, team identity, names, numbers and any specific requirements.')}
        </div>${formFooter('Send design request')}
      </form>
    </div></section>`;
}

function teamPage() {
  return `${pageHero('Team Order', 'Capture the real requirements for a club, school, company, tournament or community order before pricing and delivery are confirmed.')}
    <section class="section"><div class="container form-layout">
      ${formAside('Plan the order', [
        ['Name the group', 'Tell us which team or organization the request is for.'],
        ['Estimate quantity', 'Include the current number of kits required.'],
        ['Share timing', 'Add a target date only if you have one.'],
      ])}
      <form class="form-card" id="team-form" novalidate>
        <h2>Team order request</h2><p>This is a request for follow-up, not an automatic price or delivery promise.</p>
        <div class="form-grid">
          ${field('contact_name', 'Contact name', 'text', true)}
          ${field('organization', 'Team or organization', 'text', true)}
          ${field('email', 'Email address', 'email', true)}
          ${field('phone', 'Phone number', 'tel')}
          ${field('quantity', 'Estimated quantity', 'number', true, 'min="1" max="10000"')}
          ${field('target_date', 'Target date', 'date')}
          ${textareaField('details', 'Order details', true, 'Describe the sport, items, sizes, customization and anything else that matters.')}
        </div>${formFooter('Send team order request')}
      </form>
    </div></section>`;
}

function contactPage() {
  return `${pageHero('Contact', 'Send a direct message to the My Jersey team. No unverified address, phone number or response-time promise is shown.')}
    <section class="section"><div class="container form-layout">
      ${formAside('What to include', [
        ['Your goal', 'Tell us what you are trying to make or order.'],
        ['Useful context', 'Add quantities, timing or product details if relevant.'],
        ['Reply details', 'Use an email address where you can be reached.'],
      ])}
      <form class="form-card" id="contact-form" novalidate>
        <h2>Send a message</h2><p>Your message is stored by the website backend for follow-up.</p>
        <div class="form-grid">
          ${field('name', 'Your name', 'text', true)}
          ${field('email', 'Email address', 'email', true)}
          ${field('subject', 'Subject', 'text', true, '', true)}
          ${textareaField('message', 'Message', true, 'Write your message here.')}
        </div>${formFooter('Send message')}
      </form>
    </div></section>`;
}

function formAside(title, rows) {
  return `<aside class="form-aside"><h2>${title}</h2><p>Clear information helps the team review a request without making assumptions.</p><div class="aside-list">${rows.map(([heading, text], i) => `<div><b>${i + 1}</b><span><strong>${heading}</strong>${text}</span></div>`).join('')}</div></aside>`;
}

function field(name, label, type, required = false, attrs = '', full = false) {
  return `<div class="field${full ? ' full' : ''}"><label for="${name}">${label}${required ? ' *' : ' <span>(optional)</span>'}</label><input id="${name}" name="${name}" type="${type}" ${required ? 'required' : ''} ${attrs}/><span class="field-error" data-error="${name}"></span></div>`;
}

function selectField(name, label, options, required = false) {
  return `<div class="field"><label for="${name}">${label}${required ? ' *' : ''}</label><select id="${name}" name="${name}" ${required ? 'required' : ''}><option value="">Choose one</option>${options.map((item) => `<option value="${item}">${item}</option>`).join('')}</select><span class="field-error" data-error="${name}"></span></div>`;
}

function textareaField(name, label, required, placeholder) {
  return `<div class="field full"><label for="${name}">${label}${required ? ' *' : ''}</label><textarea id="${name}" name="${name}" ${required ? 'required' : ''} placeholder="${placeholder}"></textarea><span class="field-error" data-error="${name}"></span></div>`;
}

function formFooter(label) {
  return `<div class="form-actions"><span class="form-note">Submitting does not create a payment or production commitment.</span><button class="button" type="submit">${label} <span>→</span></button></div><div class="form-result" aria-live="polite"></div>`;
}

function aboutPage() {
  return `${pageHero('About My Jersey', 'A focused foundation for a custom sportswear business—built around honest catalog data and real customer requests.')}
    <section class="section white"><div class="container story-grid">
      <div class="story-visual" role="img" aria-label="Illuminated sports stadium"></div>
      <div class="story-copy"><span class="kicker">The foundation</span><h2>A brand platform ready for real operations.</h2><p>My Jersey is structured to serve individual players, teams and organizations without filling the experience with invented inventory or social proof.</p><p>The storefront reads published product data from the backend. Custom requests, team orders and contact messages are validated and stored for genuine follow-up.</p><div class="principles"><div class="principle"><strong>Real catalog only</strong><span>Products appear only after an administrator publishes them.</span></div><div class="principle"><strong>Clear commitments</strong><span>Enquiries are not presented as confirmed prices, payments or delivery dates.</span></div><div class="principle"><strong>Expandable architecture</strong><span>The API, database and frontend are separated so the platform can grow.</span></div></div></div>
    </div></section>`;
}

function adminPage() {
  return `${pageHero('Admin', 'Manage real products and review incoming requests. Admin access is disabled until the server has a secure API key.')}
    <section class="section"><div class="container admin-shell">
      <form class="form-card admin-login" id="admin-login"><h2>Connect to admin</h2><p>Enter the ADMIN_API_KEY configured on the server. It stays in this browser tab only.</p><div class="field"><label for="admin-key">Admin API key</label><input id="admin-key" name="admin_key" type="password" autocomplete="off" required /></div><div class="form-actions"><span class="admin-status" id="admin-status">Not connected</span><button class="button" type="submit">Connect</button></div><div class="form-result" aria-live="polite"></div></form>
      <div id="admin-content" hidden>
        <div class="admin-toolbar"><div><span class="kicker">Catalog control</span><h2>Products and requests</h2></div><button class="button secondary small" id="admin-disconnect">Disconnect</button></div>
        <div class="admin-grid">
          <form class="form-card" id="product-form"><h2>Add a real product</h2><p>Products remain hidden until “Published” is selected.</p><div class="form-grid">
            ${field('product_name', 'Product name', 'text', true, '', true)}
            ${field('product_slug', 'URL slug', 'text', true, 'pattern="[a-z0-9]+(?:-[a-z0-9]+)*"', true)}
            ${field('product_category', 'Category', 'text', true)}
            ${field('product_price', 'Price in BDT', 'number', false, 'min="0" step="1"')}
            ${field('product_image', 'Public image URL', 'url', false, 'placeholder="https://"', true)}
            ${textareaField('product_description', 'Description', false, 'Use verified product details only.')}
            ${selectField('product_stock', 'Stock status', ['made_to_order', 'in_stock', 'out_of_stock'], true)}
            <div class="field"><label for="product_active">Visibility</label><select id="product_active" name="product_active"><option value="false">Draft</option><option value="true">Published</option></select><span class="field-error"></span></div>
          </div><div class="form-actions"><span class="form-note">No data is pre-filled.</span><button class="button" type="submit">Add product</button></div><div class="form-result" aria-live="polite"></div></form>
          <div><div class="form-card"><h2>Catalog</h2><p>All draft and published products.</p><div class="admin-list" id="admin-products"></div></div><div class="form-card submissions"><h2>Incoming requests</h2><p>Stored submissions from the public forms.</p><div id="admin-submissions"></div></div></div>
        </div>
      </div>
    </div></section>`;
}

function notFoundPage() {
  return `${pageHero('Page not found', 'The page you requested does not exist.')}
    <section class="section"><div class="container empty-state"><div class="empty-icon">↩</div><h3>Let’s get you back on the field.</h3><p>Use the main navigation or return to the My Jersey homepage.</p><a class="button" href="/" data-link>Return home</a></div></section>`;
}

async function bindShop(selector, filters = {}) {
  const container = document.querySelector(selector);
  if (!container) return;
  try {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const { products } = await api(`/api/products${params.size ? `?${params}` : ''}`);
    renderProducts(container, products, selector === '#featured-products' ? 4 : undefined);
    if (selector === '#shop-products') fillCategories(products);
  } catch (error) {
    container.innerHTML = emptyState('Catalog unavailable', 'The product service could not be reached. Please try again later.', '/contact', 'Contact us');
  }
}

function renderProducts(container, products, limit) {
  const shown = limit ? products.slice(0, limit) : products;
  if (!shown.length) {
    container.innerHTML = emptyState('The catalog is ready for real inventory', 'No products have been published yet. You can still send a custom jersey request with your actual requirements.', '/custom-jersey', 'Start a custom request');
    return;
  }
  container.innerHTML = shown.map(productCard).join('');
}

function productCard(product) {
  const price = Number.isInteger(product.base_price) ? new Intl.NumberFormat('en-BD', { style: 'currency', currency: product.currency, maximumFractionDigits: 0 }).format(product.base_price / 100) : 'Price on request';
  const image = product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy" />` : '<span aria-hidden="true" style="font-size:3rem">◇</span>';
  return `<article class="product-card"><div class="product-image">${image}</div><div class="product-body"><span class="tag">${escapeHtml(product.category)}</span><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description || 'Details will be confirmed with the store.')}</p><div class="product-meta"><span>${price}</span><span>${stockLabel(product.stock_status)}</span></div></div></article>`;
}

function stockLabel(status) { return ({ made_to_order: 'Made to order', in_stock: 'In stock', out_of_stock: 'Out of stock' })[status] ?? status; }

function emptyState(title, copy, href, label) {
  return `<div class="empty-state"><div class="empty-icon">◇</div><h3>${title}</h3><p>${copy}</p><a class="button" href="${href}" data-link>${label} <span>→</span></a></div>`;
}

function fillCategories(products) {
  const select = document.querySelector('#category-filter');
  if (!select) return;
  [...new Set(products.map((product) => product.category))].sort().forEach((category) => {
    const option = document.createElement('option'); option.value = category; option.textContent = category; select.append(option);
  });
}

function bindShopFilters() {
  const search = document.querySelector('#product-search');
  const category = document.querySelector('#category-filter');
  let timer;
  const refresh = () => bindShop('#shop-products', { search: search.value.trim(), category: category.value });
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(refresh, 250); });
  category.addEventListener('change', refresh);
}

function bindForm(selector, endpoint) {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(form);
    const button = form.querySelector('button[type="submit"]');
    const result = form.querySelector('.form-result');
    button.disabled = true;
    button.textContent = 'Sending…';
    const payload = Object.fromEntries(new FormData(form));
    if ('quantity' in payload) payload.quantity = Number(payload.quantity);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      form.reset();
      result.innerHTML = '<div class="form-status">Your request was received and stored successfully.</div>';
      showToast('Request received successfully.');
    } catch (error) {
      showFormErrors(form, error.fields);
      result.innerHTML = `<div class="form-status error">${escapeHtml(error.message)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = button.dataset.label || ({ '#custom-form': 'Send design request →', '#team-form': 'Send team order request →', '#contact-form': 'Send message →' })[selector];
    }
  });
}

function clearFormErrors(form) { form.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; }); }
function showFormErrors(form, fields = {}) { Object.entries(fields).forEach(([name, message]) => { const target = form.querySelector(`[data-error="${CSS.escape(name)}"]`); if (target) target.textContent = message; }); }

function bindAdmin() {
  const login = document.querySelector('#admin-login');
  const content = document.querySelector('#admin-content');
  let adminKey = sessionStorage.getItem('my-jersey-admin-key') ?? '';

  const connect = async () => {
    const status = document.querySelector('#admin-status');
    const result = login.querySelector('.form-result');
    try {
      await adminRequest('/api/admin/products');
      status.textContent = 'Connected'; status.classList.add('online');
      content.hidden = false; result.innerHTML = '';
      await refreshAdmin();
    } catch (error) {
      status.textContent = 'Not connected'; status.classList.remove('online'); content.hidden = true;
      result.innerHTML = `<div class="form-status error">${escapeHtml(error.message)}</div>`;
    }
  };

  const adminRequest = (path, options = {}) => api(path, { ...options, headers: { ...(options.headers ?? {}), 'X-Admin-Key': adminKey } });

  login.addEventListener('submit', async (event) => {
    event.preventDefault();
    adminKey = login.elements.admin_key.value;
    sessionStorage.setItem('my-jersey-admin-key', adminKey);
    await connect();
  });

  document.querySelector('#admin-disconnect').addEventListener('click', () => {
    sessionStorage.removeItem('my-jersey-admin-key'); adminKey = ''; content.hidden = true; login.reset();
    document.querySelector('#admin-status').textContent = 'Not connected'; document.querySelector('#admin-status').classList.remove('online');
  });

  document.querySelector('#product-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      name: form.elements.product_name.value.trim(), slug: form.elements.product_slug.value.trim(),
      category: form.elements.product_category.value.trim(), description: form.elements.product_description.value.trim(),
      base_price: form.elements.product_price.value ? Math.round(Number(form.elements.product_price.value) * 100) : null,
      currency: 'BDT', image_url: form.elements.product_image.value.trim() || null,
      stock_status: form.elements.product_stock.value, active: form.elements.product_active.value === 'true',
    };
    try {
      await adminRequest('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
      form.reset(); form.querySelector('.form-result').innerHTML = '<div class="form-status">Product added.</div>';
      showToast('Product added.'); await refreshAdmin();
    } catch (error) { form.querySelector('.form-result').innerHTML = `<div class="form-status error">${escapeHtml(error.message)}</div>`; }
  });

  document.querySelector('#admin-products').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    try {
      if (button.dataset.action === 'delete') {
        if (!confirm('Delete this product permanently?')) return;
        await adminRequest(`/api/admin/products/${button.dataset.id}`, { method: 'DELETE' });
      } else {
        await adminRequest(`/api/admin/products/${button.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ active: button.dataset.action === 'publish' }) });
      }
      await refreshAdmin();
    } catch (error) { showToast(error.message); }
  });

  async function refreshAdmin() {
    const [{ products }, submissions] = await Promise.all([adminRequest('/api/admin/products'), adminRequest('/api/admin/submissions')]);
    document.querySelector('#admin-products').innerHTML = products.length ? products.map((product) => `<article class="admin-row"><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.category)} · ${product.active ? 'Published' : 'Draft'}</p></div><div class="admin-actions"><button class="button secondary small" data-action="${product.active ? 'unpublish' : 'publish'}" data-id="${product.id}">${product.active ? 'Hide' : 'Publish'}</button><button class="button danger small" data-action="delete" data-id="${product.id}">Delete</button></div></article>`).join('') : '<p>No products have been added.</p>';
    document.querySelector('#admin-submissions').innerHTML = [
      submissionGroup('Custom requests', submissions.custom_requests, (item) => `${item.customer_name} · ${item.sport} · Qty ${item.quantity}`),
      submissionGroup('Team orders', submissions.team_orders, (item) => `${item.organization} · Qty ${item.quantity}`),
      submissionGroup('Messages', submissions.contact_messages, (item) => `${item.name} · ${item.subject}`),
    ].join('');
  }

  if (adminKey) { login.elements.admin_key.value = adminKey; connect(); }
}

function submissionGroup(title, items, summary) {
  return `<section class="submission-group"><h3>${title} <span class="count">${items.length}</span></h3>${items.length ? items.slice(0, 20).map((item) => `<article class="submission-card"><p><strong>${escapeHtml(summary(item))}</strong></p><p>${escapeHtml(item.email)}</p><time>${new Date(item.created_at).toLocaleString()}</time></article>`).join('') : '<p>No submissions yet.</p>'}</section>`;
}

function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

renderRoute();
