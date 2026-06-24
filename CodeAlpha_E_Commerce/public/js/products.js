// ═══════════════════════════════════════════
// PRODUCTS MODULE — listing, search, filter
// ═══════════════════════════════════════════

let currentPage = 1;
let currentFilters = { search: '', category: '', minPrice: '', maxPrice: '', sort: '' };

function renderProductCard(p) {
  const inStock = p.stockQuantity > 0;
  return `
    <div class="card product-card animate-fade-in" onclick="window.location.href=window.getAppPath('/product.html?id=${p.id}')">
      <div class="product-card-image">
        <img src="${p.imageUrl || 'https://picsum.photos/seed/' + p.id + '/600/400'}" alt="${p.name}" loading="lazy">
        <span class="product-card-badge">${p.category || 'New'}</span>
        <button class="product-card-wishlist" onclick="event.stopPropagation();" title="Save">&#9825;</button>
      </div>
      <div class="product-card-body">
        <span class="product-card-category">${p.category || ''}</span>
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-rating">
          ${renderStars(p.rating || 4)}
          <span class="count">(${p.reviewCount || 0})</span>
        </div>
        ${!inStock ? '<span class="badge badge-error">Out of Stock</span>' : ''}
      </div>
      <div class="product-card-footer">
        <div class="product-price"><span class="currency">&#8377;</span>${parseFloat(p.price).toFixed(0)}</div>
        <button class="add-to-cart-btn" title="Add to cart"
          onclick="event.stopPropagation(); addToCartQuick(${p.id}, '${p.name}')"
          ${!inStock ? 'disabled' : ''}>+</button>
      </div>
    </div>`;
}

async function addToCartQuick(productId, name) {
  try {
    await api.post('/cart', { productId, quantity: 1 });
    showToast(`${name} added to cart`, 'success');
    updateCartBadge();
  } catch (err) {
    showToast(err.message || 'Could not add to cart', 'error');
  }
}

async function loadProducts(page = 1) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  showSkeletons(grid, 8);
  currentPage = page;

  const params = new URLSearchParams({
    page,
    limit: 12,
    ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v)),
  });

  try {
    const { products, total, pages } = await api.get(`/products?${params}`);

    if (!products.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon" style="font-size:48px;opacity:0.2;margin-bottom:1rem">&#9741;</div>
          <h3>No products found</h3>
          <p>Try adjusting your search or filters</p>
          <button class="btn btn-secondary" onclick="clearFilters()">Clear Filters</button>
        </div>`;
      renderPagination(0, 1, 1);
      return;
    }

    grid.innerHTML = products.map(renderProductCard).join('');
    renderPagination(total, pages, page);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>Failed to load products</h3><p>${err.message}</p></div>`;
  }
}

function renderPagination(total, pages, current) {
  const container = document.getElementById('pagination');
  if (!container || pages <= 1) { if (container) container.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="loadProducts(${current - 1})" ${current === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="loadProducts(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="loadProducts(${current + 1})" ${current === pages ? 'disabled' : ''}>›</button>`;
  container.innerHTML = html;
}

async function loadCategories() {
  try {
    const { categories } = await api.get('/products/categories');
    const bar = document.getElementById('category-filters');
    if (!bar) return;
    const chips = ['All', ...categories].map(cat => `
      <button class="filter-chip ${cat === 'All' ? 'active' : ''}" data-cat="${cat === 'All' ? '' : cat}"
        onclick="filterByCategory(this, '${cat === 'All' ? '' : cat}')">${cat}</button>`).join('');
    bar.innerHTML = chips;
  } catch {}
}

function filterByCategory(el, category) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentFilters.category = category;
  loadProducts(1);
}

function clearFilters() {
  currentFilters = { search: '', category: '', minPrice: '', maxPrice: '', sort: '' };
  document.querySelectorAll('.filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  loadProducts(1);
}

function setupSearch() {
  const input = document.getElementById('search-input');
  const navInput = document.querySelector('.nav-search input');

  const handler = debounce((val) => {
    currentFilters.search = val;
    loadProducts(1);
  }, 400);

  if (input) input.addEventListener('input', e => handler(e.target.value));
  if (navInput) navInput.addEventListener('input', e => {
    handler(e.target.value);
    if (input) input.value = e.target.value;
  });
}

function setupSortFilter() {
  const select = document.getElementById('sort-select');
  if (!select) return;
  select.addEventListener('change', (e) => {
    currentFilters.sort = e.target.value;
    loadProducts(1);
  });
}

// Init on product listing page
if (document.getElementById('product-grid')) {
  setupNav();
  loadCategories();
  loadProducts(1);
  setupSearch();
  setupSortFilter();

  // Pre-fill search from URL param
  const q = getParam('q');
  if (q) {
    currentFilters.search = q;
    const si = document.getElementById('search-input');
    if (si) si.value = q;
  }
}

window.addToCartQuick = addToCartQuick;
window.loadProducts = loadProducts;
window.filterByCategory = filterByCategory;
window.clearFilters = clearFilters;
