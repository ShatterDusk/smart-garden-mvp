/**
 * 日志控制器 - 整改版
 * 统一支持文件存储和数据库存储两种模式
 * 提供完整的CRUD、搜索、统计和导出功能
 */

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const {
  LOG_LEVELS,
  LOG_SOURCES,
  LOG_FIELDS,
  DB_FIELD_MAP,
  DEFAULT_QUERY_PARAMS,
  PUSH_LIMITS,
  isValidLogLevel
} = require('../shared/logConstants');

// 日志存储模式
const LOG_STORAGE_MODE = process.env.LOG_STORAGE_MODE || 'file';

// 延迟加载模型
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
  [LOG_SOURCES.BACKEND]: path.resolve(__dirname, '../../logs'),
  [LOG_SOURCES.FRONTEND]: path.resolve(__dirname, '../../../../logs/frontend')
};

/**
 * 获取安全的日志文件路径
 * 防止路径遍历攻击
 * @param {string} source - 日志来源
 * @param {string} fileName - 文件名
 * @returns {string|null} 安全的文件路径，如果非法则返回null
 */
const getSafeLogFilePath = (source, fileName) => {
  // 获取基础目录
  const baseDir = LOGS_DIRS[source] || LOGS_DIRS[LOG_SOURCES.BACKEND];
  
  // 规范化基础目录
  const safeBaseDir = path.resolve(baseDir);
  
  // 清理文件名：只保留基本文件名，移除所有路径分隔符
  const safeFileName = path.basename(fileName).replace(/[\\/]/g, '');
  
  // 验证文件名合法性
  if (!safeFileName || safeFileName === '.' || safeFileName === '..') {
    return null;
  }
  
  // 只允许.log文件
  if (!safeFileName.endsWith('.log')) {
    return null;
  }
  
  // 解析完整路径
  const fullPath = path.resolve(safeBaseDir, safeFileName);
  
  // 确保解析后的路径在基础目录内（防止路径遍历）
  // 使用path.sep确保跨平台兼容
  const baseDirWithSep = safeBaseDir.endsWith(path.sep) ? safeBaseDir : safeBaseDir + path.sep;
  if (!fullPath.startsWith(baseDirWithSep) && fullPath !== safeBaseDir) {
    return null;
  }
  
  return fullPath;
};

/**
 * 获取日志目录
 * @param {string} source - 日志来源
 * @returns {string} 日志目录路径
 */
const getLogsDir = (source = LOG_SOURCES.BACKEND) => {
  return LOGS_DIRS[source] || LOGS_DIRS[LOG_SOURCES.BACKEND];
};

/**
 * 构建数据库查询条件
 * @param {Object} filters - 过滤条件
 * @returns {Object} Sequelize where条件
 */
const buildWhereClause = (filters) => {
  const where = {};
  const { level, source, startTime, endTime, userId, requestId, keyword } = filters;

  if (level && isValidLogLevel(level)) {
    where.level = level.toLowerCase();
  }

  if (startTime || endTime) {
    where.created_at = {};
    if (startTime) {
      const startDate = new Date(startTime);
      if (!isNaN(startDate.getTime())) {
        where.created_at[Op.gte] = startDate;
      }
    }
    if (endTime) {
      const endDate = new Date(endTime);
      if (!isNaN(endDate.getTime())) {
        where.created_at[Op.lte] = endDate;
      }
    }
  }

  // 安全处理keyword搜索：限制长度并转义LIKE特殊字符
  if (keyword) {
    const sanitizedKeyword = String(keyword)
      .substring(0, 100) // 限制长度
      .replace(/[%_\\]/g, '\\$&'); // 转义LIKE特殊字符：%, _, \
    
    if (sanitizedKeyword.trim()) {
      where.message = { [Op.like]: `%${sanitizedKeyword}%` };
    }
  }

  // 后端日志特有字段
  if (source === LOG_SOURCES.BACKEND) {
    if (requestId && typeof requestId === 'string' && requestId.length <= 64) {
      where.request_id = requestId;
    }
  }

  // 前端日志特有字段
  if (source === LOG_SOURCES.FRONTEND) {
    if (userId && typeof userId === 'string' && userId.length <= 64) {
      where.user_id = userId;
    }
  }

  return where;
};

