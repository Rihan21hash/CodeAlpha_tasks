// ═══════════════════════════════════════════
// CART MODULE — view, update, remove
// ═══════════════════════════════════════════

async function loadCart() {
  const container = document.getElementById('cart-items');
  const summaryEl = document.getElementById('cart-summary');
  if (!container) return;

  container.innerHTML = `<div class="animate-pulse" style="color:var(--color-text-muted);padding:2rem">Loading cart…</div>`;

  try {
    const { items, subtotal } = await api.get('/cart');
    renderCartItems(items, subtotal);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Could not load cart</h3></div>`;
  }
}

function renderCartItems(items, subtotal) {
  const container = document.getElementById('cart-items');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added any items yet.</p>
        <a href="index.html" class="btn btn-primary">Browse Products</a>
      </div>`;
    updateSummary(0);
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  container.innerHTML = items.map(item => {
    const img = item.product?.imageUrl || `https://picsum.photos/seed/${item.productId}/200/150`;
    const price = parseFloat(item.product?.price || 0);
    const total = (price * item.quantity).toFixed(2);
    return `
      <div class="cart-item" id="cart-item-${item.id}">
        <img class="cart-item-img" src="${img}" alt="${item.product?.name}">
        <div>
          <div class="cart-item-name">${item.product?.name || 'Unknown Product'}</div>
          <div class="cart-item-price">${formatCurrency(price)} each</div>
          <div class="qty-control">
            <button class="qty-btn" onclick="changeQty(${item.id}, ${item.quantity - 1})">−</button>
            <span class="qty-value" id="qty-${item.id}">${item.quantity}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, ${item.quantity + 1})">+</button>
          </div>
        </div>
        <div>
          <div class="cart-item-total" id="item-total-${item.id}">${formatCurrency(total)}</div>
          <button class="cart-item-remove" onclick="removeItem(${item.id})">Remove</button>
        </div>
      </div>`;
  }).join('');

  updateSummary(parseFloat(subtotal));
  if (checkoutBtn) checkoutBtn.disabled = false;
}

function updateSummary(subtotal) {
  const shipping = subtotal > 50 ? 0 : (subtotal > 0 ? 9.99 : 0);
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('summary-subtotal', formatCurrency(subtotal));
  set('summary-shipping', shipping === 0 ? 'FREE' : formatCurrency(shipping));
  set('summary-tax', formatCurrency(tax));
  set('summary-total', formatCurrency(total));

  const shippingNote = document.getElementById('shipping-note');
  if (shippingNote) {
    shippingNote.textContent = subtotal > 0 && subtotal < 50
      ? `Add ${formatCurrency(50 - subtotal)} more for free shipping!`
      : subtotal >= 50 ? '🎉 You qualify for free shipping!' : '';
  }
}

async function changeQty(itemId, newQty) {
  if (newQty < 1) return removeItem(itemId);
  try {
    await api.patch(`/cart/${itemId}`, { quantity: newQty });
    await loadCart();
    updateCartBadge();
  } catch (err) {
    showToast(err.message || 'Could not update quantity', 'error');
  }
}

async function removeItem(itemId) {
  const el = document.getElementById(`cart-item-${itemId}`);
  if (el) { el.style.opacity = '0.4'; el.style.pointerEvents = 'none'; }
  try {
    await api.delete(`/cart/${itemId}`);
    showToast('Item removed from cart', 'info');
    await loadCart();
    updateCartBadge();
  } catch (err) {
    showToast(err.message || 'Could not remove item', 'error');
    if (el) { el.style.opacity = ''; el.style.pointerEvents = ''; }
  }
}

function goToCheckout() {
  const user = getCurrentUser();
  if (!user) {
    sessionStorage.setItem('redirect_after_login', window.getAppPath('/checkout.html'));
    showToast('Please log in to checkout', 'info');
    setTimeout(() => window.location.href = window.getAppPath('/login.html'), 800);
    return;
  }
  window.location.href = window.getAppPath('/checkout.html');
}

if (document.getElementById('cart-items')) {
  setupNav();
  loadCart();
}

window.changeQty = changeQty;
window.removeItem = removeItem;
window.goToCheckout = goToCheckout;
