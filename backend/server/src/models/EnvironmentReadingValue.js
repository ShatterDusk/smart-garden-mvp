const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EnvironmentReadingValue = sequelize.define(
  'EnvironmentReadingValue',
  {
    value_id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      comment: '唯一标识，UUID',
    },
    reading_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '关联读数',
      references: {
        model: 'environment_readings',
        key: 'reading_id',
      },
    },
    metric_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '指标编码',
      references: {
        model: 'environment_metrics',
        key: 'metric_code',
      },
    },
    value: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '指标值（字符串存储）',
    },
  },
  {
    tableName: 'environment_reading_values',
    comment: '环境读数明细表',
    timestamps: false,
    indexes: [
      {
        name: 'idx_reading',
        fields: ['reading_id'],
      },
    ],
    getterMethods: {
      valueId() { return this.getDataValue('value_id'); },
      readingId() { return this.getDataValue('reading_id'); },
      metricCode() { return this.getDataValue('metric_code'); },
      value() { return this.getDataValue('value'); },
    },
  }
);

module.exports = EnvironmentReadingValue;
