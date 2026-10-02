document.body.innerHTML = `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header" id="site-header">
    <div class="container nav-shell">
      <a href="/" class="brand" data-link aria-label="My Jersey home"><span class="brand-mark" aria-hidden="true"><i></i></span><span>My Jersey</span></a>
      <button class="menu-button" id="menu-button" aria-expanded="false" aria-controls="primary-nav" aria-label="Open menu"><span></span><span></span><span></span></button>
      <nav class="primary-nav" id="primary-nav" aria-label="Primary navigation">
        <a href="/shop" data-link>Shop</a><a href="/shop" data-link>Categories</a><a href="/custom-jersey" data-link>Custom Jerseys</a><a href="/team-order" data-link>Team Orders</a><a href="/about" data-link>About</a><a href="/contact" data-link>Contact</a>
      </nav>
      <form class="header-search" id="header-search" role="search">${icon('search')}<input name="q" type="search" placeholder="Search jerseys…" aria-label="Search published products" /></form>
      <a class="header-icon" href="/admin" data-link aria-label="Admin dashboard">${icon('user')}</a>
      <a class="header-icon cart-link" href="/cart" data-link aria-label="Shopping cart">${icon('cart')}<span id="cart-count">0</span></a>
    </div>
  </header>
  <main id="main" tabindex="-1"></main>
  <footer class="footer">
    <div class="container footer-grid">
      <div class="footer-brand"><a href="/" class="brand brand-light" data-link><span class="brand-mark" aria-hidden="true"><i></i></span><span>My Jersey</span></a><p>Custom sportswear shaped around your team, colors and identity.</p></div>
      <div><h2>Shop</h2><a href="/shop" data-link>All jerseys</a><a href="/custom-jersey" data-link>Custom jerseys</a><a href="/team-order" data-link>Team orders</a></div>
      <div><h2>Help</h2><a href="/contact" data-link>Contact</a><a href="/about" data-link>How it works</a><a href="/cart" data-link>Your cart</a></div>
      <div><h2>Company</h2><a href="/about" data-link>About us</a><a href="/contact" data-link>Contact us</a><a href="/admin" data-link>Admin</a></div>
      <div class="footer-action"><h2>Start your jersey</h2><p>Share your real requirements and the team can follow up.</p><a class="button" href="/custom-jersey" data-link>Send a brief <span>→</span></a></div>
    </div>
    <div class="container footer-bottom"><span>© <span id="year"></span> My Jersey.</span><span>Real inventory only. No fabricated reviews or order data.</span></div>
  </footer>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

const main = document.querySelector('#main');
const nav = document.querySelector('#primary-nav');
const menuButton = document.querySelector('#menu-button');
const toast = document.querySelector('#toast');
const cartKey = 'my-jersey-cart-v1';
let catalogCache = [];
document.querySelector('#year').textContent = new Date().getFullYear();

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);

const routes = {
  '/': homePage,
  '/shop': shopPage,
  '/cart': cartPage,
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
  navigate(link.pathname + link.search);
});

document.querySelector('#header-search').addEventListener('submit', (event) => {
  event.preventDefault();
  const query = new FormData(event.currentTarget).get('q')?.trim();
  navigate(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop');
});

window.addEventListener('popstate', renderRoute);
menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
});

function icon(name) {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    cart: '<path d="M3 4h2l2 12h10l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
    shirt: '<path d="m8 4 4 2 4-2 5 3-3 5-2-1v10H8V11l-2 1-3-5 5-3Z"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="m9 9 3-2 3 2-1 4h-4L9 9Zm-5 1 5-1m6 0 5 1M10 13l-3 5m7-5 3 5"/>',
    cricket: '<path d="M7 20 16 3l3 2-9 17-3-2Zm-3-1 6 3M6 5h4m-2-2v4"/>',
    shield: '<path d="M12 3 20 6v6c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
    edit: '<path d="m4 20 4-1 11-11-3-3L5 16l-1 4Zm10-13 3 3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/>',
    inbox: '<path d="M4 4h16v16H4zM4 14h5l2 3h2l2-3h5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="m3 3 18 18M10 5.3c.7-.2 1.3-.3 2-.3 6 0 10 7 10 7a19 19 0 0 1-3 3.9M6.6 6.6C3.8 8.6 2 12 2 12s4 7 10 7c1.4 0 2.7-.4 3.8-1"/>',
    message: '<path d="M4 5h16v12H8l-4 4V5Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    home: '<path d="m3 11 9-8 9 8v10h-6v-6H9v6H3V11Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
  };
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.shirt}</svg>`;
}

function navigate(target) {
  history.pushState({}, '', target);
  renderRoute();
}

