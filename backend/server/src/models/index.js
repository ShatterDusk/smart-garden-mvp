const sequelize = require('../config/database');

// 导入所有模型
const User = require('./User');
const UserConfig = require('./UserConfig');
const Plant = require('./Plant');
const Session = require('./Session');
const Message = require('./Message');
const DiagnosisCard = require('./DiagnosisCard');
const Device = require('./Device');
const EnvironmentReading = require('./EnvironmentReading');
const EnvironmentMetric = require('./EnvironmentMetric');
const EnvironmentReadingValue = require('./EnvironmentReadingValue');
const CareRecord = require('./CareRecord');
const ReadingTask = require('./ReadingTask');

// ==================== 定义模型关联关系 ====================

// User 关联（与数据库外键约束保持一致）
User.hasMany(Plant, { foreignKey: 'user_id', as: 'plants', onDelete: 'CASCADE' });
User.hasMany(Session, { foreignKey: 'user_id', as: 'sessions', onDelete: 'CASCADE' });
User.hasMany(Device, { foreignKey: 'user_id', as: 'devices', onDelete: 'CASCADE' });
User.hasMany(CareRecord, { foreignKey: 'user_id', as: 'careRecords', onDelete: 'CASCADE' });
User.hasMany(UserConfig, { foreignKey: 'user_id', as: 'configs', onDelete: 'CASCADE' });

// Plant 关联（与数据库外键约束保持一致）
Plant.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
Plant.hasMany(DiagnosisCard, { foreignKey: 'plant_id', as: 'diagnosisCards', onDelete: 'SET NULL' });
Plant.hasMany(EnvironmentReading, { foreignKey: 'plant_id', as: 'environmentReadings', onDelete: 'CASCADE' });
Plant.hasMany(CareRecord, { foreignKey: 'plant_id', as: 'careRecords', onDelete: 'CASCADE' });
Plant.hasMany(Session, { foreignKey: 'plant_id', as: 'sessions', onDelete: 'SET NULL' });
Plant.hasMany(ReadingTask, { foreignKey: 'plant_id', as: 'readingTasks', onDelete: 'CASCADE' });
Plant.belongsTo(Device, { foreignKey: 'current_device_id', as: 'currentDevice', onDelete: 'SET NULL' });

// Session 关联（与数据库外键约束保持一致）
Session.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
Session.belongsTo(Plant, { foreignKey: 'plant_id', as: 'plant', onDelete: 'SET NULL' });
Session.hasMany(Message, { foreignKey: 'session_id', as: 'messages', onDelete: 'CASCADE' });

// Message 关联（与数据库外键约束保持一致）
Message.belongsTo(Session, { foreignKey: 'session_id', as: 'session', onDelete: 'CASCADE' });
Message.belongsTo(Message, { foreignKey: 'reply_to_message_id', as: 'replyToMessage', onDelete: 'SET NULL' });
Message.hasMany(Message, { foreignKey: 'reply_to_message_id', as: 'replies', onDelete: 'SET NULL' });
Message.hasOne(DiagnosisCard, { foreignKey: 'message_id', as: 'diagnosisCard', onDelete: 'CASCADE' });

// DiagnosisCard 关联（与数据库外键约束保持一致）
DiagnosisCard.belongsTo(Message, { foreignKey: 'message_id', as: 'message', onDelete: 'CASCADE' });
DiagnosisCard.belongsTo(Plant, { foreignKey: 'plant_id', as: 'plant', onDelete: 'SET NULL' });

// Device 关联（与数据库外键约束保持一致）
Device.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// EnvironmentReading 关联（与数据库外键约束保持一致）
EnvironmentReading.belongsTo(Plant, { foreignKey: 'plant_id', as: 'plant', onDelete: 'CASCADE' });
EnvironmentReading.hasMany(EnvironmentReadingValue, {
  foreignKey: 'reading_id',
  as: 'values',
  onDelete: 'CASCADE',
});

// EnvironmentMetric 关联（级联删除）
EnvironmentMetric.hasMany(EnvironmentReadingValue, {
  foreignKey: 'metric_code',
  as: 'readingValues',
  onDelete: 'CASCADE',
});

// EnvironmentReadingValue 关联
EnvironmentReadingValue.belongsTo(EnvironmentReading, {
  foreignKey: 'reading_id',
  as: 'reading',
  onDelete: 'CASCADE',
});
EnvironmentReadingValue.belongsTo(EnvironmentMetric, {
  foreignKey: 'metric_code',
  as: 'metric',
  onDelete: 'CASCADE',
});

// CareRecord 关联（级联删除）
CareRecord.belongsTo(Plant, { foreignKey: 'plant_id', as: 'plant', onDelete: 'CASCADE' });
CareRecord.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// UserConfig 关联（级联删除）
UserConfig.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ReadingTask 关联（级联删除）
ReadingTask.belongsTo(Plant, { foreignKey: 'plant_id', as: 'plant', onDelete: 'CASCADE' });

// ==================== 导出模型和连接 ====================

module.exports = {
  sequelize,
  User,
  UserConfig,
  Plant,
  Session,
  Message,
  DiagnosisCard,
  Device,
  EnvironmentReading,
  EnvironmentMetric,
  EnvironmentReadingValue,
  CareRecord,
  ReadingTask,
};
