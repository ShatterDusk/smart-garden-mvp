/**
 * 日志常量定义 - 前后端共享
 * 统一日志级别、字段命名和映射关系
 */

// 统一日志级别（小写）
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

// 日志级别优先级（数字越大优先级越高）
const LOG_LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

// 日志来源
const LOG_SOURCES = {
  BACKEND: 'backend',
  FRONTEND: 'frontend'
};

// 统一日志字段（API/前端使用驼峰命名）
const LOG_FIELDS = {
  // 核心字段
  ID: 'id',
  TIMESTAMP: 'timestamp',
  LEVEL: 'level',
  MESSAGE: 'message',

  // 上下文字段
  SOURCE: 'source',
  USER_ID: 'userId',
  REQUEST_ID: 'requestId',
  SESSION_ID: 'sessionId',

  // 扩展字段
  METADATA: 'metadata',
  PAGE_PATH: 'pagePath',
  ACTION: 'action',
  DEVICE_INFO: 'deviceInfo',
  NETWORK_TYPE: 'networkType',

  // 后端特有字段
  IP_ADDRESS: 'ipAddress',
  USER_AGENT: 'userAgent',
  URL: 'url',
  METHOD: 'method',
  ERROR_STACK: 'errorStack'
};

// 后端数据库字段映射（snake_case）
const DB_FIELD_MAP = {
  [LOG_FIELDS.ID]: 'id',
  [LOG_FIELDS.TIMESTAMP]: 'created_at',
  [LOG_FIELDS.LEVEL]: 'level',
  [LOG_FIELDS.MESSAGE]: 'message',
  [LOG_FIELDS.SOURCE]: 'source',
  [LOG_FIELDS.USER_ID]: 'user_id',
  [LOG_FIELDS.REQUEST_ID]: 'request_id',
  [LOG_FIELDS.SESSION_ID]: 'session_id',
  [LOG_FIELDS.METADATA]: 'metadata',
  [LOG_FIELDS.PAGE_PATH]: 'page_path',
  [LOG_FIELDS.ACTION]: 'action',
  [LOG_FIELDS.DEVICE_INFO]: 'device_info',
  [LOG_FIELDS.NETWORK_TYPE]: 'network_type',
  [LOG_FIELDS.IP_ADDRESS]: 'ip_address',
  [LOG_FIELDS.USER_AGENT]: 'user_agent',
  [LOG_FIELDS.URL]: 'url',
  [LOG_FIELDS.METHOD]: 'method',
  [LOG_FIELDS.ERROR_STACK]: 'error_stack'
};

// API查询参数默认值
const DEFAULT_QUERY_PARAMS = {
  PAGE: 1,
  PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 500
};

// 日志批量推送限制
const PUSH_LIMITS = {
  MAX_BATCH_SIZE: 100,
  MAX_QUEUE_SIZE: 500,
  PUSH_INTERVAL_MS: 10000
};

// 字段长度限制（与数据库模型保持一致）
const FIELD_LIMITS = {
  USER_ID: 64,
  SESSION_ID: 64,
  MESSAGE: 1000,
  PAGE_PATH: 200,
  ACTION: 100,
  NETWORK_TYPE: 20,
  REQUEST_ID: 64,
  IP_ADDRESS: 45,      // IPv6最大长度
  USER_AGENT: 500,
  URL: 2048,
  METHOD: 10,
  KEYWORD_SEARCH: 100  // 搜索关键词最大长度
};

// 验证日志级别是否有效
const isValidLogLevel = (level) => {
  if (!level) return false;
  return Object.values(LOG_LEVELS).includes(level.toLowerCase());
};

// 获取日志级别优先级
const getLogLevelPriority = (level) => {
  return LOG_LEVEL_PRIORITY[level?.toLowerCase()] ?? -1;
};

// 比较两个日志级别（返回true如果level1 >= level2）
const isLogLevelGte = (level1, level2) => {
  return getLogLevelPriority(level1) >= getLogLevelPriority(level2);
};

module.exports = {
  LOG_LEVELS,
  LOG_LEVEL_PRIORITY,
  LOG_SOURCES,
  LOG_FIELDS,
  DB_FIELD_MAP,
  DEFAULT_QUERY_PARAMS,
  PUSH_LIMITS,
  FIELD_LIMITS,
  isValidLogLevel,
  getLogLevelPriority,
  isLogLevelGte
};
