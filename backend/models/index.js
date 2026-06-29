const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

const db = {};

// Read all model files EXCEPT index.js
fs.readdirSync(__dirname)
    .filter(file => {
        return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js');
    })
    .forEach(file => {
        const model = require(path.join(__dirname, file));
        db[model.name] = model; // Use Sequelize's internal model name
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

// ==================== EXPORTS ====================
db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;