const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemLog = sequelize.define(
  'SystemLog',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '日志ID',
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
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '额外数据',
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '来源模块',
    },
    request_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '请求追踪ID',
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP地址',
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'User Agent',
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '请求URL',
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'HTTP方法',
    },
    error_stack: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '错误堆栈',
    },
  },
  {
    tableName: 'system_logs',
    comment: '系统日志表',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_level_created',
        fields: ['level', 'created_at'],
      },
      {
        name: 'idx_source_created',
        fields: ['source', 'created_at'],
      },
      {
        name: 'idx_request_id',
        fields: ['request_id'],
      },
      {
        name: 'idx_created_at',
        fields: ['created_at'],
      },
    ],
    getterMethods: {
      logId() { return this.getDataValue('id'); },
      createdAt() { return this.getDataValue('created_at'); },
    },
  }
);

module.exports = SystemLog;
