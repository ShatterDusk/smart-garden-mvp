/**
 * 前端日志收集器 - 整改版
 * 自动收集console输出并批量推送到后端
 * 统一使用与后端一致的日志级别和字段格式
 */

const logApi = require('./logApi');

// 配置常量
const CONFIG = {
  PUSH_INTERVAL: 10000, // 10秒推送一次
  MAX_QUEUE_SIZE: 100,  // 队列最大长度
  BATCH_SIZE: 50,       // 每批推送条数
  LOG_LEVELS: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    FATAL: 'fatal'
  }
};

/**
 * 日志收集器类
 */
class LogCollector {
  constructor(options = {}) {
    this.logQueue = [];
    this.pushTimer = null;
    this.isPushing = false;
    this.isInitialized = false;
    this.options = {
      autoPush: true,           // 是否自动推送
      interceptConsole: true,   // 是否拦截console
      pushInterval: CONFIG.PUSH_INTERVAL,
      ...options
    };

    // 保存原始console方法
    this._originalConsole = null;
  }

  /**
   * 初始化收集器
   */
  init() {
    if (this.isInitialized) {
      return;
    }

    // 拦截原生console方法
    if (this.options.interceptConsole) {
      this.interceptConsole();
    }

    // 启动自动推送定时器
    if (this.options.autoPush) {
      this.startAutoPush();
    }

    // 页面隐藏时推送剩余日志
    wx.onAppHide(() => {
      this.flush();
    });

    this.isInitialized = true;
    this._log('[LogCollector] 初始化完成');
  }

  /**
   * 拦截原生console方法
   */
  interceptConsole() {
    if (this._originalConsole) {
      return; // 已经拦截过
    }

    // 保存原始方法
    this._originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    const self = this;

    // 重写console方法
    console.log = function(...args) {
      self._originalConsole.log.apply(console, args);
      self._captureLog(CONFIG.LOG_LEVELS.INFO, args);
    };

    console.info = function(...args) {
      self._originalConsole.info.apply(console, args);
      self._captureLog(CONFIG.LOG_LEVELS.INFO, args);
    };

    console.warn = function(...args) {
      self._originalConsole.warn.apply(console, args);
      self._captureLog(CONFIG.LOG_LEVELS.WARN, args);
    };

    console.error = function(...args) {
      self._originalConsole.error.apply(console, args);
      self._captureLog(CONFIG.LOG_LEVELS.ERROR, args);
    };

    console.debug = function(...args) {
      self._originalConsole.debug.apply(console, args);
      self._captureLog(CONFIG.LOG_LEVELS.DEBUG, args);
    };
  }

  /**
   * 恢复原始console方法
   */
  restoreConsole() {
    if (!this._originalConsole) {
      return;
    }

    console.log = this._originalConsole.log;
    console.info = this._originalConsole.info;
    console.warn = this._originalConsole.warn;
    console.error = this._originalConsole.error;
    console.debug = this._originalConsole.debug;

    this._originalConsole = null;
  }

  /**
   * 捕获console输出
   * @param {string} level - 日志级别
   * @param {Array} args - console参数
   */
  _captureLog(level, args) {
    // 避免捕获收集器自身的输出（防止循环）
    if (args.length > 0 && typeof args[0] === 'string' && args[0].startsWith('[LogCollector]')) {
      return;
    }

    // 格式化消息
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    // 创建日志条目（统一格式，与后端ClientLog模型对应）
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level, // 已经是小写
      message: message.substring(0, 1000), // 限制长度
      pagePath: this._getCurrentPagePath(),
      // metadata字段留给手动添加的额外数据
      metadata: null
    };

