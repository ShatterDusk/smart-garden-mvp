const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DiagnosisCard = sequelize.define(
  'DiagnosisCard',
  {
    diagnosis_card_id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      comment: '唯一标识，UUID',
    },
    message_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '关联消息',
      references: {
        model: 'messages',
        key: 'message_id',
      },
    },
    plant_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '关联植物（可选，咨询会话为空）',
      references: {
        model: 'plants',
        key: 'plant_id',
      },
    },
    species: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '识别到的植物品种',
    },
    analysis_type: {
      type: DataTypes.ENUM('normal', 'deep'),
      allowNull: false,
      comment: '分析类型',
    },
    health_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '健康评分 0-100',
    },
    status: {
      type: DataTypes.ENUM('healthy', 'warning', 'critical'),
      allowNull: true,
      comment: '健康状态',
    },
    issues: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '问题列表',
    },
    suggestions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '建议列表',
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: '置信度 0-1',
    },
    context_used: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '用了哪些上下文',
    },
  },
  {
    tableName: 'diagnosis_cards',
    comment: '诊断卡表',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        name: 'idx_plant_time',
        fields: ['plant_id', 'created_at'],
      },
      {
        name: 'idx_message',
        fields: ['message_id'],
      },
    ],
    getterMethods: {
      diagnosisCardId() { return this.getDataValue('diagnosis_card_id'); },
      messageId() { return this.getDataValue('message_id'); },
      plantId() { return this.getDataValue('plant_id'); },
      species() { return this.getDataValue('species'); },
      analysisType() { return this.getDataValue('analysis_type'); },
      healthScore() { return this.getDataValue('health_score'); },
      contextUsed() { return this.getDataValue('context_used'); },
      createdAt() { return this.getDataValue('created_at'); },
    },
  }
);

module.exports = DiagnosisCard;