/**
 * 格式化日志记录（统一输出格式）
 * @param {Object} log - 原始日志记录
 * @param {string} source - 日志来源
 * @returns {Object} 格式化后的日志
 */
const formatLogEntry = (log, source) => {
  const base = {
    id: log.id,
    timestamp: log.created_at ? new Date(log.created_at).toISOString() : new Date().toISOString(),
    level: log.level?.toLowerCase(),
    message: log.message,
    source: source || LOG_SOURCES.BACKEND
  };

  // 根据source明确区分前后端日志，不使用user_id作为判断条件
  if (source === LOG_SOURCES.FRONTEND) {
    // 前端日志字段（client_logs表）
    return {
      ...base,
      userId: log.user_id,
      sessionId: log.session_id,
      pagePath: log.page_path,
      action: log.action,
      deviceInfo: log.device_info,
      networkType: log.network_type,
      metadata: log.metadata
    };
  } else {
    // 后端日志字段（system_logs表）
    return {
      ...base,
      requestId: log.request_id,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      url: log.url,
      method: log.method,
      errorStack: log.error_stack,
      metadata: log.metadata
    };
  }
};

/**
 * 获取日志列表（统一接口）
 * GET /api/logs
 */
const getLogs = async (req, res) => {
  try {
    const {
      level,
      source = LOG_SOURCES.BACKEND,
      startTime,
      endTime,
      userId,
      requestId,
      keyword,
      page = DEFAULT_QUERY_PARAMS.PAGE,
      pageSize = DEFAULT_QUERY_PARAMS.PAGE_SIZE
    } = req.query;

    // 参数验证
    const limit = Math.min(parseInt(pageSize), DEFAULT_QUERY_PARAMS.MAX_PAGE_SIZE);
    const offset = (parseInt(page) - 1) * limit;

    if (level && !isValidLogLevel(level)) {
      return error(res, `无效的日志级别: ${level}，可选: ${Object.values(LOG_LEVELS).join(', ')}`, 400);
    }

    // 数据库模式
    if (LOG_STORAGE_MODE === 'database') {
      const Model = source === LOG_SOURCES.FRONTEND ? getClientLog() : getSystemLog();
      if (!Model) {
        return error(res, '数据库模型未加载', 500);
      }

      const where = buildWhereClause({ level, source, startTime, endTime, userId, requestId, keyword });

      const { count, rows } = await Model.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      return success(res, {
        logs: rows.map(log => formatLogEntry(log.toJSON(), source)),
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        },
        mode: 'database'
      });
    }

    // 文件模式（简化实现，仅返回文本内容）
    return error(res, '文件模式暂不支持高级查询，请使用数据库模式', 501);

  } catch (err) {
    logger.error('获取日志列表失败', { error: err.message, query: req.query });
    return error(res, '获取日志列表失败', 500);
  }
};

/**
 * 获取日志统计
 * GET /api/logs/stats
 */
const getLogStats = async (req, res) => {
  try {
    const { source = LOG_SOURCES.BACKEND, startTime, endTime } = req.query;

    if (LOG_STORAGE_MODE === 'database') {
      const Model = source === LOG_SOURCES.FRONTEND ? getClientLog() : getSystemLog();
      if (!Model) {
        return error(res, '数据库模型未加载', 500);
      }

      const where = buildWhereClause({ source, startTime, endTime });

      // 按级别统计
      const stats = await Model.findAll({
        where,
        attributes: ['level', [Model.sequelize.fn('COUNT', '*'), 'count']],
        group: ['level'],
        raw: true
      });

      const total = stats.reduce((sum, s) => sum + parseInt(s.count), 0);

      return success(res, {
        total,
        byLevel: stats.reduce((acc, s) => {
          acc[s.level] = parseInt(s.count);
          return acc;
        }, {}),
        source,
        timeRange: { startTime, endTime },
        mode: 'database'
      });
    }

    return error(res, '文件模式暂不支持统计功能', 501);

  } catch (err) {
    logger.error('获取日志统计失败', { error: err.message });
    return error(res, '获取日志统计失败', 500);
  }
};

