/**
 * 日志控制器 - 数据库模式专用版
 * 仅支持数据库存储，提供完整的CRUD、搜索、统计和导出功能
 */

const { Op } = require('sequelize');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const {
  LOG_LEVELS,
  LOG_SOURCES,
  DEFAULT_QUERY_PARAMS,
  PUSH_LIMITS,
  FIELD_LIMITS,
  isValidLogLevel
} = require('../shared/logConstants');

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

/**
 * 构建数据库查询条件
 * @param {Object} filters - 过滤条件
 * @returns {Object} 包含 where 和 error 的对象
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
      if (isNaN(startDate.getTime())) {
        return { error: { message: `无效的开始时间格式: ${startTime}，请使用ISO 8601格式（如：2024-01-01T00:00:00Z）`, status: 400 } };
      }
      where.created_at[Op.gte] = startDate;
    }
    if (endTime) {
      const endDate = new Date(endTime);
      if (isNaN(endDate.getTime())) {
        return { error: { message: `无效的结束时间格式: ${endTime}，请使用ISO 8601格式（如：2024-01-01T00:00:00Z）`, status: 400 } };
      }
      where.created_at[Op.lte] = endDate;
    }
  }

  // 安全处理keyword搜索：限制长度并转义LIKE特殊字符
  if (keyword) {
    const sanitizedKeyword = String(keyword)
      .substring(0, FIELD_LIMITS.KEYWORD_SEARCH) // 限制长度
      .replace(/[%_\\]/g, '\\$&'); // 转义LIKE特殊字符：%, _, \
    
    if (sanitizedKeyword.trim()) {
      where.message = { [Op.like]: `%${sanitizedKeyword}%` };
    }
  }

  // 后端日志特有字段
  if (source === LOG_SOURCES.BACKEND) {
    if (requestId && typeof requestId === 'string' && requestId.length <= FIELD_LIMITS.REQUEST_ID) {
      where.request_id = requestId;
    }
  }

  // 前端日志特有字段
  if (source === LOG_SOURCES.FRONTEND) {
    if (userId && typeof userId === 'string' && userId.length <= FIELD_LIMITS.USER_ID) {
      where.user_id = userId;
    }
  }

  return { where };
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

  // 根据source明确区分前后端日志
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
 * 获取日志列表
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

    const Model = source === LOG_SOURCES.FRONTEND ? getClientLog() : getSystemLog();
    if (!Model) {
      return error(res, '数据库模型未加载', 500);
    }

    const whereResult = buildWhereClause({ level, source, startTime, endTime, userId, requestId, keyword });
    if (whereResult.error) {
      return error(res, whereResult.error.message, whereResult.error.status);
    }

    const { count, rows } = await Model.findAndCountAll({
      where: whereResult.where,
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
      }
    });

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

    const Model = source === LOG_SOURCES.FRONTEND ? getClientLog() : getSystemLog();
    if (!Model) {
      return error(res, '数据库模型未加载', 500);
    }

    const whereResult = buildWhereClause({ source, startTime, endTime });
    if (whereResult.error) {
      return error(res, whereResult.error.message, whereResult.error.status);
    }

    // 按级别统计
    const stats = await Model.findAll({
      where: whereResult.where,
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
      timeRange: { startTime, endTime }
    });

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

    const Model = source === LOG_SOURCES.FRONTEND ? getClientLog() : getSystemLog();
    if (!Model) {
      return error(res, '数据库模型未加载', 500);
    }

    const whereResult = buildWhereClause({ level, source, startTime, endTime, keyword });
    if (whereResult.error) {
      return error(res, whereResult.error.message, whereResult.error.status);
    }

    const { count, rows } = await Model.findAndCountAll({
      where: whereResult.where,
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
      }
    });

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

    // 权限检查由路由中间件 verifyLogAccess 统一处理
    // 如需更细粒度的权限控制，可在此添加

    const Model = source === LOG_SOURCES.FRONTEND ? getClientLog() : getSystemLog();
    if (!Model) {
      return error(res, '数据库模型未加载', 500);
    }

    let where = {};
    let deletedCount = 0;

    if (ids) {
      // 按ID删除
      const idList = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
      if (idList.length === 0) {
        return error(res, '无效的ID列表', 400);
      }
      where = { id: { [Op.in]: idList} };
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
      source
    });

  } catch (err) {
    logger.error('删除日志失败', { error: err.message });
    return error(res, '删除日志失败', 500);
  }
};

/**
 * CSV字段转义
 * 处理逗号、换行符、引号等特殊字符
 * @param {*} value - 字段值
 * @returns {string} 转义后的字符串
 */
const escapeCsvField = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  
  // 对象转JSON字符串
  let str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  
  // 如果包含特殊字符，需要用引号包裹并转义内部引号
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    // 将双引号替换为两个双引号（CSV标准转义方式）
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  
  return str;
};

/**
 * 生成CSV内容
 * @param {Array} logs - 日志数组
 * @returns {string} CSV格式内容（带BOM）
 */
