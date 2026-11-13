'use strict';

/* ==========================================================================
   Order details — status timeline, items and cancellation
   ========================================================================== */

(() => {
  const root = document.getElementById('order-root');
  const crumb = document.getElementById('crumb-order');
  const number = decodeURIComponent(window.location.pathname.replace(/^\/order\//, '').replace(/\/$/, ''));
  let currentOrder = null;

  const STATUS_CLASS = {
    Processing: 'processing',
    Shipped: 'shipped',
    Delivered: 'delivered',
    Cancelled: 'cancelled',
  };

  const STEPS = ['Ordered', 'Processing', 'Shipped', 'Delivered'];

  function completedSteps(orderStatus) {
    if (orderStatus === 'Delivered') return 4;
    if (orderStatus === 'Shipped') return 3;
    return 2;
  }

  function statusPill(status) {
    return `<span class="status-pill status-pill--${STATUS_CLASS[status] || 'processing'}">${SV.escapeHtml(
      status
    )}</span>`;
  }

  function deliveryMessage(order) {
    if (order.status === 'Cancelled') {
      return 'This order was cancelled and the items were returned to stock.';
    }
    if (order.status === 'Delivered') {
      return `Delivered on ${SV.formatDate(order.createdAt, { month: 'long' })}.`;
    }
    if (order.status === 'Shipped') {
      return `Your package is on the way and should arrive by ${SV.deliveryDate(2)}.`;
    }
    return `Arriving ${SV.deliveryDate(4)}. We will email ${order.address.email} when it ships.`;
  }

  function render(order) {
    currentOrder = order;
    const placed = new URLSearchParams(window.location.search).get('placed') === '1';
    const complete = completedSteps(order.status);

    const timeline =
      order.status === 'Cancelled'
        ? `<div class="notice-bar" style="margin-top:12px">
            ${SV.icon('info', 16)} This order was cancelled. Contact support if you need help with a refund.
          </div>`
        : `<div class="timeline" aria-label="Delivery progress">
            ${STEPS.map(
              (step, index) => `<div class="timeline__step${index < complete ? ' is-complete' : ''}">
                <span class="timeline__dot"></span>
                ${step}
              </div>`
            ).join('')}
          </div>`;

    const items = order.items
      .map(
        (item) => `<div class="order-item-row">
          <img src="${SV.escapeHtml(item.image)}" alt="${SV.escapeHtml(item.title)}"
               width="74" height="74" loading="lazy">
          <div class="order-item-row__body">
            ${
              item.slug
                ? `<a class="order-item-row__title" href="/p/${encodeURIComponent(item.slug)}">${SV.escapeHtml(
                    item.title
                  )}</a>`
                : `<p class="order-item-row__title">${SV.escapeHtml(item.title)}</p>`
            }
            <p class="muted small">${SV.escapeHtml(item.brand)} · Qty ${item.qty}</p>
            <p class="muted small">${SV.money(item.price)} each</p>
          </div>
          <span class="order-item-row__price">${SV.money(item.lineTotal)}</span>
        </div>`
      )
      .join('');

    root.innerHTML = `
      <div class="order-detail-head">
        <div>
          <h1>Order details</h1>
          <p class="muted">
            Order <strong>${SV.escapeHtml(order.number)}</strong> ·
            Placed ${SV.formatDate(order.createdAt)} · ${statusPill(order.status)}
          </p>
        </div>
        <div class="inline-actions">
          <a class="btn btn--outline btn--sm" href="/orders">← All orders</a>
          ${
            order.status === 'Processing'
              ? `<button class="btn btn--danger btn--sm" type="button" id="cancel-order">Cancel order</button>`
              : ''
          }
        </div>
      </div>

      ${
        placed
          ? `<div class="order-success" role="status">
              <div class="order-success__icon">${SV.icon('check', 20, 3)}</div>
              <div>
                <h2>Thank you — your order is confirmed</h2>
                <p>A confirmation was sent to ${SV.escapeHtml(order.address.email)}. You can track it below.</p>
              </div>
            </div>`
          : ''
      }

      <div class="order-layout">
        <div style="display:flex;flex-direction:column;gap:18px">
          <section class="panel" id="tracking">
            <div class="panel__head">
              <h2>Delivery status</h2>
              ${statusPill(order.status)}
            </div>
            ${timeline}
            <p class="muted small" style="margin-top:12px">${SV.escapeHtml(deliveryMessage(order))}</p>
          </section>

          <section class="panel">
            <div class="panel__head">
              <h2>Items in this order</h2>
              <span class="muted small">${order.itemCount} ${order.itemCount === 1 ? 'item' : 'items'}</span>
            </div>
            ${items}
          </section>
        </div>

        <aside>
          <div class="cart-summary">
            <h2>Order summary</h2>
            <div class="summary-row"><span>Items</span><span>${SV.money(order.subtotal)}</span></div>
            <div class="summary-row"><span>Delivery</span><span>${order.shipping === 0 ? 'FREE' : SV.money(order.shipping)}</span></div>
            <div class="summary-row"><span>Tax</span><span>${SV.money(order.tax)}</span></div>
            <div class="summary-row summary-row--total"><span>Total</span><span>${SV.money(order.total)}</span></div>

            <div class="product-divider"></div>
            <h2 style="font-size:16px">Delivery address</h2>
            <p class="small" style="line-height:1.6;color:#333">
              <strong>${SV.escapeHtml(order.address.fullName)}</strong><br>
              ${SV.escapeHtml(order.address.address)}<br>
              ${SV.escapeHtml(order.address.city)}, ${SV.escapeHtml(order.address.state)} ${SV.escapeHtml(
                order.address.zip
              )}<br>
              ${SV.escapeHtml(order.address.country)}<br>
              <span class="muted">${SV.escapeHtml(order.address.email)}</span>
            </p>

            <div class="product-divider"></div>
            <h2 style="font-size:16px">Payment method</h2>
            <p class="small">${SV.escapeHtml(order.paymentMethod)}</p>

            <a class="btn btn--outline btn--block" href="/search" style="margin-top:14px">Keep shopping</a>
          </div>
        </aside>
      </div>`;

    document.title = `Order ${order.number} — ShopVerse`;
    if (crumb) crumb.textContent = order.number;

    document.getElementById('cancel-order')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      if (!window.confirm(`Cancel order ${order.number}? Your items will be returned to stock.`)) return;
      button.disabled = true;
      button.textContent = 'Cancelling…';
      try {
        const result = await SV.api.post(`/api/orders/${encodeURIComponent(order.number)}/cancel`);
        SV.toast(result.message, 'success', 'Order cancelled');
        const url = new URL(window.location.href);
        url.searchParams.delete('placed');
        history.replaceState(null, '', url.pathname + url.search);
        window.location.reload();
      } catch (error) {
        SV.toast(error.message, 'error');
        button.disabled = false;
        button.textContent = 'Cancel order';
      }
    });
  }

  function showMessage(title, message, action = true) {
    root.innerHTML = `<div class="empty-state" style="background:#fff;border-radius:12px;padding:54px 20px">
      <div class="empty-state__icon">${SV.icon(action ? 'lock' : 'package', 30)}</div>
      <h1>${SV.escapeHtml(title)}</h1>
      <p>${SV.escapeHtml(message)}</p>
      <div class="inline-actions" style="justify-content:center">
        ${
          action
            ? `<a class="btn btn--primary" href="/login?next=${encodeURIComponent(
                window.location.pathname
              )}">Sign in</a>`
            : ''
        }
        <a class="btn btn--outline" href="/orders">Your orders</a>
      </div>
    </div>`;
  }

  async function load() {
    try {
      const data = await SV.api.get(`/api/orders/${encodeURIComponent(number)}`);
      render(data.order);
    } catch (error) {
      if (error.status === 401) {
        showMessage('Sign in to view this order', 'Order details are only visible to the account that placed them.');
      } else if (error.status === 403) {
        showMessage('This order belongs to another account', 'Switch accounts to view it, or head back to your own orders.', false);
      } else if (error.status === 404) {
        showMessage('Order not found', 'Check the order number from your confirmation email and try again.', false);
        if (crumb) crumb.textContent = 'Order not found';
      } else {
        showMessage('Could not load this order', error.message, false);
      }
    }
  }

  SV.state.ready.then(load).catch(load);
})();
