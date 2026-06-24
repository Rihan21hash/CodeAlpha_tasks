// ═══════════════════════════════════════════
// ORDERS MODULE — order history
// ═══════════════════════════════════════════

const statusConfig = {
  pending:   { badge: 'badge-warning', label: 'Pending' },
  confirmed: { badge: 'badge-info',    label: 'Confirmed' },
  shipped:   { badge: 'badge-primary', label: 'Shipped' },
  delivered: { badge: 'badge-success', label: 'Delivered' },
  cancelled: { badge: 'badge-error',   label: 'Cancelled' },
};

async function loadOrders() {
  const container = document.getElementById('orders-list');
  if (!container) return;

  container.innerHTML = `<div class="animate-pulse" style="color:var(--color-text-muted);padding:2rem">Loading orders…</div>`;

  try {
    const { orders } = await api.get('/orders');

    if (!orders.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No orders yet</h3>
          <p>You haven't placed any orders. Start shopping!</p>
          <a href="index.html" class="btn btn-primary">Shop Now</a>
        </div>`;
      return;
    }

    container.innerHTML = orders.map(order => {
      const status = statusConfig[order.status] || { badge: 'badge-muted', label: order.status };
      const items = order.items || [];
      const itemCount = items.reduce((s, i) => s + i.quantity, 0);

      return `
        <div class="order-card animate-fade-in">
          <div class="order-card-header" onclick="toggleOrder(${order.id})">
            <div>
              <div class="order-id">#ORD-${String(order.id).padStart(5, '0')}</div>
              <div class="order-date">${formatDate(order.createdAt)} &middot; ${itemCount} item${itemCount !== 1 ? 's' : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:1rem">
              <span class="badge ${status.badge}">${status.label}</span>
              <span class="order-total">${formatCurrency(order.totalPrice)}</span>
              <span style="color:var(--color-text-muted)">&#9660;</span>
            </div>
          </div>
          <div class="order-card-items" id="order-items-${order.id}" style="display:none">
            ${items.map(item => `
              <div class="order-item-row">
                <img class="order-item-img"
                  src="${item.product?.imageUrl || `https://picsum.photos/seed/${item.productId}/200/150`}"
                  alt="${item.product?.name}">
                <span class="order-item-name">${item.product?.name || 'Product'}</span>
                <span class="order-item-qty">×${item.quantity}</span>
                <span class="order-item-price">${formatCurrency(parseFloat(item.unitPriceAtPurchase) * item.quantity)}</span>
              </div>`).join('')}
            <div class="summary-line" style="margin-top:1rem">
              <span>Shipping</span>
              <span>${parseFloat(order.totalPrice) >= 50 ? 'FREE' : formatCurrency(9.99)}</span>
            </div>
            <div class="summary-line">
              <span class="summary-total">Total</span>
              <span class="summary-total">${formatCurrency(order.totalPrice)}</span>
            </div>
            ${order.shippingAddressJson ? `
              <div style="margin-top:1rem;padding:1rem;background:var(--color-surface-2);border-radius:var(--radius-md);font-size:var(--font-size-sm);color:var(--color-text-muted)">
                <strong style="color:var(--color-text)">Shipped to:</strong><br>
                ${order.shippingAddressJson.fullName}, ${order.shippingAddressJson.address},
                ${order.shippingAddressJson.city}, ${order.shippingAddressJson.state} ${order.shippingAddressJson.zip}
              </div>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Could not load orders</h3><p>${err.message}</p></div>`;
  }
}

function toggleOrder(id) {
  const el = document.getElementById(`order-items-${id}`);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// Order confirmation page
async function loadOrderConfirmation() {
  const id = getParam('id');
  if (!id) { window.location.href = window.getAppPath('/index.html'); return; }

  try {
    const { order } = await api.get(`/orders/${id}`);
    const container = document.getElementById('confirmation-details');
    if (!container) return;

    const items = order.items || [];
    container.innerHTML = `
      <div class="order-id" style="font-size:1.2rem;margin-bottom:0.5rem">#ORD-${String(order.id).padStart(5, '0')}</div>
      <div style="color:var(--color-text-muted);font-size:0.875rem;margin-bottom:1.5rem">Placed on ${formatDate(order.createdAt)}</div>
      ${items.map(item => `
        <div class="order-item-row">
          <img class="order-item-img" src="${item.product?.imageUrl || `https://picsum.photos/seed/${item.productId}/200/150`}" alt="">
          <span class="order-item-name">${item.product?.name}</span>
          <span class="order-item-qty">×${item.quantity}</span>
          <span class="order-item-price">${formatCurrency(parseFloat(item.unitPriceAtPurchase) * item.quantity)}</span>
        </div>`).join('')}
      <div class="summary-line" style="margin-top:1rem">
        <span class="summary-total">Total Paid</span>
        <span class="summary-total">${formatCurrency(order.totalPrice)}</span>
      </div>`;
  } catch (err) {
    showToast('Could not load order details', 'error');
  }
}

if (document.getElementById('orders-list')) {
  if (requireAuth()) { setupNav(); loadOrders(); }
}

if (document.getElementById('confirmation-details')) {
  setupNav();
  loadOrderConfirmation();
}

window.toggleOrder = toggleOrder;
