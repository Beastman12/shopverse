'use strict';

/* ==========================================================================
   Cart page — item management with live totals
   ========================================================================== */

(() => {
  const itemsHost = document.getElementById('cart-items');
  const summaryHost = document.getElementById('cart-summary');
  const countLabel = document.getElementById('cart-count-label');
  let busy = false;

  function summaryHtml(cart) {
    if (!cart.items.length) return '';

    const remaining = Math.max(0, cart.freeShippingThreshold - cart.subtotal);
    const progress = Math.min(100, Math.round((cart.subtotal / cart.freeShippingThreshold) * 100));
    const shipping = cart.shipping === 0 ? 'FREE' : SV.money(cart.shipping);

    return `<div class="cart-summary">
      <h2>Order summary</h2>
      ${
        cart.qualifiesForFreeShipping
          ? `<div class="cart-summary__note">${SV.icon('check-circle', 16)}
              <span>Your order qualifies for <strong>FREE delivery</strong>.</span></div>`
          : `<div class="cart-progress">
              <span class="small">Add <strong>${SV.money(remaining)}</strong> for FREE delivery</span>
              <div class="cart-progress__bar"><div class="cart-progress__fill" style="width:${progress}%"></div></div>
            </div>`
      }
      <div class="summary-row"><span>Items (${cart.count})</span><span>${SV.money(cart.subtotal)}</span></div>
      <div class="summary-row"><span>Delivery</span><span>${shipping}</span></div>
      <div class="summary-row"><span>Estimated tax</span><span>${SV.money(cart.tax)}</span></div>
      <div class="summary-row summary-row--total"><span>Order total</span><span>${SV.money(cart.total)}</span></div>
      <a class="btn btn--primary btn--block" href="${SV.state.user ? '/checkout' : '/login?next=%2Fcheckout'}">
        ${SV.state.user ? 'Proceed to checkout' : 'Sign in to check out'}
      </a>
      <a class="btn btn--outline btn--block" href="/search">Continue shopping</a>
      <div class="cart-summary__note">${SV.icon('lock', 15)}
        <span>Safe and secure checkout. This demo never charges a real card.</span></div>
      <div class="cart-summary__small">Free delivery on orders over ${SV.money(
        cart.freeShippingThreshold
      )} · 30-day returns</div>
    </div>`;
  }

  function itemHtml(item) {
    const lowStock = item.stock > 0 && item.stock <= 10;
    return `<div class="cart-item" data-product="${item.productId}">
      <a class="cart-item__media" href="/p/${encodeURIComponent(item.slug)}">
        <img src="${SV.escapeHtml(item.image)}" alt="${SV.escapeHtml(item.title)}" width="130" height="130" loading="lazy">
      </a>
      <div>
        <a class="cart-item__title" href="/p/${encodeURIComponent(item.slug)}">${SV.escapeHtml(item.title)}</a>
        <p class="muted small">${SV.escapeHtml(item.brand)} · ${SV.escapeHtml(item.category)}</p>
        <p class="cart-item__stock${lowStock ? ' cart-item__stock--low' : ''}">
          ${item.stock > 0 ? (lowStock ? `Only ${item.stock} left in stock` : 'In Stock') : 'Out of stock'}
        </p>
        <div class="cart-item__controls">
          <div class="qty-control" aria-label="Quantity for ${SV.escapeHtml(item.title)}">
            <button type="button" data-dec="${item.productId}" aria-label="Decrease quantity"
                    ${item.qty <= 1 ? 'disabled' : ''}>${SV.icon('minus', 13)}</button>
            <span>${item.qty}</span>
            <button type="button" data-inc="${item.productId}" aria-label="Increase quantity"
                    ${item.qty >= Math.min(item.stock, 99) ? 'disabled' : ''}>${SV.icon('plus', 13)}</button>
          </div>
          <button class="cart-item__remove" type="button" data-remove="${item.productId}">Delete</button>
        </div>
      </div>
      <div class="cart-item__price">
        ${SV.money(item.lineTotal)}
        <small>${SV.money(item.price)} each</small>
      </div>
    </div>`;
  }

  function render(cart) {
    if (countLabel) {
      countLabel.textContent = cart.count
        ? `${cart.count} ${cart.count === 1 ? 'item' : 'items'} in your cart`
        : 'Your cart is waiting to be filled';
    }

    if (!cart.items.length) {
      itemsHost.innerHTML = `<div class="empty-state" style="padding:40px 10px">
        <div class="empty-state__icon">${SV.icon('shopping-bag', 30)}</div>
        <h2>Your ShopVerse cart is empty</h2>
        <p>Everyday essentials, gadgets and great reads are one click away.</p>
        <div class="inline-actions" style="justify-content:center">
          <a class="btn btn--primary" href="/search">Start shopping</a>
          <a class="btn btn--outline" href="/search?deal=1">See today's deals</a>
        </div>
      </div>`;
      if (summaryHost) summaryHost.innerHTML = '';
      return;
    }

    itemsHost.innerHTML = cart.items.map(itemHtml).join('');
    if (summaryHost) summaryHost.innerHTML = summaryHtml(cart);
  }

  async function refresh() {
    try {
      const { cart } = await SV.api.get('/api/cart');
      render(cart);
      document.dispatchEvent(new CustomEvent('sv:cart', { detail: cart }));
    } catch (error) {
      itemsHost.innerHTML = `<div class="empty-state" style="padding:40px 10px">
        <div class="empty-state__icon">${SV.icon('info', 30)}</div>
        <h2>Could not load your cart</h2>
        <p>${SV.escapeHtml(error.message)}</p>
        <button class="btn btn--primary" type="button" id="retry-cart">Try again</button>
      </div>`;
      document.getElementById('retry-cart')?.addEventListener('click', refresh);
    }
  }

  async function mutate(request, message) {
    if (busy) return;
    busy = true;
    try {
      const { cart } = await request();
      render(cart);
      document.dispatchEvent(new CustomEvent('sv:cart', { detail: cart }));
      if (message) SV.toast(message, 'success');
      return cart;
    } catch (error) {
      SV.toast(error.message, 'error');
    } finally {
      busy = false;
    }
  }

  function findItem(productId) {
    return document.querySelector(`.cart-item[data-product="${productId}"]`);
  }

  document.addEventListener('click', (event) => {
    const inc = event.target.closest('[data-inc]');
    if (inc) {
      const productId = Number(inc.dataset.inc);
      const current = Number(findItem(productId)?.querySelector('.qty-control span')?.textContent) || 1;
      mutate(() => SV.api.patch(`/api/cart/${productId}`, { qty: current + 1 }));
      return;
    }

    const dec = event.target.closest('[data-dec]');
    if (dec) {
      const productId = Number(dec.dataset.dec);
      const current = Number(findItem(productId)?.querySelector('.qty-control span')?.textContent) || 2;
      mutate(() => SV.api.patch(`/api/cart/${productId}`, { qty: Math.max(0, current - 1) }));
      return;
    }

    const remove = event.target.closest('[data-remove]');
    if (remove && remove.closest('#cart-items')) {
      const productId = Number(remove.dataset.remove);
      mutate(() => SV.api.del(`/api/cart/${productId}`), 'Item removed from your cart.');
    }
  });

  SV.state.ready.then(refresh).catch(refresh);
})();
