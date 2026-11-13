'use strict';

/* ==========================================================================
   Product detail page — gallery, buy box, reviews and related products
   ========================================================================== */

(() => {
  const root = document.getElementById('product-root');
  const slug = decodeURIComponent(window.location.pathname.replace(/^\/p\//, '').replace(/\/$/, ''));
  let loaded = null;

  function variantUrl(image, variant) {
    const base = image || `/img/p/${encodeURIComponent(slug)}.svg`;
    return `${base}${base.includes('?') ? '&' : '?'}v=${variant}`;
  }

  function stockLabel(product) {
    if (product.stock < 1) return '<span class="stock-status stock-status--out">Currently out of stock</span>';
    if (product.stock <= 10) {
      return `<span class="stock-status stock-status--low">Only ${product.stock} left in stock</span>`;
    }
    return '<span class="stock-status">In Stock</span>';
  }

  function quantityOptions(product) {
    const max = Math.min(Math.max(product.stock, 1), 10);
    return Array.from({ length: max }, (_, index) => index + 1)
      .map((value) => `<option value="${value}">${value}</option>`)
      .join('');
  }

  function reviewCards(reviews) {
    if (!reviews.items.length) {
      return `<p class="muted" style="padding:18px 0">No written reviews yet. Be the first to share your experience.</p>`;
    }
    return reviews.items
      .map(
        (review) => `
        <article class="review">
          <div class="review__head">
            <span class="review__author">${SV.escapeHtml(review.author)}</span>
            <span class="review__verified">Verified purchase</span>
          </div>
          ${SV.starsHtml(review.rating, null)}
          <h3 class="review__title">${SV.escapeHtml(review.title)}</h3>
          <p class="review__body">${SV.escapeHtml(review.body)}</p>
          <p class="review__date">Reviewed on ${SV.formatDate(review.createdAt)}</p>
        </article>`
      )
      .join('');
  }

  function histogramHtml(reviews) {
    const total = reviews.reviewCount || 0;
    return [5, 4, 3, 2, 1]
      .map((stars) => {
        const count = reviews.histogram[stars] || 0;
        const percent = total ? Math.round((count / total) * 100) : 0;
        return `<div class="histogram__row">
          <span>${stars} star</span>
          <span class="histogram__track"><span class="histogram__fill" style="width:${percent}%"></span></span>
          <span>${percent}%</span>
        </div>`;
      })
      .join('');
  }

  function reviewForm(product) {
    if (!SV.state.user) {
      return `<div class="review-form" id="review-form">
        <h3>Review this product</h3>
        <p class="muted small">Share your thoughts with other customers.</p>
        <a class="btn btn--outline" href="/login?next=${encodeURIComponent(
          window.location.pathname
        )}">Sign in to write a review</a>
      </div>`;
    }

    const stars = [5, 4, 3, 2, 1]
      .map(
        (value) => `
        <input type="radio" id="rating-${value}" name="rating" value="${value}" ${value === 5 ? 'checked' : ''}>
        <label for="rating-${value}" title="${value} star${value > 1 ? 's' : ''}">★</label>`
      )
      .join('');

    return `<form class="review-form" id="review-form">
      <h3>Review this product</h3>
      <p class="muted small" style="margin-bottom:8px">Share your thoughts with other customers.</p>
      <div id="review-error" class="notice-bar" hidden></div>
      <div class="rating-input" role="radiogroup" aria-label="Your rating">${stars}</div>
      <div class="form-group">
        <label class="form-label" for="review-title">Review title</label>
        <input class="form-input" id="review-title" name="title" maxlength="120" required
               placeholder="What stood out to you?">
      </div>
      <div class="form-group">
        <label class="form-label" for="review-body">Your review</label>
        <textarea class="form-input form-textarea" id="review-body" name="body" rows="4" maxlength="2000"
                  required placeholder="Tell us about the quality, fit and value."></textarea>
      </div>
      <button class="btn btn--primary" type="submit">Submit review</button>
    </form>`;
  }

  function render(data) {
    loaded = data;
    const product = data.product;
    const categoryHref = `/search?category=${encodeURIComponent(product.category.slug)}`;
    const discount =
      product.discount > 0
        ? `<span class="discount-badge">-${product.discount}%</span>`
        : '';
    const listPrice =
      product.listPrice > product.price
        ? `<span class="muted small">List price: <s>${SV.money(product.listPrice)}</s></span>`
        : '';
    const savings =
      product.listPrice > product.price
        ? `<span class="price-note">You save ${SV.money(product.listPrice - product.price)} (${product.discount}%)</span>`
        : '';

    const thumbs = [0, 1, 2, 3]
      .map(
        (variant) => `
        <button class="product-thumb${variant === 0 ? ' is-active' : ''}" type="button"
                data-variant="${variant}" aria-label="View image ${variant + 1}">
          <img src="${variantUrl(product.image, variant)}" alt="" width="62" height="62" loading="lazy">
        </button>`
      )
      .join('');

    const features = product.features.length
      ? product.features.map((feature) => `<li>${SV.escapeHtml(feature)}</li>`).join('')
      : `<li>${SV.escapeHtml(product.description || 'Quality-checked by the ShopVerse team.')}</li>`;

    root.innerHTML = `
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="breadcrumbs__sep">›</span>
        <a href="${categoryHref}">${SV.escapeHtml(product.category.name)}</a>
        <span class="breadcrumbs__sep">›</span>
        <span>${SV.escapeHtml(product.title)}</span>
      </nav>

      <div class="product-top">
        <div class="product-gallery">
          <div class="product-thumbs">${thumbs}</div>
          <div class="product-main-image">
            <img id="main-product-image" src="${variantUrl(product.image, 0)}"
                 alt="${SV.escapeHtml(product.title)}" width="900" height="900">
          </div>
        </div>

        <div class="product-info">
          <p class="product-brandline">
            Visit the <a href="/search?q=${encodeURIComponent(product.brand)}">${SV.escapeHtml(product.brand)}</a> store
          </p>
          <h1 class="product-title">${SV.escapeHtml(product.title)}</h1>

          <div class="product-rating-row">
            <span class="rating__big">${Number(product.rating).toFixed(1)}</span>
            ${SV.starsHtml(product.rating, null)}
            <a href="#reviews">${SV.number(product.ratingCount)} ratings</a>
            ${product.badge ? `<span class="badge ${product.badge === 'Best Seller' ? 'badge--best' : 'badge--pick'}">${SV.escapeHtml(product.badge)}</span>` : ''}
          </div>

          <div class="product-price-block">
            ${SV.priceHtml(product.price, 'price--lg')}
            ${discount}
            ${listPrice}
          </div>
          ${savings}
          <p class="muted small" style="margin:2px 0 10px">
            ${product.prime ? `${SV.icon('check', 13, 3)} <strong>prime</strong> · FREE delivery` : 'Standard delivery available'}
          </p>

          <div class="product-coupon">
            ${SV.icon('check-circle', 14)} Save 5% with coupon — applied automatically at checkout
          </div>

          <div class="product-features">
            <h3>About this item</h3>
            <ul>${features}</ul>
          </div>

          <div class="buy-box">
            <div class="buy-box__row">
              ${stockLabel(product)}
              <label class="muted small" for="product-qty">Quantity
                <select class="qty-select" id="product-qty" ${product.stock < 1 ? 'disabled' : ''}>
                  ${quantityOptions(product)}
                </select>
              </label>
            </div>
            <button class="btn btn--cart btn--block" type="button"
                    data-add-to-cart="${product.id}" data-qty-from="product-qty"
                    ${product.stock < 1 ? 'disabled' : ''}>
              Add to Cart
            </button>
            <button class="btn btn--orange btn--block" type="button" id="buy-now"
                    ${product.stock < 1 ? 'disabled' : ''}>
              Buy Now
            </button>
            <div class="buy-box__secure">${SV.icon('lock', 13)} Secure transaction</div>
          </div>

          <div class="delivery-box">
            <div><strong>FREE delivery ${SV.deliveryDate(4)}</strong> on orders over $35.</div>
            <div class="delivery-box__row">${SV.icon('truck', 15)}
              <span>Arrives in 3–5 business days. Order within the next few hours.</span>
            </div>
            <div class="delivery-box__row">${SV.icon('refresh', 15)}
              <span>30-day returns — free and easy, no questions asked.</span>
            </div>
          </div>

          <dl class="meta-list">
            <div><dt>Brand</dt><dd>${SV.escapeHtml(product.brand)}</dd></div>
            <div><dt>Department</dt><dd>${SV.escapeHtml(product.category.name)}</dd></div>
            <div><dt>SKU</dt><dd>${SV.escapeHtml(product.slug)}</dd></div>
            <div><dt>Availability</dt><dd>${product.stock > 0 ? 'In stock' : 'Out of stock'}</dd></div>
          </dl>
        </div>
      </div>

      <div class="product-details-grid">
        <section class="detail-card">
          <h2>Product description</h2>
          <p>${SV.escapeHtml(product.description || 'No description has been written for this product yet.')}</p>
        </section>
        <section class="detail-card">
          <h2>Details</h2>
          <table class="spec-table">
            <tbody>
              <tr><th>Brand</th><td>${SV.escapeHtml(product.brand)}</td></tr>
              <tr><th>Category</th><td>${SV.escapeHtml(product.category.name)}</td></tr>
              <tr><th>Customer rating</th><td>${Number(product.rating).toFixed(1)} out of 5</td></tr>
              <tr><th>Ratings count</th><td>${SV.number(product.ratingCount)}</td></tr>
              <tr><th>Stock</th><td>${SV.number(product.stock)} units</td></tr>
              <tr><th>Delivery</th><td>${product.prime ? 'Prime-style, free over $35' : 'Standard, free over $35'}</td></tr>
            </tbody>
          </table>
        </section>
      </div>

      <section class="reviews-card" id="reviews" aria-labelledby="reviews-heading">
        <div class="reviews-card__header">
          <h2 id="reviews-heading">Customer reviews</h2>
          <a href="#review-form">Write a review</a>
        </div>
        <div class="reviews-layout">
          <aside class="rating-summary">
            <div class="rating-summary__head">
              <span class="rating__big">${Number(product.rating).toFixed(1)}</span>
              <div>
                ${SV.starsHtml(product.rating, null)}
                <div class="muted small">${SV.number(product.ratingCount)} global ratings</div>
              </div>
            </div>
            <div class="histogram">${histogramHtml(data.reviews)}</div>
            <p class="muted small">${data.reviews.reviewCount} written ${data.reviews.reviewCount === 1 ? 'review' : 'reviews'} on ShopVerse.</p>
          </aside>
          <div>
            <div class="reviews-list">${reviewCards(data.reviews)}</div>
            ${reviewForm(product)}
          </div>
        </div>
      </section>

      ${
        data.related.length
          ? `<section class="section-card" style="margin-top:18px" aria-labelledby="related-heading">
              <div class="section-head">
                <h2 id="related-heading">Customers also viewed</h2>
                <a href="${categoryHref}">See all in ${SV.escapeHtml(product.category.name)} →</a>
              </div>
              <div class="product-grid">${data.related.map(SV.productCard).join('')}</div>
            </section>`
          : ''
      }`;

    document.title = `${product.title} — ShopVerse`;
    const description = document.querySelector('meta[name="description"]');
    if (description && product.description) {
      description.setAttribute('content', product.description.slice(0, 155));
    }

    /* Gallery */
    root.querySelectorAll('.product-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const variant = Number(thumb.dataset.variant) || 0;
        const main = document.getElementById('main-product-image');
        if (main) main.src = variantUrl(product.image, variant);
        root.querySelectorAll('.product-thumb').forEach((other) => {
          other.classList.toggle('is-active', other === thumb);
        });
      });
    });

    /* Buy now */
    const buyNow = document.getElementById('buy-now');
    buyNow?.addEventListener('click', async () => {
      const quantity = Number(document.getElementById('product-qty')?.value) || 1;
      buyNow.disabled = true;
      const original = buyNow.textContent;
      buyNow.textContent = 'Taking you to checkout…';
      try {
        const result = await SV.api.post('/api/cart', { productId: product.id, qty: quantity });
        document.dispatchEvent(new CustomEvent('sv:cart', { detail: result.cart }));
        window.location.href = SV.state.user ? '/checkout' : '/login?next=%2Fcheckout';
      } catch (error) {
        SV.toast(error.message, 'error');
        buyNow.disabled = false;
        buyNow.textContent = original;
      }
    });

    /* Review form */
    const reviewFormElement = document.getElementById('review-form');
    if (reviewFormElement && reviewFormElement.tagName === 'FORM') {
      reviewFormElement.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = new FormData(reviewFormElement);
        const errorBox = document.getElementById('review-error');
        const button = reviewFormElement.querySelector('button[type="submit"]');
        const rating = Number(form.get('rating')) || 0;
        const title = String(form.get('title') || '').trim();
        const body = String(form.get('body') || '').trim();

        errorBox.hidden = true;
        if (body.length < 10) {
          errorBox.textContent = 'Your review needs at least 10 characters.';
          errorBox.hidden = false;
          return;
        }

        button.disabled = true;
        button.textContent = 'Publishing…';
        try {
          await SV.api.post(`/api/products/${product.id}/reviews`, { rating, title, body });
          SV.toast('Thanks — your review has been published.', 'success', 'Review posted');
          const refreshed = await SV.api.get(`/api/products/${encodeURIComponent(product.slug)}`);
          render(refreshed);
          document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
          errorBox.textContent = error.message;
          errorBox.hidden = false;
          button.disabled = false;
          button.textContent = 'Submit review';
        }
      });
    }
  }

  function showNotFound(message) {
    root.innerHTML = `
      <div class="empty-state" style="background:#fff;border-radius:12px;padding:60px 20px">
        <div class="empty-state__icon">${SV.icon('search', 30)}</div>
        <h1>Product not found</h1>
        <p>${SV.escapeHtml(message || 'That product may have sold out or been removed from the catalog.')}</p>
        <div class="inline-actions" style="justify-content:center">
          <a class="btn btn--primary" href="/search">Browse the catalog</a>
          <a class="btn btn--outline" href="/">Back to home</a>
        </div>
      </div>`;
  }

  async function load() {
    if (!slug) {
      showNotFound('No product was specified in the URL.');
      return;
    }
    try {
      const data = await SV.api.get(`/api/products/${encodeURIComponent(slug)}`);
      render(data);
    } catch (error) {
      if (error.status === 404) showNotFound(error.message);
      else {
        root.innerHTML = `<div class="empty-state" style="background:#fff;border-radius:12px;padding:60px 20px">
          <div class="empty-state__icon">${SV.icon('info', 30)}</div>
          <h1>Could not load this product</h1>
          <p>${SV.escapeHtml(error.message)}</p>
          <button class="btn btn--primary" type="button" id="retry-product">Try again</button>
        </div>`;
        document.getElementById('retry-product')?.addEventListener('click', load);
      }
    }
  }

  SV.state.ready.then(load).catch(load);
})();
