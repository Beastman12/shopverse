'use strict';

/* ==========================================================================
   Checkout page — address form, payment selection and order placement
   ========================================================================== */

(() => {
  const form = document.getElementById('checkout-form');
  const summaryHost = document.getElementById('checkout-summary');
  const errorBox = document.getElementById('checkout-error');
  const submitButton = document.getElementById('place-order');
  let cart = null;

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  function summaryHtml(cart) {
    const shipping = cart.shipping === 0 ? 'FREE' : SV.money(cart.shipping);
    return `<div class="cart-summary">
      <h2>Order summary</h2>
      <div class="checkout-items">
        ${cart.items
          .map(
            (item) => `<div class="checkout-item">
              <img src="${SV.escapeHtml(item.image)}" alt="" width="56" height="56" loading="lazy">
              <div class="checkout-item__body">
                <p class="checkout-item__title">${SV.escapeHtml(item.title)}</p>
                <p class="checkout-item__meta">Qty ${item.qty} · ${SV.escapeHtml(item.brand)}</p>
              </div>
              <span class="checkout-item__price">${SV.money(item.lineTotal)}</span>
            </div>`
          )
          .join('')}
      </div>
      <div class="summary-row"><span>Items (${cart.count})</span><span>${SV.money(cart.subtotal)}</span></div>
      <div class="summary-row"><span>Delivery</span><span>${shipping}</span></div>
      <div class="summary-row"><span>Estimated tax</span><span>${SV.money(cart.tax)}</span></div>
      <div class="summary-row summary-row--total"><span>Order total</span><span>${SV.money(cart.total)}</span></div>
      <div class="cart-summary__note">${SV.icon('lock', 15)}
        <span>Your order is protected. This is a demo — no real payment is processed.</span></div>
      <a class="cart-summary__small" href="/cart" style="display:block;margin-top:6px">Edit your cart</a>
    </div>`;
  }

  function emptyCheckout() {
    if (summaryHost) summaryHost.innerHTML = '';
    if (form) form.hidden = true;
    showError('');
    const host = document.querySelector('.checkout-layout');
    if (host) {
      host.style.display = 'none';
      host.insertAdjacentHTML(
        'beforebegin',
        `<div class="empty-state" style="background:#fff;border-radius:12px;padding:46px 20px;margin-bottom:18px">
          <div class="empty-state__icon">${SV.icon('cart', 30)}</div>
          <h2>Your cart is empty</h2>
          <p>Add a few items before heading to checkout.</p>
          <a class="btn btn--primary" href="/search">Browse products</a>
        </div>`
      );
    }
  }

  async function init() {
    const user = SV.state.user;
    if (!user) {
      window.location.replace('/login?next=%2Fcheckout');
      return;
    }

    try {
      const result = await SV.api.get('/api/cart');
      cart = result.cart;
    } catch (error) {
      showError(error.message);
      return;
    }

    if (!cart.items.length) {
      emptyCheckout();
      return;
    }

    if (summaryHost) summaryHost.innerHTML = summaryHtml(cart);

    const nameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    if (nameInput && !nameInput.value) nameInput.value = user.name;
    if (emailInput && !emailInput.value) emailInput.value = user.email;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError('');

    if (!cart || !cart.items.length) {
      showError('Your cart is empty.');
      return;
    }

    const data = new FormData(form);
    const shipping = {
      fullName: String(data.get('fullName') || '').trim(),
      email: String(data.get('email') || '').trim(),
      address: String(data.get('address') || '').trim(),
      city: String(data.get('city') || '').trim(),
      state: String(data.get('state') || '').trim(),
      zip: String(data.get('zip') || '').trim(),
      country: String(data.get('country') || '').trim(),
    };

    const missing = Object.entries(shipping).find(([, value]) => !value);
    if (missing) {
      showError('Please complete every delivery field before placing your order.');
      const field = document.getElementById(missing[0]);
      field?.focus();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) {
      showError('Please enter a valid email address for order updates.');
      document.getElementById('email')?.focus();
      return;
    }

    const paymentMethod = String(data.get('paymentMethod') || 'card');

    submitButton.disabled = true;
    submitButton.textContent = 'Placing your order…';

    try {
      const result = await SV.api.post('/api/orders', { shipping, paymentMethod });
      document.dispatchEvent(
        new CustomEvent('sv:cart', {
          detail: { items: [], count: 0, subtotal: 0, shipping: 0, tax: 0, total: 0 },
        })
      );
      SV.toast(result.message, 'success', 'Order placed');
      window.location.href = `/order/${encodeURIComponent(result.order.number)}?placed=1`;
    } catch (error) {
      showError(error.message);
      SV.toast(error.message, 'error');
      submitButton.disabled = false;
      submitButton.textContent = 'Place your order';
    }
  });

  SV.state.ready.then(init).catch(() => {
    showError('Could not start checkout. Please refresh the page.');
  });
})();
