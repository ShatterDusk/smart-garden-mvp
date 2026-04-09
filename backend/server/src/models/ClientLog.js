const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClientLog = sequelize.define(
  'ClientLog',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '日志ID',
    },
    user_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '用户ID',
    },
    session_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '会话ID',
    },
    level: {
      type: DataTypes.ENUM('debug', 'info', 'warn', 'error', 'fatal'),
      defaultValue: 'info',
      allowNull: false,
      comment: '日志级别',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '日志消息',
    },
    page_path: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '页面路径',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '用户行为',
    },
    device_info: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '设备信息',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '附加数据',
    },
    network_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '网络类型',
    },
  },
  {
    tableName: 'client_logs',
    comment: '客户端日志表',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_user_created',
        fields: ['user_id', 'created_at'],
      },
      {
        name: 'idx_session_created',
        fields: ['session_id', 'created_at'],
      },
      {
        name: 'idx_level_created',
        fields: ['level', 'created_at'],
      },
      {
        name: 'idx_page_created',
        fields: ['page_path', 'created_at'],
      },
      {
        name: 'idx_created_at',
        fields: ['created_at'],
      },
    ],
    getterMethods: {
      logId() { return this.getDataValue('id'); },
      userId() { return this.getDataValue('user_id'); },
      sessionId() { return this.getDataValue('session_id'); },
      createdAt() { return this.getDataValue('created_at'); },
    },
  }
);

module.exports = ClientLog;