async function renderRoute() {
  closeMenu();
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (path !== '/admin') {
    document.querySelector('.site-header').classList.remove('admin-hidden');
    document.querySelector('.footer').classList.remove('admin-hidden');
  }
  const render = routes[path] || notFoundPage;
  main.innerHTML = '<div class="loading"><span></span>Loading…</div>';
  main.innerHTML = await render();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  updateNav(path);
  updateCartCount();
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
  if (path === '/') bindHome();
  if (path === '/shop') bindShopPage();
  if (path === '/cart') bindCart();
  if (path === '/custom-jersey') bindForm('#custom-form', '/api/custom-requests');
  if (path === '/team-order') bindForm('#team-form', '/api/team-orders');
  if (path === '/contact') bindForm('#contact-form', '/api/contact');
  if (path === '/admin') bindAdmin();
}

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  let payload = {};
  try { payload = await response.json(); } catch { /* Non-JSON response. */ }
  if (!response.ok) {
    const error = new Error(payload.error || 'The request could not be completed.');
    error.fields = payload.fields || {};
    error.status = response.status;
    throw error;
  }
  return payload;
}

function homePage() {
  return `
    <section class="hero home-hero">
      <div class="container hero-content">
        <span class="eyebrow">Wear · Customize · Support · Belong</span>
        <h1>Jerseys<br>that <em>belong</em></h1>
        <p>Your team. Your style. Start with a published jersey or share a custom brief built around your real requirements.</p>
        <div class="hero-actions"><a class="button" href="/shop" data-link>Shop jerseys <span>→</span></a><a class="button outline" href="/custom-jersey" data-link>${icon('shirt')} Customize now</a></div>
        <div class="trust-row">
          <div>${icon('shirt')}<span><strong>Real catalog</strong>Published products only</span></div>
          <div>${icon('edit')}<span><strong>Custom briefs</strong>Names, colors and identity</span></div>
          <div>${icon('inbox')}<span><strong>Team requests</strong>Requirements stored securely</span></div>
        </div>
      </div>
    </section>
    ${catalogSection('Custom Jersey', 'Design it. Wear it. Make it yours.', 'custom', 'shirt')}
    ${catalogSection('Football Jersey', 'Published football jerseys from the live catalog.', 'football', 'ball', true)}
    ${catalogSection('Cricket Jersey', 'Published cricket jerseys from the live catalog.', 'cricket', 'cricket')}
    <section class="request-band"><div class="container"><div><span class="eyebrow">Built for teams</span><h2>Need a jersey that is not in the catalog?</h2><p>Send the real sport, quantity, colors and design direction. A request is not shown as a confirmed order or price.</p></div><a class="button" href="/team-order" data-link>Start a team request <span>→</span></a></div></section>`;
}

function catalogSection(title, copy, group, iconName, dark = false) {
  return `<section class="catalog-section ${dark ? 'catalog-dark' : ''}" data-catalog-group="${group}"><div class="container"><div class="section-title"><div class="title-icon">${icon(iconName)}</div><div><h2>${title}</h2><p>${copy}</p></div><a href="/shop" data-link>View all <span>→</span></a></div><div class="product-grid" data-product-grid><div class="loading"><span></span>Checking live catalog…</div></div></div></section>`;
}

async function bindHome() {
  try {
    const { products } = await api('/api/products');
    catalogCache = products;
    document.querySelectorAll('[data-catalog-group]').forEach((section) => {
      const group = section.dataset.catalogGroup;
      const matches = products.filter((product) => categoryGroup(product.category) === group);
      renderProducts(section.querySelector('[data-product-grid]'), matches, 6, group);
    });
  } catch {
    document.querySelectorAll('[data-product-grid]').forEach((grid) => { grid.innerHTML = compactEmpty('Catalog unavailable', 'The product service could not be reached.'); });
  }
  bindProductActions();
}

function categoryGroup(category = '') {
  const value = category.toLowerCase();
  if (value.includes('football') || value.includes('soccer')) return 'football';
  if (value.includes('cricket')) return 'cricket';
  if (value.includes('custom')) return 'custom';
  return 'other';
}

function shopPage() {
  const query = new URLSearchParams(location.search).get('q') || '';
  return `${pageHero('Shop jerseys', 'Only products published by the store appear here. Prices and stock labels come directly from the live catalog.')}
    <section class="shop-section"><div class="container"><div class="shop-tools"><label class="shop-search">${icon('search')}<input id="product-search" type="search" value="${escapeHtml(query)}" placeholder="Search published products" aria-label="Search products"></label><select id="category-filter" aria-label="Filter by category"><option value="">All categories</option></select></div><div class="product-grid" id="shop-products"><div class="loading"><span></span>Checking live catalog…</div></div></div></section>`;
}

