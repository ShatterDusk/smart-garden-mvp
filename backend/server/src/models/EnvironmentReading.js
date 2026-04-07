const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EnvironmentReading = sequelize.define(
  'EnvironmentReading',
  {
    reading_id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      comment: '唯一标识，UUID',
    },
    plant_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '关联植物',
      references: {
        model: 'plants',
        key: 'plant_id',
      },
    },
    data_source: {
      type: DataTypes.ENUM('sensor', 'weather_api', 'manual'),
      allowNull: false,
      comment: '数据来源',
    },
    recorded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '数据采集时间',
    },
    is_stale: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: '是否为补偿数据',
    },
  },
  {
    tableName: 'environment_readings',
    comment: '环境数据读数表',
    timestamps: false,
    indexes: [
      {
        name: 'idx_plant_time',
        fields: ['plant_id', 'recorded_at'],
      },
    ],
    getterMethods: {
      readingId() { return this.getDataValue('reading_id'); },
      plantId() { return this.getDataValue('plant_id'); },
      dataSource() { return this.getDataValue('data_source'); },
      recordedAt() { return this.getDataValue('recorded_at'); },
      isStale() { return this.getDataValue('is_stale'); },
    },
  }
);

module.exports = EnvironmentReading;
