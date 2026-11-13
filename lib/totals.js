'use strict';

/** Shipping is free over $35; tax is a flat demo rate of 8.25%. */
const FREE_SHIPPING_THRESHOLD = 3500;
const SHIPPING_FEE = 599;
const TAX_RATE = 0.0825;

/**
 * @param {Array<{price:number, qty:number}>} items prices in integer cents
 */
function cartTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = Math.round(subtotal * TAX_RATE);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

module.exports = { cartTotals, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, TAX_RATE };
