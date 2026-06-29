const { sequelize, DataTypes } = require('../config/database');

const LabTestTemplate = sequelize.define('LabTestTemplate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'General'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    sampleType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    defaultReferenceRanges: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    },
    resultFields: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [
            { name: 'Result', type: 'text', required: true },
            { name: 'Reference Range', type: 'text', required: false }
        ]
    },
    instructions: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'lab_test_templates',
    timestamps: true
});

module.exports = LabTestTemplate;