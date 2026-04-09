/**
 * 日志 API 封装
 * 用于获取前后端日志文件，以及推送前端日志到后端
 * 注意：使用完整本地地址，不使用 config.API_BASE_URL
 */

// 日志服务基础地址（本地开发环境）
const LOG_API_BASE = 'http://localhost:3000/api/logs';

// 访问密钥
const ACCESS_KEY = 'dev-log-key-2024';

/**
 * 发送请求
 * @param {string} url - 完整 URL
 * @param {string} method - 请求方法
 * @param {object} data - 请求体数据（POST 请求使用）
 * @returns {Promise}
 */
function request(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      url,
      method,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          resolve(res.data.data);
        } else if (res.statusCode === 403) {
          reject(new Error('访问密钥无效'));
        } else {
          reject(new Error(res.data.message || '请求失败'));
        }
      },
      fail: (err) => {
        reject(new Error('网络请求失败: ' + err.errMsg));
      }
    };

    if (data) {
      options.data = data;
      options.header = {
        'Content-Type': 'application/json'
      };
    }

    wx.request(options);
  });
}

/**
 * 日志 API 对象
 */
const logApi = {
  /**
   * 获取后端日志文件列表
   * @returns {Promise<{files: Array, source: string, path: string}>}
   */
  getBackendLogFiles() {
    return request(`${LOG_API_BASE}/files?accessKey=${ACCESS_KEY}&source=backend`);
  },

  /**
   * 获取前端日志文件列表
   * @returns {Promise<{files: Array, source: string, path: string}>}
   */
  getFrontendLogFiles() {
    return request(`${LOG_API_BASE}/files?accessKey=${ACCESS_KEY}&source=frontend`);
  },

  /**
   * 获取后端日志内容
   * @param {string} file - 文件名
   * @param {number} lines - 返回行数（默认 100）
   * @returns {Promise<{file: string, source: string, totalLines: number, lines: number, content: string}>}
   */
  getBackendLogContent(file, lines = 100) {
    return request(`${LOG_API_BASE}/content?accessKey=${ACCESS_KEY}&source=backend&file=${encodeURIComponent(file)}&lines=${lines}`);
  },

  /**
   * 获取前端日志内容
   * @param {string} file - 文件名
   * @param {number} lines - 返回行数（默认 100）
   * @returns {Promise<{file: string, source: string, totalLines: number, lines: number, content: string}>}
   */
  getFrontendLogContent(file, lines = 100) {
    return request(`${LOG_API_BASE}/content?accessKey=${ACCESS_KEY}&source=frontend&file=${encodeURIComponent(file)}&lines=${lines}`);
  },

  /**
   * 搜索后端日志
   * @param {string} file - 文件名
   * @param {string} keyword - 搜索关键词
   * @param {number} lines - 返回行数（默认 50）
   * @returns {Promise<{file: string, source: string, keyword: string, matchedCount: number, content: string}>}
   */
  searchBackendLogs(file, keyword, lines = 50) {
    return request(`${LOG_API_BASE}/search?accessKey=${ACCESS_KEY}&source=backend&file=${encodeURIComponent(file)}&keyword=${encodeURIComponent(keyword)}&lines=${lines}`);
  },

  /**
   * 搜索前端日志
   * @param {string} file - 文件名
   * @param {string} keyword - 搜索关键词
   * @param {number} lines - 返回行数（默认 50）
   * @returns {Promise<{file: string, source: string, keyword: string, matchedCount: number, content: string}>}
   */
  searchFrontendLogs(file, keyword, lines = 50) {
    return request(`${LOG_API_BASE}/search?accessKey=${ACCESS_KEY}&source=frontend&file=${encodeURIComponent(file)}&keyword=${encodeURIComponent(keyword)}&lines=${lines}`);
  },

  /**
   * 清空后端日志文件
   * @param {string} file - 文件名
   * @returns {Promise<{message: string, file: string, source: string}>}
   */
  clearBackendLog(file) {
    return request(`${LOG_API_BASE}/clear?accessKey=${ACCESS_KEY}&source=backend&file=${encodeURIComponent(file)}`, 'DELETE');
  },

  /**
   * 清空前端日志文件
   * @param {string} file - 文件名
   * @returns {Promise<{message: string, file: string, source: string}>}
   */
  clearFrontendLog(file) {
    return request(`${LOG_API_BASE}/clear?accessKey=${ACCESS_KEY}&source=frontend&file=${encodeURIComponent(file)}`, 'DELETE');
  },

  /**
   * 推送前端日志到后端
   * @param {Array} logs - 日志数组，每项包含 {timestamp, level, message, data}
   * @returns {Promise<{received: number, file: string}>}
   */
  pushFrontendLogs(logs) {
    return request(`${LOG_API_BASE}/frontend`, 'POST', logs);
  }
};

module.exports = logApi;
