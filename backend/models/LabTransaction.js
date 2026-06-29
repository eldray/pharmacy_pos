const { sequelize, DataTypes } = require('../config/database');

const LabTransaction = sequelize.define('LabTransaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    transactionNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    patientName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    patientPhone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    patientEmail: {
        type: DataTypes.STRING,
        allowNull: true
    },
    patientAge: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    patientGender: {
        type: DataTypes.ENUM('Male', 'Female', 'Other'),
        allowNull: true
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    paidAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    paymentMethod: {
        type: DataTypes.ENUM('cash', 'mtn', 'vodafone', 'airteltigo', 'card'),
        allowNull: true
    },
    paymentReference: {
        type: DataTypes.STRING,
        allowNull: true
    },
    paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'partial', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
    },
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    requestedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    },
    requestedByName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    receiptNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    receiptPrintedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancelledBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' }
    },
    cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'lab_transactions',
    timestamps: true
});

module.exports = LabTransaction;