/**
 * 搜索日志
 * GET /api/logs/search
 */
const searchLogs = async (req, res) => {
  try {
    const {
      keyword,
      level,
      source = LOG_SOURCES.BACKEND,
      startTime,
      endTime,
      page = DEFAULT_QUERY_PARAMS.PAGE,
      pageSize = DEFAULT_QUERY_PARAMS.PAGE_SIZE
    } = req.query;

    if (!keyword) {
      return error(res, '请提供搜索关键词', 400);
    }

    const limit = Math.min(parseInt(pageSize), DEFAULT_QUERY_PARAMS.MAX_PAGE_SIZE);
    const offset = (parseInt(page) - 1) * limit;

    if (LOG_STORAGE_MODE === 'database') {
      const Model = source === LOG_SOURCES.FRONTEND ? getClientLog() : getSystemLog();
      if (!Model) {
        return error(res, '数据库模型未加载', 500);
      }

      const where = buildWhereClause({ level, source, startTime, endTime, keyword });

      const { count, rows } = await Model.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      return success(res, {
        keyword,
        logs: rows.map(log => formatLogEntry(log.toJSON(), source)),
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        },
        mode: 'database'
      });
    }

    return error(res, '文件模式暂不支持搜索功能', 501);

  } catch (err) {
    logger.error('搜索日志失败', { error: err.message, keyword: req.query.keyword });
    return error(res, '搜索日志失败', 500);
  }
};

/**
 * 删除日志
 * DELETE /api/logs
 */
const deleteLogs = async (req, res) => {
  try {
    const { ids, level, before, source = LOG_SOURCES.BACKEND } = req.query;

    // 检查权限（简化实现，实际应该检查req.user.role）
    if (req.user?.role !== 'admin') {
      return error(res, '权限不足，需要管理员角色', 403);
    }

    if (LOG_STORAGE_MODE === 'database') {
      const Model = source === LOG_SOURCES.FRONTEND ? getClientLog() : getSystemLog();
      if (!Model) {
        return error(res, '数据库模型未加载', 500);
      }

      let where = {};
      let deletedCount = 0;

      if (ids) {
        // 按ID删除
        const idList = ids.split(',').map(id => parseInt(id)).filter(Boolean);
        where = { id: { [Op.in]: idList } };
      } else if (level && isValidLogLevel(level)) {
        // 按级别删除
        where = { level: level.toLowerCase() };
        if (before) {
          where.created_at = { [Op.lt]: new Date(before) };
        }
      } else if (before) {
        // 按时间删除
        where = { created_at: { [Op.lt]: new Date(before) } };
      } else {
        return error(res, '请提供删除条件：ids、level或before', 400);
      }

      deletedCount = await Model.destroy({ where });

      logger.info('日志已删除', { deletedCount, source, query: req.query });

      return success(res, {
        deletedCount,
        source,
        mode: 'database'
      });
    }

    return error(res, '文件模式暂不支持删除功能', 501);

  } catch (err) {
    logger.error('删除日志失败', { error: err.message });
    return error(res, '删除日志失败', 500);
  }
};

/**
 * 导出日志
 * GET /api/logs/export
 */
