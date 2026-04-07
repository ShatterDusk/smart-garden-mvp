/**
 * 统一响应格式辅助函数
 * 参考 mock-data.js 中的响应格式
 */

/**
 * 成功响应
 * @param {Object} res - Express response 对象
 * @param {*} data - 响应数据
 * @param {string} message - 成功消息
 * @param {number} code - HTTP 状态码
 */
function success(res, data, message = 'success', code = 200) {
  return res.status(code).json({
    code: 200,
    message,
    data,
  });
}

/**
 * 错误响应
 * @param {Object} res - Express response 对象
 * @param {string} message - 错误消息
 * @param {number} code - 错误码
 * @param {number} statusCode - HTTP 状态码
 */
function error(res, message = 'error', code = 500, statusCode = 500) {
  return res.status(statusCode).json({
    code,
    message,
    data: null,
  });
}

/**
 * 分页响应
 * @param {Object} res - Express response 对象
 * @param {Array} list - 数据列表
 * @param {number} total - 总数量
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页数量
 */
function paginated(res, list, total, page, pageSize) {
  return success(res, {
    total,
    page,
    pageSize,
    list,
  });
}

module.exports = {
  success,
  error,
  paginated,
};
