'use strict';

/**
 * Every product image in ShopVerse is a generated SVG. That keeps the demo
 * fully offline (no external image hosts) while still giving each product a
 * distinct, branded look. Icons are Feather/Lucide-style paths (MIT).
 */

const ICONS = {
  electronics: [
    '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
    '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    '<circle cx="12" cy="12" r="6"/><path d="M12 10v2l1 1M16.13 7.66l-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05M7.88 16.36l.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05"/>',
    '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    '<rect width="16" height="20" x="4" y="2" rx="2"/><circle cx="12" cy="14" r="4"/><path d="M12 6h.01"/>',
    '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M8 13h.01M12 13h.01M16 13h.01M7 17h10"/>',
    '<rect x="1" y="6" width="18" height="12" rx="2"/><path d="M23 10v4"/><path d="M5 10v4"/>',
    '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  ],
  fashion: [
    '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
    '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    '<circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2M2.5 13 5 7c.7-1.3 1.4-2 3-2M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>',
    '<circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 1"/><path d="M9 2h6"/>',
    '<path d="M4 16c2.5-4 4.5-5 7-5s4.5 1 7 5"/><path d="M4 16l-1.5 4M20 16l1.5 4M8 10l2-7M16 10l-2-7"/>',
    '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10Z"/><path d="M8 6V4a4 4 0 0 1 8 0v2"/><path d="M8 11h8v4H8z"/>',
  ],
  home: [
    '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>',
    '<path d="M8 2h8l4 10H4L8 2Z"/><path d="M12 12v6"/><path d="M8 22v-2c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2H8Z"/>',
    '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
    '<path d="M2 12h20M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8M4 8h16M6 4h12"/>',
    '<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/>',
  ],
  books: [
    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  ],
  beauty: [
    '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    '<path d="M12 2.7s6 6.3 6 10.3a6 6 0 0 1-12 0c0-4 6-10.3 6-10.3Z"/>',
    '<path d="M9 2h6v5l-1 2v11a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V9L7 7V2Z"/><path d="M9 12h6"/>',
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  ],
  sports: [
    '<rect x="2" y="9" width="4" height="6" rx="1"/><rect x="18" y="9" width="4" height="6" rx="1"/><rect x="6" y="6" width="3" height="12" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/>',
    '<path d="M9 2h6v3l1 2v11a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V7l1-2V2Z"/><path d="M9 9h6"/>',
    '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10Z"/><path d="M8 6V4a4 4 0 0 1 8 0v2"/><path d="M8 11h8v4H8z"/>',
    '<path d="M2 12h4l2-7 4 14 2-7h6"/>',
    '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  ],
  toys: [
    '<path d="M19.4 7.9a1 1 0 0 0 1.9.5l.5-1.9a2.5 2.5 0 0 0-3.2 3.1c.4 1 1.5 1.4 2.4 1.1"/><path d="M4.6 16.1a1 1 0 0 0-1.9-.5l-.5 1.9a2.5 2.5 0 0 0 3.2-3.1c-.4-1-1.5-1.4-2.4-1.1"/><path d="M7.9 4.6a1 1 0 0 0-.5-1.9L5.5 3.2a2.5 2.5 0 0 0 3.1 3.2c1-.4 1.4-1.5 1.1-2.4"/><path d="M16.1 19.4a1 1 0 0 0 .5 1.9l1.9.5a2.5 2.5 0 0 0-3.1-3.2c-1 .4-1.4 1.5-1.1 2.4"/><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59c-.18 1.6-.36 3.22-.36 4.85 0 1.44 1.16 2.61 2.6 2.61 1.44 0 2.61-1.17 2.61-2.61V13h8.9v.44c0 1.44 1.17 2.61 2.61 2.61 1.44 0 2.6-1.17 2.6-2.61 0-1.63-.18-3.25-.36-4.85A4 4 0 0 0 17.32 5z"/>',
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    '<circle cx="12" cy="10" r="6"/><path d="M8 16c-2 1-3 3-3 5h14c0-2-1-4-3-5M9 10h.01M15 10h.01M12 13v2"/>',
  ],
  grocery: [
    '<path d="m5 11 4-7M19 11l-4-7M2 11h20M3.5 11l1.6 8.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-8.4M9 11l1 9M15 11l-1 9"/>',
    '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>',
    '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2.5 2 4.5 2 8a7 7 0 0 1-7 7Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    '<path d="M12 2.7s6 6.3 6 10.3a6 6 0 0 1-12 0c0-4 6-10.3 6-10.3Z"/>',
  ],
};

const PALETTES = {
  electronics: [
    ['#dbeafe', '#bfdbfe', '#1e3a8a'],
    ['#e0e7ff', '#c7d2fe', '#312e81'],
    ['#cffafe', '#a5f3fc', '#164e63'],
  ],
  fashion: [
    ['#ffe4e6', '#fecdd3', '#881337'],
    ['#fef3c7', '#fde68a', '#78350f'],
    ['#ede9fe', '#ddd6fe', '#4c1d95'],
  ],
  home: [
    ['#d1fae5', '#a7f3d0', '#064e3b'],
    ['#ccfbf1', '#99f6e4', '#134e4a'],
    ['#ecfccb', '#d9f99d', '#365314'],
  ],
  books: [
    ['#e0e7ff', '#c7d2fe', '#1e1b4b'],
    ['#fae8ff', '#f5d0fe', '#4a044e'],
    ['#ffe4e6', '#fecdd3', '#881337'],
  ],
  beauty: [
    ['#fce7f3', '#fbcfe8', '#831843'],
    ['#ffe4e6', '#fecdd3', '#9f1239'],
    ['#fae8ff', '#e9d5ff', '#581c87'],
  ],
  sports: [
    ['#ffedd5', '#fed7aa', '#7c2d12'],
    ['#ecfccb', '#d9f99d', '#3f6212'],
    ['#cffafe', '#a5f3fc', '#155e75'],
  ],
  toys: [
    ['#fef9c3', '#fef08a', '#713f12'],
    ['#ffedd5', '#fed7aa', '#7c2d12'],
    ['#dbeafe', '#bfdbfe', '#1e3a8a'],
  ],
  grocery: [
    ['#dcfce7', '#bbf7d0', '#14532d'],
    ['#fef3c7', '#fde68a', '#78350f'],
    ['#ecfccb', '#d9f99d', '#365314'],
  ],
};

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

/**
 * Build the SVG for a product card. Deterministic from the slug so the same
 * product always renders identically, with `variant` used for gallery thumbs.
 */
function renderProductImage(product, variant = 0) {
  const category = product.category_slug || 'electronics';
  const seed = hashString(`${product.slug}:${variant}`);
  const icons = ICONS[category] || ICONS.electronics;
  const palette = pick(PALETTES[category] || PALETTES.electronics, seed);
  const icon = pick(icons, seed, variant);
  const angle = 20 + (seed % 60);
  const brand = String(product.brand || 'SHOPVERSE').toUpperCase();
  const title = String(product.title || '');
  const shortTitle = title.length > 42 ? `${title.slice(0, 40)}…` : title;
  const blobX = 90 + (seed % 520);
  const blobY = 80 + ((seed >> 5) % 380);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="${escapeXmlAttr(title)}">
  <defs>
    <linearGradient id="bg" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0%" stop-color="${palette[0]}"/>
      <stop offset="100%" stop-color="${palette[1]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="${palette[2]}" fill-opacity="0.12"/>
    </pattern>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <rect width="800" height="800" fill="url(#dots)"/>
  <circle cx="${blobX}" cy="${blobY}" r="250" fill="#ffffff" fill-opacity="0.32"/>
  <circle cx="${800 - blobX / 2}" cy="${620 - blobY / 4}" r="150" fill="${palette[2]}" fill-opacity="0.07"/>
  <ellipse cx="400" cy="420" rx="260" ry="230" fill="url(#glow)"/>
  <g transform="translate(400 380) scale(13.5) translate(-12 -12)" fill="none" stroke="${palette[2]}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" opacity="0.82">
    ${icon}
  </g>
  <text x="56" y="86" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="5" fill="${palette[2]}" fill-opacity="0.55">${escapeXmlAttr(brand)}</text>
  <text x="56" y="730" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="600" fill="${palette[2]}" fill-opacity="0.8">${escapeXmlAttr(shortTitle)}</text>
  <text x="56" y="766" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="4" fill="${palette[2]}" fill-opacity="0.4">SHOPVERSE</text>
</svg>`;
}

function renderCategoryImage(category) {
  const seed = hashString(category.slug);
  const palette = pick(PALETTES[category.slug] || PALETTES.electronics, seed);
  const icon = pick(ICONS[category.slug] || ICONS.electronics, seed);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="400" height="260" role="img" aria-label="${escapeXmlAttr(category.name)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette[0]}"/>
      <stop offset="100%" stop-color="${palette[1]}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="260" fill="url(#bg)"/>
  <circle cx="330" cy="40" r="130" fill="#ffffff" fill-opacity="0.35"/>
  <circle cx="40" cy="240" r="110" fill="${palette[2]}" fill-opacity="0.07"/>
  <g transform="translate(200 112) scale(4.2) translate(-12 -12)" fill="none" stroke="${palette[2]}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity="0.78">
    ${icon}
  </g>
  <text x="200" y="232" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="${palette[2]}" fill-opacity="0.8">${escapeXmlAttr(category.name)}</text>
</svg>`;
}

function escapeXmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { renderProductImage, renderCategoryImage, hashString };