    this._addToQueue(logEntry);
  }

  /**
   * 手动记录日志
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  log(level, message, data = null) {
    const levelLower = level.toLowerCase();

    // 验证日志级别
    if (!Object.values(CONFIG.LOG_LEVELS).includes(levelLower)) {
      this._warn(`[LogCollector] 未知日志级别: ${level}`);
      return;
    }

    // 输出到原始console
    if (this._originalConsole) {
      const consoleMethod = levelLower === 'debug' ? 'debug' :
                           levelLower === 'warn' ? 'warn' :
                           levelLower === 'error' ? 'error' :
                           levelLower === 'fatal' ? 'error' : 'log';
      this._originalConsole[consoleMethod](`[${level.toUpperCase()}] ${message}`, data || '');
    }

    // 创建日志条目（统一格式）
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: levelLower,
      message: String(message).substring(0, 1000),
      // 统一使用metadata字段名
      metadata: data || null,
      pagePath: this._getCurrentPagePath()
    };

    this._addToQueue(logEntry);
  }

  /**
   * 快捷方法：调试日志
   */
  debug(message, data) {
    this.log(CONFIG.LOG_LEVELS.DEBUG, message, data);
  }

  /**
   * 快捷方法：信息日志
   */
  info(message, data) {
    this.log(CONFIG.LOG_LEVELS.INFO, message, data);
  }

  /**
   * 快捷方法：警告日志
   */
  warn(message, data) {
    this.log(CONFIG.LOG_LEVELS.WARN, message, data);
  }

  /**
   * 快捷方法：错误日志
   */
  error(message, data) {
    this.log(CONFIG.LOG_LEVELS.ERROR, message, data);
  }

  /**
   * 添加入队
   * @param {Object} logEntry
   */
  _addToQueue(logEntry) {
    this.logQueue.push(logEntry);

    // 队列过长时立即推送
    if (this.logQueue.length >= CONFIG.BATCH_SIZE) {
      this.flush();
    }

    // 限制队列长度
    if (this.logQueue.length > CONFIG.MAX_QUEUE_SIZE) {
      this.logQueue = this.logQueue.slice(-CONFIG.MAX_QUEUE_SIZE);
      this._warn('[LogCollector] 队列已满，丢弃旧日志');
    }
  }

  /**
   * 获取当前页面路径
   * @returns {string|null}
   */
  _getCurrentPagePath() {
    try {
      const pages = getCurrentPages();
      return pages.length > 0 ? pages[pages.length - 1].route : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 获取用户信息
   * @returns {Object}
   */
  _getUserInfo() {
    try {
      const app = getApp();
      return {
        userId: app.globalData?.userInfo?.userId || 'SYSTEM',
        sessionId: app.globalData?.sessionId || null
      };
    } catch (e) {
      return { userId: 'SYSTEM', sessionId: null };
    }
  }

  /**
   * 启动自动推送
   */
  startAutoPush() {
    if (this.pushTimer) {
      return;
    }

    this.pushTimer = setInterval(() => {
      this.flush();
    }, this.options.pushInterval);

    this._log('[LogCollector] 自动推送已启动');
  }

  /**
   * 停止自动推送
   */
  stopAutoPush() {
    if (this.pushTimer) {
      clearInterval(this.pushTimer);
      this.pushTimer = null;
      this._log('[LogCollector] 自动推送已停止');
    }
  }

  /**
   * 立即推送日志到后端
   * @returns {Promise}
   */
  async flush() {
    if (this.logQueue.length === 0 || this.isPushing) {
      return { received: 0 };
    }

    this.isPushing = true;
    const logsToPush = this.logQueue.splice(0, CONFIG.BATCH_SIZE);

    // 添加用户信息
    const userInfo = this._getUserInfo();
    const logsWithUser = logsToPush.map(log => ({
      ...log,
      userId: userInfo.userId,
      sessionId: log.sessionId || userInfo.sessionId
    }));

    try {
      const result = await logApi.pushClientLogs(logsWithUser);
      this._log(`[LogCollector] 推送成功: ${result.received} 条日志`);
      return result;
    } catch (err) {
      // 推送失败，将日志放回队列（保留最近100条）
      this.logQueue = [...logsToPush, ...this.logQueue].slice(0, 100);
      this._error('[LogCollector] 推送失败:', err.message);
      throw err;
    } finally {
      this.isPushing = false;
    }
  }

  /**
   * 获取队列中的日志数量
   * @returns {number}
   */
  getQueueSize() {
    return this.logQueue.length;
  }

  /**
   * 清空队列
   */
  clearQueue() {
    const count = this.logQueue.length;
    this.logQueue = [];
    this._log(`[LogCollector] 队列已清空: ${count} 条日志`);
  }

  /**
   * 销毁收集器
   */
  destroy() {
    this.stopAutoPush();
    this.restoreConsole();
    this.flush(); // 尝试推送剩余日志
    this.isInitialized = false;
    this._log('[LogCollector] 已销毁');
  }

  // ========== 内部日志方法（使用原始console避免循环）==========

  _log(...args) {
    if (this._originalConsole) {
      this._originalConsole.log(...args);
    }
  }

  _warn(...args) {
    if (this._originalConsole) {
      this._originalConsole.warn(...args);
    }
  }

  _error(...args) {
    if (this._originalConsole) {
      this._originalConsole.error(...args);
    }
  }
}

// 创建默认实例
const logCollector = new LogCollector();

// 自动初始化（如果不在测试环境）
if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
  logCollector.init();
}

module.exports = logCollector;
module.exports.LogCollector = LogCollector; // 导出类供自定义实例使用
