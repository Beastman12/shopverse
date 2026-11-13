'use strict';

/* ==========================================================================
   Shared header / footer + global interactions
   ========================================================================== */

(() => {
  const headerHost = document.getElementById('site-header');
  const footerHost = document.getElementById('site-footer');

  function logoHtml() {
    return `
      <span class="logo__word">shop<span>verse</span></span>
      <svg class="logo__smile" viewBox="0 0 100 20" fill="none" aria-hidden="true">
        <path d="M3 4c20 13 58 15 84 5" stroke="#febd69" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M80 3.5 89 7l-7.5 6" stroke="#febd69" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }

  function headerHtml() {
    return `
      <header class="site-header">
        <div class="header-main">
          <div class="container header-main__inner">
            <a class="logo" href="/" aria-label="ShopVerse home">${logoHtml()}</a>

            <button class="header-deliver" type="button" id="deliver-btn">
              ${SV.icon('pin', 18)}
              <span>
                <span class="header-deliver__label">Deliver to</span>
                <span class="header-deliver__value">Mumbai 400020</span>
              </span>
            </button>

            <form class="header-search" action="/search" method="get" role="search">
              <label class="sr-only" for="search-category">Search category</label>
              <select class="header-search__select" id="search-category" name="category">
                <option value="">All</option>
              </select>
              <label class="sr-only" for="site-search">Search ShopVerse</label>
              <input class="header-search__input" id="site-search" type="search" name="q"
                     placeholder="Search ShopVerse" autocomplete="off">
              <button class="header-search__button" type="submit" aria-label="Search">
                ${SV.icon('search', 21, 2.4)}
              </button>
            </form>

            <div class="header-actions">
              <div class="account-wrap" id="account-wrap">
                <button class="header-action header-action--account" type="button" id="account-btn"
                        aria-expanded="false" aria-controls="account-menu">
                  <span class="header-action__top" id="account-greeting">Hello, sign in</span>
                  <span class="header-action__bottom">Account &amp; Lists ${SV.icon('chevron', 14)}</span>
                </button>
                <div class="account-menu" id="account-menu"></div>
              </div>

              <a class="header-action header-action--orders" href="/orders">
                <span class="header-action__top">Returns</span>
                <span class="header-action__bottom">&amp; Orders</span>
              </a>

              <a class="header-action header-action--cart" href="/cart" aria-label="Shopping cart">
                <span class="header-cart">
                  ${SV.icon('cart', 32, 1.7)}
                  <span class="header-cart__count" data-cart-count>0</span>
                </span>
                <span class="header-cart__label">Cart</span>
              </a>
            </div>
          </div>
        </div>

        <nav class="header-nav" aria-label="Store categories">
          <div class="container header-nav__inner" id="nav-links"></div>
        </nav>
      </header>`;
  }

  function footerHtml() {
    return `
      <footer class="site-footer">
        <button class="footer-top" type="button" id="back-to-top">Back to top</button>
        <div class="footer-main">
          <div class="container footer-grid">
            <div class="footer-col footer-brand">
              <a class="logo" href="/" aria-label="ShopVerse home">${logoHtml()}</a>
              <p>A full-stack demo storefront built with Node.js, Express and SQLite. Browse the
                 catalog, manage a cart, place an order and track it from the dashboard.</p>
              <div class="footer-badges">
                <span class="footer-badge">Node.js</span>
                <span class="footer-badge">Express</span>
                <span class="footer-badge">SQLite</span>
                <span class="footer-badge">Vanilla JS</span>
              </div>
            </div>

            <div class="footer-col">
              <h3>Shop by department</h3>
              <ul id="footer-categories">
                <li><a href="/search?category=electronics">Electronics</a></li>
                <li><a href="/search?category=fashion">Fashion</a></li>
                <li><a href="/search?category=home">Home &amp; Kitchen</a></li>
                <li><a href="/search?category=books">Books</a></li>
                <li><a href="/search?category=grocery">Grocery</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h3>Your account</h3>
              <ul>
                <li><a href="/orders">Your orders</a></li>
                <li><a href="/cart">Your cart</a></li>
                <li><a href="/login">Sign in</a></li>
                <li><a href="/register">Create an account</a></li>
                <li><a href="/admin">Seller dashboard</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h3>About ShopVerse</h3>
              <ul>
                <li><a href="/search?deal=1">Today's deals</a></li>
                <li><a href="/search?sort=newest">New arrivals</a></li>
                <li><a href="/search?prime=1">Prime-style delivery</a></li>
                <li><a href="mailto:ng522884@gmail.com">Contact the developer</a></li>
                <li><a href="https://github.com/Beastman12/shopverse" target="_blank" rel="noopener">Source on GitHub</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="container footer-bottom__inner">
            <span>© <span id="footer-year">2026</span> ShopVerse. A portfolio project by Niranjan Gupta.</span>
            <span>Demo storefront — orders and payments are simulated.</span>
          </div>
        </div>
      </footer>`;
  }

  function navHtml(categories) {
    const links = categories
      .slice(0, 5)
      .map(
        (category) =>
          `<a class="nav-link" href="/search?category=${encodeURIComponent(category.slug)}">${SV.escapeHtml(
            category.name
          )}</a>`
      )
      .join('');

    return `
      <a class="nav-link nav-link--all" href="/search">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        All
      </a>
      ${links}
      <a class="nav-link" href="/search?deal=1">Today's Deals</a>
      <a class="nav-link" href="/search?sort=newest">New Releases</a>
      <a class="nav-link" href="/search?prime=1">Prime Delivery</a>
      <a class="nav-link" href="/search?category=toys">Toys &amp; Games</a>`;
  }

  function accountMenuHtml(user) {
    if (!user) {
      return `
        <div class="account-menu__header">
          <strong>Welcome to ShopVerse</strong>
          <span>Sign in for the full experience</span>
        </div>
        <a href="/login">Sign in</a>
        <a href="/register">Create your ShopVerse account</a>
        <div class="account-menu__divider"></div>
        <a href="/orders">Your Orders</a>
        <a href="/cart">Your Cart</a>`;
    }

    return `
      <div class="account-menu__header">
        <strong>Hello, ${SV.escapeHtml(user.name.split(' ')[0])}</strong>
        <span>${SV.escapeHtml(user.email)}</span>
      </div>
      <a href="/orders">Your Orders</a>
      <a href="/cart">Your Cart</a>
      ${
        user.role === 'admin'
          ? `<a href="/admin">Seller Dashboard <span class="account-menu__badge">Admin</span></a>`
          : ''
      }
      <div class="account-menu__divider"></div>
      <button type="button" id="signout-btn">Sign out</button>`;
  }

  function paintHeader() {
    const user = SV.state.user;
    const greeting = document.getElementById('account-greeting');
    const menu = document.getElementById('account-menu');
    const nav = document.getElementById('nav-links');
    const select = document.getElementById('search-category');

    if (greeting) {
      greeting.textContent = user ? `Hello, ${user.name.split(' ')[0]}` : 'Hello, sign in';
    }
    if (menu) menu.innerHTML = accountMenuHtml(user);
    if (nav) nav.innerHTML = navHtml(SV.state.categories);

    if (select) {
      const current = SV.qs('category') || '';
      select.innerHTML =
        '<option value="">All</option>' +
        SV.state.categories
          .map(
            (category) =>
              `<option value="${encodeURIComponent(category.slug)}"${
                current === category.slug ? ' selected' : ''
              }>${SV.escapeHtml(category.name)}</option>`
          )
          .join('');
    }

    const signout = document.getElementById('signout-btn');
    if (signout) {
      signout.addEventListener('click', async () => {
        try {
          await SV.api.post('/api/auth/logout');
          SV.toast('You have been signed out.', 'success');
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        } catch (error) {
          SV.toast(error.message, 'error');
        }
      });
    }
  }

  async function refreshCart() {
    try {
      const { cart } = await SV.api.get('/api/cart');
      document.dispatchEvent(new CustomEvent('sv:cart', { detail: cart }));
      return cart;
    } catch {
      return null;
    }
  }

  SV.refreshCart = refreshCart;

  if (headerHost) {
    headerHost.innerHTML = headerHtml();
  }
  if (footerHost) {
    footerHost.innerHTML = footerHtml();
  }

  const footerYear = document.getElementById('footer-year');
  if (footerYear) footerYear.textContent = String(new Date().getFullYear());

  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const deliverBtn = document.getElementById('deliver-btn');
  if (deliverBtn) {
    deliverBtn.addEventListener('click', () => {
      SV.toast('This demo delivers everywhere in India — enjoy free shipping over $35.', 'info', 'Delivery');
    });
  }

  /* Account dropdown */
  const accountBtn = document.getElementById('account-btn');
  const accountMenu = document.getElementById('account-menu');

  function closeAccountMenu() {
    accountMenu?.classList.remove('is-open');
    accountBtn?.setAttribute('aria-expanded', 'false');
  }

  if (accountBtn && accountMenu) {
    accountBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = accountMenu.classList.toggle('is-open');
      accountBtn.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', (event) => {
      if (!accountMenu.contains(event.target) && !accountBtn.contains(event.target)) {
        closeAccountMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAccountMenu();
    });
  }

  /* Add-to-cart delegation (works on every page) */
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-add-to-cart]');
    if (!button) return;

    const productId = Number(button.dataset.addToCart);
    let qty = 1;

    if (button.dataset.qtyFrom) {
      const source = document.getElementById(button.dataset.qtyFrom);
      if (source) qty = Math.max(1, Number(source.value) || 1);
    }

    const original = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Adding…';

    try {
      const result = await SV.api.post('/api/cart', { productId, qty });
      document.dispatchEvent(new CustomEvent('sv:cart', { detail: result.cart }));
      if (button.dataset.afterAdd === 'stay') {
        SV.toast(result.message, 'success', 'Added to cart');
      } else {
        SV.toast(result.message, 'success', 'Added to cart');
      }
    } catch (error) {
      SV.toast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  });

  /* Initial data: session, categories and cart count */
  SV.state.ready = (async () => {
    const [me, categories, cart] = await Promise.allSettled([
      SV.api.get('/api/auth/me'),
      SV.api.get('/api/categories'),
      SV.api.get('/api/cart'),
    ]);

    if (me.status === 'fulfilled') SV.state.user = me.value.user;
    if (categories.status === 'fulfilled') SV.state.categories = categories.value.categories;
    if (cart.status === 'fulfilled') {
      document.dispatchEvent(new CustomEvent('sv:cart', { detail: cart.value.cart }));
    }

    paintHeader();
    return { user: SV.state.user, categories: SV.state.categories };
  })();
})();
