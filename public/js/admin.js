'use strict';

/* ==========================================================================
   Seller dashboard — overview stats, product CRUD and order management
   ========================================================================== */

(() => {
  const loading = document.getElementById('admin-loading');
  const denied = document.getElementById('admin-denied');
  const deniedCopy = document.getElementById('admin-denied-copy');
  const app = document.getElementById('admin-app');

  const statGrid = document.getElementById('stat-grid');
  const recentOrdersBody = document.getElementById('recent-orders-body');
  const topProductsBody = document.getElementById('top-products-body');
  const productsBody = document.getElementById('admin-products-body');
  const productTotal = document.getElementById('product-total');
  const productSearch = document.getElementById('admin-product-search');
  const ordersBody = document.getElementById('admin-orders-body');
  const orderFilter = document.getElementById('admin-order-filter');

  const modal = document.getElementById('product-modal');
  const modalTitle = document.getElementById('product-modal-title');
  const productForm = document.getElementById('product-form');
  const formError = document.getElementById('product-form-error');

  let products = [];
  let editingId = null;

  const STATUS_CLASS = {
    Processing: 'processing',
    Shipped: 'shipped',
    Delivered: 'delivered',
    Cancelled: 'cancelled',
  };

  function statusPill(status) {
    return `<span class="status-pill status-pill--${STATUS_CLASS[status] || 'processing'}">${SV.escapeHtml(
      status
    )}</span>`;
  }

  function showFormError(message) {
    if (!formError) return;
    formError.textContent = message;
    formError.hidden = !message;
  }

  /* --------------------------------- Tabs --------------------------------- */

  function switchTab(tab) {
    document.querySelectorAll('.admin-tab').forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.admin-panel').forEach((panel) => {
      panel.hidden = panel.id !== `panel-${tab}`;
    });
    if (tab === 'orders') loadOrders();
    if (tab === 'products') renderProducts();
  }

  document.querySelectorAll('.admin-tab').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  document.querySelectorAll('[data-goto-tab]').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.gotoTab));
  });

  /* ------------------------------- Overview ------------------------------- */

  function renderStats(stats) {
    const cards = [
      { label: 'Revenue', value: SV.money(stats.revenue), hint: 'Excludes cancelled orders' },
      { label: 'Orders', value: SV.number(stats.orders), hint: 'All time' },
      { label: 'Customers', value: SV.number(stats.customers), hint: 'Registered accounts' },
      { label: 'Products', value: SV.number(stats.products), hint: `${stats.lowStock} low on stock` },
    ];

    statGrid.innerHTML = cards
      .map(
        (card) => `<div class="stat-card">
          <p class="stat-card__label">${card.label}</p>
          <p class="stat-card__value">${card.value}</p>
          <p class="stat-card__hint">${card.hint}</p>
        </div>`
      )
      .join('');

    recentOrdersBody.innerHTML = stats.recentOrders.length
      ? stats.recentOrders
          .map(
            (order) => `<tr>
              <td><a href="/order/${encodeURIComponent(order.order_number)}">${SV.escapeHtml(
                order.order_number
              )}</a></td>
              <td>${SV.escapeHtml(order.customer)}</td>
              <td>${statusPill(order.status)}</td>
              <td>${SV.money(order.total)}</td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="4" class="table-empty">No orders yet.</td></tr>';

    topProductsBody.innerHTML = stats.topProducts.length
      ? stats.topProducts
          .map(
            (product) => `<tr>
              <td>${SV.escapeHtml(product.title)}</td>
              <td>${SV.number(product.sold)}</td>
              <td>${SV.money(product.revenue)}</td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="3" class="table-empty">No sales data yet.</td></tr>';
  }

  async function loadStats() {
    try {
      const { stats } = await SV.api.get('/api/admin/stats');
      renderStats(stats);
    } catch (error) {
      statGrid.innerHTML = `<p class="muted">${SV.escapeHtml(error.message)}</p>`;
    }
  }

  /* ------------------------------- Products ------------------------------- */

  function renderProducts() {
    const query = (productSearch?.value || '').trim().toLowerCase();
    const filtered = query
      ? products.filter((product) =>
          [product.title, product.brand, product.category.name]
            .join(' ')
            .toLowerCase()
            .includes(query)
        )
      : products;

    if (productTotal) {
      productTotal.textContent = query
        ? `(${filtered.length} of ${products.length})`
        : `(${products.length})`;
    }

    productsBody.innerHTML = filtered.length
      ? filtered
          .map(
            (product) => `<tr>
              <td>
                <div class="table-product">
                  <img src="${SV.escapeHtml(product.image)}" alt="" width="44" height="44" loading="lazy">
                  <div>
                    <a class="table-product__title" href="/p/${encodeURIComponent(product.slug)}">${SV.escapeHtml(
                      product.title
                    )}</a>
                    <span class="table-product__brand">${SV.escapeHtml(product.brand)}</span>
                  </div>
                </div>
              </td>
              <td>${SV.escapeHtml(product.category.name)}</td>
              <td>${SV.money(product.price)}</td>
              <td>${product.stock <= 10 ? `<span class="text-danger">${product.stock}</span>` : product.stock}</td>
              <td>${Number(product.rating).toFixed(1)} (${SV.number(product.ratingCount)})</td>
              <td>
                <div class="table-actions">
                  <button class="icon-btn" type="button" data-edit="${product.id}" aria-label="Edit ${SV.escapeHtml(
                    product.title
                  )}">${SV.icon('edit', 15)}</button>
                  <button class="icon-btn icon-btn--danger" type="button" data-delete="${
                    product.id
                  }" aria-label="Delete ${SV.escapeHtml(product.title)}">${SV.icon('trash', 15)}</button>
                </div>
              </td>
            </tr>`
          )
          .join('')
      : `<tr><td colspan="6" class="table-empty">${
          products.length ? 'No products match that search.' : 'No products yet — add your first one.'
        }</td></tr>`;
  }

  async function loadProducts() {
    try {
      const data = await SV.api.get('/api/admin/products');
      products = data.products;
      renderProducts();
    } catch (error) {
      productsBody.innerHTML = `<tr><td colspan="6" class="table-empty">${SV.escapeHtml(
        error.message
      )}</td></tr>`;
    }
  }

  productSearch?.addEventListener(
    'input',
    SV.debounce(() => renderProducts(), 150)
  );

  /* --------------------------------- Orders -------------------------------- */

  async function loadOrders() {
    const status = orderFilter?.value || '';
    ordersBody.innerHTML =
      '<tr><td colspan="6" class="table-empty">Loading orders…</td></tr>';
    try {
      const data = await SV.api.get(`/api/admin/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`);
      ordersBody.innerHTML = data.orders.length
        ? data.orders
            .map(
              (order) => `<tr>
                <td><a href="/order/${encodeURIComponent(order.order_number)}">${SV.escapeHtml(
                  order.order_number
                )}</a></td>
                <td>
                  <strong>${SV.escapeHtml(order.full_name || order.customer)}</strong><br>
                  <span class="muted small">${SV.escapeHtml(order.email)}</span>
                </td>
                <td>${SV.formatDate(order.created_at, { month: 'short' })}</td>
                <td>${order.item_count}</td>
                <td>${SV.money(order.total)}</td>
                <td>
                  ${
                    order.status === 'Cancelled'
                      ? statusPill('Cancelled')
                      : `<select class="form-select" data-order-id="${order.id}" data-current="${order.status}"
                            aria-label="Status for ${SV.escapeHtml(order.order_number)}"
                            style="width:140px;padding:6px 8px;font-size:12px">
                          ${['Processing', 'Shipped', 'Delivered', 'Cancelled']
                            .map(
                              (value) =>
                                `<option value="${value}" ${value === order.status ? 'selected' : ''}>${value}</option>`
                            )
                            .join('')}
                        </select>`
                  }
                </td>
              </tr>`
            )
            .join('')
        : '<tr><td colspan="6" class="table-empty">No orders match this filter.</td></tr>';
    } catch (error) {
      ordersBody.innerHTML = `<tr><td colspan="6" class="table-empty">${SV.escapeHtml(
        error.message
      )}</td></tr>`;
    }
  }

  orderFilter?.addEventListener('change', loadOrders);

  ordersBody?.addEventListener('change', async (event) => {
    const select = event.target.closest('select[data-order-id]');
    if (!select) return;
    const id = Number(select.dataset.orderId);
    const status = select.value;
    select.disabled = true;
    try {
      const result = await SV.api.patch(`/api/admin/orders/${id}`, { status });
      SV.toast(result.message, 'success', 'Order updated');
      await Promise.allSettled([loadOrders(), loadStats()]);
    } catch (error) {
      SV.toast(error.message, 'error');
      select.value = select.dataset.current || select.value;
      select.disabled = false;
    }
  });

  /* ------------------------------ Product modal ---------------------------- */

  function fillCategorySelect() {
    const select = document.getElementById('pf-category');
    if (!select) return;
    select.innerHTML = SV.state.categories
      .map((category) => `<option value="${category.id}">${SV.escapeHtml(category.name)}</option>`)
      .join('');
  }

  function openModal(product = null) {
    editingId = product ? product.id : null;
    fillCategorySelect();
    productForm.reset();
    showFormError('');

    modalTitle.textContent = product ? 'Edit product' : 'New product';
    document.getElementById('pf-title').value = product?.title || '';
    document.getElementById('pf-brand').value = product?.brand || '';
    document.getElementById('pf-price').value = product ? (product.price / 100).toFixed(2) : '';
    document.getElementById('pf-list-price').value = product
      ? (product.listPrice / 100).toFixed(2)
      : '';
    document.getElementById('pf-stock').value = product ? product.stock : 25;
    document.getElementById('pf-badge').value = product?.badge || '';
    document.getElementById('pf-description').value = product?.description || '';
    document.getElementById('pf-features').value = product?.features?.join('\n') || '';
    document.getElementById('pf-prime').checked = Boolean(product?.prime);
    document.getElementById('pf-deal').checked = Boolean(product?.deal);
    document.getElementById('pf-featured').checked = Boolean(product?.featured);

    if (product) {
      const match = SV.state.categories.find((category) => category.slug === product.category.slug);
      if (match) document.getElementById('pf-category').value = String(match.id);
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('pf-title')?.focus(), 50);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    editingId = null;
  }

  modal?.querySelectorAll('[data-close]').forEach((element) => {
    element.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal?.classList.contains('is-open')) closeModal();
  });

  document.getElementById('new-product')?.addEventListener('click', () => openModal());

  productsBody?.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit]');
    if (editButton) {
      const product = products.find((item) => item.id === Number(editButton.dataset.edit));
      if (product) openModal(product);
      return;
    }

    const deleteButton = event.target.closest('[data-delete]');
    if (deleteButton) {
      const id = Number(deleteButton.dataset.delete);
      const product = products.find((item) => item.id === id);
      if (!product) return;
      if (!window.confirm(`Delete “${product.title}”? This cannot be undone.`)) return;

      deleteButton.disabled = true;
      try {
        const result = await SV.api.del(`/api/admin/products/${id}`);
        SV.toast(result.message, 'success', 'Product deleted');
        if (editingId === id) closeModal();
        await Promise.allSettled([loadProducts(), loadStats()]);
      } catch (error) {
        SV.toast(error.message, 'error');
        deleteButton.disabled = false;
      }
    }
  });

  productForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showFormError('');

    const data = new FormData(productForm);
    const price = Number(data.get('price'));
    const listPrice = Number(data.get('listPrice'));
    const stock = Number(data.get('stock'));
    const categoryId = Number(data.get('categoryId'));
    const title = String(data.get('title') || '').trim();
    const brand = String(data.get('brand') || '').trim();

    if (title.length < 3) return showFormError('Product title needs at least 3 characters.');
    if (brand.length < 2) return showFormError('Brand needs at least 2 characters.');
    if (!Number.isFinite(price) || price <= 0) return showFormError('Enter a valid sale price.');
    if (!Number.isFinite(listPrice) || listPrice < price) {
      return showFormError('List price must be greater than or equal to the sale price.');
    }
    if (!Number.isInteger(categoryId) || categoryId <= 0) return showFormError('Choose a category.');
    if (!Number.isFinite(stock) || stock < 0) return showFormError('Enter a valid stock quantity.');

    const payload = {
      title,
      brand,
      categoryId,
      price,
      listPrice,
      stock,
      badge: String(data.get('badge') || '').trim(),
      description: String(data.get('description') || '').trim(),
      features: String(data.get('features') || '')
        .split('\n')
        .map((feature) => feature.trim())
        .filter(Boolean),
      prime: data.get('prime') === 'on',
      deal: data.get('deal') === 'on',
      featured: data.get('featured') === 'on',
    };

    const submit = document.getElementById('pf-submit');
    submit.disabled = true;
    submit.textContent = 'Saving…';

    try {
      const result = editingId
        ? await SV.api.put(`/api/admin/products/${editingId}`, payload)
        : await SV.api.post('/api/admin/products', payload);
      SV.toast(result.message, 'success', editingId ? 'Product updated' : 'Product created');
      closeModal();
      await Promise.allSettled([loadProducts(), loadStats()]);
    } catch (error) {
      showFormError(error.message);
      SV.toast(error.message, 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Save product';
    }
  });

  /* --------------------------------- Access -------------------------------- */

  function showDenied() {
    loading.hidden = true;
    denied.hidden = false;
    app.hidden = true;

    if (!SV.state.user) {
      deniedCopy.textContent =
        'Sign in with an administrator account to manage the catalog and orders.';
      return;
    }

    deniedCopy.innerHTML = `You are signed in as <strong>${SV.escapeHtml(
      SV.state.user.name
    )}</strong> (${SV.escapeHtml(
      SV.state.user.role
    )}), which does not have seller access. Sign out and use the demo admin account.`;
  }

  async function init() {
    await SV.state.ready;

    if (!SV.state.user || SV.state.user.role !== 'admin') {
      showDenied();
      return;
    }

    loading.hidden = true;
    denied.hidden = true;
    app.hidden = false;

    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (['overview', 'products', 'orders'].includes(tab)) switchTab(tab);
    else switchTab('overview');

    await Promise.allSettled([loadStats(), loadProducts(), loadOrders()]);
  }

  init().catch((error) => {
    loading.hidden = true;
    SV.toast(error.message || 'Could not load the dashboard.', 'error');
  });
})();
