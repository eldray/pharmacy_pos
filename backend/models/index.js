const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

const db = {};

// Load all model files except this one
fs.readdirSync(__dirname)
    .filter(file => {
        return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js');
    })
    .forEach(file => {
        const model = require(path.join(__dirname, file));
        db[model.name] = model;
    });

// ==================== CENTRALIZED ASSOCIATIONS ====================

// --- Lab Module ---
db.LabTransaction.hasMany(db.LabTest, { foreignKey: 'labTransactionId', as: 'labTests' });
db.LabTest.belongsTo(db.LabTransaction, { foreignKey: 'labTransactionId', as: 'transaction' });

db.LabTransaction.belongsTo(db.User, { foreignKey: 'requestedBy', as: 'requester' });
db.LabTest.belongsTo(db.User, { foreignKey: 'performedBy', as: 'performer' });

// --- Inventory Module ---
db.Product.hasMany(db.InventoryLog, { foreignKey: 'productId', as: 'inventoryLogs' });
db.InventoryLog.belongsTo(db.Product, { foreignKey: 'productId' });

db.User.hasMany(db.InventoryLog, { foreignKey: 'userId', as: 'inventoryLogs' });
db.InventoryLog.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

// --- Purchase Orders Module ---
db.Supplier.hasMany(db.PurchaseOrder, { foreignKey: 'supplierId', as: 'purchaseOrders' });
db.PurchaseOrder.belongsTo(db.Supplier, { foreignKey: 'supplierId' });

// --- POS Transactions Module ---
db.User.hasMany(db.Transaction, { foreignKey: 'cashierId', as: 'transactions' });
db.Transaction.belongsTo(db.User, { foreignKey: 'cashierId', as: 'cashier' });

// --- Multi-Branch & Inventory Module ---
db.Branch.hasMany(db.BranchInventory, { foreignKey: 'branchId', as: 'inventories' });
db.BranchInventory.belongsTo(db.Branch, { foreignKey: 'branchId', as: 'branch' });
db.Product.hasMany(db.BranchInventory, { foreignKey: 'productId', as: 'branchInventories' });
db.BranchInventory.belongsTo(db.Product, { foreignKey: 'productId', as: 'product' });

db.Branch.hasMany(db.StockTransfer, { foreignKey: 'fromBranchId', as: 'outgoingTransfers' });
db.Branch.hasMany(db.StockTransfer, { foreignKey: 'toBranchId', as: 'incomingTransfers' });
db.StockTransfer.belongsTo(db.Branch, { foreignKey: 'fromBranchId', as: 'fromBranch' });
db.StockTransfer.belongsTo(db.Branch, { foreignKey: 'toBranchId', as: 'toBranch' });

// --- Stock Transfers (extend existing block) ---
db.StockTransfer.belongsTo(db.User, { foreignKey: 'requestedById', as: 'requester' });
db.StockTransfer.belongsTo(db.User, { foreignKey: 'approvedById', as: 'approver' });

// --- HR & Staff Module ---
db.User.hasOne(db.StaffProfile, { foreignKey: 'userId', as: 'staffProfile' });
db.StaffProfile.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
db.Branch.hasMany(db.StaffProfile, { foreignKey: 'branchId', as: 'staff' });
db.StaffProfile.belongsTo(db.Branch, { foreignKey: 'branchId', as: 'branch' });

// --- Sales Orders & Insurance Module ---
db.User.hasMany(db.SalesOrder, { foreignKey: 'createdById', as: 'createdOrders' });
db.SalesOrder.belongsTo(db.User, { foreignKey: 'createdById', as: 'creator' });
db.SalesOrder.belongsTo(db.User, { foreignKey: 'cashierId', as: 'cashier' });
db.SalesOrder.belongsTo(db.Branch, { foreignKey: 'branchId', as: 'branch' });

db.Product.hasMany(db.ProductBatch, { foreignKey: 'productId', as: 'batches' });
db.ProductBatch.belongsTo(db.Product, { foreignKey: 'productId', as: 'product' });
db.Branch.hasMany(db.ProductBatch, { foreignKey: 'branchId', as: 'batches' });

db.InsuranceProvider.hasMany(db.InsuranceClaim, { foreignKey: 'insuranceProviderId', as: 'claims' });
db.InsuranceClaim.belongsTo(db.InsuranceProvider, { foreignKey: 'insuranceProviderId', as: 'provider' });
db.InsuranceClaim.belongsTo(db.SalesOrder, { foreignKey: 'orderId', as: 'salesOrder' });

// --- Lab Service Order ---
db.User.hasMany(db.LabServiceOrder, { foreignKey: 'createdById', as: 'createdLabOrders' });
db.LabServiceOrder.belongsTo(db.User, { foreignKey: 'createdById', as: 'creator' });

db.Customer.hasMany(db.LabServiceOrder, { foreignKey: 'customerId', as: 'labServiceOrders' });
db.LabServiceOrder.belongsTo(db.Customer, { foreignKey: 'customerId', as: 'customer' });

db.LabServiceOrder.belongsTo(db.LabTransaction, { foreignKey: 'labTransactionId', as: 'labTransaction' });
db.LabServiceOrder.belongsTo(db.Branch, { foreignKey: 'branchId', as: 'branch' });

// --- Customer Module ---
db.Customer.hasMany(db.CustomerInsurance, {
    foreignKey: 'customerId',
    as: 'insurances',
    onDelete: 'CASCADE',
});
db.CustomerInsurance.belongsTo(db.Customer, {
    foreignKey: 'customerId',
    as: 'customer',
});

db.CustomerInsurance.belongsTo(db.InsuranceProvider, {
    foreignKey: 'insuranceProviderId',
    as: 'provider',
});
db.InsuranceProvider.hasMany(db.CustomerInsurance, {
    foreignKey: 'insuranceProviderId',
    as: 'customerInsurances',
});

// --- Customer ↔ SalesOrder ---
db.Customer.hasMany(db.SalesOrder, { foreignKey: 'customerId', as: 'salesOrders' });
db.SalesOrder.belongsTo(db.Customer, { foreignKey: 'customerId', as: 'customer' });

// --- Customer ↔ Transaction ---
db.Customer.hasMany(db.Transaction, { foreignKey: 'customerId', as: 'transactions' });
db.Transaction.belongsTo(db.Customer, { foreignKey: 'customerId', as: 'customer' });

// --- Customer ↔ LabTransaction ---
db.Customer.hasMany(db.LabTransaction, { foreignKey: 'customerId', as: 'labTransactions' });
db.LabTransaction.belongsTo(db.Customer, { foreignKey: 'customerId', as: 'customer' });

// --- Customer ↔ InsuranceClaim ---
db.Customer.hasMany(db.InsuranceClaim, { foreignKey: 'customerId', as: 'claims' });
db.InsuranceClaim.belongsTo(db.Customer, { foreignKey: 'customerId', as: 'customer' });

// ==================== EXPORTS ====================
db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;