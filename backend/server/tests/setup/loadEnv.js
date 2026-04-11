/**
 * Jest 环境变量预加载
 * 在测试框架启动前执行，确保所有环境变量已加载
 */

const path = require('path');
const fs = require('fs');

// 确定 .env.test 文件路径
const envTestPath = path.resolve(__dirname, '../../.env.test');
const envExamplePath = path.resolve(__dirname, '../../.env.example');

// 优先加载 .env.test
if (fs.existsSync(envTestPath)) {
  require('dotenv').config({ path: envTestPath });
  console.log('[Jest Setup] 已加载 .env.test');
} else if (fs.existsSync(envExamplePath)) {
  // 如果没有 .env.test，使用 .env.example
  require('dotenv').config({ path: envExamplePath });
  console.log('[Jest Setup] 已加载 .env.example');
}

// 确保关键环境变量存在
const requiredEnvVars = ['JWT_SECRET'];
const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.warn(`[Jest Setup] 警告: 缺少环境变量: ${missing.join(', ')}`);
  console.warn('[Jest Setup] 使用默认值');
  
  // 设置默认值
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test_jwt_secret_for_ci_testing';
  }
}
