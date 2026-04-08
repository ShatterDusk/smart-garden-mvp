#!/usr/bin/env node
/**
 * 数据库初始化脚本
 * 用于创建开发数据库和表结构
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_garden_dev',
};

console.log('[数据库初始化] 配置信息:');
console.log(`  主机: ${config.host}`);
console.log(`  端口: ${config.port}`);
console.log(`  用户: ${config.user}`);
console.log(`  数据库: ${config.database}`);

async function initDatabase() {
  let connection;
  
  try {
    // 1. 连接到 MySQL（不指定数据库）
    console.log('\n[1/3] 连接到 MySQL...');
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });
    console.log('  ✅ 连接成功');
    
    // 2. 创建数据库
    console.log('\n[2/3] 创建数据库...');
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` 
       CHARACTER SET utf8mb4 
       COLLATE utf8mb4_unicode_ci`
    );
    console.log(`  ✅ 数据库 ${config.database} 创建成功`);
    
    // 3. 关闭当前连接，重新连接到指定数据库
    await connection.end();
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });
    console.log('  ✅ 数据库切换成功');
    
    // 4. 创建表结构
    console.log('\n[3/3] 创建表结构...');
    
    // 用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
        openid VARCHAR(100) UNIQUE COMMENT '微信openid',
        nickname VARCHAR(100) COMMENT '昵称',
        avatar_url VARCHAR(500) COMMENT '头像URL',
        role ENUM('user', 'expert', 'admin') DEFAULT 'user',
        status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ users 表创建成功');
    
    // 设备表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS devices (
        device_id VARCHAR(64) NOT NULL COMMENT '设备ID',
        user_id VARCHAR(64) NOT NULL COMMENT '所属用户',
        mac_address VARCHAR(32) UNIQUE NOT NULL COMMENT 'MAC地址',
        device_name VARCHAR(100) COMMENT '设备名称',
        status ENUM('online', 'offline', 'unbound') DEFAULT 'unbound',
        battery_level INT COMMENT '电池电量',
        last_heartbeat DATETIME COMMENT '最后心跳时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (device_id),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ devices 表创建成功');
    
    // 植物表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS plants (
        plant_id VARCHAR(64) NOT NULL COMMENT '植物ID',
        user_id VARCHAR(64) NOT NULL COMMENT '所属用户',
        device_id VARCHAR(64) COMMENT '关联设备',
        name VARCHAR(100) NOT NULL COMMENT '植物名称',
        species VARCHAR(100) COMMENT '植物品种',
        description TEXT COMMENT '描述',
        avatar_url VARCHAR(500) COMMENT '植物头像',
        status ENUM('healthy', 'warning', 'critical', 'inactive') DEFAULT 'healthy',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (plant_id),
        INDEX idx_user (user_id),
        INDEX idx_device (device_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ plants 表创建成功');
    
    // 环境指标定义表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS environment_metrics (
        metric_id VARCHAR(64) NOT NULL COMMENT '指标ID',
        metric_code VARCHAR(50) NOT NULL COMMENT '指标代码',
        metric_name VARCHAR(100) NOT NULL COMMENT '指标名称',
        unit VARCHAR(20) COMMENT '单位',
        icon VARCHAR(50) COMMENT '图标',
        description TEXT COMMENT '描述',
        min_value DECIMAL(10,2) COMMENT '最小值',
        max_value DECIMAL(10,2) COMMENT '最大值',
        sort_order INT DEFAULT 0 COMMENT '排序',
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (metric_id),
        UNIQUE KEY uk_code (metric_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ environment_metrics 表创建成功');
    
    // 环境读数表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS environment_readings (
        reading_id VARCHAR(64) NOT NULL COMMENT '读数ID',
        device_id VARCHAR(64) NOT NULL COMMENT '设备ID',
        plant_id VARCHAR(64) COMMENT '植物ID',
        timestamp DATETIME NOT NULL COMMENT '读数时间',
        data_source ENUM('sensor', 'weather_api', 'compensation') DEFAULT 'sensor',
        is_stale BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (reading_id),
        INDEX idx_device_time (device_id, timestamp),
        INDEX idx_plant_time (plant_id, timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ environment_readings 表创建成功');
    
    // 环境读数值表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS environment_reading_values (
        value_id VARCHAR(64) NOT NULL COMMENT '值ID',
        reading_id VARCHAR(64) NOT NULL COMMENT '读数ID',
        metric_id VARCHAR(64) NOT NULL COMMENT '指标ID',
        value DECIMAL(10,2) NOT NULL COMMENT '读数值',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (value_id),
        INDEX idx_reading (reading_id),
        INDEX idx_metric (metric_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ environment_reading_values 表创建成功');
    
    // 5. 插入测试数据
    console.log('\n[4/4] 插入测试数据...');
    
    // 测试用户
    await connection.execute(`
      INSERT IGNORE INTO users (user_id, openid, nickname, role) 
      VALUES ('TEST_USER_001', 'test_openid_001', '测试用户', 'user')
    `);
    console.log('  ✅ 测试用户插入成功');
    
    // 测试植物
    await connection.execute(`
      INSERT IGNORE INTO plants (plant_id, user_id, name, species, status) 
      VALUES ('TEST_PLANT_001', 'TEST_USER_001', '测试多肉', '多肉植物', 'healthy')
    `);
    console.log('  ✅ 测试植物插入成功');
    
    // 环境指标定义
    const metrics = [
      { id: 'METRIC_TEMP', code: 'temperature', name: '温度', unit: '°C', icon: 'temp' },
      { id: 'METRIC_HUMIDITY', code: 'humidity', name: '湿度', unit: '%', icon: 'humidity' },
      { id: 'METRIC_SOIL_MOISTURE', code: 'soil_moisture', name: '土壤湿度', unit: '%', icon: 'soil' },
      { id: 'METRIC_LIGHT', code: 'light_intensity', name: '光照强度', unit: 'lux', icon: 'light' },
      { id: 'METRIC_BATTERY', code: 'battery_level', name: '电池电量', unit: '%', icon: 'battery' },
    ];
    
    for (const metric of metrics) {
      await connection.execute(`
        INSERT IGNORE INTO environment_metrics 
        (metric_id, metric_code, metric_name, unit, icon, sort_order) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [metric.id, metric.code, metric.name, metric.unit, metric.icon, 1]);
    }
    console.log('  ✅ 环境指标定义插入成功');
    
    console.log('\n✅ 数据库初始化完成！');
    console.log(`\n数据库: ${config.database}`);
    console.log('表: users, devices, plants, environment_metrics, environment_readings, environment_reading_values');
    
  } catch (error) {
    console.error('\n❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
