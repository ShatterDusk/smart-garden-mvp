/**
 * 前端日志收集器
 * 用于收集小程序 console.log 并推送到后端
 * 日志通过 API 推送到后端统一存储
 */

const logApi = require('./logApi')

const PUSH_INTERVAL = 10000 // 10秒推送一次

class LogCollector {
  constructor() {
    this.logQueue = []
    this.pushTimer = null
    this.isPushing = false
    this.init()
  }

  init() {
    // 定时推送日志到后端（每10秒）
    this.pushTimer = setInterval(() => {
      this.pushToBackend()
    }, PUSH_INTERVAL)

    // 页面卸载时推送剩余日志
    wx.onAppHide(() => {
      this.pushToBackend()
    })

    // 拦截原生 console 方法
    this.interceptConsole()
  }

  /**
   * 拦截原生 console 方法，自动捕获所有 console.log
   */
  interceptConsole() {
    const originalLog = console.log
    const originalInfo = console.info
    const originalWarn = console.warn
    const originalError = console.error
    const originalDebug = console.debug

    // 保存原始方法，以便内部使用
    this._originalConsole = {
      log: originalLog,
      info: originalInfo,
      warn: originalWarn,
      error: originalError,
      debug: originalDebug
    }

    const self = this

    // 重写 console.log
    console.log = function(...args) {
      originalLog.apply(console, args)
      self._captureConsoleLog('INFO', args)
    }

    // 重写 console.info
    console.info = function(...args) {
      originalInfo.apply(console, args)
      self._captureConsoleLog('INFO', args)
    }

    // 重写 console.warn
    console.warn = function(...args) {
      originalWarn.apply(console, args)
      self._captureConsoleLog('WARN', args)
    }

    // 重写 console.error
    console.error = function(...args) {
      originalError.apply(console, args)
      self._captureConsoleLog('ERROR', args)
    }

    // 重写 console.debug
    console.debug = function(...args) {
      originalDebug.apply(console, args)
      self._captureConsoleLog('DEBUG', args)
    }
  }

  /**
   * 捕获 console 输出
   */
  _captureConsoleLog(level, args) {
    // 避免捕获日志收集器自身的输出（防止循环）
    if (args.length > 0 && typeof args[0] === 'string' && args[0].startsWith('[LogCollector]')) {
      return
    }

    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg)
        } catch (e) {
          return String(arg)
        }
      }
      return String(arg)
    }).join(' ')

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      data: ''
    }

    this.logQueue.push(logEntry)

    // 队列过长时立即推送
    if (this.logQueue.length >= 50) {
      this.pushToBackend()
    }
  }

  /**
   * 记录日志
   * @param {string} level - 日志级别: debug, info, warn, error
   * @param {string} message - 日志消息
   * @param {*} data - 附加数据
   */
  log(level, message, data) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data: data ? JSON.stringify(data) : ''
    }

    // 同时输出到控制台
    console[level](`[${logEntry.level}] ${message}`, data || '')

    // 加入队列
    this.logQueue.push(logEntry)

    // 队列过长时立即推送
    if (this.logQueue.length >= 50) {
      this.pushToBackend()
    }
  }

  debug(message, data) {
    this.log('debug', message, data)
  }

  info(message, data) {
    this.log('info', message, data)
  }

  warn(message, data) {
    this.log('warn', message, data)
  }

  error(message, data) {
    this.log('error', message, data)
  }

  /**
   * 推送日志到后端
   */
  async pushToBackend() {
    if (this.logQueue.length === 0 || this.isPushing) return

    this.isPushing = true
    const logs = this.logQueue.splice(0)

    try {
      await logApi.pushFrontendLogs(logs)
      // 使用原始 console 避免循环
      if (this._originalConsole) {
        this._originalConsole.log('[LogCollector] 日志已推送到后端，条数:', logs.length)
      }
    } catch (err) {
      // 推送失败，将日志放回队列（保留最近100条）
      this.logQueue = [...logs, ...this.logQueue].slice(0, 100)
      if (this._originalConsole) {
        this._originalConsole.error('[LogCollector] 推送日志失败:', err.message)
      }
    } finally {
      this.isPushing = false
    }
  }

  /**
   * 销毁收集器
   */
  destroy() {
    if (this.pushTimer) {
      clearInterval(this.pushTimer)
      this.pushTimer = null
    }
    this.pushToBackend()
  }
}

// 创建单例实例
const logCollector = new LogCollector()

module.exports = logCollector
