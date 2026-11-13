'use strict';

/* ==========================================================================
   Search / browse page — filters, sorting and pagination
   ========================================================================== */

(() => {
  const filterGroups = document.getElementById('filter-groups');
  const resultsGrid = document.getElementById('results-grid');
  const resultsTitle = document.getElementById('results-title');
  const resultsSubtitle = document.getElementById('results-subtitle');
  const resultsCount = document.getElementById('results-count');
  const activeFilters = document.getElementById('active-filters');
  const pagination = document.getElementById('pagination');
  const crumb = document.getElementById('crumb-current');
  const sortSelect = document.getElementById('sort-select');
  const filtersPanel = document.getElementById('filters');
  const backdrop = document.getElementById('filters-backdrop');
  const openFilters = document.getElementById('filters-open');
  const closeFilters = document.getElementById('filters-close');

  const LIMIT = 12;
  let latestRequest = 0;

  const params = () => new URLSearchParams(window.location.search);

  function readFilters() {
    const current = params();
    return {
      q: current.get('q') || '',
      category: current.get('category') || '',
      minPrice: current.get('minPrice') || '',
      maxPrice: current.get('maxPrice') || '',
      rating: current.get('rating') || '',
      prime: current.get('prime') === '1',
      deal: current.get('deal') === '1',
      inStock: current.get('inStock') === '1',
      sort: current.get('sort') || 'featured',
      page: Math.max(1, Number(current.get('page')) || 1),
    };
  }

  function urlWith(patch) {
    const next = params();
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined || value === '' || value === false) {
        next.delete(key);
      } else {
        next.set(key, value === true ? '1' : String(value));
      }
    }
    if (!Object.prototype.hasOwnProperty.call(patch, 'page')) next.delete('page');
    const query = next.toString();
    return query ? `?${query}` : window.location.pathname;
  }

  function navigate(patch, { replace = false } = {}) {
    const target = urlWith(patch);
    if (replace) history.replaceState(null, '', target);
    else history.pushState(null, '', target);
    closeDrawer();
    load();
  }

  function categoryFor(slug) {
    return SV.state.categories.find((category) => category.slug === slug);
  }

  function filterLink(label, patch, active, extra = '') {
    return `<li>
      <a class="filter-link${active ? ' is-active' : ''}" href="${SV.escapeHtml(urlWith(patch))}"
         data-filter-link ${extra}>${label}</a>
    </li>`;
  }

  function renderFilters() {
    if (!filterGroups) return;
    const filters = readFilters();

    const categories = SV.state.categories
      .map((category) =>
        filterLink(
          `${SV.escapeHtml(category.name)} <span>${category.product_count ?? ''}</span>`,
          { category: filters.category === category.slug ? '' : category.slug },
          filters.category === category.slug
        )
      )
      .join('');

    const ratings = [4, 3, 2].map((value) =>
      filterLink(
        `${'★'.repeat(value)}${'☆'.repeat(5 - value)} &amp; up`,
        { rating: filters.rating === String(value) ? '' : String(value) },
        filters.rating === String(value)
      )
    ).join('');

    filterGroups.innerHTML = `
      <div class="filter-group">
        <h3 class="filter-group__title">Department</h3>
        <ul class="filter-list">
          <li>
            <a class="filter-link${filters.category ? '' : ' is-active'}" href="${SV.escapeHtml(
              urlWith({ category: '' })
            )}" data-filter-link>All departments</a>
          </li>
          ${categories}
        </ul>
      </div>

      <div class="filter-group">
        <h3 class="filter-group__title">Customer rating</h3>
        <ul class="filter-list">
          <li>
            <a class="filter-link${filters.rating ? '' : ' is-active'}" href="${SV.escapeHtml(
              urlWith({ rating: '' })
            )}" data-filter-link>Any rating</a>
          </li>
          ${ratings}
        </ul>
      </div>

      <div class="filter-group">
        <h3 class="filter-group__title">Price</h3>
        <form class="price-filter" id="price-filter">
          <div class="price-inputs">
            <label class="sr-only" for="min-price">Minimum price</label>
            <input class="form-input" id="min-price" name="minPrice" type="number" min="0" step="0.01"
                   placeholder="Min" value="${SV.escapeHtml(filters.minPrice)}">
            <span class="muted small">to</span>
            <label class="sr-only" for="max-price">Maximum price</label>
            <input class="form-input" id="max-price" name="maxPrice" type="number" min="0" step="0.01"
                   placeholder="Max" value="${SV.escapeHtml(filters.maxPrice)}">
          </div>
          <button class="btn btn--outline btn--sm btn--block" type="submit">Apply price</button>
        </form>
      </div>

      <div class="filter-group">
        <h3 class="filter-group__title">Delivery &amp; offers</h3>
        <ul class="filter-list">
          ${filterLink('Prime-style delivery', { prime: filters.prime ? '' : '1' }, filters.prime)}
          ${filterLink("Today's deals", { deal: filters.deal ? '' : '1' }, filters.deal)}
          ${filterLink('In stock only', { inStock: filters.inStock ? '' : '1' }, filters.inStock)}
        </ul>
      </div>

      <div class="inline-actions">
        <button class="btn btn--ghost btn--sm" type="button" id="clear-filters">Clear all filters</button>
      </div>`;
  }

  function renderChips() {
    if (!activeFilters) return;
    const filters = readFilters();
    const chips = [];

    if (filters.q) {
      chips.push(
        `<span class="chip">“${SV.escapeHtml(filters.q)}”
          <button type="button" data-remove="q" aria-label="Remove search term">${SV.icon('x', 12)}</button>
        </span>`
      );
    }
    if (filters.category) {
      const category = categoryFor(filters.category);
      chips.push(
        `<span class="chip">${SV.escapeHtml(category ? category.name : filters.category)}
          <button type="button" data-remove="category" aria-label="Remove category filter">${SV.icon('x', 12)}</button>
        </span>`
      );
    }
    if (filters.minPrice || filters.maxPrice) {
      const label = `${filters.minPrice ? SV.money(Math.round(Number(filters.minPrice) * 100)) : '$0'} – ${
        filters.maxPrice ? SV.money(Math.round(Number(filters.maxPrice) * 100)) : 'Any'
      }`;
      chips.push(
        `<span class="chip">${label}
          <button type="button" data-remove="price" aria-label="Remove price filter">${SV.icon('x', 12)}</button>
        </span>`
      );
    }
    if (filters.rating) {
      chips.push(
        `<span class="chip">${filters.rating}★ &amp; up
          <button type="button" data-remove="rating" aria-label="Remove rating filter">${SV.icon('x', 12)}</button>
        </span>`
      );
    }
    if (filters.prime) {
      chips.push(
        `<span class="chip">Prime delivery
          <button type="button" data-remove="prime" aria-label="Remove Prime filter">${SV.icon('x', 12)}</button>
        </span>`
      );
    }
    if (filters.deal) {
      chips.push(
        `<span class="chip">On deal
          <button type="button" data-remove="deal" aria-label="Remove deals filter">${SV.icon('x', 12)}</button>
        </span>`
      );
    }
    if (filters.inStock) {
      chips.push(
        `<span class="chip">In stock
          <button type="button" data-remove="inStock" aria-label="Remove stock filter">${SV.icon('x', 12)}</button>
        </span>`
      );
    }

    activeFilters.innerHTML = chips.length
      ? `${chips.join('')}<button class="chip chip--clear" type="button" data-remove="all">Clear all</button>`
      : '';
  }

  function renderPagination(page, pages) {
    if (!pagination) return;
    if (pages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    const pagesToShow = new Set([1, pages]);
    for (let number = page - 2; number <= page + 2; number += 1) {
      if (number >= 1 && number <= pages) pagesToShow.add(number);
    }
    const sorted = [...pagesToShow].sort((a, b) => a - b);

    const items = [];
    items.push(
      `<button type="button" data-page="${page - 1}" class="${page <= 1 ? 'is-disabled' : ''}"
        ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">${SV.icon('left', 15)} Prev</button>`
    );

    let previous = 0;
    for (const number of sorted) {
      if (previous && number - previous > 1) {
        items.push('<span class="is-disabled">…</span>');
      }
      items.push(
        `<button type="button" data-page="${number}" class="${number === page ? 'is-current' : ''}"
          ${number === page ? 'aria-current="page"' : ''}>${number}</button>`
      );
      previous = number;
    }

    items.push(
      `<button type="button" data-page="${page + 1}" class="${page >= pages ? 'is-disabled' : ''}"
        ${page >= pages ? 'disabled' : ''} aria-label="Next page">Next ${SV.icon('right', 15)}</button>`
    );

    pagination.innerHTML = items.join('');
  }

  function headingFor(filters) {
    if (filters.q) return `Results for “${filters.q}”`;
    if (filters.category) {
      const category = categoryFor(filters.category);
      if (category) return category.name;
    }
    if (filters.deal) return "Today's Deals";
    if (filters.prime) return 'Prime-style delivery';
    if (filters.sort === 'newest') return 'New arrivals';
    if (filters.sort === 'rating') return 'Top rated products';
    return 'All products';
  }

  function subtitleFor(filters, total) {
    if (total === 0) return 'No products matched these filters — try removing a filter.';
    if (filters.q) return `${total} ${total === 1 ? 'result' : 'results'} for your search`;
    if (filters.category) {
      const category = categoryFor(filters.category);
      if (category?.blurb) return `${total} products · ${category.blurb}`;
    }
    if (filters.deal) return `${total} limited-time offers across the store`;
    if (filters.prime) return `${total} products with fast, free delivery`;
    return `${total} products across every department`;
  }

  async function load() {
    const requestId = ++latestRequest;
    const filters = readFilters();

    renderFilters();
    renderChips();
    if (sortSelect) sortSelect.value = filters.sort;

    resultsGrid.innerHTML = SV.skeletonCards(LIMIT);
    if (resultsCount) resultsCount.innerHTML = 'Loading results…';

    const query = new URLSearchParams();
    if (filters.q) query.set('q', filters.q);
    if (filters.category) query.set('category', filters.category);
    if (filters.minPrice) query.set('minPrice', filters.minPrice);
    if (filters.maxPrice) query.set('maxPrice', filters.maxPrice);
    if (filters.rating) query.set('rating', filters.rating);
    if (filters.prime) query.set('prime', '1');
    if (filters.deal) query.set('deal', '1');
    if (filters.inStock) query.set('inStock', '1');
    query.set('sort', filters.sort);
    query.set('page', filters.page);
    query.set('limit', LIMIT);

    try {
      const data = await SV.api.get(`/api/products?${query.toString()}`);
      if (requestId !== latestRequest) return;

      const heading = headingFor(filters);
      const subtitle = subtitleFor(filters, data.total);

      if (resultsTitle) resultsTitle.textContent = heading;
      if (resultsSubtitle) resultsSubtitle.textContent = subtitle;
      if (crumb) crumb.textContent = heading;
      document.title = `${heading} — ShopVerse`;
      if (resultsCount) {
        resultsCount.innerHTML =
          data.total === 0
            ? 'No results'
            : `<strong>${SV.number(data.total)}</strong> ${data.total === 1 ? 'result' : 'results'}`;
      }

      resultsGrid.innerHTML = data.products.length
        ? data.products.map(SV.productCard).join('')
        : `<div class="empty-state" style="grid-column:1/-1">
             <div class="empty-state__icon">${SV.icon('search', 28)}</div>
             <h2>No matches found</h2>
             <p>Try a different keyword or clear a filter to see more products.</p>
             <button class="btn btn--primary" type="button" data-remove="all">Clear all filters</button>
           </div>`;

      renderPagination(data.page, data.pages);

      const normalized = new URLSearchParams(window.location.search);
      if (data.page > data.pages && data.total > 0) {
        navigate({ page: data.pages }, { replace: true });
      } else if (!normalized.has('page') && normalized.toString()) {
        /* keep the URL tidy without forcing a reload */
        history.replaceState(null, '', window.location.pathname + '?' + normalized.toString());
      }
    } catch (error) {
      if (requestId !== latestRequest) return;
      resultsGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state__icon">${SV.icon('info', 28)}</div>
        <h2>Could not load results</h2>
        <p>${SV.escapeHtml(error.message || 'Please try again in a moment.')}</p>
      </div>`;
      if (resultsCount) resultsCount.textContent = '';
      SV.toast(error.message || 'Could not load results.', 'error');
    }
  }

  /* ------------------------------ Interactions ------------------------------ */

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-filter-link]');
    if (link) {
      event.preventDefault();
      const url = new URL(link.getAttribute('href'), window.location.origin);
      history.pushState(null, '', url.pathname + url.search);
      closeDrawer();
      load();
      return;
    }

    const remove = event.target.closest('[data-remove]');
    if (remove) {
      const key = remove.dataset.remove;
      if (key === 'all') {
        const keep = {};
        const filters = readFilters();
        if (filters.sort !== 'featured') keep.sort = filters.sort;
        const next = new URLSearchParams();
        for (const [name, value] of Object.entries(keep)) next.set(name, value);
        const query = next.toString();
        history.pushState(null, '', query ? `?${query}` : window.location.pathname);
        load();
      } else if (key === 'price') {
        navigate({ minPrice: '', maxPrice: '' });
      } else {
        navigate({ [key]: '' });
      }
      return;
    }

    const pageButton = event.target.closest('[data-page]');
    if (pageButton && !pageButton.disabled) {
      const target = Number(pageButton.dataset.page);
      if (target >= 1) {
        navigate({ page: target });
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }
    }
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'price-filter') return;
    event.preventDefault();
    const form = new FormData(event.target);
    const minPrice = String(form.get('minPrice') || '').trim();
    const maxPrice = String(form.get('maxPrice') || '').trim();
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      SV.toast('The minimum price is higher than the maximum price.', 'error');
      return;
    }
    navigate({ minPrice, maxPrice });
  });

  sortSelect?.addEventListener('change', () => {
    navigate({ sort: sortSelect.value === 'featured' ? '' : sortSelect.value });
  });

  /* --------------------------- Mobile filter drawer -------------------------- */

  function openDrawer() {
    filtersPanel?.classList.add('is-open');
    backdrop?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    filtersPanel?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  openFilters?.addEventListener('click', openDrawer);
  closeFilters?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });

  window.addEventListener('popstate', load);

  SV.state.ready.then(load).catch(load);
})();
