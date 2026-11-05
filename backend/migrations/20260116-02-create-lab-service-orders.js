// backend/migrations/20260116-02-create-lab-service-orders.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    const tables = await queryInterface.showAllTables();
    if (tables.includes('lab_service_orders')) {
      console.log('   ↳ lab_service_orders already exists — skipping');
      return;
    }

    // NOTE: No `references:` here — FKs added later once all parent tables exist.
    await queryInterface.createTable('lab_service_orders', {
      id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      orderNumber:  { type: DataTypes.STRING, unique: true },
      customerId:   { type: DataTypes.INTEGER },
      patientName:  { type: DataTypes.STRING },
      patientPhone: { type: DataTypes.STRING },
      templateId:   { type: DataTypes.INTEGER },
      testName:     { type: DataTypes.STRING },
      price:        { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      status:       { type: DataTypes.STRING, defaultValue: 'pending' },
      sampleType:   { type: DataTypes.STRING },
      resultData:   { type: DataTypes.JSONB, defaultValue: {} },
      resultNotes:  { type: DataTypes.TEXT },
      requestedBy:  { type: DataTypes.INTEGER },
      processedBy:  { type: DataTypes.INTEGER },
      completedAt:  { type: DataTypes.DATE },
      branchId:     { type: DataTypes.INTEGER },
      notes:        { type: DataTypes.TEXT },
      createdAt:    { type: DataTypes.DATE, allowNull: false },
      updatedAt:    { type: DataTypes.DATE, allowNull: false },
    });

    console.log('   ↳ Created lab_service_orders (no FKs yet)');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('lab_service_orders');
  },
};