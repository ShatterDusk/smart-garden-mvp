const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Device = sequelize.define(
  'Device',
  {
    device_id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      comment: '唯一标识，UUID',
    },
    user_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '所属用户',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    mac_address: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
      comment: 'MAC地址',
    },
    device_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '设备名称',
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'unbound'),
      defaultValue: 'unbound',
      allowNull: false,
      comment: '设备状态',
    },
    battery_level: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '电池电量 0-100',
    },
    last_heartbeat: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后心跳时间',
    },
  },
  {
    tableName: 'devices',
    comment: '设备表',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      // 注意：mac_address 字段已设置 unique: true，无需额外索引
      {
        name: 'idx_user',
        fields: ['user_id'],
      },
    ],
    getterMethods: {
      deviceId() { return this.getDataValue('device_id'); },
      userId() { return this.getDataValue('user_id'); },
      macAddress() { return this.getDataValue('mac_address'); },
      deviceName() { return this.getDataValue('device_name'); },
      batteryLevel() { return this.getDataValue('battery_level'); },
      lastHeartbeat() { return this.getDataValue('last_heartbeat'); },
      createdAt() { return this.getDataValue('created_at'); },
    },
  }
);

module.exports = Device;
