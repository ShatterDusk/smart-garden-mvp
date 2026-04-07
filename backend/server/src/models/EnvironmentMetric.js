const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EnvironmentMetric = sequelize.define(
  'EnvironmentMetric',
  {
    metric_code: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      comment: '指标编码，如 temp, humidity',
    },
    category: {
      type: DataTypes.ENUM('device', 'weather', 'soil', 'air'),
      allowNull: false,
      comment: '指标分类',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '显示名称',
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '单位',
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '图标',
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '描述',
    },
    applicable_sources: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '适用数据源',
    },
    is_common: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: '是否常用',
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: '排序',
    },
    min_value: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: '正常范围下限',
    },
    max_value: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: '正常范围上限',
    },
  },
  {
    tableName: 'environment_metrics',
    comment: '环境指标字典表',
    timestamps: false,
    getterMethods: {
      metricCode() { return this.getDataValue('metric_code'); },
      minValue() { return this.getDataValue('min_value'); },
      maxValue() { return this.getDataValue('max_value'); },
      applicableSources() { return this.getDataValue('applicable_sources'); },
      isCommon() { return this.getDataValue('is_common'); },
      sortOrder() { return this.getDataValue('sort_order'); },
    },
  }
);

module.exports = EnvironmentMetric;
