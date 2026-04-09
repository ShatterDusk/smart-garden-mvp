/**
 * 日志查看控制器
 * 支持文件存储和数据库存储两种模式
 * 通过 LOG_STORAGE_MODE 环境变量控制
 */

const fs = require('fs');
const path = require('path');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// 日志存储模式
const LOG_STORAGE_MODE = process.env.LOG_STORAGE_MODE || 'file';

// 延迟加载模型（避免启动时数据库未连接）
let SystemLog = null;
let ClientLog = null;

const getSystemLog = () => {
  if (!SystemLog) {
    try {
      SystemLog = require('../models/SystemLog');
    } catch (err) {
      console.error('[logController] 加载 SystemLog 模型失败:', err.message);
    }
  }
  return SystemLog;
};

const getClientLog = () => {
  if (!ClientLog) {
    try {
      ClientLog = require('../models/ClientLog');
    } catch (err) {
      console.error('[logController] 加载 ClientLog 模型失败:', err.message);
    }
  }
  return ClientLog;
};

// 日志目录配置（文件模式）
const LOGS_DIRS = {
  backend: path.join(__dirname, '../../logs'),
  frontend: path.join(__dirname, '../../../../logs/frontend')
};

/**
 * 获取日志目录（文件模式）
 * @param {string} source - 日志来源：backend 或 frontend
 * @returns {string} 日志目录路径
 */
const getLogsDir = (source = 'backend') => {
  return LOGS_DIRS[source] || LOGS_DIRS.backend;
};

/**
 * 获取日志文件列表
 * GET /api/logs/files?source=backend|frontend
 */
const getLogFiles = async (req, res) => {
  try {
    const { source = 'backend' } = req.query;

    // 数据库模式：返回虚拟文件列表
    if (LOG_STORAGE_MODE === 'database') {
      const today = new Date().toISOString().split('T')[0];
      return success(res, {
        files: [{
          name: `${source}-${today}.log`,
          size: 0,
          modifiedAt: new Date(),
          mode: 'database'
        }],
        source,
        mode: 'database'
      });
    }

    // 文件模式
    const LOGS_DIR = getLogsDir(source);
    if (!fs.existsSync(LOGS_DIR)) {
      return success(res, { files: [], source, mode: 'file' });
    }

    const files = fs.readdirSync(LOGS_DIR)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(LOGS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modifiedAt: stats.mtime,
        };
      });

    return success(res, { files, source, path: LOGS_DIR, mode: 'file' });
  } catch (err) {
    logger.error('获取日志文件列表失败', { error: err.message, source: req.query.source });
    return error(res, '获取日志文件列表失败', 500);
  }
};

/**
 * 获取日志内容
 * GET /api/logs/content?file=xxx.log&lines=100&source=backend|frontend
 */
