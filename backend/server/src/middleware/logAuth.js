/**
 * 日志接口密钥验证中间件
 * 用于保护日志查看接口的访问权限
 */

/**
 * 获取日志访问密钥
 * 每次请求时动态读取，确保环境变量已加载
 */
const getLogAccessKey = () => {
  return process.env.LOG_ACCESS_KEY || 'dev-log-key-2024';
};

/**
 * 验证日志访问密钥
 * 从 query 参数中获取 accessKey 进行验证
 */
const verifyLogAccessKey = (req, res, next) => {
  const key = req.query.accessKey;
  const LOG_ACCESS_KEY = getLogAccessKey();

  if (!key || key !== LOG_ACCESS_KEY) {
    return res.status(403).json({
      code: 403,
      message: '无效的访问密钥',
      data: null
    });
  }

  next();
};

module.exports = {
  verifyLogAccessKey,
  getLogAccessKey
};
