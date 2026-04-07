const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Session = sequelize.define(
  'Session',
  {
    session_id: {
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
    type: {
      type: DataTypes.ENUM('consultation', 'plant'),
      allowNull: false,
      comment: '会话类型',
    },
    plant_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '植物会话时绑定',
      references: {
        model: 'plants',
        key: 'plant_id',
      },
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '会话标题',
    },
    context_config: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '上下文开关配置',
    },
    status: {
      type: DataTypes.ENUM('active', 'closed'),
      defaultValue: 'active',
      allowNull: false,
      comment: '状态',
    },
  },
  {
    tableName: 'sessions',
    comment: '会话表',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_user_type',
        fields: ['user_id', 'type'],
      },
      {
        name: 'idx_plant',
        fields: ['plant_id'],
      },
    ],
    getterMethods: {
      sessionId() { return this.getDataValue('session_id'); },
      userId() { return this.getDataValue('user_id'); },
      plantId() { return this.getDataValue('plant_id'); },
      contextConfig() { return this.getDataValue('context_config'); },
      createdAt() { return this.getDataValue('created_at'); },
      updatedAt() { return this.getDataValue('updated_at'); },
    },
  }
);

module.exports = Session;
