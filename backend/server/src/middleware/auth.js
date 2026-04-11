/**
 * JWT 认证中间件
 * 验证 Authorization: Bearer <token> 头
 * 验证失败返回 401
 * 验证成功将用户信息挂载到 req.user
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT 配置
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 获取 JWT_SECRET
 * 使用函数延迟获取，确保环境变量已加载
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // 测试环境使用默认值，生产环境必须设置
    if (process.env.NODE_ENV === 'test') {
      console.warn('[Auth] 警告: JWT_SECRET 未设置，使用测试默认值');
      process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
      return process.env.JWT_SECRET;
    }
    throw new Error('JWT_SECRET 环境变量必须设置，用于 JWT 签名和验证');
  }
  return secret;
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Bearer Token
 */
async function authMiddleware(req, res, next) {
  try {
    // 获取 Authorization 头
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        code: 401,
        message: '缺少Authorization头',
        data: null,
      });
    }

    // 验证 Bearer 格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        code: 401,
        message: 'Authorization格式错误，应为: Bearer <token>',
        data: null,
      });
    }

    const token = parts[1];

    // 验证 Token
    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          code: 1002,
          message: 'Token已过期',
          data: null,
        });
      }
      return res.status(401).json({
        code: 401,
        message: '无效的Token',
        data: null,
      });
    }

    // 查询用户信息
    const user = await User.findByPk(decoded.user_id, {
      attributes: ['user_id', 'nickname', 'avatar_url', 'created_at'],
    });

    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在',
        data: null,
      });
    }

    // 将用户信息挂载到 req.user
    req.user = {
      userId: user.user_id,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 可选认证中间件
 * 有 Token 则验证，无 Token 也继续
 */
async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];
    const decoded = jwt.verify(token, getJwtSecret());

    const user = await User.findByPk(decoded.user_id, {
      attributes: ['user_id', 'nickname', 'avatar_url', 'created_at'],
    });

    if (user) {
      req.user = {
        userId: user.user_id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      };
    }

    next();
  } catch (error) {
    // 可选认证失败不阻止请求
    next();
  }
}

/**
 * 生成 JWT Token
 * @param {Object} payload - Token 载荷
 * @returns {string} JWT Token
 */
function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * 验证 JWT Token
 * @param {string} token - JWT Token
 * @returns {Object} 解码后的载荷
 */
function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  generateToken,
  verifyToken,
  // 注意：JWT_EXPIRES_IN 可以导出，但 getJwtSecret 不应导出（安全考虑）
  JWT_EXPIRES_IN,
};