async function bindShopPage() {
  const search = document.querySelector('#product-search');
  const category = document.querySelector('#category-filter');
  try {
    const { products } = await api('/api/products');
    catalogCache = products;
    [...new Set(products.map((product) => product.category))].sort().forEach((name) => category.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`));
    const refresh = () => {
      const term = search.value.trim().toLowerCase();
      const shown = products.filter((product) => (!term || `${product.name} ${product.category} ${product.description || ''}`.toLowerCase().includes(term)) && (!category.value || product.category === category.value));
      renderProducts(document.querySelector('#shop-products'), shown, undefined, 'shop');
      bindProductActions();
    };
    search.addEventListener('input', refresh);
    category.addEventListener('change', refresh);
    refresh();
  } catch {
    document.querySelector('#shop-products').innerHTML = compactEmpty('Catalog unavailable', 'Please try again later or send a custom request.');
  }
}

function renderProducts(container, products, limit, group) {
  const shown = limit ? products.slice(0, limit) : products;
  if (!shown.length) {
    const label = group === 'shop' ? 'No published products match this view.' : `No published ${group} jerseys yet.`;
    container.innerHTML = compactEmpty('Nothing published here yet', `${label} The store will show items here only after real product details are published.`);
    return;
  }
  container.innerHTML = shown.map(productCard).join('');
  bindImageFallbacks(container);
}

function productCard(product) {
  const available = product.stock_status !== 'out_of_stock';
  return `<article class="product-card">
    <div class="product-image">${product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">` : jerseyPlaceholder()}<span class="stock-pill ${product.stock_status}">${escapeHtml(stockLabel(product.stock_status))}</span></div>
    <div class="product-body"><span class="product-category">${escapeHtml(product.category)}</span><h3>${escapeHtml(product.name)}</h3>${product.description ? `<p>${escapeHtml(product.description)}</p>` : ''}<div class="product-bottom"><strong>${formatPrice(product)}</strong><button class="button product-add" type="button" data-add-cart="${product.id}" ${available ? '' : 'disabled'}>${available ? `${icon('cart')} Add to cart` : 'Unavailable'}</button></div></div>
  </article>`;
}

function jerseyPlaceholder() {
  return `<div class="jersey-placeholder" aria-hidden="true"><span></span></div>`;
}

function bindImageFallbacks(scope = document) {
  scope.querySelectorAll('.product-image img').forEach((image) => image.addEventListener('error', () => { image.replaceWith(fragmentFrom(jerseyPlaceholder())); }, { once: true }));
}

function fragmentFrom(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function bindProductActions() {
  document.querySelectorAll('[data-add-cart]').forEach((button) => button.addEventListener('click', () => addToCart(button.dataset.addCart)));
}

function getCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    return Array.isArray(cart) ? cart.filter((item) => item && typeof item.id === 'string' && Number.isInteger(item.quantity) && item.quantity > 0) : [];
  } catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(id) {
  const product = catalogCache.find((item) => item.id === id);
  if (!product || product.stock_status === 'out_of_stock') return;
  const cart = getCart();
  const existing = cart.find((item) => item.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ id, quantity: 1 });
  saveCart(cart);
  showToast(`${product.name} added to your cart.`);
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#cart-count').hidden = count === 0;
}

function cartPage() {
  return `<section class="cart-hero"><div class="container"><div class="breadcrumbs"><a href="/" data-link>Home</a> / Cart</div><h1>Your <em>Cart</em></h1><p>Review the published products you selected.</p><div class="cart-trust"><span>${icon('shirt')} Real catalog items</span><span>${icon('shield')} No payment collected</span><span>${icon('message')} Confirm details with the team</span></div></div></section>
    <section class="cart-section"><div class="container cart-layout"><div class="cart-main"><div class="panel-heading"><span class="panel-icon">${icon('cart')}</span><div><h2>Cart items <span id="cart-heading-count"></span></h2><p>Change quantity or remove an item.</p></div></div><div id="cart-items"><div class="loading"><span></span>Loading your cart…</div></div></div><aside class="cart-side"><div class="summary-card"><div class="panel-heading"><span class="panel-icon">${icon('inbox')}</span><div><h2>Order summary</h2><p>Published item prices only</p></div></div><div id="cart-summary"></div></div><div class="notice-card"><h3>${icon('shield')} Checkout status</h3><p>Online checkout and payment are not enabled yet. No order will be created and no payment will be collected from this cart.</p><a class="button full" href="/contact" data-link>Contact My Jersey <span>→</span></a><a class="plain-link" href="/shop" data-link>← Continue shopping</a></div></aside></div></section>`;
}

async function bindCart() {
  try {
    const { products } = await api('/api/products');
    catalogCache = products;
    renderCart(products);
  } catch {
    document.querySelector('#cart-items').innerHTML = compactEmpty('Cart unavailable', 'The live product catalog could not be reached.');
    document.querySelector('#cart-summary').innerHTML = '<p class="muted">No totals available.</p>';
  }
}

function renderCart(products) {
  const cart = getCart();
  const availableIds = new Set(products.map((product) => product.id));
  const cleaned = cart.filter((item) => availableIds.has(item.id));
  if (cleaned.length !== cart.length) saveCart(cleaned);
  const items = cleaned.map((item) => ({ ...item, product: products.find((product) => product.id === item.id) }));
  const itemsRoot = document.querySelector('#cart-items');
  document.querySelector('#cart-heading-count').textContent = `(${items.reduce((sum, item) => sum + item.quantity, 0)})`;
  if (!items.length) {
    itemsRoot.innerHTML = `<div class="cart-empty">${icon('cart')}<h3>Your cart is empty</h3><p>Add a real published product to see it here.</p><a class="button" href="/shop" data-link>Browse jerseys <span>→</span></a></div>`;
    document.querySelector('#cart-summary').innerHTML = '<div class="summary-line"><span>Subtotal</span><strong>BDT 0</strong></div>';
    return;
  }
  itemsRoot.innerHTML = items.map(({ product, quantity }) => `<article class="cart-item" data-cart-row="${product.id}"><div class="cart-thumb">${product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">` : jerseyPlaceholder()}</div><div class="cart-item-copy"><span class="stock-pill ${product.stock_status}">${escapeHtml(stockLabel(product.stock_status))}</span><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.category)}</p><strong>${formatPrice(product)}</strong></div><div class="quantity-control"><button type="button" data-qty="down" aria-label="Reduce quantity">${icon('minus')}</button><span>${quantity}</span><button type="button" data-qty="up" aria-label="Increase quantity">${icon('plus')}</button></div><button class="remove-button" type="button" data-remove-cart aria-label="Remove ${escapeHtml(product.name)}">${icon('trash')}</button></article>`).join('');
  bindImageFallbacks(itemsRoot);
  itemsRoot.querySelectorAll('[data-cart-row]').forEach((row) => {
    row.querySelector('[data-qty="down"]').addEventListener('click', () => changeCartQuantity(row.dataset.cartRow, -1));
    row.querySelector('[data-qty="up"]').addEventListener('click', () => changeCartQuantity(row.dataset.cartRow, 1));
    row.querySelector('[data-remove-cart]').addEventListener('click', () => removeFromCart(row.dataset.cartRow));
  });
  const priced = items.filter(({ product }) => Number.isInteger(product.base_price));
  const subtotal = priced.reduce((sum, { product, quantity }) => sum + product.base_price * quantity, 0);
  const allPriced = priced.length === items.length;
  document.querySelector('#cart-summary').innerHTML = `<div class="summary-line"><span>Items</span><strong>${items.reduce((sum, item) => sum + item.quantity, 0)}</strong></div><div class="summary-line total"><span>Subtotal</span><strong>${allPriced ? formatMinorPrice(subtotal, items[0]?.product.currency || 'BDT') : 'Contact for price'}</strong></div>${allPriced ? '' : '<p class="summary-note">At least one item has no published price, so a complete total cannot be calculated.</p>'}<p class="summary-note">Delivery, discounts and payment are not calculated because they are not configured.</p>`;
}

function changeCartQuantity(id, amount) {
  const cart = getCart();
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity += amount;
  saveCart(cart.filter((entry) => entry.quantity > 0));
  renderCart(catalogCache);
}

function removeFromCart(id) {
  saveCart(getCart().filter((item) => item.id !== id));
  renderCart(catalogCache);
  showToast('Item removed from your cart.');
}

function formatPrice(product) {
  return Number.isInteger(product.base_price) ? formatMinorPrice(product.base_price, product.currency || 'BDT') : 'Price on request';
}

function formatMinorPrice(value, currency) {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value / 100);
}

function stockLabel(status) {
  return ({ made_to_order: 'Made to order', in_stock: 'In stock', out_of_stock: 'Out of stock' })[status] || status;
}

function pageHero(title, copy) {
  return `<section class="page-hero"><div class="container"><div class="breadcrumbs"><a href="/" data-link>Home</a> / ${escapeHtml(title)}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p></div></section>`;
}

function customPage() {
  return `${pageHero('Custom Jersey', 'Send a structured design brief. This creates a real request for review and follow-up.')}${requestForm('custom')}`;
}

function teamPage() {
  return `${pageHero('Team Order', 'Capture the real requirements for a club, school, company, tournament or community order.')}${requestForm('team')}`;
}

function contactPage() {
  return `${pageHero('Contact Us', 'Send a direct message to the My Jersey team. No unverified phone number or response-time promise is shown.')}${requestForm('contact')}`;
}

function requestForm(type) {
  const configs = {
    custom: { id: 'custom-form', title: 'Custom design request', copy: 'Tell us what you genuinely need. Required fields are marked.', button: 'Send design request', fields: `${field('customer_name', 'Your name', 'text', true)}${field('email', 'Email address', 'email', true)}${field('phone', 'Phone number', 'tel')}${selectField('sport', 'Sport', [['Football','Football'],['Cricket','Cricket'],['Esports','Esports'],['Other','Other']], true)}${field('quantity', 'Estimated quantity', 'number', true, 'min="1" max="10000"')}${field('preferred_colors', 'Preferred colors', 'text')}${field('reference_url', 'Public reference link', 'url', false, 'placeholder="https://"')}${textareaField('details', 'Design details', true, 'Describe the style, identity, names, numbers and specific requirements.')}` },
    team: { id: 'team-form', title: 'Team order request', copy: 'This is a request for follow-up, not an automatic order or quote.', button: 'Send team request', fields: `${field('contact_name', 'Contact name', 'text', true)}${field('organization', 'Team or organization', 'text', true)}${field('email', 'Email address', 'email', true)}${field('phone', 'Phone number', 'tel')}${field('quantity', 'Estimated quantity', 'number', true, 'min="1" max="10000"')}${field('target_date', 'Target date', 'date')}${textareaField('details', 'Order details', true, 'Describe the sport, items, sizes and customization.')}` },
    contact: { id: 'contact-form', title: 'Send a message', copy: 'Your message is stored by the website backend for follow-up.', button: 'Send message', fields: `${field('name', 'Your name', 'text', true)}${field('email', 'Email address', 'email', true)}${field('subject', 'Subject', 'text', true)}${textareaField('message', 'Message', true, 'Write your message here.')}` },
  };
  const config = configs[type];
  return `<section class="form-section"><div class="container form-layout"><aside class="form-aside"><span class="eyebrow">Clear by design</span><h2>Share only real details.</h2><p>The form records your information for follow-up. It does not create a payment, production commitment or guaranteed delivery date.</p><div class="aside-points"><span>${icon('check')} Backend validation</span><span>${icon('check')} Secure database storage</span><span>${icon('check')} Honest request status</span></div></aside><form class="form-card" id="${config.id}" novalidate><h2>${config.title}</h2><p>${config.copy}</p><div class="form-grid">${config.fields}</div><div class="form-actions"><span>No payment is collected.</span><button class="button" type="submit" data-label="${config.button}">${config.button} <b>→</b></button></div><div class="form-result" aria-live="polite"></div></form></div></section>`;
}

function aboutPage() {
  return `${pageHero('About My Jersey', 'A strong commerce foundation for custom sportswear—built around honest catalog data and real customer requests.')}<section class="about-section"><div class="container about-grid"><div class="about-art"></div><div><span class="kicker">The foundation</span><h2>A store ready for real operations.</h2><p>The storefront reads published product data from the backend. Custom requests, team orders and messages are validated and stored for genuine follow-up.</p><div class="principles"><article><strong>Real catalog only</strong><span>Products appear after an administrator publishes them.</span></article><article><strong>Clear commitments</strong><span>Requests are not presented as paid or confirmed orders.</span></article><article><strong>Expandable architecture</strong><span>The Worker API, Supabase data layer and storefront are separated cleanly.</span></article></div></div></div></section>`;
}

function adminPage() {
  return `<section class="admin-page"><div class="admin-login-wrap"><form class="form-card admin-login" id="admin-login"><div class="admin-login-logo"><span class="brand-mark"><i></i></span><div><strong>My Jersey</strong><span>Admin dashboard</span></div></div><h1>Secure admin access</h1><p>Enter the ADMIN_API_KEY configured in Cloudflare. It remains in this browser tab only.</p><div class="field"><label for="admin-key">Admin API key</label><input id="admin-key" name="admin_key" type="password" autocomplete="off" required></div><div class="form-actions"><span class="admin-status" id="admin-status">Not connected</span><button class="button" type="submit">Connect</button></div><div class="form-result" aria-live="polite"></div></form></div>
    <div class="dashboard" id="admin-content" hidden>
      <aside class="dashboard-side"><a class="brand" href="/" data-link><span class="brand-mark"><i></i></span><span>My Jersey<small>Admin Dashboard</small></span></a><nav><a href="#dashboard-top" class="active">${icon('home')} Dashboard</a><a href="#product-management">${icon('shirt')} Products</a><a href="#incoming-requests">${icon('inbox')} Requests</a><a href="/" data-link>${icon('eye')} View store</a></nav><div class="dashboard-side-note"><span class="crown-mark">♕</span><strong>More than a jersey</strong><p>Real products. Real requests. No placeholder business data.</p></div></aside>
      <div class="dashboard-main"><header class="dashboard-top" id="dashboard-top"><label>${icon('search')}<input id="admin-search" type="search" placeholder="Search real products…"></label><div><a class="button secondary small" href="/" data-link>View store ↗</a><button class="admin-avatar" id="admin-disconnect" type="button"><span>A</span><b>Admin<small>Disconnect</small></b></button></div></header>
      <main class="dashboard-content"><section class="dashboard-welcome"><div><h1>Welcome back.</h1><p>Manage published jerseys and incoming requests.</p></div></section><section class="metric-grid" id="admin-metrics"></section>
      <section class="dashboard-panel" id="product-management"><div class="dashboard-panel-head"><div><span class="panel-icon">${icon('shirt')}</span><div><h2>Product management</h2><p>Manage real products across all categories</p></div></div><button class="button" id="show-product-form" type="button">${icon('plus')} Add product</button></div><div class="category-tabs" id="admin-category-tabs"></div><div class="product-form-drawer" id="product-form-drawer" hidden>${adminProductForm()}</div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Actions</th></tr></thead><tbody id="admin-products"></tbody></table></div></section>
      <section class="dashboard-panel" id="incoming-requests"><div class="dashboard-panel-head"><div><span class="panel-icon">${icon('inbox')}</span><div><h2>Incoming requests</h2><p>Live submissions from public forms</p></div></div></div><div class="submission-columns" id="admin-submissions"></div></section></main></div></div></section>`;
}

function adminProductForm() {
  return `<form id="product-form" novalidate><div class="drawer-head"><div><h3 id="product-form-title">Add a real product</h3><p>Nothing is pre-filled with invented details.</p></div><button type="button" class="drawer-close" id="close-product-form">×</button></div><input type="hidden" name="product_id"><div class="form-grid">${field('product_name', 'Product name', 'text', true)}${field('product_slug', 'URL slug', 'text', true, 'pattern="[a-z0-9]+(?:-[a-z0-9]+)*"')}${field('product_category', 'Category', 'text', true)}${field('product_price', 'Price in BDT', 'number', false, 'min="0" step="1"')}${field('product_image', 'Public image URL', 'url', false, 'placeholder="https://"')}${selectField('product_stock', 'Stock status', [['made_to_order','Made to order'],['in_stock','In stock'],['out_of_stock','Out of stock']], true)}${selectField('product_active', 'Visibility', [['false','Draft'],['true','Published']], true)}${textareaField('product_description', 'Description', false, 'Use verified product details only.')}</div><div class="form-actions"><button class="button secondary" id="cancel-product-edit" type="button">Cancel</button><button class="button" type="submit" id="save-product">Save product</button></div><div class="form-result" aria-live="polite"></div></form>`;
}

function field(name, label, type, required = false, attrs = '') {
  return `<div class="field"><label for="${name}">${label}${required ? ' *' : ' <span>(optional)</span>'}</label><input id="${name}" name="${name}" type="${type}" ${required ? 'required' : ''} ${attrs}><span class="field-error" data-error="${name}"></span></div>`;
}

function selectField(name, label, options, required = false) {
  return `<div class="field"><label for="${name}">${label}${required ? ' *' : ''}</label><select id="${name}" name="${name}" ${required ? 'required' : ''}><option value="">Choose one</option>${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select><span class="field-error" data-error="${name}"></span></div>`;
}

function textareaField(name, label, required, placeholder) {
  return `<div class="field full"><label for="${name}">${label}${required ? ' *' : ' <span>(optional)</span>'}</label><textarea id="${name}" name="${name}" ${required ? 'required' : ''} placeholder="${placeholder}"></textarea><span class="field-error" data-error="${name}"></span></div>`;
}

function bindForm(selector, endpoint) {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(form);
    const button = form.querySelector('button[type="submit"]');
    const original = button.dataset.label;
    button.disabled = true;
    button.textContent = 'Sending…';
    const payload = Object.fromEntries(new FormData(form));
    if ('quantity' in payload) payload.quantity = Number(payload.quantity);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      form.reset();
      form.querySelector('.form-result').innerHTML = '<div class="form-status">Your request was received and stored successfully.</div>';
      showToast('Request received successfully.');
    } catch (error) {
      showFormErrors(form, error.fields);
      form.querySelector('.form-result').innerHTML = `<div class="form-status error">${escapeHtml(error.message)}</div>`;
    } finally {
      button.disabled = false;
      button.innerHTML = `${escapeHtml(original)} <b>→</b>`;
    }
  });
}

