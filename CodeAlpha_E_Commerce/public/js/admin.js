// ═══════════════════════════════════════════
// ADMIN MODULE — dashboard, product CRUD, orders
// ═══════════════════════════════════════════

// Guard admin access
const user = getCurrentUser();
if (!user || !user.isAdmin) {
  showToast('Admin access required', 'error');
  setTimeout(() => window.location.href = window.getAppPath('/login.html'), 800);
}

let editingProductId = null;

// ── Dashboard Stats ──────────────────────
async function loadDashboard() {
  try {
    const data = await api.get('/admin/stats');
    document.getElementById('stat-products').textContent = data.totalProducts;
    document.getElementById('stat-orders').textContent = data.totalOrders;
    document.getElementById('stat-users').textContent = data.totalUsers;
    document.getElementById('stat-revenue').textContent = formatCurrency(data.revenue || 0);
  } catch (err) {
    showToast('Could not load stats: ' + err.message, 'error');
  }
}

// ── Products ─────────────────────────────
async function loadAdminProducts() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-muted)">Loading…</td></tr>`;
  try {
    const { products } = await api.get('/admin/products');
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.75rem">
            <img src="${p.imageUrl || 'https://picsum.photos/seed/' + p.id + '/80/60'}" style="width:48px;height:40px;object-fit:cover;border-radius:6px">
            <div>
              <div style="font-weight:600">${p.name}</div>
              <div style="font-size:0.75rem;color:var(--color-text-muted)">${p.sku || '—'}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-primary">${p.category || '—'}</span></td>
        <td style="font-weight:700">${formatCurrency(p.price)}</td>
        <td>
          <span class="badge ${p.stockQuantity > 10 ? 'badge-success' : p.stockQuantity > 0 ? 'badge-warning' : 'badge-error'}">
            ${p.stockQuantity} units
          </span>
        </td>
        <td>${formatDate(p.createdAt)}</td>
        <td>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-sm btn-secondary" onclick="openEditProduct(${p.id})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Delete">Del</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--color-error);padding:1rem">${err.message}</td></tr>`;
  }
}

async function openEditProduct(id) {
  editingProductId = id;
  try {
    const { product } = await api.get(`/products/${id}`);
    const form = document.getElementById('product-form');
    form.name.value = product.name;
    form.description.value = product.description || '';
    form.price.value = product.price;
    form.stockQuantity.value = product.stockQuantity;
    form.category.value = product.category || '';
    form.sku.value = product.sku || '';
    form.imageUrl.value = product.imageUrl || '';
    document.getElementById('modal-title').textContent = 'Edit Product';
    openModal('product-modal');
  } catch (err) {
    showToast('Could not load product: ' + err.message, 'error');
  }
}

function openAddProduct() {
  editingProductId = null;
  document.getElementById('product-form').reset();
  document.getElementById('modal-title').textContent = 'Add Product';
  openModal('product-modal');
}

async function saveProduct(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving…';

  const formData = new FormData(form);

  try {
    if (editingProductId) {
      await api.patchForm(`/admin/products/${editingProductId}`, formData);
      showToast('Product updated', 'success');
    } else {
      await api.postForm('/admin/products', formData);
      showToast('Product created', 'success');
    }
    closeModal('product-modal');
    loadAdminProducts();
  } catch (err) {
    showToast(err.message || 'Save failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Product';
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await api.delete(`/admin/products/${id}`);
    showToast('Product deleted', 'info');
    loadAdminProducts();
  } catch (err) {
    showToast(err.message || 'Delete failed', 'error');
  }
}

// ── Orders ───────────────────────────────
const statusConfig = {
  pending: 'badge-warning', confirmed: 'badge-info',
  shipped: 'badge-primary', delivered: 'badge-success', cancelled: 'badge-error',
};

async function loadAdminOrders() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-muted)">Loading…</td></tr>`;
  try {
    const { orders } = await api.get('/admin/orders');
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td style="font-weight:600">#ORD-${String(o.id).padStart(5, '0')}</td>
        <td>${o.user ? `${o.user.firstName} ${o.user.lastName}<br><small style="color:var(--color-text-muted)">${o.user.email}</small>` : '—'}</td>
        <td>${formatDate(o.createdAt)}</td>
        <td style="font-weight:700">${formatCurrency(o.totalPrice)}</td>
        <td><span class="badge ${statusConfig[o.status] || 'badge-muted'}">${o.status}</span></td>
        <td>
          <select class="filter-select" onchange="updateOrderStatus(${o.id}, this.value)" style="padding:6px 10px;font-size:0.75rem">
            ${['pending','confirmed','shipped','delivered','cancelled'].map(s =>
              `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
            ).join('')}
          </select>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--color-error);padding:1rem">${err.message}</td></tr>`;
  }
}

async function updateOrderStatus(id, status) {
  try {
    await api.patch(`/admin/orders/${id}`, { status });
    showToast(`Order status updated to "${status}"`, 'success');
  } catch (err) {
    showToast(err.message || 'Update failed', 'error');
  }
}

// ── Modal helpers ─────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── Tabs ──────────────────────────────────
function showTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const tab = document.getElementById(`tab-${tabName}`);
  if (tab) tab.style.display = 'block';
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  if (btn) btn.classList.add('active');

  if (tabName === 'products') loadAdminProducts();
  if (tabName === 'orders') loadAdminOrders();
}

// Init
if (document.getElementById('stat-products')) {
  setupNav();
  loadDashboard();
  showTab('overview');
}

window.openAddProduct = openAddProduct;
window.openEditProduct = openEditProduct;
window.saveProduct = saveProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.openModal = openModal;
window.closeModal = closeModal;
window.showTab = showTab;
