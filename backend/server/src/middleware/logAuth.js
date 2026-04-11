/**
 * 日志接口权限验证中间件 - 整改版
 * 支持JWT Token认证，生产环境强制安全策略
 */

const crypto = require('crypto');
const { LOG_SOURCES } = require('../shared/logConstants');

// 环境变量
const JWT_SECRET = process.env.JWT_SECRET;
const LOG_ACCESS_KEY = process.env.LOG_ACCESS_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * 验证JWT签名
 * @param {string} headerB64 - Base64编码的header
 * @param {string} payloadB64 - Base64编码的payload
 * @param {string} signatureB64 - Base64编码的签名
 * @returns {boolean} 签名是否有效
 */
const verifySignature = (headerB64, payloadB64, signatureB64) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');
    
    // 使用timing-safe比较防止时序攻击
    const sigBuf = Buffer.from(signatureB64);
    const expectedBuf = Buffer.from(expectedSignature);
    
    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch (err) {
    console.error('[logAuth] 签名验证失败:', err.message);
    return false;
  }
};

/**
 * 验证JWT Token
 * @param {string} token - JWT Token
 * @returns {Object|null} 解码后的payload或null
 */
const verifyToken = (token) => {
  try {
    // 基础验证：token存在且格式正确
    if (!token || typeof token !== 'string') {
      return null;
    }

    // 开发环境简化验证：检查是否以 log-token- 开头
    if (NODE_ENV === 'development' && token.startsWith('log-token-')) {
      return {
        userId: 'developer',
        role: 'admin',
        source: 'dev-token'
      };
    }

    // 生产环境需要JWT_SECRET
    if (!JWT_SECRET) {
      console.error('[logAuth] 生产环境必须设置 JWT_SECRET');
      return null;
    }

    // JWT格式验证
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // 验证签名（关键安全修复）
    if (!verifySignature(headerB64, payloadB64, signatureB64)) {
      console.error('[logAuth] JWT签名无效');
      return null;
    }

    // 解析payload
    let payload;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    } catch (e) {
      console.error('[logAuth] Payload解析失败');
      return null;
    }

    // 检查过期时间
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.error('[logAuth] Token已过期');
      return null;
    }

    // 检查生效时间
    if (payload.nbf && payload.nbf > Date.now() / 1000) {
      console.error('[logAuth] Token尚未生效');
      return null;
    }

    return payload;
  } catch (err) {
    console.error('[logAuth] Token验证失败:', err.message);
    return null;
  }
};

/**
 * 验证日志访问权限
 * 优先从Authorization Header获取JWT Token
 * 开发环境允许从x-log-access-key Header获取AccessKey
 */
const verifyLogAccess = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. 优先尝试JWT Token认证 (Authorization: Bearer <token>)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded) {
      req.user = decoded;
      req.authMethod = 'jwt';
      return next();
    }
  }

  // 2. 开发环境允许AccessKey认证 (Header方式，非URL参数)
  if (NODE_ENV === 'development') {
    const accessKey = req.headers['x-log-access-key'];
    if (accessKey && accessKey === LOG_ACCESS_KEY) {
      req.user = {
        userId: 'developer',
        role: 'admin',
        source: 'access-key'
      };
      req.authMethod = 'access-key';
      return next();
    }
  }

  // 3. 认证失败
  const isProduction = NODE_ENV === 'production';
  return res.status(401).json({
    code: 401,
    message: isProduction
      ? '请使用有效的JWT Token访问日志接口 (Authorization: Bearer <token>)'
      : '认证失败，请提供有效的JWT Token或AccessKey',
    data: {
      hint: isProduction
        ? '联系管理员获取日志访问Token'
        : '开发环境可在Header中设置 x-log-access-key'
    }
  });
};

/**
 * 生成日志访问Token (HS256)
 * @param {string} userId - 用户ID
 * @param {string} role - 角色
 * @param {number} expiresInHours - 过期时间（小时）
 * @returns {string} Token
 */
const generateLogAccessToken = (userId, role = 'viewer', expiresInHours = 1) => {
  // 开发环境简化Token
  if (NODE_ENV === 'development') {
    return `log-token-${userId}-${Date.now()}`;
  }

  // 生产环境需要JWT_SECRET
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET未设置，无法生成Token');
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId,
    role,
    scope: 'logs:read',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (expiresInHours * 3600)
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // 使用HMAC-SHA256生成签名（安全修复）
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
};

// 简单的内存限流存储
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1分钟窗口
const RATE_LIMIT_MAX_REQUESTS = 100; // 每分钟最多100次

/**
 * 清理过期的限流记录
 */
const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validTimestamps);
    }
  }
};

// 每5分钟清理一次
setInterval(cleanupRateLimitStore, 300000);

/**
 * 检查是否超过限流阈值
 * @param {string} clientId - 客户端标识（IP或userId）
 * @returns {boolean} 是否允许请求
 */
const checkRateLimit = (clientId) => {
  const now = Date.now();
  const timestamps = rateLimitStore.get(clientId) || [];
  
  // 过滤出窗口期内的请求
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  // 记录本次请求
  validTimestamps.push(now);
  rateLimitStore.set(clientId, validTimestamps);
  return true;
};

/**
 * 获取客户端标识
 * @param {Object} req - Express请求对象
 * @returns {string} 客户端标识
 */
const getClientId = (req) => {
  // 优先使用用户ID，其次是IP地址
  return req.user?.userId || 
         req.headers['x-forwarded-for'] || 
         req.ip || 
         'unknown';
};

/**
 * 验证客户端日志推送请求
 * 包含简单的请求频率限制
 */
const verifyClientLogPush = (req, res, next) => {
  // 客户端日志推送保持开放，但记录来源
  req.logSource = LOG_SOURCES.FRONTEND;
  
  // 获取客户端标识
  const clientId = getClientId(req);
  
  // 检查限流
  if (!checkRateLimit(clientId)) {
    return res.status(429).json({
      code: 429,
      message: '请求过于频繁，请稍后再试',
      data: { retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000) }
    });
  }
  
  next();
};

module.exports = {
  verifyLogAccess,
  verifyClientLogPush,
  generateLogAccessToken
};
