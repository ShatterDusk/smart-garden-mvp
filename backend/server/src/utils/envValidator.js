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
  'WECHAT_APPID',
  'WECHAT_SECRET',
  'COS_BUCKET',
  'COS_SECRET_ID',
  'COS_SECRET_KEY',
];

// AI 服务至少需要一个
const AI_REQUIRED_VARS = [
  'GLM_API_KEY',
  'OPENAI_API_KEY',
  'WENXIN_API_KEY',
  'QWEN_API_KEY',
  'HUNYUAN_API_KEY',
];

// 开发环境可选的环境变量
const OPTIONAL_VARS = [
  'DB_PORT',
  'DB_DIALECT',
  'DB_SSL',
  'DB_LOGGING',
  'WEATHER_API_KEY',
  'LOG_ACCESS_KEY',
];

/**
 * 校验环境变量
 * @param {boolean} isProduction - 是否为生产环境
 * @returns {boolean} - 校验是否通过
 */
function validateEnv(isProduction = false) {
  const missing = [];

  // 检查基础必需变量
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // 检查 AI 服务（至少需要一个）
  const hasAIKey = AI_REQUIRED_VARS.some(varName => process.env[varName]);
  if (!hasAIKey) {
    missing.push('至少一个 AI API Key (GLM_API_KEY / OPENAI_API_KEY / WENXIN_API_KEY / QWEN_API_KEY / HUNYUAN_API_KEY)');
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
