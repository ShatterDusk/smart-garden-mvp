/**
 * 统一响应格式中间件
 * 添加 res.success() 和 res.error() 方法
 * 参考 mock-data.js 中的响应格式
 */

const { success, error } = require('../utils/response');

/**
 * 响应中间件
 * 为 res 对象添加统一响应方法
 */
function responseMiddleware(req, res, next) {
  /**
   * 成功响应
   * @param {*} data - 响应数据
   * @param {string} message - 成功消息
   * @param {number} code - HTTP 状态码
   */
  res.success = function(data, message = 'success', code = 200) {
    return success(res, data, message, code);
  };

  /**
   * 错误响应
   * @param {string} message - 错误消息
   * @param {number} code - 错误码
   * @param {number} statusCode - HTTP 状态码
   */
  res.error = function(message = 'error', code = 500, statusCode = 500) {
    return error(res, message, code, statusCode);
  };

  next();
}

module.exports = responseMiddleware;
