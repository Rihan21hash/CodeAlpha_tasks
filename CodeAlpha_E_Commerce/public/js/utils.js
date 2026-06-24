// ═══════════════════════════════════════════
// UTILS MODULE — toast, currency, helpers
// ═══════════════════════════════════════════

// Toast notification system
const toastContainer = (() => {
  const el = document.createElement('div');
  el.className = 'toast-container';
  document.body.appendChild(el);
  return el;
})();

function showToast(message, type = 'info', duration = 3500) {
  const labels = { success: '', error: '', info: '', warning: '' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// Currency formatter
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// Date formatter
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Render star rating
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) stars += '★';
    else if (i === full && half) stars += '½';
    else stars += '☆';
  }
  return `<span class="stars">${stars}</span>`;
}

// Debounce
function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// Skeleton loader
function createSkeletonCard() {
  return `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line shorter"></div>
      </div>
    </div>`;
}

function showSkeletons(container, count = 8) {
  container.innerHTML = Array(count).fill(createSkeletonCard()).join('');
}

// Get query param
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Redirect if not authenticated
function requireAuth(redirectUrl = '/login.html') {
  const token = localStorage.getItem('token');
  if (!token) {
    sessionStorage.setItem('redirect_after_login', window.location.href);
    window.location.href = window.getAppPath(redirectUrl);
    return false;
  }
  return true;
}

// Get logged in user
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('user')) || null; }
  catch { return null; }
}

// Update cart badge in navbar
async function updateCartBadge() {
  try {
    const { items } = await api.get('/cart');
    const badge = document.querySelector('.cart-badge');
    if (badge) {
      const count = items.reduce((s, i) => s + i.quantity, 0);
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  } catch {}
}

// Setup nav user state
function setupNav() {
  const user = getCurrentUser();
  const authArea = document.getElementById('nav-auth-area');
  if (!authArea) return;
  if (user) {
    authArea.innerHTML = `
      <a href="${window.getAppPath('/orders.html')}" class="nav-link">My Orders</a>
      ${user.isAdmin ? `<a href="${window.getAppPath('/admin/index.html')}" class="nav-link">Admin</a>` : ''}
      <button class="nav-user-btn" onclick="logout()">${user.firstName} · Logout</button>`;
  } else {
    authArea.innerHTML = `
      <a href="${window.getAppPath('/login.html')}" class="nav-link">Login</a>
      <a href="${window.getAppPath('/register.html')}" class="btn btn-primary btn-sm">Sign Up</a>`;
  }
  updateCartBadge();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully', 'info');
  setTimeout(() => window.location.href = window.getAppPath('/index.html'), 800);
}

window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.renderStars = renderStars;
window.debounce = debounce;
window.showSkeletons = showSkeletons;
window.getParam = getParam;
window.requireAuth = requireAuth;
window.getCurrentUser = getCurrentUser;
window.updateCartBadge = updateCartBadge;
window.setupNav = setupNav;
window.logout = logout;
