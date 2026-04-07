const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReadingTask = sequelize.define(
  'ReadingTask',
  {
    task_id: {
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
    recorded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '任务时间',
    },
    sensor_status: {
      type: DataTypes.ENUM('pending', 'received', 'compensated', 'failed'),
      defaultValue: 'pending',
      allowNull: false,
      comment: '传感器数据状态',
    },
    weather_status: {
      type: DataTypes.ENUM('pending', 'received', 'failed'),
      defaultValue: 'pending',
      allowNull: false,
      comment: '天气数据状态',
    },
  },
  {
    tableName: 'reading_tasks',
    comment: '环境数据采集任务表',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_plant_time',
        fields: ['plant_id', 'recorded_at'],
      },
      {
        name: 'idx_sensor_status',
        fields: ['sensor_status'],
      },
      {
        name: 'idx_weather_status',
        fields: ['weather_status'],
      },
    ],
    getterMethods: {
      taskId() { return this.getDataValue('task_id'); },
      plantId() { return this.getDataValue('plant_id'); },
      recordedAt() { return this.getDataValue('recorded_at'); },
      sensorStatus() { return this.getDataValue('sensor_status'); },
      weatherStatus() { return this.getDataValue('weather_status'); },
      createdAt() { return this.getDataValue('created_at'); },
      updatedAt() { return this.getDataValue('updated_at'); },
    },
  }
);

module.exports = ReadingTask;
