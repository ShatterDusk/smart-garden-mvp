/**
 * 数据库初始化脚本
 * 自动创建数据库（如果不存在）
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'smart_garden';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;

async function initDatabase() {
  try {
    console.log('🔄 正在连接 MySQL...');
    
    // 先连接到 mysql 系统数据库
    const sequelize = new Sequelize('mysql', DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: 'mysql',
      logging: false,
    });

    console.log('✅ MySQL 连接成功');
    console.log(`🔄 检查数据库 "${DB_NAME}" 是否存在...`);

    // 检查数据库是否存在
    const [results] = await sequelize.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${DB_NAME}'`
    );

    if (results.length === 0) {
      console.log(`🔄 数据库不存在，正在创建 "${DB_NAME}"...`);
      await sequelize.query(
        `CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ 数据库 "${DB_NAME}" 创建成功`);
    } else {
      console.log(`✅ 数据库 "${DB_NAME}" 已存在`);
    }

    await sequelize.close();
    console.log('🎉 数据库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    console.error('\n可能的原因：');
    console.error('1. MySQL 服务未启动');
    console.error('2. 用户名或密码错误');
    console.error('3. MySQL 端口不正确');
    process.exit(1);
  }
}

initDatabase();
