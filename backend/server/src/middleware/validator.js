/**
 * 请求验证中间件
 * 支持 body、query、params 三种验证
 */

/**
 * 创建验证中间件
 * @param {Object} options - 验证配置
 * @param {Object} options.body - body 验证 schema
 * @param {Object} options.query - query 验证 schema
 * @param {Object} options.params - params 验证 schema
 * @returns {Function} Express 中间件
 */
function validate(options = {}) {
  const { body, query, params } = options;

  return (req, res, next) => {
    const errors = [];

    // 验证 body
    if (body) {
      const { error } = body.validate(req.body);
      if (error) {
        errors.push(...error.details.map(d => d.message));
      }
    }

    // 验证 query
    if (query) {
      const { error, value } = query.validate(req.query);
      if (error) {
        errors.push(...error.details.map(d => d.message));
      } else {
        // Express 5 中 req.query 是只读的，使用 validatedQuery 存储验证后的值
        req.validatedQuery = value;
      }
    }

    // 验证 params
    if (params) {
      const { error } = params.validate(req.params);
      if (error) {
        errors.push(...error.details.map(d => d.message));
      }
    }

    // 有错误则返回
    if (errors.length > 0) {
      return res.status(400).json({
        code: 400,
        message: errors.join(', '),
        data: null,
      });
    }

    next();
  };
}

/**
 * 仅验证 body（快捷方法）
 * @param {Object} schema - Joi schema
 * @returns {Function} Express 中间件
 */
function validateBody(schema) {
  return validate({ body: schema });
}

/**
 * 仅验证 query（快捷方法）
 * @param {Object} schema - Joi schema
 * @returns {Function} Express 中间件
 */
function validateQuery(schema) {
  return validate({ query: schema });
}

/**
 * 仅验证 params（快捷方法）
 * @param {Object} schema - Joi schema
 * @returns {Function} Express 中间件
 */
function validateParams(schema) {
  return validate({ params: schema });
}

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
};
