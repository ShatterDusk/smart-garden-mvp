/**
 * 全局错误处理中间件
 * 捕获所有异常，返回统一错误格式
 */

const logger = require('../utils/logger');

/**
 * 错误码定义
 * 参考 API 接口设计文档
 */
const ERROR_CODES = {
  // HTTP 标准错误码
  BAD_REQUEST: { code: 400, message: '请求参数错误' },
  UNAUTHORIZED: { code: 401, message: '未授权' },
  FORBIDDEN: { code: 403, message: '禁止访问' },
  NOT_FOUND: { code: 404, message: '资源不存在' },
  INTERNAL_ERROR: { code: 500, message: '服务器内部错误' },

  // 业务错误码
  WECHAT_LOGIN_FAILED: { code: 1001, message: '微信登录失败' },
  TOKEN_EXPIRED: { code: 1002, message: 'Token过期' },
  PLANT_NOT_FOUND: { code: 1003, message: '植物不存在' },
  SESSION_NOT_FOUND: { code: 1004, message: '会话不存在' },
  DEVICE_NOT_FOUND: { code: 1005, message: '设备不存在' },
  DIAGNOSIS_NOT_FOUND: { code: 1006, message: '诊断记录不存在' },
  UPLOAD_FAILED: { code: 1007, message: '图片上传失败' },
  AI_SERVICE_UNAVAILABLE: { code: 1008, message: 'AI服务不可用' },
};

/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  // 记录错误日志
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // 默认错误信息
  let statusCode = err.statusCode || err.status || 500;
  let errorCode = err.code || 500;
  let message = err.message || '服务器内部错误';

  // 处理 Sequelize 验证错误
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    errorCode = 400;
    message = err.errors ? err.errors.map(e => e.message).join(', ') : '数据验证失败';
  }

  // 处理 JWT 错误
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 401;
    message = '无效的Token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 1002;
    message = 'Token已过期';
  }

  // 处理 Joi 验证错误
  if (err.name === 'ValidationError' && err.isJoi) {
    statusCode = 400;
    errorCode = 400;
    message = err.details ? err.details.map(d => d.message).join(', ') : '参数验证失败';
  }

  // 返回统一错误格式
  res.status(statusCode).json({
    code: errorCode,
    message,
    data: null,
  });
}

/**
 * 404 错误处理中间件
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null,
  });
}

/**
 * 异步错误包装器
 * 用于包装异步路由处理函数，自动捕获错误
 * @param {Function} fn - 异步处理函数
 * @returns {Function} 包装后的函数
 */
function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ERROR_CODES,
};
