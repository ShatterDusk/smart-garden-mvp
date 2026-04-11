/**
 * 手动触发环境数据同步（用于测试和补数据）
 */

const environmentSyncJob = require('../src/jobs/environmentSyncJob');
const logger = require('../src/utils/logger');

async function main() {
  logger.info('========== 手动触发环境数据同步 ==========');
  
  try {
    // 执行同步
    await environmentSyncJob.runSync();
    logger.info('========== 手动同步完成 ==========');
  } catch (error) {
    logger.error('手动同步失败', { error: error.message, stack: error.stack });
    process.exit(1);
  }
  
  // 等待日志写入
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

main();
