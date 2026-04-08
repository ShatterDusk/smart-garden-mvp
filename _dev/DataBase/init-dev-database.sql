-- 本地开发数据库初始化脚本
-- 用于快速创建开发环境所需的数据库和基础数据

-- 创建数据库
CREATE DATABASE IF NOT EXISTS smart_garden_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_garden_dev;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(64) NOT NULL COMMENT '用户ID，UUID',
  openid VARCHAR(100) UNIQUE COMMENT '微信openid',
  nickname VARCHAR(100) COMMENT '昵称',
  avatar_url VARCHAR(500) COMMENT '头像URL',
  role ENUM('user', 'expert', 'admin') DEFAULT 'user' COMMENT '角色',
  status ENUM('active', 'inactive', 'banned') DEFAULT 'active' COMMENT '状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建设备表
CREATE TABLE IF NOT EXISTS devices (
  device_id VARCHAR(64) NOT NULL COMMENT '设备ID，UUID',
  user_id VARCHAR(64) NOT NULL COMMENT '所属用户',
  mac_address VARCHAR(32) UNIQUE NOT NULL COMMENT 'MAC地址',
  device_name VARCHAR(100) COMMENT '设备名称',
  status ENUM('online', 'offline', 'unbound') DEFAULT 'unbound' COMMENT '设备状态',
  battery_level INT COMMENT '电池电量 0-100',
  last_heartbeat DATETIME COMMENT '最后心跳时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备表';

-- 创建植物表
CREATE TABLE IF NOT EXISTS plants (
  plant_id VARCHAR(64) NOT NULL COMMENT '植物ID，UUID',
  user_id VARCHAR(64) NOT NULL COMMENT '所属用户',
  device_id VARCHAR(64) COMMENT '关联设备',
  name VARCHAR(100) NOT NULL COMMENT '植物名称',
  species VARCHAR(100) COMMENT '植物品种',
  description TEXT COMMENT '描述',
  avatar_url VARCHAR(500) COMMENT '植物头像',
  status ENUM('healthy', 'warning', 'critical', 'inactive') DEFAULT 'healthy' COMMENT '健康状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (plant_id),
  INDEX idx_user (user_id),
  INDEX idx_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='植物表';

-- 创建环境指标定义表
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
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (metric_id),
  UNIQUE KEY uk_code (metric_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='环境指标定义表';

-- 创建环境读数表
CREATE TABLE IF NOT EXISTS environment_readings (
  reading_id VARCHAR(64) NOT NULL COMMENT '读数ID，UUID',
  device_id VARCHAR(64) NOT NULL COMMENT '设备ID',
  plant_id VARCHAR(64) COMMENT '植物ID',
  timestamp DATETIME NOT NULL COMMENT '读数时间',
  data_source ENUM('sensor', 'weather_api', 'compensation') DEFAULT 'sensor' COMMENT '数据来源',
  is_stale BOOLEAN DEFAULT FALSE COMMENT '是否过期',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reading_id),
  INDEX idx_device_time (device_id, timestamp),
  INDEX idx_plant_time (plant_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='环境读数表';

-- 创建环境读数值表
CREATE TABLE IF NOT EXISTS environment_reading_values (
  value_id VARCHAR(64) NOT NULL COMMENT '值ID，UUID',
  reading_id VARCHAR(64) NOT NULL COMMENT '读数ID',
  metric_id VARCHAR(64) NOT NULL COMMENT '指标ID',
  value DECIMAL(10,2) NOT NULL COMMENT '读数值',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (value_id),
  INDEX idx_reading (reading_id),
  INDEX idx_metric (metric_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='环境读数值表';

-- 插入测试用户
INSERT INTO users (user_id, openid, nickname, role) VALUES
('TEST_USER_001', 'test_openid_001', '测试用户', 'user');

-- 插入测试植物
INSERT INTO plants (plant_id, user_id, name, species, status) VALUES
('TEST_PLANT_001', 'TEST_USER_001', '测试多肉', '多肉植物', 'healthy');

-- 插入环境指标定义
INSERT INTO environment_metrics (metric_id, metric_code, metric_name, unit, icon, sort_order) VALUES
('METRIC_TEMP', 'temperature', '温度', '°C', 'temp', 1),
('METRIC_HUMIDITY', 'humidity', '湿度', '%', 'humidity', 2),
('METRIC_SOIL_MOISTURE', 'soil_moisture', '土壤湿度', '%', 'soil', 3),
('METRIC_LIGHT', 'light_intensity', '光照强度', 'lux', 'light', 4),
('METRIC_BATTERY', 'battery_level', '电池电量', '%', 'battery', 5);

-- 查看创建结果
SELECT 'Database initialized successfully!' AS result;
SELECT CONCAT('Users: ', COUNT(*)) FROM users;
SELECT CONCAT('Plants: ', COUNT(*)) FROM plants;
SELECT CONCAT('Environment Metrics: ', COUNT(*)) FROM environment_metrics;
