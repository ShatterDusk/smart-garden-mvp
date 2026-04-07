const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CareRecord = sequelize.define(
  'CareRecord',
  {
    record_id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      comment: '唯一标识，UUID',
    },
    plant_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '所属植物',
      references: {
        model: 'plants',
        key: 'plant_id',
      },
    },
    user_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: '记录人',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    action_type: {
      type: DataTypes.ENUM('water', 'fertilize', 'prune', 'repot', 'pest_control', 'other'),
      allowNull: false,
      comment: '操作类型',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '详细描述',
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '照片数组',
    },
    performed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '操作执行时间',
    },
  },
  {
    tableName: 'care_records',
    comment: '养护记录表',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        name: 'idx_plant_time',
        fields: ['plant_id', 'performed_at'],
      },
      {
        name: 'idx_user',
        fields: ['user_id'],
      },
    ],
    getterMethods: {
      recordId() { return this.getDataValue('record_id'); },
      plantId() { return this.getDataValue('plant_id'); },
      userId() { return this.getDataValue('user_id'); },
      actionType() { return this.getDataValue('action_type'); },
      performedAt() { return this.getDataValue('performed_at'); },
      createdAt() { return this.getDataValue('created_at'); },
    },
  }
);

module.exports = CareRecord;
