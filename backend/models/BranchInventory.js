const { sequelize, DataTypes } = require('../config/database');

const BranchInventory = sequelize.define('BranchInventory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'branches', key: 'id' }
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'products', key: 'id' }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  reorderLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  rackLocation: DataTypes.STRING
}, {
  tableName: 'branch_inventories',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['branchId', 'productId'] }
  ]
});

/**
 * Gives a branch a stock row for every product it has none for, carrying the
 * product's own quantity. Products predating the multi-branch module only have
 * `products.quantity`, so without this the Branches page and the low-stock
 * alerts read zero for stock the POS is still selling. Existing rows are never
 * touched — a branch's counted quantity outranks the catalogue's.
 * Returns the number of rows added.
 */
BranchInventory.syncFromProducts = async function (branchId, transaction) {
  const Product = require('./Product');
  const [products, stocked] = await Promise.all([
    Product.findAll({ attributes: ['id', 'quantity'], transaction }),
    this.findAll({ where: { branchId }, attributes: ['productId'], transaction }),
  ]);
  const hasRow = new Set(stocked.map((r) => r.productId));
  const missing = products
    .filter((p) => !hasRow.has(p.id))
    .map((p) => ({ branchId, productId: p.id, quantity: p.quantity || 0 }));
  if (!missing.length) return 0;
  await this.bulkCreate(missing, { ignoreDuplicates: true, transaction });
  return missing.length;
};

module.exports = BranchInventory;
