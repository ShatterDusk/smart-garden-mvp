/**
 * Joi 参数校验规则
 * 定义所有 API 的校验规则
 * 注意：API 参数使用 camelCase，与前端保持一致
 */

const Joi = require('joi');

// ==================== 用户模块校验规则 ====================

const userLoginSchema = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': '微信登录code不能为空',
    'any.required': '微信登录code是必填项',
  }),
  nickname: Joi.string().allow('').optional(),
  avatarUrl: Joi.string().allow('').optional(),
  gender: Joi.number().integer().min(0).max(2).optional(),
}).unknown(true);

const updateProfileSchema = Joi.object({
  nickname: Joi.string().min(1).max(50).optional().allow(null),
  avatarUrl: Joi.string().max(500).optional().allow(null, ''),
});

const updateSettingsSchema = Joi.object({
  notification: Joi.object({
    diagnosisReminder: Joi.boolean().optional(),
    careReminder: Joi.boolean().optional(),
    environmentAlert: Joi.boolean().optional(),
    reminderTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  }).optional(),
  preferences: Joi.object({
    language: Joi.string().valid('zh-CN', 'en-US').optional(),
  }).optional(),
});

// ==================== 植物模块校验规则 ====================

const createPlantSchema = Joi.object({
  nickname: Joi.string().min(1).max(50).required().messages({
    'string.empty': '植物昵称不能为空',
    'any.required': '植物昵称是必填项',
  }),
  species: Joi.string().max(100).allow(null, '').optional().messages({
    'string.max': '品种名称过长',
  }),
  plantCategory: Joi.string()
    .valid('succulent', 'flower', 'foliage', 'vegetable', 'herb', 'other')
    .required()
    .messages({
      'any.required': '植物分类是必填项',
      'any.only': '无效的植物分类',
    }),
  coverImageUrl: Joi.string().allow(null, '').optional(),
  locationName: Joi.string().max(100).allow(null, '').optional(),
  locationCode: Joi.string().allow(null, '').optional(),
  locationLat: Joi.number().optional().allow(null),
  locationLng: Joi.number().optional().allow(null),
  currentDeviceId: Joi.string().allow(null, '').optional(),
  remark: Joi.string().allow(null, '').optional(),
  firstDiagnosis: Joi.object({
    diagnosisCardId: Joi.string().optional(),
    healthScore: Joi.number().integer().min(0).max(100).optional(),
    status: Joi.string().valid('healthy', 'warning', 'critical').optional(),
  }).optional(),
});

const updatePlantSchema = Joi.object({
  nickname: Joi.string().min(1).max(50).optional().allow(null, ''),
  species: Joi.string().max(100).optional().allow(null, ''),
  plantCategory: Joi.string()
    .valid('succulent', 'flower', 'foliage', 'vegetable', 'herb', 'other')
    .optional()
    .allow(null, ''),
  coverImageUrl: Joi.string().allow(null, '').optional(),
  locationName: Joi.string().max(100).allow(null, '').optional(),
  locationCode: Joi.string().allow(null, '').optional(),
  locationLat: Joi.number().optional().allow(null),
  locationLng: Joi.number().optional().allow(null),
  currentDeviceId: Joi.string().allow(null, '').optional(),
  remark: Joi.string().allow(null, '').optional(),
});

const getPlantsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

// ==================== 会话模块校验规则 ====================

const createSessionSchema = Joi.object({
  type: Joi.string().valid('consultation', 'plant').required().messages({
    'any.required': '会话类型是必填项',
    'any.only': '无效的会话类型',
  }),
  plantId: Joi.string().allow(null).when('type', {
    is: 'plant',
    then: Joi.required().messages({
      'any.required': '植物会话必须提供plantId',
    }),
    otherwise: Joi.optional(),
  }),
  title: Joi.string().max(100).optional(),
});

const getSessionsQuerySchema = Joi.object({
  type: Joi.string().valid('consultation', 'plant').optional(),
  plantId: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

const sendMessageSchema = Joi.object({
  contentType: Joi.string().valid('text', 'image', 'diagnosis').required(),
  content: Joi.string().allow('').optional(),
  imageUrls: Joi.array().items(Joi.string().max(500)).optional(),
  contextConfig: Joi.object({
    environmentData: Joi.boolean().optional(),
    careRecords: Joi.boolean().optional(),
    historyDiagnosis: Joi.boolean().optional(),
  }).optional(),
});

const upgradeSessionSchema = Joi.object({
  plantId: Joi.string().required().messages({
    'string.empty': '植物ID不能为空',
    'any.required': '植物ID是必填项',
  }),
});

const getMessagesQuerySchema = Joi.object({
  before: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// ==================== 养护记录模块校验规则 ====================

const getCareRecordsQuerySchema = Joi.object({
  plantId: Joi.string().required().messages({
    'any.required': '植物ID是必填项',
  }),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

const createCareRecordSchema = Joi.object({
  plantId: Joi.string().required().messages({
    'string.empty': '植物ID不能为空',
    'any.required': '植物ID是必填项',
  }),
  actionType: Joi.string().valid('water', 'fertilize', 'prune', 'repot', 'pest_control', 'observe', 'purchase', 'relocate', 'other').required().messages({
    'any.required': '操作类型是必填项',
    'any.only': '无效的操作类型',
  }),
  description: Joi.string().max(500).optional(),
  images: Joi.array().items(Joi.string().max(500)).optional(),
  performedAt: Joi.date().iso().optional(),
});

const updateCareRecordSchema = Joi.object({
  actionType: Joi.string().valid('water', 'fertilize', 'prune', 'repot', 'pest_control', 'observe', 'purchase', 'relocate', 'other').optional(),
  description: Joi.string().max(500).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  performedAt: Joi.date().iso().optional(),
});

// ==================== 设备模块校验规则 ====================

const bindDeviceSchema = Joi.object({
  macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/).required().messages({
    'string.pattern.base': 'MAC地址格式无效',
    'any.required': 'MAC地址是必填项',
  }),
  deviceName: Joi.string().max(50).optional(),
  plantId: Joi.string().optional().allow(null),
});

const unbindDeviceSchema = Joi.object({
  deviceId: Joi.string().required().messages({
    'string.empty': '设备ID不能为空',
    'any.required': '设备ID是必填项',
  }),
});

// ==================== 通用 ID 校验 ====================

const idParamSchema = Joi.object({
  id: Joi.string().required().messages({
    'string.empty': 'ID不能为空',
    'any.required': 'ID是必填项',
  }),
});

// ==================== 导出所有校验规则 ====================

module.exports = {
  // 用户模块
  userLoginSchema,
  updateProfileSchema,
  updateSettingsSchema,

  // 植物模块
  createPlantSchema,
  updatePlantSchema,
  getPlantsQuerySchema,

  // 会话模块
  createSessionSchema,
  getSessionsQuerySchema,
  sendMessageSchema,
  upgradeSessionSchema,
  getMessagesQuerySchema,

  // 养护记录模块
  getCareRecordsQuerySchema,
  createCareRecordSchema,
  updateCareRecordSchema,

  // 设备模块
  bindDeviceSchema,
  unbindDeviceSchema,

  // 通用
  idParamSchema,
};
