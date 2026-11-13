'use strict';

/* ==========================================================================
   Orders page — history, status filters and cancellation
   ========================================================================== */

(() => {
  const listHost = document.getElementById('orders-list');
  const noticeHost = document.getElementById('orders-notice');
  const filterHost = document.getElementById('order-filters');
  const heading = document.getElementById('orders-heading');

  let orders = [];
  let status = new URLSearchParams(window.location.search).get('status') || 'all';
  let busy = false;

  const STATUS_CLASS = {
    Processing: 'processing',
    Shipped: 'shipped',
    Delivered: 'delivered',
    Cancelled: 'cancelled',
  };

  function statusPill(orderStatus) {
    return `<span class="status-pill status-pill--${STATUS_CLASS[orderStatus] || 'processing'}">${SV.escapeHtml(
      orderStatus
    )}</span>`;
  }

  function statusHeadline(order) {
    if (order.status === 'Cancelled') return 'Order cancelled';
    if (order.status === 'Delivered') return `Delivered on ${SV.formatDate(order.createdAt, { month: 'short' })}`;
    if (order.status === 'Shipped') return 'On the way';
    return `Arriving ${SV.deliveryDate(4)}`;
  }

  function orderCard(order) {
    const thumbs = order.items
      .slice(0, 6)
      .map(
        (item) => `<a href="/p/${encodeURIComponent(item.slug || '')}">
          <img class="order-card__thumb" src="${SV.escapeHtml(item.image)}" alt="${SV.escapeHtml(item.title)}"
               width="64" height="64" loading="lazy">
        </a>`
      )
      .join('');

    return `<article class="order-card" data-order="${SV.escapeHtml(order.number)}">
      <div class="order-card__head">
        <div class="order-card__meta">
          <div>Order placed<strong>${SV.formatDate(order.createdAt, { month: 'short' })}</strong></div>
          <div>Total<strong>${SV.money(order.total)}</strong></div>
          <div>Ship to<strong>${SV.escapeHtml(order.address.fullName)}</strong></div>
        </div>
        <div class="inline-actions">
          <span>Order # <strong>${SV.escapeHtml(order.number)}</strong></span>
          ${statusPill(order.status)}
        </div>
      </div>

      <div class="order-card__body">
        <div>
          <div class="order-card__items">
            ${thumbs}
            <div>
              <strong>${statusHeadline(order)}</strong>
              <p class="muted small">
                ${order.itemCount} ${order.itemCount === 1 ? 'item' : 'items'} ·
                ${SV.escapeHtml(order.paymentMethod)}
              </p>
            </div>
          </div>
        </div>
        <div class="order-card__actions">
          <a class="btn btn--primary" href="/order/${encodeURIComponent(order.number)}">View order details</a>
          ${
            order.status === 'Cancelled'
              ? ''
              : `<a class="btn btn--outline" href="/order/${encodeURIComponent(order.number)}#tracking">Track package</a>`
          }
          ${
            order.status === 'Processing'
              ? `<button class="btn btn--ghost" type="button" data-cancel="${SV.escapeHtml(order.number)}">Cancel order</button>`
              : ''
          }
        </div>
      </div>
    </article>`;
  }

  function renderFilters() {
    if (!filterHost) return;
    filterHost.querySelectorAll('[data-status]').forEach((button) => {
      const active = button.dataset.status === status;
      button.className = `btn btn--sm ${active ? 'btn--dark' : 'btn--outline'}`;
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function render() {
    renderFilters();
    if (heading) {
      heading.textContent = orders.length
        ? `Order history (${orders.length})`
        : 'Order history';
    }

    const visible = status === 'all' ? orders : orders.filter((order) => order.status === status);

    if (!orders.length) {
      listHost.innerHTML = `<div class="empty-state" style="padding:36px 10px">
        <div class="empty-state__icon">${SV.icon('package', 30)}</div>
        <h2>No orders yet</h2>
        <p>When you place an order it will show up here with live delivery updates.</p>
        <a class="btn btn--primary" href="/search">Start shopping</a>
      </div>`;
      return;
    }

    if (!visible.length) {
      listHost.innerHTML = `<div class="empty-state" style="padding:36px 10px">
        <div class="empty-state__icon">${SV.icon('package', 30)}</div>
        <h2>No ${SV.escapeHtml(status.toLowerCase())} orders</h2>
        <p>Try a different status filter to see the rest of your history.</p>
        <button class="btn btn--outline" type="button" data-status="all">Show all orders</button>
      </div>`;
      return;
    }

    listHost.innerHTML = visible.map(orderCard).join('');
  }

  function showSignedOut() {
    if (heading) heading.textContent = 'Order history';
    if (noticeHost) {
      noticeHost.innerHTML = `<div class="notice-bar" style="margin-bottom:16px">
        Sign in to see your order history and track deliveries.
        <a href="/login?next=%2Forders">Sign in</a> · <a href="/register">Create an account</a>
      </div>`;
    }
    listHost.innerHTML = `<div class="empty-state" style="padding:36px 10px">
      <div class="empty-state__icon">${SV.icon('lock', 28)}</div>
      <h2>Your orders are private</h2>
      <p>Sign in to view past orders, track packages and request cancellations.</p>
      <div class="inline-actions" style="justify-content:center">
        <a class="btn btn--primary" href="/login?next=%2Forders">Sign in</a>
        <a class="btn btn--outline" href="/search">Keep shopping</a>
      </div>
    </div>`;
  }

  async function load() {
    if (!SV.state.user) {
      showSignedOut();
      return;
    }
    try {
      const data = await SV.api.get('/api/orders');
      orders = data.orders;
      if (noticeHost) noticeHost.innerHTML = '';
      render();
    } catch (error) {
      if (error.status === 401) {
        showSignedOut();
        return;
      }
      listHost.innerHTML = `<div class="empty-state" style="padding:36px 10px">
        <div class="empty-state__icon">${SV.icon('info', 30)}</div>
        <h2>Could not load your orders</h2>
        <p>${SV.escapeHtml(error.message)}</p>
        <button class="btn btn--primary" type="button" id="retry-orders">Try again</button>
      </div>`;
      document.getElementById('retry-orders')?.addEventListener('click', load);
    }
  }

  async function cancelOrder(number, button) {
    if (busy) return;
    if (!window.confirm(`Cancel order ${number}? Your items will be returned to stock.`)) return;
    busy = true;
    button.disabled = true;
    button.textContent = 'Cancelling…';
    try {
      const result = await SV.api.post(`/api/orders/${encodeURIComponent(number)}/cancel`);
      SV.toast(result.message, 'success', 'Order cancelled');
      await load();
    } catch (error) {
      SV.toast(error.message, 'error');
      button.disabled = false;
      button.textContent = 'Cancel order';
    } finally {
      busy = false;
    }
  }

  document.addEventListener('click', (event) => {
    const statusButton = event.target.closest('[data-status]');
    if (statusButton) {
      status = statusButton.dataset.status || 'all';
      const url = new URL(window.location.href);
      if (status === 'all') url.searchParams.delete('status');
      else url.searchParams.set('status', status);
      history.replaceState(null, '', url.pathname + url.search);
      render();
      return;
    }

    const cancelButton = event.target.closest('[data-cancel]');
    if (cancelButton) {
      cancelOrder(cancelButton.dataset.cancel, cancelButton);
    }
  });

  renderFilters();
  SV.state.ready.then(load).catch(load);
})();
