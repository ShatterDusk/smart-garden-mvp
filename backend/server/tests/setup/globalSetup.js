const { Sequelize } = require('sequelize');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  
  // 只在环境变量未设置时加载 .env.test
  // CI 环境中环境变量已通过 env 设置，不应被覆盖
  if (!process.env.DB_HOST) {
    require('dotenv').config({ path: '.env.test' });
    console.log('[Global Setup] 从 .env.test 加载环境变量');
  } else {
    console.log('[Global Setup] 使用 CI 环境变量');
  }
  
  console.log('测试环境配置:', {
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
  });

  const rootSequelize = new Sequelize('', process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  });

  try {
    await rootSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log('测试数据库创建成功');
  } catch (error) {
    console.log('数据库已存在或创建失败:', error.message);
  } finally {
    await rootSequelize.close();
  }

  const { sequelize } = require('../../src/models');
  
  try {
    await sequelize.authenticate();
    console.log('测试数据库连接成功');
    
    await sequelize.sync({ force: true });
    console.log('测试数据库同步完成');
  } catch (error) {
    console.error('测试数据库初始化失败:', error.message);
    throw error;
  }
};
