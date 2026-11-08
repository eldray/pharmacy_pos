// Sequelize sends DECIMAL and JSONB columns back as strings, and null when a value
// was never set, so every amount read from the API goes through this before maths.
export const safeNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

// The price a patient is actually charged for one unit of a product.
// `sellingPrice` is the retail price set in Product Management; `unitPrice` is only the
// fallback for products that never had one set. Every screen that shows or charges a
// product price (POS, cart, payment, product list) must use this one function so they
// can never disagree.
export const getSellingPrice = (
  product: { sellingPrice?: unknown; unitPrice?: unknown } | null | undefined
): number => {
  const selling = safeNumber(product?.sellingPrice);
  return selling > 0 ? selling : safeNumber(product?.unitPrice);
};
