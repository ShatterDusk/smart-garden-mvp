/**
 * 前端日志工具 - 整改版
 * 统一日志级别、字段命名，与后端保持一致
 * 支持控制台输出、本地存储和API推送
 */

// 引入API封装
const logApi = require('./logApi');

// 日志级别常量（与后端保持一致，小写）
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

// 日志级别优先级
const LOG_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

// 配置
const CONFIG = {
  STORAGE_KEY: 'app_logs',
  MAX_LOGS: 500,
  DEFAULT_LEVEL: 'debug',
  ENABLE_STORAGE: true,
  ENABLE_API_PUSH: false // 默认关闭，需要手动开启
};

// 当前日志级别
let currentLevel = LOG_PRIORITY[CONFIG.DEFAULT_LEVEL];

/**
 * 获取存储的日志
 * @returns {Array} 日志数组
 */
const getStoredLogs = () => {
  try {
    const logs = wx.getStorageSync(CONFIG.STORAGE_KEY);
    return Array.isArray(logs) ? logs : [];
  } catch (e) {
    return [];
  }
};

/**
 * 保存日志到本地存储
 * @param {Object} logEntry - 日志条目
 */
const saveToStorage = (logEntry) => {
  if (!CONFIG.ENABLE_STORAGE) return;

  try {
    const logs = getStoredLogs();
    logs.push(logEntry);

    // 限制日志数量
    if (logs.length > CONFIG.MAX_LOGS) {
      logs.shift();
    }

    wx.setStorageSync(CONFIG.STORAGE_KEY, logs);
  } catch (e) {
    console.error('[Logger] 保存日志失败:', e);
  }
};

/**
 * 格式化日志数据
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Object} data - 附加数据
 * @returns {Object} 格式化的日志对象
 */
const formatLogEntry = (level, message, data = null) => {
  const timestamp = new Date().toISOString();

  return {
    timestamp,
    level: level.toLowerCase(), // 统一小写
    message: String(message || ''),
    // 统一使用metadata字段名（与后端一致）
    metadata: data || null,
    // 添加环境信息
    pagePath: getCurrentPagePath(),
    // 可以扩展更多字段：deviceInfo, networkType等
  };
};

/**
 * 获取当前页面路径
 * @returns {string|null}
 */
const getCurrentPagePath = () => {
  try {
    const pages = getCurrentPages();
    return pages.length > 0 ? pages[pages.length - 1].route : null;
  } catch (e) {
    return null;
  }
};

/**
 * 输出到控制台
 * @param {string} level - 日志级别
 * @param {string} message - 消息
 * @param {Object} data - 数据
 */
const outputToConsole = (level, message, data) => {
  const time = new Date().toLocaleTimeString();
  const formatted = `[${time}] [${level.toUpperCase()}] ${message}`;

  switch (level.toLowerCase()) {
    case LOG_LEVELS.DEBUG:
      console.debug(formatted, data || '');
      break;
    case LOG_LEVELS.INFO:
      console.info(formatted, data || '');
      break;
    case LOG_LEVELS.WARN:
      console.warn(formatted, data || '');
      break;
    case LOG_LEVELS.ERROR:
    case LOG_LEVELS.FATAL:
      console.error(formatted, data || '');
      break;
    default:
      console.log(formatted, data || '');
  }
};

/**
 * 核心日志记录函数
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Object} data - 附加数据
 */
const log = (level, message, data) => {
  const levelLower = level.toLowerCase();

  // 检查日志级别
  if (LOG_PRIORITY[levelLower] === undefined) {
    console.warn(`[Logger] 未知日志级别: ${level}`);
    return;
  }

  if (LOG_PRIORITY[levelLower] < currentLevel) {
    return; // 级别不够，不记录
  }

  // 输出到控制台
  outputToConsole(level, message, data);

  // 构建日志条目
  const logEntry = formatLogEntry(level, message, data);

  // 保存到本地存储
  saveToStorage(logEntry);

  // 如果开启了API推送，高优先级日志实时推送
  if (CONFIG.ENABLE_API_PUSH && LOG_PRIORITY[levelLower] >= LOG_PRIORITY.error) {
    pushLogImmediately(logEntry);
  }
};

