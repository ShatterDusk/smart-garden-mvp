/**
 * 前端日志工具
 * 支持控制台输出和本地存储
 */

const LOG_STORAGE_KEY = 'app_logs';
const MAX_LOGS = 500; // 最多保存500条日志

// 日志级别
const levels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// 当前日志级别
let currentLevel = levels.DEBUG;

/**
 * 获取存储的日志
 */
const getStoredLogs = () => {
  try {
    const logs = wx.getStorageSync(LOG_STORAGE_KEY);
    return logs || [];
  } catch (e) {
    return [];
  }
};

/**
 * 保存日志到本地存储
 */
const saveLog = (level, message, data) => {
  const logs = getStoredLogs();
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data: data ? JSON.stringify(data) : null,
  };
  
  logs.push(logEntry);
  
  // 限制日志数量
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  
  try {
    wx.setStorageSync(LOG_STORAGE_KEY, logs);
  } catch (e) {
    console.error('保存日志失败', e);
  }
};

/**
 * 格式化日志消息
 */
const formatMessage = (level, message, data) => {
  const time = new Date().toLocaleTimeString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `[${time}] [${level}] ${message}${dataStr}`;
};

const logger = {
  /**
   * 设置日志级别
   */
  setLevel(level) {
    currentLevel = level;
  },

  /**
   * 错误日志
   */
  error(message, data) {
    if (currentLevel >= levels.ERROR) {
      const formatted = formatMessage('ERROR', message, data);
      console.error(formatted);
      saveLog('ERROR', message, data);
    }
  },

  /**
   * 警告日志
   */
  warn(message, data) {
    if (currentLevel >= levels.WARN) {
      const formatted = formatMessage('WARN', message, data);
      console.warn(formatted);
      saveLog('WARN', message, data);
    }
  },

  /**
   * 信息日志
   */
  info(message, data) {
    if (currentLevel >= levels.INFO) {
      const formatted = formatMessage('INFO', message, data);
      console.info(formatted);
      saveLog('INFO', message, data);
    }
  },

  /**
   * 调试日志
   */
  debug(message, data) {
    if (currentLevel >= levels.DEBUG) {
      const formatted = formatMessage('DEBUG', message, data);
      console.log(formatted);
      saveLog('DEBUG', message, data);
    }
  },

  /**
   * 获取所有存储的日志
   */
  getLogs() {
    return getStoredLogs();
  },

  /**
   * 清空日志
   */
  clearLogs() {
    try {
      wx.removeStorageSync(LOG_STORAGE_KEY);
      console.log('日志已清空');
    } catch (e) {
      console.error('清空日志失败', e);
    }
  },

  /**
   * 导出日志为文本
   */
  exportLogs() {
    const logs = getStoredLogs();
    return logs.map(log => {
      const dataStr = log.data ? ` ${log.data}` : '';
      return `[${log.timestamp}] [${log.level}] ${log.message}${dataStr}`;
    }).join('\n');
  },
};

module.exports = logger;