function clearFormErrors(form) { form.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; }); }
function showFormErrors(form, fields = {}) { Object.entries(fields).forEach(([name, message]) => { const target = form.querySelector(`[data-error="${CSS.escape(name)}"]`); if (target) target.textContent = message; }); }

function bindAdmin() {
  const loginWrap = document.querySelector('.admin-login-wrap');
  const login = document.querySelector('#admin-login');
  const content = document.querySelector('#admin-content');
  const drawer = document.querySelector('#product-form-drawer');
  const form = document.querySelector('#product-form');
  let adminKey = sessionStorage.getItem('my-jersey-admin-key') || '';
  let adminProducts = [];
  let activeCategory = 'all';

  const adminRequest = (path, options = {}) => api(path, { ...options, headers: { ...(options.headers || {}), 'X-Admin-Key': adminKey } });

  async function connect() {
    const status = document.querySelector('#admin-status');
    try {
      await adminRequest('/api/admin/products');
      status.textContent = 'Connected';
      status.classList.add('online');
      loginWrap.hidden = true;
      content.hidden = false;
      document.querySelector('.site-header').classList.add('admin-hidden');
      document.querySelector('.footer').classList.add('admin-hidden');
      await refreshAdmin();
    } catch (error) {
      status.textContent = 'Not connected';
      status.classList.remove('online');
      content.hidden = true;
      loginWrap.hidden = false;
      login.querySelector('.form-result').innerHTML = `<div class="form-status error">${escapeHtml(error.message)}</div>`;
    }
  }

  login.addEventListener('submit', async (event) => {
    event.preventDefault();
    adminKey = login.elements.admin_key.value;
    sessionStorage.setItem('my-jersey-admin-key', adminKey);
    await connect();
  });

  document.querySelector('#admin-disconnect').addEventListener('click', () => {
    sessionStorage.removeItem('my-jersey-admin-key');
    adminKey = '';
    content.hidden = true;
    loginWrap.hidden = false;
    login.reset();
    document.querySelector('.site-header').classList.remove('admin-hidden');
    document.querySelector('.footer').classList.remove('admin-hidden');
  });

  const openForm = (product = null) => {
    form.reset();
    form.elements.product_id.value = product?.id || '';
    document.querySelector('#product-form-title').textContent = product ? 'Edit product' : 'Add a real product';
    document.querySelector('#save-product').textContent = product ? 'Update product' : 'Save product';
    if (product) {
      form.elements.product_name.value = product.name || '';
      form.elements.product_slug.value = product.slug || '';
      form.elements.product_category.value = product.category || '';
      form.elements.product_price.value = Number.isInteger(product.base_price) ? product.base_price / 100 : '';
      form.elements.product_image.value = product.image_url || '';
      form.elements.product_stock.value = product.stock_status || 'made_to_order';
      form.elements.product_active.value = String(Boolean(product.active));
      form.elements.product_description.value = product.description || '';
    }
    drawer.hidden = false;
    drawer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const closeForm = () => { drawer.hidden = true; form.reset(); form.querySelector('.form-result').innerHTML = ''; };
  document.querySelector('#show-product-form').addEventListener('click', () => openForm());
  document.querySelector('#close-product-form').addEventListener('click', closeForm);
  document.querySelector('#cancel-product-edit').addEventListener('click', closeForm);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = form.elements.product_id.value;
    const payload = {
      name: form.elements.product_name.value.trim(),
      slug: form.elements.product_slug.value.trim(),
      category: form.elements.product_category.value.trim(),
      description: form.elements.product_description.value.trim(),
      base_price: form.elements.product_price.value ? Math.round(Number(form.elements.product_price.value) * 100) : null,
      currency: 'BDT',
      image_url: form.elements.product_image.value.trim() || null,
      stock_status: form.elements.product_stock.value,
      active: form.elements.product_active.value === 'true',
    };
    try {
      await adminRequest(id ? `/api/admin/products/${id}` : '/api/admin/products', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      showToast(id ? 'Product updated.' : 'Product added.');
      closeForm();
      await refreshAdmin();
    } catch (error) {
      form.querySelector('.form-result').innerHTML = `<div class="form-status error">${escapeHtml(error.message)}</div>`;
    }
  });

  document.querySelector('#admin-products').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const product = adminProducts.find((item) => item.id === button.dataset.id);
    if (button.dataset.action === 'edit') return openForm(product);
    try {
      if (button.dataset.action === 'delete') {
        if (!confirm(`Delete ${product?.name || 'this product'} permanently?`)) return;
        await adminRequest(`/api/admin/products/${button.dataset.id}`, { method: 'DELETE' });
      } else {
        await adminRequest(`/api/admin/products/${button.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ active: button.dataset.action === 'publish' }) });
      }
      await refreshAdmin();
    } catch (error) { showToast(error.message); }
  });

  document.querySelector('#admin-category-tabs').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    renderAdminProducts();
  });
  document.querySelector('#admin-search').addEventListener('input', renderAdminProducts);

  async function refreshAdmin() {
    const [{ products }, submissions] = await Promise.all([adminRequest('/api/admin/products'), adminRequest('/api/admin/submissions')]);
    adminProducts = products;
    const published = products.filter((product) => product.active).length;
    const draft = products.length - published;
    const metrics = [
      ['shirt', 'Total products', products.length, 'Draft and published'],
      ['eye', 'Published', published, 'Visible in the store'],
      ['eyeoff', 'Draft products', draft, 'Hidden from customers'],
      ['edit', 'Custom requests', submissions.custom_requests.length, 'Stored submissions'],
      ['message', 'Team & messages', submissions.team_orders.length + submissions.contact_messages.length, 'Stored submissions'],
    ];
    document.querySelector('#admin-metrics').innerHTML = metrics.map(([iconName, label, value, note]) => `<article><span>${icon(iconName)}</span><div><small>${label}</small><strong>${value}</strong><p>${note}</p></div></article>`).join('');
    const categories = [...new Set(products.map((product) => product.category))].sort();
    document.querySelector('#admin-category-tabs').innerHTML = `<button class="${activeCategory === 'all' ? 'active' : ''}" data-category="all">All products <b>${products.length}</b></button>${categories.map((category) => `<button class="${activeCategory === category ? 'active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)} <b>${products.filter((product) => product.category === category).length}</b></button>`).join('')}`;
    renderAdminProducts();
    document.querySelector('#admin-submissions').innerHTML = [
      submissionGroup('Custom requests', submissions.custom_requests, (item) => `${item.customer_name} · ${item.sport} · Qty ${item.quantity}`),
      submissionGroup('Team orders', submissions.team_orders, (item) => `${item.organization} · Qty ${item.quantity}`),
      submissionGroup('Messages', submissions.contact_messages, (item) => `${item.name} · ${item.subject}`),
    ].join('');
  }

  function renderAdminProducts() {
    const root = document.querySelector('#admin-products');
    const term = document.querySelector('#admin-search').value.trim().toLowerCase();
    const shown = adminProducts.filter((product) => (activeCategory === 'all' || product.category === activeCategory) && (!term || `${product.name} ${product.category}`.toLowerCase().includes(term)));
    root.innerHTML = shown.length ? shown.map((product) => `<tr><td><div class="table-product"><div>${product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="">` : jerseyPlaceholder()}</div><span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.slug)}</small></span></div></td><td>${escapeHtml(product.category)}</td><td>${formatPrice(product)}</td><td><span class="table-status ${product.stock_status}">${escapeHtml(stockLabel(product.stock_status))}</span></td><td><span class="table-status ${product.active ? 'published' : 'draft'}">${product.active ? 'Published' : 'Draft'}</span></td><td><div class="table-actions"><button title="Edit" data-action="edit" data-id="${product.id}">${icon('edit')}</button><button title="${product.active ? 'Hide' : 'Publish'}" data-action="${product.active ? 'unpublish' : 'publish'}" data-id="${product.id}">${icon(product.active ? 'eyeoff' : 'eye')}</button><button class="danger" title="Delete" data-action="delete" data-id="${product.id}">${icon('trash')}</button></div></td></tr>`).join('') : '<tr><td colspan="6"><div class="table-empty">No products match this view.</div></td></tr>';
    bindImageFallbacks(root);
  }

  if (adminKey) { login.elements.admin_key.value = adminKey; connect(); }
}

function submissionGroup(title, items, summary) {
  return `<section class="submission-group"><h3>${title} <span>${items.length}</span></h3>${items.length ? items.slice(0, 20).map((item) => `<article><strong>${escapeHtml(summary(item))}</strong><p>${escapeHtml(item.email)}</p><time>${new Date(item.created_at).toLocaleString()}</time></article>`).join('') : '<div class="submission-empty">No submissions yet.</div>'}</section>`;
}

function compactEmpty(title, copy) {
  return `<div class="compact-empty">${icon('shirt')}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div>`;
}

function notFoundPage() {
  return `${pageHero('Page not found', 'The page you requested does not exist.')}<section class="shop-section"><div class="container">${compactEmpty('Back to the field', 'Use the main navigation or return to the homepage.')}</div></section>`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

renderRoute();
