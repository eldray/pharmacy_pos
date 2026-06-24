const { sequelize, DataTypes } = require('../config/database');

const LabTest = sequelize.define('LabTest', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    testNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    labTransactionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'lab_transactions', key: 'id' }
    },
    testType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    testCategory: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'General'
    },
    testPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1
    },
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
    },
    priority: {
        type: DataTypes.ENUM('normal', 'urgent', 'stat'),
        allowNull: false,
        defaultValue: 'normal'
    },
    sampleType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sampleCollectedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    sampleReceivedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    results: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    },
    resultSummary: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    resultInterpretation: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    resultDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    referenceRanges: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    performedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
    },
    performedByName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'lab_tests',
    timestamps: true,
    indexes: [
        { fields: ['labTransactionId'] },
        { fields: ['performedBy'] },
        { fields: ['status'] },
    ]
});

module.exports = LabTest;