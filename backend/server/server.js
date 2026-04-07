/**
 * 智能园艺助手 - 服务器启动脚本
 */

const app = require('./src/app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 启动服务器
const startServer = () => {
  const server = app.listen(PORT, HOST, () => {
    logger.info(`服务器启动成功`, {
      port: PORT,
      host: HOST,
      env: process.env.NODE_ENV || 'development',
    });
    console.log(`🚀 服务器运行在 http://${HOST}:${PORT}`);
  });

  // 优雅关闭
  process.on('SIGTERM', () => {
    logger.info('SIGTERM 信号接收，开始优雅关闭...');
    server.close(() => {
      logger.info('服务器已关闭');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT 信号接收，开始优雅关闭...');
    server.close(() => {
      logger.info('服务器已关闭');
      process.exit(0);
    });
  });
};

// 启动服务
startServer();

// 未捕获的异常
process.on('uncaughtException', (err) => {
  logger.error('未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', { reason, promise });
  process.exit(1);
});
