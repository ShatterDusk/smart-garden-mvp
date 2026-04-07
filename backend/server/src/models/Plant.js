const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Plant = sequelize.define(
  'Plant',
  {
    plant_id: {
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
    nickname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '植物昵称，如"小绿"',
    },
    plant_category: {
      type: DataTypes.ENUM('succulent', 'flower', 'foliage', 'vegetable', 'other'),
      allowNull: false,
      comment: '植物种类',
    },
    species: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '具体品种，如"绿萝"',
    },
    cover_image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '封面照片URL',
    },
    current_device_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: '当前绑定设备ID（单向绑定）',
      references: {
        model: 'devices',
        key: 'device_id',
      },
    },
    location_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '位置名称，如"北京市朝阳区"',
    },
    location_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '城市编码，如"110105"',
    },
    location_lat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      comment: '纬度',
    },
    location_lng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      comment: '经度',
    },
  },
  {
    tableName: 'plants',
    comment: '植物档案表',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_user',
        fields: ['user_id'],
      },
      {
        name: 'idx_device',
        fields: ['current_device_id'],
      },
    ],
    getterMethods: {
      plantId() { return this.getDataValue('plant_id'); },
      userId() { return this.getDataValue('user_id'); },
      plantCategory() { return this.getDataValue('plant_category'); },
      coverImageUrl() { return this.getDataValue('cover_image_url'); },
      currentDeviceId() { return this.getDataValue('current_device_id'); },
      locationName() { return this.getDataValue('location_name'); },
      locationCode() { return this.getDataValue('location_code'); },
      locationLat() { return this.getDataValue('location_lat'); },
      locationLng() { return this.getDataValue('location_lng'); },
      createdAt() { return this.getDataValue('created_at'); },
      updatedAt() { return this.getDataValue('updated_at'); },
    },
  }
);

module.exports = Plant;
