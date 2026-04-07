const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// 构建 dialectOptions，根据环境配置 SSL
const dialectOptions = {
  // MySQL 8.0 认证插件支持
  authPlugins: {
    caching_sha2_password: () => () => Buffer.from(process.env.DB_PASSWORD + '\0'),
  },
  connectTimeout: 60000,
};

// 仅在明确设置 DB_SSL=true 时启用 SSL
if (process.env.DB_SSL === 'true') {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false, // 允许自签名证书
  };
}

// 自定义日志函数
const loggingFunction = (msg, timing) => {
  // 提取 SQL 查询（去掉时间戳等前缀）
  const sqlMatch = msg.match(/Executing \((\w+)\): (.+)/);
  if (sqlMatch) {
    const [, connection, sql] = sqlMatch;
    logger.debug('SQL 查询', {
      connection,
      sql: sql.substring(0, 500), // 截断长 SQL
      timing: timing ? `${timing}ms` : null,
    });
  } else {
    logger.debug('数据库日志', { msg });
  }
};

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? loggingFunction : false,
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 30000,
      evict: 30000,
    },
    retry: {
      max: 3,
      match: [
        /ECONNRESET/,
        /ETIMEDOUT/,
        /EPIPE/,
        /Connection lost/,
        /SequelizeConnectionError/,
      ],
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
    dialectOptions,
  }
);

module.exports = sequelize;
