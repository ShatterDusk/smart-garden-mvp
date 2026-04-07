const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserConfig = sequelize.define(
  'UserConfig',
  {
    config_id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      comment: '配置项唯一标识，UUID',
    },
    user_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '所属用户ID',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    config_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '配置键名，如 plant_sort_order',
    },
    config_value: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: '配置值，JSON格式',
    },
    config_type: {
      type: DataTypes.ENUM('preference', 'setting', 'data'),
      defaultValue: 'preference',
      allowNull: false,
      comment: '配置类型',
    },
  },
  {
    tableName: 'user_config',
    comment: '用户配置表',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'uk_user_key',
        unique: true,
        fields: ['user_id', 'config_key'],
      },
    ],
    getterMethods: {
      configId() { return this.getDataValue('config_id'); },
      userId() { return this.getDataValue('user_id'); },
      configKey() { return this.getDataValue('config_key'); },
      configValue() { return this.getDataValue('config_value'); },
      configType() { return this.getDataValue('config_type'); },
      createdAt() { return this.getDataValue('created_at'); },
      updatedAt() { return this.getDataValue('updated_at'); },
    },
  }
);

module.exports = UserConfig;
