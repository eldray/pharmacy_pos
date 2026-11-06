// Atomic stock movement.
//
// Every stock mutation in this app used to be findByPk -> update(quantity +/- n)
// with no lock, so two tills that both read "1 left" both passed the
// availability check and both wrote 0 — the same unit sold twice. Callers must
// pass their transaction; these helpers take the row lock for its duration and
// refuse the whole transaction instead of clamping the shortfall to zero.

const Product = require('../models/Product');
const { AppError } = require('./errors');

function positiveQty(value, label = 'quantity') {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new AppError(`Invalid ${label}: ${value}`, 400);
  }
  return qty;
}

async function lockProduct(productId, transaction, { allowMissing = false } = {}) {
  if (!transaction) throw new AppError('Stock movement requires a transaction', 500);
  const product = await Product.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!product && !allowMissing) {
    throw new AppError(`Product ${productId} not found`, 404);
  }
  return product;
}

// Sell / issue stock. Throws when the locked row no longer covers the request.
async function deductStock(productId, quantity, { transaction, allowMissing = false } = {}) {
  const qty = positiveQty(quantity);
  const product = await lockProduct(productId, transaction, { allowMissing });
  if (!product) return null;

  if (Number(product.quantity) < qty) {
    throw new AppError(
      `Not enough stock for ${product.name}. Available: ${product.quantity}, requested: ${qty}`,
      400
    );
  }

  await product.update({ quantity: Number(product.quantity) - qty }, { transaction });
  return product;
}

// Receive / return / transfer-in stock.
async function addStock(productId, quantity, { transaction, allowMissing = false, extra = {} } = {}) {
  const qty = positiveQty(quantity);
  const product = await lockProduct(productId, transaction, { allowMissing });
  if (!product) return null;

  await product.update({ quantity: Number(product.quantity) + qty, ...extra }, { transaction });
  return product;
}

module.exports = { deductStock, addStock, lockProduct, positiveQty };
