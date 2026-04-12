/**
 * 日志API封装 - 整改完整版
 * 提供日志推送、查询、搜索、统计、导出等功能
 */

const config = require('./config.js');

// 日志级别常量（与后端保持一致）
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

// 日志来源
const LOG_SOURCES = {
  BACKEND: 'backend',
  FRONTEND: 'frontend'
};

/**
 * 获取认证Token
 * 优先从全局数据获取，支持JWT Token或AccessKey
 */
const getAuthToken = () => {
  try {
    const app = getApp();
    return app?.globalData?.logAccessToken || null;
  } catch (e) {
    return null;
  }
};

/**
 * 构建请求头
 */
const buildHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  return headers;
};

/**
 * 统一请求封装
 * @param {string} url - 请求路径（不含baseUrl）
 * @param {string} method - 请求方法
 * @param {object} data - 请求数据
 * @param {object} options - 额外选项
 * @returns {Promise}
 */
function request(url, method = 'GET', data = null, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      url: `${config.API_BASE_URL}${url}`,
      method,
      header: buildHeaders(),
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          resolve(res.data.data);
        } else if (res.statusCode === 401) {
          reject(new Error('认证失败：请提供有效的访问令牌'));
        } else {
          reject(new Error(res.data.message || `请求失败 (${res.statusCode})`));
        }
      },
      fail: (err) => {
        reject(new Error('网络请求失败: ' + (err.errMsg || err.message)));
      }
    };

    if (data) {
      requestOptions.data = data;
    }

    // 合并额外选项
    Object.assign(requestOptions, options);

    wx.request(requestOptions);
  });
}

/**
 * 构建查询字符串
 * @param {Object} params - 查询参数
 * @returns {string} 查询字符串
 */
const buildQueryString = (params = {}) => {
  const query = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return query ? `?${query}` : '';
};

/**
 * 日志API对象
 */