const exportLogs = async (req, res) => {
  try {
    const {
      format = 'json',
      level,
      source = LOG_SOURCES.BACKEND,
      startTime,
      endTime,
      maxRows = 10000
    } = req.query;

    if (!['json', 'csv'].includes(format)) {
      return error(res, '不支持的导出格式，可选: json, csv', 400);
    }

    if (LOG_STORAGE_MODE === 'database') {
      const Model = source === LOG_SOURCES.FRONTEND ? getClientLog() : getSystemLog();
      if (!Model) {
        return error(res, '数据库模型未加载', 500);
      }

      const where = buildWhereClause({ level, source, startTime, endTime });

      const rows = await Model.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: parseInt(maxRows)
      });

      const logs = rows.map(log => formatLogEntry(log.toJSON(), source));

      if (format === 'csv') {
        // CSV格式
        const headers = Object.keys(logs[0] || {}).join(',');
        const csvRows = logs.map(log =>
          Object.values(log).map(v =>
            typeof v === 'object' ? JSON.stringify(v) : String(v)
          ).join(',')
        );
        const csvContent = [headers, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="logs-${Date.now()}.csv"`);
        return res.send(csvContent);
      }

      // JSON格式
      return success(res, {
        logs,
        exportedAt: new Date().toISOString(),
        count: logs.length,
        mode: 'database'
      });
    }

    return error(res, '文件模式暂不支持导出功能', 501);

  } catch (err) {
    logger.error('导出日志失败', { error: err.message });
    return error(res, '导出日志失败', 500);
  }
};

/**
 * 接收客户端日志（整改版）
 * POST /api/logs/client
 */
const receiveClientLogs = async (req, res) => {
  try {
    const logs = req.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return error(res, '日志格式错误，需要非空数组', 400);
    }

    // 限制批量大小
    if (logs.length > PUSH_LIMITS.MAX_BATCH_SIZE) {
      logger.warn('[receiveClientLogs] 日志批量过大，截断处理', {
        original: logs.length,
        max: PUSH_LIMITS.MAX_BATCH_SIZE
      });
      logs.splice(PUSH_LIMITS.MAX_BATCH_SIZE);
    }

    // 获取用户信息
    const userId = logs[0]?.userId || logs[0]?.user_id || req.user?.userId || 'SYSTEM';

    const ClientLog = getClientLog();
    if (!ClientLog) {
      logger.warn('[receiveClientLogs] ClientLog 模型未加载，使用文件模式');
      return await writeLogsToFile(logs, userId, res);
    }

    // 数据清洗和验证
    const logEntries = logs.map((log, index) => {
      try {
        // 处理日志级别（前端已经转小写，但做兼容处理）
        const rawLevel = log.level || LOG_LEVELS.INFO;
        const level = typeof rawLevel === 'string' ? rawLevel.toLowerCase() : LOG_LEVELS.INFO;
        
        if (!isValidLogLevel(level)) {
          logger.warn(`[receiveClientLogs] 无效日志级别: ${level}，使用默认值`);
        }

        // 处理时间戳：优先使用前端传入的timestamp
        let clientTimestamp = null;
        if (log.timestamp) {
          const parsedDate = new Date(log.timestamp);
          if (!isNaN(parsedDate.getTime())) {
            clientTimestamp = parsedDate;
          }
        }

        return {
          user_id: String(log.userId || log.user_id || userId).substring(0, 64),
          session_id: log.sessionId ? String(log.sessionId).substring(0, 64) : null,
          level: isValidLogLevel(level) ? level : LOG_LEVELS.INFO,
          message: String(log.message || '').substring(0, 1000),
          page_path: String(log.pagePath || log.page_path || '').substring(0, 200) || null,
          action: String(log.action || '').substring(0, 100) || null,
          device_info: log.deviceInfo || log.device_info || null,
          // 统一使用metadata，前端data字段映射到metadata
          metadata: log.data || log.metadata || null,
          network_type: log.networkType ? String(log.networkType).substring(0, 20) : null,
          // 使用前端传入的时间戳（如果有效），否则使用当前时间
          created_at: clientTimestamp || new Date()
        };
      } catch (parseErr) {
        logger.warn(`[receiveClientLogs] 日志条目 ${index} 解析失败`, { error: parseErr.message });
        return null;
      }
    }).filter(Boolean);

    if (logEntries.length === 0) {
      return success(res, { received: 0, mode: 'none' });
    }

    try {
      await ClientLog.bulkCreate(logEntries, {
        validate: false,
        logging: false
      });

      logger.info('[receiveClientLogs] 客户端日志已写入数据库', {
        count: logEntries.length,
        userId
      });

      return success(res, {
        received: logEntries.length,
        mode: 'database'
      });
    } catch (dbErr) {
      logger.warn('[receiveClientLogs] 数据库写入失败，切换到文件模式', {
        error: dbErr.message
      });
      return await writeLogsToFile(logs, userId, res);
    }
  } catch (err) {
    logger.error('[receiveClientLogs] 接收客户端日志失败', {
      error: err.message,
      stack: err.stack
    });
    // 生产环境隐藏详细错误信息，防止信息泄露
    const isDev = process.env.NODE_ENV === 'development';
    const message = isDev 
      ? '日志接收失败: ' + err.message 
      : '日志接收失败，请稍后重试';
    return error(res, message, 500);
  }
};

/**
 * 写入文件（降级处理）
 */
async function writeLogsToFile(logs, userId, res) {
  try {
    const LOGS_DIR = LOGS_DIRS[LOG_SOURCES.FRONTEND];
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOGS_DIR, `frontend-${date}.log`);

    const fileEntries = logs.map(log => {
      try {
        const timestamp = log.timestamp || new Date().toISOString();
        const level = (log.level || 'INFO').toUpperCase();
        const message = String(log.message || '').substring(0, 500);
        const data = log.data || log.metadata ? JSON.stringify(log.data || log.metadata).substring(0, 500) : '';
        return `[${timestamp}] [${level}] [${userId}] ${message} ${data}`.trim();
      } catch (e) {
        return `[${new Date().toISOString()}] [ERROR] [${userId}] 日志序列化失败`;
      }
    });

    fs.appendFileSync(logFile, fileEntries.join('\n') + '\n');

    logger.info('[writeLogsToFile] 前端日志已写入文件', {
      count: logs.length,
      file: `frontend-${date}.log`
    });

    return success(res, {
      received: logs.length,
      mode: 'file'
    });
  } catch (fileErr) {
    logger.error('[writeLogsToFile] 写入文件失败', { error: fileErr.message });
    return error(res, '日志保存失败: ' + fileErr.message, 500);
  }
}

/**
 * 获取日志文件列表（兼容旧接口）
 * GET /api/logs/files
 * @deprecated
 */
const getLogFiles = async (req, res) => {
  try {
    const { source = LOG_SOURCES.BACKEND } = req.query;

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
        mode: 'database',
        note: '数据库模式下文件为虚拟概念，建议使用 GET /api/logs 查询'
      });
    }

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

    return success(res, {
      files,
      source,
      path: LOGS_DIR,
      mode: 'file',
      note: '此接口已废弃，建议使用 GET /api/logs 查询'
    });
  } catch (err) {
    logger.error('获取日志文件列表失败', { error: err.message });
    return error(res, '获取日志文件列表失败', 500);
  }
};

/**
 * 获取日志文件内容（兼容旧接口）
 * GET /api/logs/content
 * @deprecated
 */
const getLogContent = async (req, res) => {
  try {
    const { file, lines = 100, source = LOG_SOURCES.BACKEND } = req.query;

    if (LOG_STORAGE_MODE === 'database') {
      // 数据库模式下重定向到新接口
      return await getLogs(req, res);
    }

    if (!file) {
      return error(res, '请指定日志文件名', 400);
    }

    // 使用安全的文件路径获取（防止路径遍历攻击）
    const filePath = getSafeLogFilePath(source, file);
    
    if (!filePath) {
      return error(res, '非法文件路径', 400);
    }

    if (!fs.existsSync(filePath)) {
      return error(res, '日志文件不存在', 404);
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
      note: '此接口已废弃，建议使用 GET /api/logs 查询'
    });
  } catch (err) {
    logger.error('获取日志内容失败', { error: err.message });
    return error(res, '获取日志内容失败', 500);
  }
};

module.exports = {
  getLogs,
  getLogStats,
  searchLogs,
  deleteLogs,
  exportLogs,
  receiveClientLogs,
  getLogFiles,
  getLogContent
};
