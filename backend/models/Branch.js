const { sequelize, DataTypes } = require('../config/database');
const { Op } = require('sequelize');

const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('warehouse', 'branch'),
    allowNull: false,
    defaultValue: 'branch'
  },
  address: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  isMain: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'branches',
  timestamps: true,
  indexes: [
    // Exactly one home branch. Per-branch stock, staff assignment and "which
    // branch is this till" all assume a single main, and two of them made the
    // answer depend on which row Postgres happened to scan first.
    { name: 'branches_one_main', unique: true, fields: ['isMain'], where: { isMain: true } }
  ]
});

// The single place that decides which branch a till works in, the same way
// Company.getCompany decides which company row is "the" company.
Branch.getMainBranch = async function () {
  return this.findOne({ where: { isMain: true }, order: [['id', 'ASC']] });
};

/**
 * Guarantees a home branch exists. This is structure, not demo data, so it runs
 * in production too: an installation with no main branch has nowhere to put
 * stock and no branch to attribute a sale to.
 */
Branch.ensureMainBranch = async function ({ name, code = 'MAIN' } = {}) {
  const main = await this.getMainBranch();
  if (main) return main;

  // A branch created by hand before this guard existed is already the home
  // branch in practice; promote it rather than adding a second one.
  const first = await this.findOne({ order: [['id', 'ASC']] });
  if (first) {
    await first.update({ isMain: true });
    return first;
  }

  return this.create({
    name: name || 'Main Branch',
    code,
    type: 'branch',
    isMain: true,
    status: 'active'
  });
};

/**
 * The branch a document belongs to when the client did not name one. Single-till
 * installs never send a branchId, and a null there left sales and staff with no
 * branch to report against.
 */
Branch.resolveBranchId = async function (branchId) {
  if (branchId) return branchId;
  const main = await this.getMainBranch();
  return main ? main.id : null;
};

/**
 * Clears the flag on every other branch. Call this inside the same transaction
 * as the write that sets it, before that write, so the unique index is never
 * briefly violated.
 */
Branch.clearOtherMains = async function (keepId, transaction) {
  await this.update(
    { isMain: false },
    { where: { isMain: true, ...(keepId ? { id: { [Op.ne]: keepId } } : {}) }, transaction }
  );
};

module.exports = Branch;
