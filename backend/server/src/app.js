/**
 * 智能园艺助手 - 后端服务入口
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// 仅在非测试环境下加载 .env，测试环境由 jest setup 加载 .env.test
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}

const { sequelize } = require('./models');
const logger = require('./utils/logger');
const { validateEnv } = require('./utils/envValidator');
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');
const responseMiddleware = require('./middleware/response');

// 环境变量校验
const isProduction = process.env.NODE_ENV === 'production';
if (!validateEnv(isProduction)) {
  logger.error('环境变量校验失败，服务启动终止');
  process.exit(1);
}

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = process.env.UPLOAD_PATH || path.resolve(__dirname, '../../uploads/');
const fullUploadDir = path.resolve(uploadDir);
app.use('/uploads', express.static(fullUploadDir));

// 响应格式中间件
app.use(responseMiddleware);

// 敏感字段列表
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'code', 'openid'];

// 过滤敏感信息
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  }
  return sanitized;
}

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: sanitizeBody(req.body),
  });
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/users', require('./routes/users'));
app.use('/api/plants', require('./routes/plants'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/care-records', require('./routes/careRecords'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/diagnosis', require('./routes/diagnosis'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/environment', require('./routes/environment'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/storage', require('./routes/storage'));
app.use('/api/cos', require('./routes/cos'));
app.use('/api/logs', require('./routes/logs'));

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null,
  });
});

// 错误处理
app.use(errorHandler);

// 数据库连接测试
const testDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 启动环境数据同步定时任务（生产环境）
    if (process.env.NODE_ENV !== 'test') {
      const environmentSyncJob = require('./jobs/environmentSyncJob');
      environmentSyncJob.start();
    }
  } catch (err) {
    logger.error('数据库连接失败:', err);
    process.exit(1);
  }
};

testDatabaseConnection();

module.exports = app;
