const { Sequelize } = require('sequelize');

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
    rejectUnauthorized: false,
  };
}

// 自定义日志函数（避免循环依赖，不直接引用 logger）
const loggingFunction = (msg, timing) => {
  if (process.env.DB_LOGGING === 'true') {
    const sqlMatch = msg.match(/Executing \((\w+)\): (.+)/);
    if (sqlMatch) {
      console.log(`[SQL] ${sqlMatch[1]} (${timing || 0}ms): ${sqlMatch[2].substring(0, 200)}`);
    }
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
    timezone: '+08:00',  // 设置时区为北京时间
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
    dialectOptions: {
      ...dialectOptions,
      timezone: '+08:00',  // MySQL 连接时区
    },
  }
);

module.exports = sequelize;
