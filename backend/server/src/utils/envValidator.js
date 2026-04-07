/**
 * 环境变量校验
 * 启动时检查必要的环境变量
 */

const logger = require('./logger');

// 必需的环境变量（生产环境）
const REQUIRED_VARS = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

// 开发环境可选的环境变量
const OPTIONAL_VARS = [
  'WECHAT_APPID',
  'WECHAT_SECRET',
  'DB_PORT',
  'DB_DIALECT',
  'DB_SSL',
  'DB_LOGGING',
];

/**
 * 校验环境变量
 * @param {boolean} isProduction - 是否为生产环境
 * @returns {boolean} - 校验是否通过
 */
function validateEnv(isProduction = false) {
  const missing = [];

  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    if (isProduction) {
      logger.error('缺少必需的环境变量:', missing.join(', '));
      return false;
    } else {
      logger.warn('开发环境缺少部分环境变量:', missing.join(', '));
    }
  }

  logger.info('环境变量校验通过');
  return true;
}

/**
 * 获取环境变量，支持默认值
 * @param {string} name - 环境变量名
 * @param {*} defaultValue - 默认值
 * @returns {*} - 环境变量值或默认值
 */
function getEnv(name, defaultValue = undefined) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  return value;
}

/**
 * 获取必需的环境变量，缺失时抛出错误
 * @param {string} name - 环境变量名
 * @returns {*} - 环境变量值
 */
function getRequiredEnv(name) {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`缺少必需的环境变量: ${name}`);
  }
  return value;
}

module.exports = {
  validateEnv,
  getEnv,
  getRequiredEnv,
  REQUIRED_VARS,
  OPTIONAL_VARS,
};