const logApi = {
  // ========== 常量 ==========
  LOG_LEVELS,
  LOG_SOURCES,

  // ========== 认证相关 ==========

  /**
   * 设置访问令牌
   * @param {string} token - JWT Token或AccessKey
   */
  setAccessToken(token) {
    const app = getApp();
    if (!app.globalData) {
      app.globalData = {};
    }
    app.globalData.logAccessToken = token;
  },

  /**
   * 清除访问令牌
   */
  clearAccessToken() {
    const app = getApp();
    if (app.globalData) {
      app.globalData.logAccessToken = null;
    }
  },

  // ========== 客户端日志推送 ==========

  /**
   * 推送客户端日志到后端
   * @param {Array} logs - 日志数组，每项包含 {timestamp, level, message, data, ...}
   * @returns {Promise<{received: number, mode: string}>}
   */
  pushClientLogs(logs) {
    if (!Array.isArray(logs) || logs.length === 0) {
      return Promise.reject(new Error('日志必须是数组且不能为空'));
    }
    return request('/logs/client', 'POST', logs);
  },

  // ========== 日志查询 ==========

  /**
   * 获取日志列表
   * @param {Object} params - 查询参数
   * @param {string} params.level - 日志级别: debug|info|warn|error|fatal
   * @param {string} params.source - 来源: backend|frontend
   * @param {string} params.startTime - 开始时间 (ISO格式)
   * @param {string} params.endTime - 结束时间 (ISO格式)
   * @param {string} params.userId - 用户ID（前端日志）
   * @param {string} params.requestId - 请求ID（后端日志）
   * @param {string} params.keyword - 关键词搜索
   * @param {number} params.page - 页码，默认1
   * @param {number} params.pageSize - 每页条数，默认50
   * @returns {Promise<{logs: Array, pagination: Object, mode: string}>}
   */
  getLogs(params = {}) {
    const query = buildQueryString(params);
    return request(`/logs${query}`);
  },

  /**
   * 获取日志统计
   * @param {Object} params - 查询参数
   * @param {string} params.source - 来源: backend|frontend
   * @param {string} params.startTime - 开始时间
   * @param {string} params.endTime - 结束时间
   * @returns {Promise<{total: number, byLevel: Object, source: string, mode: string}>}
   */
  getStats(params = {}) {
    const query = buildQueryString(params);
    return request(`/logs/stats${query}`);
  },

  /**
   * 搜索日志
   * @param {string} keyword - 搜索关键词（必填）
   * @param {Object} options - 其他过滤条件
   * @param {string} options.level - 日志级别
   * @param {string} options.source - 来源
   * @param {string} options.startTime - 开始时间
   * @param {string} options.endTime - 结束时间
   * @param {number} options.page - 页码
   * @param {number} options.pageSize - 每页条数
   * @returns {Promise<{keyword: string, logs: Array, pagination: Object, mode: string}>}
   */
  searchLogs(keyword, options = {}) {
    if (!keyword || typeof keyword !== 'string') {
      return Promise.reject(new Error('搜索关键词不能为空'));
    }
    const params = { keyword, ...options };
    const query = buildQueryString(params);
    return request(`/logs/search${query}`);
  },

  /**
   * 获取最近的错误日志
   * @param {number} limit - 条数限制，默认20
   * @param {string} source - 来源
   * @returns {Promise<Array>}
   */
  async getRecentErrors(limit = 20, source = LOG_SOURCES.BACKEND) {
    const result = await this.getLogs({
      level: LOG_LEVELS.ERROR,
      source,
      pageSize: limit
    });
    return result.logs || [];
  },

  // ========== 日志导出 ==========

  /**
   * 导出日志
   * @param {string} format - 导出格式: json|csv
   * @param {Object} params - 过滤条件
   * @param {string} params.level - 日志级别
   * @param {string} params.source - 来源
   * @param {string} params.startTime - 开始时间
   * @param {string} params.endTime - 结束时间
   * @param {number} params.maxRows - 最大行数，默认10000
   * @returns {Promise<Object|string>} JSON对象或CSV文本
   */
  exportLogs(format = 'json', params = {}) {
    if (!['json', 'csv'].includes(format)) {
      return Promise.reject(new Error('导出格式必须是 json 或 csv'));
    }
    const queryParams = { format, ...params };
    const query = buildQueryString(queryParams);
    return request(`/logs/export${query}`, 'GET', null, {
      responseType: format === 'csv' ? 'text' : 'json'
    });
  },

  // ========== 日志删除（需要管理员权限）==========

  /**
   * 删除指定ID的日志
   * @param {Array<number>} ids - 日志ID数组
   * @param {string} source - 来源
   * @returns {Promise<{deletedCount: number, source: string, mode: string}>}
   */
  deleteByIds(ids, source = LOG_SOURCES.BACKEND) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return Promise.reject(new Error('ID数组不能为空'));
    }
    const params = {
      ids: ids.join(','),
      source
    };
    const query = buildQueryString(params);
    return request(`/logs${query}`, 'DELETE');
  },

  /**
   * 按级别删除日志
   * @param {string} level - 日志级别
   * @param {string} before - 删除此时间之前的日志 (ISO格式)
   * @param {string} source - 来源
   * @returns {Promise<{deletedCount: number, source: string, mode: string}>}
   */
  deleteByLevel(level, before = null, source = LOG_SOURCES.BACKEND) {
    if (!level || !Object.values(LOG_LEVELS).includes(level.toLowerCase())) {
      return Promise.reject(new Error('无效的日志级别'));
    }
    const params = { level: level.toLowerCase(), before, source };
    const query = buildQueryString(params);
    return request(`/logs${query}`, 'DELETE');
  },

  // ========== 兼容旧接口（已废弃）=========

  /**
   * 获取日志文件列表（已废弃，建议使用 getLogs）
   * @deprecated
   */
  getLogFiles(source = LOG_SOURCES.BACKEND) {
    console.warn('[logApi] getLogFiles 已废弃，请使用 getLogs');
    const query = buildQueryString({ source });
    return request(`/logs/files${query}`);
  },

  /**
   * 获取日志文件内容（已废弃，建议使用 getLogs）
   * @deprecated
   */
  getLogContent(file, lines = 100, source = LOG_SOURCES.BACKEND) {
    console.warn('[logApi] getLogContent 已废弃，请使用 getLogs');
    const query = buildQueryString({ file, lines, source });
    return request(`/logs/content${query}`);
  }
};

module.exports = logApi;