const getLogContent = async (req, res) => {
  try {
    const { file, lines = 100, source = 'backend' } = req.query;

    // 数据库模式
    if (LOG_STORAGE_MODE === 'database') {
      const SystemLog = getSystemLog();
      const ClientLog = getClientLog();
      
      if (!SystemLog || !ClientLog) {
        console.error('[logController] 数据库模型未加载');
        return error(res, '数据库模型未加载', 500);
      }
      
      try {
        const limit = parseInt(lines);
        let logs;
        let totalCount;

        if (source === 'backend') {
          logs = await SystemLog.findAll({
            order: [['created_at', 'DESC']],
            limit: limit
          });
          totalCount = await SystemLog.count();
        } else {
          logs = await ClientLog.findAll({
            order: [['created_at', 'DESC']],
            limit: limit
          });
          totalCount = await ClientLog.count();
        }

      // 转换为文本格式
      const content = logs.map(log => {
        const timestamp = log.created_at.toISOString();
        const level = log.level.toUpperCase();
        const message = log.message;
        const meta = log.metadata ? JSON.stringify(log.metadata) : '';
        return `[${timestamp}] [${level}] ${message} ${meta}`.trim();
      }).reverse().join('\n');

        return success(res, {
          file: file || `${source}-${new Date().toISOString().split('T')[0]}.log`,
          source,
          mode: 'database',
          totalLines: totalCount,
          lines: logs.length,
          content: content,
        });
      } catch (dbErr) {
        console.error('[logController] 数据库查询失败:', dbErr.message);
        return error(res, `数据库查询失败: ${dbErr.message}`, 500);
      }
    }

    // 文件模式
    if (!file) {
      return error(res, '请指定日志文件名', 400, 400);
    }

    const LOGS_DIR = getLogsDir(source);
    const fileName = path.basename(file);
    const filePath = path.join(LOGS_DIR, fileName);

    if (!filePath.startsWith(LOGS_DIR)) {
      return error(res, '非法文件路径', 400, 400);
    }

    if (!fs.existsSync(filePath)) {
      return error(res, '日志文件不存在', 404, 404);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n').filter(line => line.trim());
    const lastLines = allLines.slice(-parseInt(lines));

    return success(res, {
      file: fileName,
      source,
      mode: 'file',
      totalLines: allLines.length,
      lines: lastLines.length,
      content: lastLines.join('\n'),
    });
  } catch (err) {
    logger.error('获取日志内容失败', { error: err.message, file: req.query.file, source: req.query.source });
    return error(res, '获取日志内容失败', 500);
  }
};

/**
 * 搜索日志
 * GET /api/logs/search?file=xxx.log&keyword=xxx&source=backend|frontend
 */
const searchLogs = async (req, res) => {
  try {
    const { file, keyword, lines = 50, source = 'backend' } = req.query;

    if (!keyword) {
      return error(res, '请指定搜索关键词', 400, 400);
    }

    // 数据库模式
    if (LOG_STORAGE_MODE === 'database') {
      const SystemLog = getSystemLog();
      const ClientLog = getClientLog();
      
      if (!SystemLog || !ClientLog) {
        return error(res, '数据库模型未加载', 500);
      }
      
      const limit = parseInt(lines);
      let logs;

      if (source === 'backend') {
        logs = await SystemLog.findAll({
          where: {
            message: { [Op.like]: `%${keyword}%` }
          },
          order: [['created_at', 'DESC']],
          limit: limit
        });
      } else {
        logs = await ClientLog.findAll({
          where: {
            message: { [Op.like]: `%${keyword}%` }
          },
          order: [['created_at', 'DESC']],
          limit: limit
        });
      }

      const content = logs.map(log => {
        const timestamp = log.created_at.toISOString();
        const level = log.level.toUpperCase();
        const message = log.message;
        const meta = log.metadata ? JSON.stringify(log.metadata) : '';
        return `[${timestamp}] [${level}] ${message} ${meta}`.trim();
      }).reverse().join('\n');

      return success(res, {
        file: file || `${source}-${new Date().toISOString().split('T')[0]}.log`,
        source,
        mode: 'database',
        keyword,
        matchedCount: logs.length,
        content: content,
      });
    }

    // 文件模式
    if (!file) {
      return error(res, '请指定文件名', 400, 400);
    }

    const LOGS_DIR = getLogsDir(source);
    const fileName = path.basename(file);
    const filePath = path.join(LOGS_DIR, fileName);

    if (!filePath.startsWith(LOGS_DIR) || !fs.existsSync(filePath)) {
      return error(res, '日志文件不存在', 404, 404);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n');
    const matchedLines = allLines
      .filter(line => line.includes(keyword))
      .slice(-parseInt(lines));

    return success(res, {
      file: fileName,
      source,
      mode: 'file',
      keyword,
      matchedCount: matchedLines.length,
      content: matchedLines.join('\n'),
    });
  } catch (err) {
    logger.error('搜索日志失败', { error: err.message, keyword: req.query.keyword, source: req.query.source });
    return error(res, '搜索日志失败', 500);
  }
};

/**
 * 清空日志
 * DELETE /api/logs/clear?file=xxx.log&source=backend|frontend
 */
const clearLogFile = async (req, res) => {
  try {
    const { file, source = 'backend' } = req.query;

    // 数据库模式
    if (LOG_STORAGE_MODE === 'database') {
      const SystemLog = getSystemLog();
      const ClientLog = getClientLog();
      
      if (!SystemLog || !ClientLog) {
        return error(res, '数据库模型未加载', 500);
      }
      
      if (source === 'backend') {
        await SystemLog.destroy({ where: {}, truncate: true });
      } else {
        await ClientLog.destroy({ where: {}, truncate: true });
      }

      logger.info('数据库日志已清空', { source });
      return success(res, { message: '数据库日志已清空', source, mode: 'database' });
    }

    // 文件模式
    if (!file) {
      return error(res, '请指定日志文件名', 400, 400);
    }

    const LOGS_DIR = getLogsDir(source);
    const fileName = path.basename(file);
    const filePath = path.join(LOGS_DIR, fileName);

    if (!filePath.startsWith(LOGS_DIR) || !fs.existsSync(filePath)) {
      return error(res, '日志文件不存在', 404, 404);
    }

    fs.writeFileSync(filePath, '');
    logger.info('日志文件已清空', { file: fileName, source });

    return success(res, { message: '日志文件已清空', file: fileName, source, mode: 'file' });
  } catch (err) {
    logger.error('清空日志失败', { error: err.message, source: req.query.source });
    return error(res, '清空日志失败', 500);
  }
};

/**
 * 接收前端日志
 * POST /api/logs/frontend
 * 支持文件模式和数据库模式
 */
const receiveFrontendLogs = async (req, res) => {
  try {
    const logs = req.body;
    const userId = req.user?.userId || 'anonymous';

    if (!Array.isArray(logs) || logs.length === 0) {
      return error(res, '日志格式错误，需要数组', 400, 400);
    }

    // 数据库模式
    if (LOG_STORAGE_MODE === 'database') {
      const ClientLog = getClientLog();
      
      if (!ClientLog) {
        return error(res, '数据库模型未加载', 500);
      }
      
      const logEntries = logs.map(log => ({
        user_id: userId,
        session_id: log.sessionId || null,
        level: (log.level || 'info').toLowerCase(),
        message: log.message || '',
        page_path: log.pagePath || null,
        action: log.action || null,
        device_info: log.deviceInfo || log.data?.deviceInfo || null,
        metadata: log.data || null,
        network_type: log.networkType || null,
      }));

      await ClientLog.bulkCreate(logEntries);
      logger.info('前端日志已写入数据库', { count: logs.length, userId });

      return success(res, {
        received: logs.length,
        mode: 'database',
      });
    }

    // 文件模式（both 模式也写入文件）
    if (LOG_STORAGE_MODE === 'file' || LOG_STORAGE_MODE === 'both') {
      const LOGS_DIR = LOGS_DIRS.frontend;
      if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
      }

      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(LOGS_DIR, `frontend-${date}.log`);

      const logEntries = logs.map(log => {
        const timestamp = log.timestamp || new Date().toISOString();
        const level = log.level || 'INFO';
        const message = log.message || '';
        const data = log.data ? JSON.stringify(log.data) : '';
        return `[${timestamp}] [${level}] ${message} ${data}`.trim();
      });

      fs.appendFileSync(logFile, logEntries.join('\n') + '\n');
      logger.info('前端日志已写入文件', { count: logs.length, file: `frontend-${date}.log` });
    }

    // both 模式：同时写入数据库
    if (LOG_STORAGE_MODE === 'both') {
      const ClientLog = getClientLog();
      
      if (ClientLog) {
        const logEntries = logs.map(log => ({
          user_id: userId,
          session_id: log.sessionId || null,
          level: (log.level || 'info').toLowerCase(),
          message: log.message || '',
          page_path: log.pagePath || null,
          action: log.action || null,
          device_info: log.deviceInfo || log.data?.deviceInfo || null,
          metadata: log.data || null,
          network_type: log.networkType || null,
        }));

        await ClientLog.bulkCreate(logEntries);
      }
    }

    return success(res, {
      received: logs.length,
      mode: LOG_STORAGE_MODE,
    });
  } catch (err) {
    logger.error('接收前端日志失败', { error: err.message });
    return error(res, '接收前端日志失败', 500);
  }
};

module.exports = {
  getLogFiles,
  getLogContent,
  searchLogs,
  clearLogFile,
  receiveFrontendLogs,
};