/**
 * 立即推送单条日志到后端
 * @param {Object} logEntry
 */
const pushLogImmediately = async (logEntry) => {
  try {
    await logApi.pushClientLogs([logEntry]);
  } catch (err) {
    // 推送失败不阻塞，静默处理
    console.warn('[Logger] 日志推送失败:', err.message);
  }
};

/**
 * Logger对象
 */
const logger = {
  // 常量暴露
  LOG_LEVELS,

  /**
   * 设置日志级别
   * @param {string} level - debug|info|warn|error|fatal
   */
  setLevel(level) {
    const levelLower = level.toLowerCase();
    if (LOG_PRIORITY[levelLower] !== undefined) {
      currentLevel = LOG_PRIORITY[levelLower];
      console.log(`[Logger] 日志级别设置为: ${levelLower}`);
    } else {
      console.warn(`[Logger] 无效的日志级别: ${level}`);
    }
  },

  /**
   * 获取当前日志级别
   * @returns {string}
   */
  getLevel() {
    return Object.keys(LOG_PRIORITY).find(key => LOG_PRIORITY[key] === currentLevel);
  },

  /**
   * 启用/禁用本地存储
   * @param {boolean} enable
   */
  setStorageEnabled(enable) {
    CONFIG.ENABLE_STORAGE = enable;
  },

  /**
   * 启用/禁用API推送
   * @param {boolean} enable
   */
  setApiPushEnabled(enable) {
    CONFIG.ENABLE_API_PUSH = enable;
  },

  // ========== 各级别日志方法 ==========

  /**
   * 调试日志
   * @param {string} message
   * @param {Object} data
   */
  debug(message, data) {
    log(LOG_LEVELS.DEBUG, message, data);
  },

  /**
   * 信息日志
   * @param {string} message
   * @param {Object} data
   */
  info(message, data) {
    log(LOG_LEVELS.INFO, message, data);
  },

  /**
   * 警告日志
   * @param {string} message
   * @param {Object} data
   */
  warn(message, data) {
    log(LOG_LEVELS.WARN, message, data);
  },

  /**
   * 错误日志
   * @param {string} message
   * @param {Object} data
   */
  error(message, data) {
    log(LOG_LEVELS.ERROR, message, data);
  },

  /**
   * 致命错误日志
   * @param {string} message
   * @param {Object} data
   */
  fatal(message, data) {
    log(LOG_LEVELS.FATAL, message, data);
  },

  // ========== 日志管理 ==========

  /**
   * 获取所有存储的日志
   * @returns {Array}
   */
  getLogs() {
    return getStoredLogs();
  },

  /**
   * 获取指定级别的日志
   * @param {string} level
   * @returns {Array}
   */
  getLogsByLevel(level) {
    const logs = getStoredLogs();
    return logs.filter(log => log.level === level.toLowerCase());
  },

  /**
   * 清空日志
   */
  clearLogs() {
    try {
      wx.removeStorageSync(CONFIG.STORAGE_KEY);
      console.log('[Logger] 日志已清空');
    } catch (e) {
      console.error('[Logger] 清空日志失败:', e);
    }
  },

  /**
   * 导出日志为JSON
   * @returns {Array}
   */
  exportAsJson() {
    return getStoredLogs();
  },

  /**
   * 导出日志为文本
   * @returns {string}
   */
  exportAsText() {
    const logs = getStoredLogs();
    return logs.map(log => {
      const dataStr = log.data ? ` ${JSON.stringify(log.data)}` : '';
      return `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${dataStr}`;
    }).join('\n');
  },

  /**
   * 批量推送日志到后端
   * @returns {Promise}
   */
  async pushToServer() {
    const logs = getStoredLogs();
    if (logs.length === 0) {
      console.log('[Logger] 没有日志需要推送');
      return { received: 0 };
    }

    try {
      const result = await logApi.pushClientLogs(logs);
      console.log(`[Logger] 成功推送 ${result.received} 条日志`);
      return result;
    } catch (err) {
      console.error('[Logger] 推送日志失败:', err.message);
      throw err;
    }
  }
};

module.exports = logger;
