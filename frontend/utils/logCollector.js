/**
 * 前端日志收集器
 * 将日志推送到本地日志服务
 */

const LOG_SERVER_URL = 'http://localhost:3456';
const STORAGE_KEY = 'pending_logs';
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5秒推送一次

// 待发送的日志队列
let pendingLogs = [];
let flushTimer = null;

/**
 * 从存储中恢复待发送日志
 */
const restorePendingLogs = () => {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    if (stored && Array.isArray(stored)) {
      pendingLogs = stored;
    }
  } catch (e) {
    console.error('恢复待发送日志失败', e);
  }
};

/**
 * 保存待发送日志到存储
 */
const savePendingLogs = () => {
  try {
    wx.setStorageSync(STORAGE_KEY, pendingLogs);
  } catch (e) {
    console.error('保存待发送日志失败', e);
  }
};

/**
 * 添加日志到队列
 */
const collect = (level, message, data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    data: data ? JSON.stringify(data) : null,
    source: 'frontend',
    page: getCurrentPage(),
  };
  
  pendingLogs.push(logEntry);
  
  // 限制队列大小
  if (pendingLogs.length > 100) {
    pendingLogs = pendingLogs.slice(-100);
  }
  
  savePendingLogs();
  
  // 立即尝试推送（如果队列足够大）
  if (pendingLogs.length >= BATCH_SIZE) {
    flush();
  }
};

/**
 * 获取当前页面路径
 */
const getCurrentPage = () => {
  const pages = getCurrentPages();
  return pages.length > 0 ? pages[pages.length - 1].route : 'unknown';
};

/**
 * 推送日志到服务器
 */
const flush = async () => {
  if (pendingLogs.length === 0) return;
  
  const logsToSend = pendingLogs.splice(0, BATCH_SIZE);
  savePendingLogs();
  
  try {
    await new Promise((resolve, reject) => {
      wx.request({
        url: `${LOG_SERVER_URL}/api/logs/frontend`,
        method: 'POST',
        data: logsToSend,
        header: {
          'Content-Type': 'application/json',
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        },
        fail: reject,
      });
    });
    
    console.log(`[LogCollector] 推送 ${logsToSend.length} 条日志成功`);
  } catch (err) {
    console.error('[LogCollector] 推送日志失败:', err.message);
    // 推送失败，重新加入队列
    pendingLogs.unshift(...logsToSend);
    savePendingLogs();
  }
};

/**
 * 启动定时推送
 */
const start = () => {
  restorePendingLogs();
  
  if (flushTimer) {
    clearInterval(flushTimer);
  }
  
  flushTimer = setInterval(flush, FLUSH_INTERVAL);
  
  // 监听小程序前后台切换
  wx.onAppShow(() => {
    console.log('[LogCollector] 小程序进入前台，恢复推送');
    flush();
  });
  
  wx.onAppHide(() => {
    console.log('[LogCollector] 小程序进入后台，保存日志');
    savePendingLogs();
  });
  
  console.log('[LogCollector] 日志收集器已启动');
};

/**
 * 停止定时推送
 */
const stop = () => {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  savePendingLogs();
};

/**
 * 立即推送所有日志
 */
const flushAll = async () => {
  while (pendingLogs.length > 0) {
    await flush();
  }
};

// 日志级别快捷方法
const logger = {
  error: (message, data) => collect('ERROR', message, data),
  warn: (message, data) => collect('WARN', message, data),
  info: (message, data) => collect('INFO', message, data),
  debug: (message, data) => collect('DEBUG', message, data),
  start,
  stop,
  flush,
  flushAll,
};

module.exports = logger;
