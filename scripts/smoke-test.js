'use strict';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

const results = [];
function check(name, condition, extra = '') {
  results.push({ name, ok: Boolean(condition), extra });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
}

async function api(path, options = {}, cookie = '') {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(options.headers || {}),
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const setCookie = res.headers.getSetCookie?.() || [];
  return { status: res.status, body, setCookie };
}

function sessionCookie(response) {
  return response.setCookie.map((value) => value.split(';')[0]).join('; ');
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);

  const health = await api('/api/health');
  check('Health endpoint', health.status === 200 && health.body.status === 'ok');

  const home = await api('/api/home');
  check(
    'Home payload',
    home.status === 200 && home.body.categories.length === 8 && home.body.deals.length > 0,
    `${home.body?.products?.length ?? ''}`
  );

  const search = await api('/api/products?q=coffee&sort=price-asc');
  check('Search returns coffee', search.status === 200 && search.body.total >= 1);
  check('Search sorted ascending', search.body.products[0].price <= search.body.products.at(-1).price);

  const detail = await api('/api/products/highland-roast-coffee-2lb');
  check('Product detail', detail.status === 200 && detail.body.product.slug === 'highland-roast-coffee-2lb');
  check('Related products', Array.isArray(detail.body.related));

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'demo@shopverse.dev', password: 'Demo123!' }),
  });
  check('Customer login', login.status === 200 && login.body.user.email === 'demo@shopverse.dev');
  const cookie = sessionCookie(login);

  const cart = await api('/api/cart', {}, cookie);
  check('Cart loads', cart.status === 200 && Array.isArray(cart.body.cart.items));

  const add = await api(
    '/api/cart',
    { method: 'POST', body: JSON.stringify({ productId: search.body.products[0].id, qty: 2 }) },
    cookie
  );
  check('Add to cart', add.status === 201 && add.body.cart.count >= 2);

  const order = await api(
    '/api/orders',
    {
      method: 'POST',
      body: JSON.stringify({
        paymentMethod: 'card',
        shipping: {
          fullName: 'Demo Shopper',
          email: 'demo@shopverse.dev',
          address: '14 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          zip: '400020',
          country: 'India',
        },
      }),
    },
    cookie
  );
  check('Place order', order.status === 201 && Boolean(order.body.order.number), order.body?.error);

  const orders = await api('/api/orders', {}, cookie);
  check('Order history', orders.status === 200 && orders.body.orders.length >= 1);

  if (order.body?.order) {
    const cancel = await api(
      `/api/orders/${order.body.order.number}/cancel`,
      { method: 'POST' },
      cookie
    );
    check('Cancel processing order', cancel.status === 200 && cancel.body.order.status === 'Cancelled');
  }

  const adminLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@shopverse.dev', password: 'Admin123!' }),
  });
  const adminCookie = sessionCookie(adminLogin);
  check('Admin login', adminLogin.status === 200 && adminLogin.body.user.role === 'admin');

  const stats = await api('/api/admin/stats', {}, adminCookie);
  check('Admin stats', stats.status === 200 && stats.body.stats.products === 56);

  const created = await api(
    '/api/admin/products',
    {
      method: 'POST',
      body: JSON.stringify({
        title: 'Smoke Test Widget',
        brand: 'TestLabs',
        categoryId: 1,
        price: '19.99',
        listPrice: '24.99',
        stock: 5,
        description: 'Created by the smoke test.',
        features: 'Feature one\nFeature two',
        prime: true,
      }),
    },
    adminCookie
  );
  check('Admin creates product', created.status === 201 && Boolean(created.body.product));

  if (created.body?.product) {
    const id = created.body.product.id;
    const updated = await api(
      `/api/admin/products/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Smoke Test Widget v2',
          brand: 'TestLabs',
          categoryId: 1,
          price: '17.99',
          listPrice: '24.99',
          stock: 9,
          description: 'Updated by the smoke test.',
          features: 'Feature one',
        }),
      },
      adminCookie
    );
    check('Admin updates product', updated.status === 200 && updated.body.product.title.endsWith('v2'));

    const removed = await api(`/api/admin/products/${id}`, { method: 'DELETE' }, adminCookie);
    check('Admin deletes product', removed.status === 200);
  }

  const unauthorized = await api('/api/admin/stats', {}, cookie);
  check('Admin routes reject customers', unauthorized.status === 403);

  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
