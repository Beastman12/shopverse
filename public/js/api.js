'use strict';

/* ==========================================================================
   ShopVerse shared front-end helpers
   ========================================================================== */

const SV = (() => {
  const ICON_PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    arrowup: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
    'shopping-bag': '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  };

  function icon(name, size = 18, strokeWidth = 2) {
    const path = ICON_PATHS[name] || ICON_PATHS.info;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }

  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.status = status;
      this.payload = payload;
    }
  }

  async function request(path, options = {}) {
    const config = {
      method: options.method || 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
    };
    if (options.body !== undefined) {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(path, config);
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw new ApiError(
        (payload && payload.error) || `Request failed (${response.status})`,
        response.status,
        payload
      );
    }
    return payload;
  }

  const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    del: (path) => request(path, { method: 'DELETE' }),
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function number(value) {
    return Number(value || 0).toLocaleString('en-US');
  }

  function money(cents) {
    return Number((Number(cents || 0) / 100)).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  function priceHtml(cents, size = '') {
    const value = Math.max(0, Math.round(Number(cents) || 0));
    const whole = Math.floor(value / 100).toLocaleString('en-US');
    const frac = String(value % 100).padStart(2, '0');
    return `<span class="price ${size}"><span class="price__currency">$</span><span class="price__whole">${whole}</span><span class="price__frac">${frac}</span></span>`;
  }

  function starsHtml(rating, count, href) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    const inner =
      `<span class="rating__stars" style="--rating:${value.toFixed(1)}"><span class="rating__fill"></span></span>` +
      `<span>${value.toFixed(1)}</span>` +
      (count !== null && count !== undefined
        ? `<span class="rating__count">(${number(count)})</span>`
        : '');
    return href
      ? `<a class="rating" href="${escapeHtml(href)}">${inner}</a>`
      : `<span class="rating">${inner}</span>`;
  }

  function badgeFor(product) {
    if (!product.badge) return '';
    const kind = product.badge === 'Best Seller' ? 'badge--best' : 'badge--pick';
    return `<span class="badge ${kind}">${escapeHtml(product.badge)}</span>`;
  }

  function productCard(product) {
    const href = `/p/${encodeURIComponent(product.slug)}`;
    const image = product.image || `/img/p/${encodeURIComponent(product.slug)}.svg`;
    const discount =
      product.discount > 0 ? `<span class="badge badge--deal">-${product.discount}%</span>` : '';
    const prime = product.prime
      ? `<span class="prime-mark">${icon('check', 13, 3)}prime</span>`
      : '';
    const listPrice =
      product.listPrice > product.price
        ? `<div class="list-price">List: <s>${money(product.listPrice)}</s></div>`
        : '';

    return `
      <article class="product-card fade-up">
        <a class="product-card__media" href="${href}" aria-label="${escapeHtml(product.title)}">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy" width="300" height="300">
        </a>
        <p class="product-card__brand">${escapeHtml(product.brand)}</p>
        <a class="product-card__title" href="${href}">${escapeHtml(product.title)}</a>
        ${starsHtml(product.rating, product.ratingCount, `${href}#reviews`)}
        ${priceHtml(product.price)}
        ${listPrice}
        <div class="product-card__badges">${badgeFor(product)}${discount}${prime}</div>
        <div class="card-foot">
          <button class="btn btn--cart" type="button" data-add-to-cart="${product.id}">
            Add to cart
          </button>
        </div>
      </article>`;
  }

  function skeletonCards(count = 8) {
    return Array.from(
      { length: count },
      () => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton skeleton--media"></div>
        <div class="skeleton skeleton--line skeleton--third"></div>
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line skeleton--half"></div>
        <div class="skeleton skeleton--price"></div>
        <div class="skeleton skeleton--button"></div>
      </div>`
    ).join('');
  }

  function toast(message, type = 'success', title = '') {
    let stack = document.getElementById('toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toast-stack';
      stack.className = 'toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }

    const titles = {
      success: title || 'Done',
      error: title || 'Something went wrong',
      info: title || 'Heads up',
    };

    const element = document.createElement('div');
    element.className = `toast toast--${type}`;
    element.setAttribute('role', 'status');
    element.innerHTML = `
      <span>${icon(type === 'error' ? 'info' : 'check-circle', 18)}</span>
      <div><strong>${escapeHtml(titles[type] || 'Notice')}</strong><span>${escapeHtml(message)}</span></div>
      <button class="toast__close" type="button" aria-label="Dismiss">${icon('x', 14)}</button>`;

    stack.appendChild(element);
    const remove = () => element.remove();
    element.querySelector('.toast__close').addEventListener('click', remove);
    setTimeout(remove, 4600);
  }

  function parseDbDate(value) {
    if (!value) return null;
    const normalised = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
    const date = new Date(normalised);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value, options = {}) {
    const date = parseDbDate(value);
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      ...options,
    });
  }

  function deliveryDate(daysFromNow = 4) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function sanitizeNext(value, fallback = '/') {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
    return value;
  }

  function debounce(fn, wait = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  document.addEventListener('sv:cart', (event) => {
    const count = event.detail?.count ?? 0;
    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = String(count);
    });
  });

  const state = {
    user: null,
    categories: [],
    ready: Promise.resolve(),
  };

  return {
    api,
    icon,
    escapeHtml,
    number,
    money,
    priceHtml,
    starsHtml,
    productCard,
    skeletonCards,
    toast,
    formatDate,
    parseDbDate,
    deliveryDate,
    qs,
    sanitizeNext,
    debounce,
    state,
  };
})();

window.SV = SV;
