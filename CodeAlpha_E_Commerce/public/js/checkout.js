// ═══════════════════════════════════════════
// CHECKOUT MODULE — multi-step wizard
// ═══════════════════════════════════════════

let currentStep = 1;
let cartItems = [];
let cartSubtotal = 0;

const steps = ['shipping', 'payment', 'review'];

function goToStep(step) {
  currentStep = step;
  steps.forEach((s, i) => {
    const panel = document.getElementById(`step-${s}`);
    const circle = document.getElementById(`step-circle-${i + 1}`);
    const stepEl = document.getElementById(`checkout-step-${i + 1}`);
    const connector = document.getElementById(`connector-${i + 1}`);

    if (panel) panel.style.display = i + 1 === step ? 'block' : 'none';
    if (stepEl) {
      stepEl.classList.toggle('active', i + 1 === step);
      stepEl.classList.toggle('done', i + 1 < step);
    }
    if (connector) connector.classList.toggle('done', i + 1 < step);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadCheckoutCart() {
  try {
    const { items, subtotal } = await api.get('/cart');
    cartItems = items;
    cartSubtotal = parseFloat(subtotal);

    if (!items.length) {
      showToast('Your cart is empty!', 'error');
      setTimeout(() => window.location.href = window.getAppPath('/cart.html'), 1000);
      return;
    }
    renderReviewItems(items, cartSubtotal);
  } catch (err) {
    showToast('Could not load cart', 'error');
  }
}

function renderReviewItems(items, subtotal) {
  const reviewList = document.getElementById('review-items');
  if (!reviewList) return;

  reviewList.innerHTML = items.map(item => `
    <div class="order-item-row">
      <img class="order-item-img" src="${item.product?.imageUrl || `https://picsum.photos/seed/${item.productId}/200/150`}" alt="${item.product?.name}">
      <span class="order-item-name">${item.product?.name}</span>
      <span class="order-item-qty">×${item.quantity}</span>
      <span class="order-item-price">${formatCurrency(parseFloat(item.product?.price || 0) * item.quantity)}</span>
    </div>`).join('');

  const shipping = subtotal >= 50 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('review-subtotal', formatCurrency(subtotal));
  set('review-shipping', shipping === 0 ? 'FREE' : formatCurrency(shipping));
  set('review-tax', formatCurrency(tax));
  set('review-total', formatCurrency(total));
}

function submitShipping(e) {
  e.preventDefault();
  const form = e.target;
  const requiredFields = ['fullName', 'address', 'city', 'state', 'zip', 'country'];
  let valid = true;

  requiredFields.forEach(f => {
    const el = form[f];
    if (!el || !el.value.trim()) {
      el && el.classList.add('error');
      valid = false;
    } else {
      el.classList.remove('error');
    }
  });

  if (!valid) { showToast('Please fill in all shipping fields', 'error'); return; }

  // Save address to review panel
  const addr = {
    fullName: form.fullName.value.trim(),
    address: form.address.value.trim(),
    city: form.city.value.trim(),
    state: form.state.value.trim(),
    zip: form.zip.value.trim(),
    country: form.country.value.trim(),
  };

  const reviewAddr = document.getElementById('review-address');
  if (reviewAddr) {
    reviewAddr.innerHTML = `${addr.fullName}<br>${addr.address}<br>${addr.city}, ${addr.state} ${addr.zip}<br>${addr.country}`;
  }

  sessionStorage.setItem('shipping_address', JSON.stringify(addr));
  goToStep(2);
}

function submitPayment(e) {
  e.preventDefault();
  const form = e.target;
  const cardNumber = form.cardNumber.value.replace(/\s/g, '');
  const expiry = form.expiry.value;
  const cvv = form.cvv.value;

  if (cardNumber.length < 13 || !expiry || !cvv) {
    showToast('Please enter valid payment details', 'error');
    return;
  }

  goToStep(3);
}

async function placeOrder() {
  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Placing Order…';

  const shippingAddress = JSON.parse(sessionStorage.getItem('shipping_address') || '{}');

  try {
    const { order } = await api.post('/orders', { shippingAddress });
    sessionStorage.removeItem('shipping_address');
    showToast('Order placed successfully!', 'success');
    setTimeout(() => window.location.href = window.getAppPath(`/order-confirmation.html?id=${order.id}`), 800);
  } catch (err) {
    showToast(err.message || 'Failed to place order', 'error');
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}

// Card number formatting
function formatCardNumber(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = val.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
  input.value = val;
}

if (document.getElementById('step-shipping')) {
  if (!requireAuth()) {/* redirected */} else {
    setupNav();
    loadCheckoutCart();
    goToStep(1);
  }
}

window.goToStep = goToStep;
window.submitShipping = submitShipping;
window.submitPayment = submitPayment;
window.placeOrder = placeOrder;
window.formatCardNumber = formatCardNumber;
window.formatExpiry = formatExpiry;
