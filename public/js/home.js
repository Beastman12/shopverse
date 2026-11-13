'use strict';

/* ==========================================================================
   Home page — hero carousel, categories and curated product rails
   ========================================================================== */

(() => {
  const stage = document.getElementById('hero-stage');
  const slides = stage ? Array.from(stage.querySelectorAll('.hero__slide')) : [];
  const dots = Array.from(document.querySelectorAll('[data-dot]'));
  const prev = document.getElementById('hero-prev');
  const next = document.getElementById('hero-next');

  let index = 0;
  let timer = null;
  const AUTOPLAY_MS = 7000;

  function showSlide(nextIndex) {
    if (!slides.length) return;
    index = (nextIndex + slides.length) % slides.length;

    slides.forEach((slide, position) => {
      slide.classList.toggle('is-active', position === index);
      slide.setAttribute('aria-hidden', String(position !== index));
    });

    dots.forEach((dot, position) => {
      const active = position === index;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-selected', String(active));
    });
  }

  function restartAutoplay() {
    if (timer) clearInterval(timer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => showSlide(index + 1), AUTOPLAY_MS);
  }

  if (slides.length > 1) {
    prev?.addEventListener('click', () => {
      showSlide(index - 1);
      restartAutoplay();
    });

    next?.addEventListener('click', () => {
      showSlide(index + 1);
      restartAutoplay();
    });

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        showSlide(Number(dot.dataset.dot) || 0);
        restartAutoplay();
      });
    });

    stage?.addEventListener('mouseenter', () => timer && clearInterval(timer));
    stage?.addEventListener('mouseleave', restartAutoplay);
    stage?.addEventListener('focusin', () => timer && clearInterval(timer));
    stage?.addEventListener('focusout', restartAutoplay);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (timer) clearInterval(timer);
      } else {
        restartAutoplay();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!stage) return;
      const tag = (event.target.tagName || '').toLowerCase();
      if (['input', 'select', 'textarea', 'button', 'a'].includes(tag) || event.target.isContentEditable) {
        return;
      }
      const rect = stage.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (!visible) return;
      if (event.key === 'ArrowLeft') {
        showSlide(index - 1);
        restartAutoplay();
      }
      if (event.key === 'ArrowRight') {
        showSlide(index + 1);
        restartAutoplay();
      }
    });

    showSlide(0);
    restartAutoplay();
  }

  const categoryGrid = document.getElementById('category-grid');
  const dealsRail = document.getElementById('deals-rail');
  const featuredGrid = document.getElementById('featured-grid');
  const topGrid = document.getElementById('top-grid');
  const newGrid = document.getElementById('new-grid');

  if (dealsRail) dealsRail.innerHTML = SV.skeletonCards(5);
  if (featuredGrid) featuredGrid.innerHTML = SV.skeletonCards(8);
  if (topGrid) topGrid.innerHTML = SV.skeletonCards(4);
  if (newGrid) newGrid.innerHTML = SV.skeletonCards(4);

  function renderCategories(categories) {
    if (!categoryGrid) return;
    categoryGrid.innerHTML = categories
      .map(
        (category) => `
        <a class="category-tile fade-up" href="/search?category=${encodeURIComponent(category.slug)}">
          <img src="/img/c/${encodeURIComponent(category.slug)}.svg"
               alt="${SV.escapeHtml(category.name)}" loading="lazy" width="400" height="260">
          <span>${SV.escapeHtml(category.name)}</span>
        </a>`
      )
      .join('');
  }

  function renderGrid(target, products) {
    if (!target) return;
    target.innerHTML = products.length
      ? products.map(SV.productCard).join('')
      : '<p class="muted">Nothing here yet — check back soon.</p>';
  }

  function renderDeals(products) {
    if (!dealsRail) return;
    dealsRail.innerHTML = products.length
      ? products
          .map(
            (product) => `
            <div class="deal-card">
              ${SV.productCard(product)}
            </div>`
          )
          .join('')
      : '<p class="muted">No deals right now — new offers land every week.</p>';
  }

  SV.state.ready
    .then(() => SV.api.get('/api/home'))
    .then((data) => {
      renderCategories(data.categories);
      renderDeals(data.deals);
      renderGrid(featuredGrid, data.featured);
      renderGrid(topGrid, data.topRated.slice(0, 4));
      renderGrid(newGrid, data.newArrivals.slice(0, 4));
    })
    .catch((error) => {
      SV.toast(error.message || 'Could not load the storefront.', 'error');
      [categoryGrid, dealsRail, featuredGrid, topGrid, newGrid].forEach((node) => {
        if (node) {
          node.innerHTML = '<p class="muted">We could not load this section. Please refresh.</p>';
        }
      });
    });
})();
