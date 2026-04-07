/**
 * 日志工具
 * 使用 Winston 实现结构化日志
 */

const winston = require('winston');
const path = require('path');

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

// 日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    let message = `${info.timestamp} ${info.level}: ${info.message}`;
    // 如果有额外数据，添加到日志中
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

// 传输方式
const transports = [
  // 控制台输出
  new winston.transports.Console(),
  
  // 错误日志文件
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
  }),
  
  // 所有日志文件
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/all.log'),
  }),
];

// 创建 Logger 实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

module.exports = logger;
