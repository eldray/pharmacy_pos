// migrations/001-create-all-tables.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    // ==================== USERS ====================
    await queryInterface.createTable('users', {
      id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name:         { type: DataTypes.STRING, allowNull: false },
      email:        { type: DataTypes.STRING, allowNull: false, unique: true },
      password:     { type: DataTypes.STRING, allowNull: false },
      role:         { type: DataTypes.ENUM('admin','manager','pharmacist_sales','cashier','lab_tech'), allowNull: false },
      phone:        { type: DataTypes.STRING },
      isActive:     { type: DataTypes.BOOLEAN, defaultValue: true },
      lastLogin:    { type: DataTypes.DATE },
      createdAt:    { type: DataTypes.DATE, allowNull: false },
      updatedAt:    { type: DataTypes.DATE, allowNull: false },
    });

    // ==================== SUPPLIERS ====================
    await queryInterface.createTable('suppliers', {
      id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name:      { type: DataTypes.STRING, allowNull: false },
      email:     { type: DataTypes.STRING },
      phone:     { type: DataTypes.STRING },
      address:   { type: DataTypes.TEXT },
      city:      { type: DataTypes.STRING },
      country:   { type: DataTypes.STRING },
      isActive:  { type: DataTypes.BOOLEAN, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ==================== PRODUCTS ====================
    await queryInterface.createTable('products', {
      id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name:        { type: DataTypes.STRING, allowNull: false },
      sku:         { type: DataTypes.STRING, unique: true },
      barcode:     { type: DataTypes.STRING },
      category:    { type: DataTypes.STRING },
      description: { type: DataTypes.TEXT },
      quantity:    { type: DataTypes.INTEGER, defaultValue: 0 },
      unitPrice:   { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      costPrice:   { type: DataTypes.DECIMAL(10, 2) },
      batchNumber: { type: DataTypes.STRING },
      expiryDate:  { type: DataTypes.DATEONLY },
      supplier:    { type: DataTypes.STRING },
      reorderLevel:{ type: DataTypes.INTEGER, defaultValue: 10 },
      isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
      createdAt:   { type: DataTypes.DATE, allowNull: false },
      updatedAt:   { type: DataTypes.DATE, allowNull: false },
    });

    // ==================== LAB TEST TEMPLATES ====================
    await queryInterface.createTable('lab_test_templates', {
      id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name:         { type: DataTypes.STRING, allowNull: false },
      category:     { type: DataTypes.STRING },
      description:  { type: DataTypes.TEXT },
      price:        { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      sampleType:   { type: DataTypes.STRING },
      resultFields: { type: DataTypes.JSONB, defaultValue: [] },
      instructions: { type: DataTypes.TEXT },
      isActive:     { type: DataTypes.BOOLEAN, defaultValue: true },
      createdAt:    { type: DataTypes.DATE, allowNull: false },
      updatedAt:    { type: DataTypes.DATE, allowNull: false },
    });

    // ==================== INSURANCE PROVIDERS ====================
    await queryInterface.createTable('insurance_providers', {
      id:                  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name:                { type: DataTypes.STRING, allowNull: false },
      code:                { type: DataTypes.STRING, unique: true },
      coverageType:        { type: DataTypes.ENUM('fixed','percentage'), defaultValue: 'percentage' },
      defaultCopayPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
      contactPerson:       { type: DataTypes.STRING },
      phone:               { type: DataTypes.STRING },
      email:               { type: DataTypes.STRING },
      status:              { type: DataTypes.ENUM('active','inactive'), defaultValue: 'active' },
      createdAt:           { type: DataTypes.DATE, allowNull: false },
      updatedAt:           { type: DataTypes.DATE, allowNull: false },
    });

    // ==================== COMPANY ====================
    await queryInterface.createTable('companies', {
      id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name:          { type: DataTypes.STRING, allowNull: false },
      addressStreet: { type: DataTypes.STRING },
      addressCity:   { type: DataTypes.STRING },
      addressCountry:{ type: DataTypes.STRING },
      contactPhone:  { type: DataTypes.STRING },
      contactEmail:  { type: DataTypes.STRING },
      taxRate:       { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
      receiptFooter: { type: DataTypes.TEXT },
      createdAt:     { type: DataTypes.DATE, allowNull: false },
      updatedAt:     { type: DataTypes.DATE, allowNull: false },
    });

    // ⚠️  ADD YOUR OTHER TABLES HERE (transactions, purchase_orders,
    //     lab_transactions, audit_logs, branches, staff, customers, etc.)
    //     Mirror them from your models. If you already have a different
    //     source-of-truth for schema, reuse it.
  },

  down: async (queryInterface) => {
    // Drop in reverse dependency order
    await queryInterface.dropTable('companies');
    await queryInterface.dropTable('insurance_providers');
    await queryInterface.dropTable('lab_test_templates');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('suppliers');
    await queryInterface.dropTable('users');
  },
};