/**
 * 服务层统一导出
 * 
 * 导出规范：
 * - BaseService: 基类，用于继承
 * - 其他服务: 统一导出为对象/实例，无需 new 直接使用
 * 
 * 使用示例：
 * const { UserService, aiService } = require('./services');
 * const user = await UserService.findById(id);
 * const result = await aiService.analyze(params);
 */

const BaseService = require('./BaseService');
const UserService = require('./UserService');
const PlantService = require('./PlantService');
const CareRecordService = require('./CareRecordService');
const DeviceService = require('./DeviceService');
const EnvironmentService = require('./EnvironmentService');
const SessionService = require('./SessionService');
const aiService = require('./aiService');
const compensationService = require('./compensationService');
const weatherService = require('./weatherService');

module.exports = {
  // 基类
  BaseService,

  // 数据模型服务（直接使用实例）
  UserService,
  PlantService,
  CareRecordService,
  DeviceService,
  EnvironmentService,
  SessionService,

  // 功能服务（直接使用）
  aiService,
  compensationService,
  weatherService,
};