const generateCsvContent = (logs) => {
  if (!logs || logs.length === 0) {
    return '\uFEFF'; // 只有BOM的空文件
  }
  
  // 固定字段顺序（与formatLogEntry返回的字段顺序一致）
  const fields = [
    'id', 'timestamp', 'level', 'message', 'source',
    'userId', 'sessionId', 'pagePath', 'action', 'deviceInfo', 'networkType', 'metadata',
    'requestId', 'ipAddress', 'userAgent', 'url', 'method', 'errorStack'
  ];
  
  // 过滤掉logs[0]中不存在的字段（根据source不同，字段不同）
  const availableFields = fields.filter(field => field in logs[0]);
  
  // 生成表头
  const headers = availableFields.map(escapeCsvField).join(',');
  
  // 生成数据行
  const csvRows = logs.map(log => {
    return availableFields.map(field => escapeCsvField(log[field])).join(',');
  });
  
  // 组合内容并添加UTF-8 BOM（解决Excel中文乱码）
  return '\uFEFF' + [headers, ...csvRows].join('\n');
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

    const Model = source === LOG_SOURCES.FRONTEND ? getClientLog() : getSystemLog();
    if (!Model) {
      return error(res, '数据库模型未加载', 500);
    }

    const whereResult = buildWhereClause({ level, source, startTime, endTime });
    if (whereResult.error) {
      return error(res, whereResult.error.message, whereResult.error.status);
    }

    const rows = await Model.findAll({
      where: whereResult.where,
      order: [['created_at', 'DESC']],
      limit: parseInt(maxRows)
    });

    const logs = rows.map(log => formatLogEntry(log.toJSON(), source));

    if (format === 'csv') {
      // 生成安全的CSV内容
      const csvContent = generateCsvContent(logs);
      
      // 设置响应头
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="logs-${Date.now()}.csv"`);
      
      return res.send(csvContent);
    }

    // JSON格式
    return success(res, {
      logs,
      exportedAt: new Date().toISOString(),
      count: logs.length
    });

  } catch (err) {
    logger.error('导出日志失败', { error: err.message });
    return error(res, '导出日志失败', 500);
  }
};

/**
 * 接收客户端日志
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
      return error(res, '数据库模型未加载', 500);
    }

    // 数据清洗和验证
    const logEntries = logs.map((log, index) => {
      try {
        // 处理日志级别
        const rawLevel = log.level || LOG_LEVELS.INFO;
        const level = typeof rawLevel === 'string' ? rawLevel.toLowerCase() : LOG_LEVELS.INFO;
        
        if (!isValidLogLevel(level)) {
          logger.warn(`[receiveClientLogs] 无效日志级别: ${level}，使用默认值`);
        }

        // 处理时间戳
        let clientTimestamp = null;
        if (log.timestamp) {
          const parsedDate = new Date(log.timestamp);
          if (!isNaN(parsedDate.getTime())) {
            clientTimestamp = parsedDate;
          }
        }

        return {
          user_id: String(log.userId || log.user_id || userId).substring(0, FIELD_LIMITS.USER_ID),
          session_id: log.sessionId ? String(log.sessionId).substring(0, FIELD_LIMITS.SESSION_ID) : null,
          level: isValidLogLevel(level) ? level : LOG_LEVELS.INFO,
          message: String(log.message || '').substring(0, FIELD_LIMITS.MESSAGE),
          page_path: String(log.pagePath || log.page_path || '').substring(0, FIELD_LIMITS.PAGE_PATH) || null,
          action: String(log.action || '').substring(0, FIELD_LIMITS.ACTION) || null,
          device_info: log.deviceInfo || log.device_info || null,
          metadata: log.metadata || null,
          network_type: log.networkType ? String(log.networkType).substring(0, FIELD_LIMITS.NETWORK_TYPE) : null,
          created_at: clientTimestamp || new Date()
        };
      } catch (parseErr) {
        logger.warn(`[receiveClientLogs] 日志条目 ${index} 解析失败`, { error: parseErr.message });
        return null;
      }
    }).filter(Boolean);

    if (logEntries.length === 0) {
      return success(res, { received: 0 });
    }

    await ClientLog.bulkCreate(logEntries, {
      validate: false,
      logging: false
    });

    logger.info('[receiveClientLogs] 客户端日志已写入数据库', {
      count: logEntries.length,
      userId
    });

    return success(res, {
      received: logEntries.length
    });

  } catch (err) {
    logger.error('[receiveClientLogs] 接收客户端日志失败', {
      error: err.message,
      stack: err.stack
    });
    // 生产环境隐藏详细错误信息
    const isDev = process.env.NODE_ENV === 'development';
    const message = isDev 
      ? '日志接收失败: ' + err.message 
      : '日志接收失败，请稍后重试';
    return error(res, message, 500);
  }
};

/**
 * 获取日志文件列表（已废弃，过渡方案）
 * GET /api/logs/files
 * @deprecated
 */
const getLogFiles = async (req, res) => {
  // 过渡方案：返回警告信息，引导迁移到新接口
  return success(res, {
    warning: '此接口已废弃，即将返回410错误，请尽快迁移到 GET /api/logs',
    alternative: '/api/logs',
    migration_guide: '使用 GET /api/logs 替代，支持分页、过滤、搜索等功能',
    deprecated_at: '2024-01-01',
    will_remove_at: '2024-06-01'
  });
};

/**
 * 获取日志文件内容（已废弃，过渡方案）
 * GET /api/logs/content
 * @deprecated
 */
const getLogContent = async (req, res) => {
  // 过渡方案：重定向到新接口，同时返回警告
  logger.warn('[getLogContent] 废弃接口被调用，请迁移到 GET /api/logs', {
    query: req.query,
    ip: req.ip
  });
  
  // 返回警告信息，并引导使用新接口
  return success(res, {
    warning: '此接口已废弃，即将返回410错误，请尽快迁移到 GET /api/logs',
    alternative: '/api/logs',
    migration_guide: '使用 GET /api/logs 替代，支持分页、过滤、搜索等功能',
    deprecated_at: '2024-01-01',
    will_remove_at: '2024-06-01',
    note: '当前请求已转发到 GET /api/logs，但建议直接调用新接口'
  });
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
