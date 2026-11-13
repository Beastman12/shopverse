'use strict';

const { db } = require('./index');
const { seed } = require('./seed');

const tables = [
  'reviews',
  'order_items',
  'orders',
  'cart_items',
  'sessions',
  'products',
  'categories',
  'users',
];

for (const table of tables) {
  db.exec(`DELETE FROM ${table}`);
}
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','categories','products','cart_items','orders','order_items','reviews','sessions')");

seed({ force: true })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Reset failed:', error);
    process.exit(1);
  });
