const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    user_id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      comment: '用户ID',
    },
    wx_openid: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: true,
      comment: '微信openid',
    },
    nickname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '微信昵称',
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '头像URL',
    },
    role: {
      type: DataTypes.ENUM('user', 'expert', 'admin'),
      defaultValue: 'user',
      allowNull: false,
      comment: '用户角色',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'banned'),
      defaultValue: 'active',
      allowNull: false,
      comment: '用户状态',
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后登录时间',
    },
  },
  {
    tableName: 'users',
    comment: '用户表',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_role',
        fields: ['role'],
      },
      // 注意：wx_openid 字段已设置 unique: true，无需额外索引
    ],
    getterMethods: {
      userId() { return this.getDataValue('user_id'); },
      wxOpenid() { return this.getDataValue('wx_openid'); },
      avatarUrl() { return this.getDataValue('avatar_url'); },
      lastLoginAt() { return this.getDataValue('last_login_at'); },
      createdAt() { return this.getDataValue('created_at'); },
      updatedAt() { return this.getDataValue('updated_at'); },
    },
  }
);

module.exports = User;
