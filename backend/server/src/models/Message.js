const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define(
  'Message',
  {
    message_id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      comment: '唯一标识，UUID',
    },
    session_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '所属会话',
      references: {
        model: 'sessions',
        key: 'session_id',
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system'),
      allowNull: false,
      comment: '发送者角色',
    },
    content_type: {
      type: DataTypes.ENUM('text', 'image', 'card'),
      allowNull: false,
      comment: '内容类型',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '消息内容',
    },
    image_urls: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '图片数组（可选）',
    },
    reply_to_message_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '回复哪条消息（可选）',
      references: {
        model: 'messages',
        key: 'message_id',
      },
    },
    status: {
      type: DataTypes.ENUM('normal', 'edited', 'recalled'),
      defaultValue: 'normal',
      allowNull: false,
      comment: '消息状态',
    },
  },
  {
    tableName: 'messages',
    comment: '消息表',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_session_time',
        fields: ['session_id', 'created_at'],
      },
    ],
    getterMethods: {
      messageId() { return this.getDataValue('message_id'); },
      sessionId() { return this.getDataValue('session_id'); },
      contentType() { return this.getDataValue('content_type'); },
      imageUrls() { return this.getDataValue('image_urls'); },
      replyToMessageId() { return this.getDataValue('reply_to_message_id'); },
      createdAt() { return this.getDataValue('created_at'); },
      updatedAt() { return this.getDataValue('updated_at'); },
    },
  }
);

module.exports = Message;
