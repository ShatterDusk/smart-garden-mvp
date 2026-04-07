/**
 * 同步数据库表结构
 * 用于开发环境快速更新表结构
 */

const sequelize = require('../config/database');
const logger = require('./logger');

async function syncDatabase() {
  try {
    logger.info('开始同步数据库表结构...');
    
    // 使用 alter: true 自动更新表结构
    await sequelize.sync({ alter: true });
    
    logger.info('数据库表结构同步完成');
    process.exit(0);
  } catch (error) {
    logger.error('数据库同步失败:', error);
    process.exit(1);
  }
}

syncDatabase();
