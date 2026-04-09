/**
 * 日志工具
 * 使用 Winston 实现结构化日志
 * 支持文件、控制台、数据库三种存储模式
 *
 * 存储模式通过 LOG_STORAGE_MODE 控制：
 * - file: 仅文件存储（本地开发）
 * - database: 仅数据库存储（云端生产环境）
 * - both: 同时写入文件和数据库（过渡/备份）
 */

const winston = require('winston');
const path = require('path');

// 日志存储模式
const LOG_STORAGE_MODE = process.env.LOG_STORAGE_MODE || 'file';

// 日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// 控制台格式
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    let message = `${info.timestamp} ${info.level}: ${info.message}`;
    const meta = { ...info };
    delete meta.timestamp;
    delete meta.level;
    delete meta.message;
    delete meta[Symbol.for('level')];
    delete meta[Symbol.for('splat')];

    if (Object.keys(meta).length > 0) {
      message += ` ${JSON.stringify(meta)}`;
    }
    return message;
  })
);

// 文件格式（无颜色）
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => {
    let message = `${info.timestamp} ${info.level}: ${info.message}`;
    const meta = { ...info };
    delete meta.timestamp;
    delete meta.level;
    delete meta.message;
    delete meta[Symbol.for('level')];
    delete meta[Symbol.for('splat')];

    if (Object.keys(meta).length > 0) {
      message += ` ${JSON.stringify(meta)}`;
    }
    return message;
  })
);

// 自定义数据库 Transport
class DatabaseTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
    this.name = 'database';
    this.SystemLog = null;
  }

  // 延迟加载模型
  getSystemLog() {
    if (!this.SystemLog) {
      try {
        this.SystemLog = require('../models/SystemLog');
      } catch (err) {
        console.error('[DatabaseTransport] 加载 SystemLog 模型失败:', err.message);
      }
    }
    return this.SystemLog;
  }

  async log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    try {
      const SystemLog = this.getSystemLog();
      if (!SystemLog) {
        // 模型加载失败，跳过数据库写入
        return callback();
      }

      // 解析日志信息
      const level = info.level.replace(/\u001b\[\d+m/g, '').trim(); // 去除颜色码
      const message = info.message;
      const timestamp = info.timestamp || new Date().toISOString();

      // 提取元数据
      const meta = { ...info };
      delete meta.timestamp;
      delete meta.level;
      delete meta.message;
      delete meta[Symbol.for('level')];
      delete meta[Symbol.for('splat')];

      // 提取特定字段
      const metadata = Object.keys(meta).length > 0 ? meta : null;
      const errorStack = meta.errorStack || meta.stack || null;
      const source = meta.source || null;
      const requestId = meta.requestId || null;
      const ipAddress = meta.ip || null;
      const userAgent = meta.userAgent || null;
      const url = meta.url || null;
      const method = meta.method || null;

      // 写入数据库
      await SystemLog.create({
        level: level.toLowerCase(),
        message,
        metadata,
        source,
        request_id: requestId,
        ip_address: ipAddress,
        user_agent: userAgent,
        url,
        method,
        error_stack: errorStack,
        created_at: timestamp,
      });
    } catch (err) {
      console.error('[DatabaseTransport] 写入数据库失败:', err.message);
    }

    callback();
  }
}

// 传输方式
const transports = [
  // 控制台输出 - 所有环境都启用
  new winston.transports.Console({ format: consoleFormat }),
];

// 根据存储模式配置传输
if (LOG_STORAGE_MODE === 'file' || LOG_STORAGE_MODE === 'both') {
  // 文件存储
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/all.log'),
      format: fileFormat,
    })
  );
  console.log('[Logger] 已启用文件日志存储');
}

if (LOG_STORAGE_MODE === 'database' || LOG_STORAGE_MODE === 'both') {
  // 数据库存储
  transports.push(new DatabaseTransport());
  console.log('[Logger] 已启用数据库日志存储');
}

// 创建 Logger 实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: consoleFormat,
  transports,
});

module.exports = logger;
