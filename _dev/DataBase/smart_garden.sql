/*
 Navicat Premium Dump SQL

 Source Server         : garden_aid
 Source Server Type    : MySQL
 Source Server Version : 80030 (8.0.30-cynos-3.1.16.003)
 Source Host           : sh-cynosdbmysql-grp-ntvvv454.sql.tencentcdb.com:27409
 Source Schema         : smart_garden

 Target Server Type    : MySQL
 Target Server Version : 80030 (8.0.30-cynos-3.1.16.003)
 File Encoding         : 65001

 Date: 07/04/2026 17:41:35
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for care_records
-- ----------------------------
DROP TABLE IF EXISTS `care_records`;
CREATE TABLE `care_records`  (
  `record_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '唯一标识，UUID',
  `plant_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '所属植物',
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '记录人',
  `action_type` enum('water','fertilize','prune','repot','pest_control','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '详细描述',
  `images` json NULL COMMENT '照片数组',
  `performed_at` datetime NOT NULL COMMENT '操作执行时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  PRIMARY KEY (`record_id`) USING BTREE,
  INDEX `idx_plant_time`(`plant_id` ASC, `performed_at` ASC) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE,
  CONSTRAINT `care_records_ibfk_1` FOREIGN KEY (`plant_id`) REFERENCES `plants` (`plant_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `care_records_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '养护记录表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of care_records
-- ----------------------------

-- ----------------------------
-- Table structure for devices
-- ----------------------------
DROP TABLE IF EXISTS `devices`;
CREATE TABLE `devices`  (
  `device_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '唯一标识，UUID',
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '所属用户',
  `mac_address` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'MAC地址',
  `device_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '设备名称',
  `status` enum('online','offline','unbound') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unbound' COMMENT '设备状态',
  `battery_level` int NULL DEFAULT NULL COMMENT '电池电量 0-100',
  `last_heartbeat` datetime NULL DEFAULT NULL COMMENT '最后心跳时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '激活时间',
  PRIMARY KEY (`device_id`) USING BTREE,
  UNIQUE INDEX `mac_address`(`mac_address` ASC) USING BTREE,
  UNIQUE INDEX `uk_mac`(`mac_address` ASC) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE,
  CONSTRAINT `devices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '设备表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of devices
-- ----------------------------

-- ----------------------------
-- Table structure for diagnosis_cards
-- ----------------------------
DROP TABLE IF EXISTS `diagnosis_cards`;
CREATE TABLE `diagnosis_cards`  (
  `diagnosis_card_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '唯一标识，UUID',
  `message_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '关联消息',
  `plant_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '关联植物（可选，咨询会话为空）',
  `species` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '识别到的植物品种',
  `analysis_type` enum('normal','deep') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分析类型',
  `health_score` int NULL DEFAULT NULL COMMENT '健康评分 0-100',
  `status` enum('healthy','warning','critical') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '健康状态',
  `issues` json NULL COMMENT '问题列表',
  `suggestions` json NULL COMMENT '建议列表',
  `confidence` decimal(3, 2) NULL DEFAULT NULL COMMENT '置信度 0-1',
  `context_used` json NULL COMMENT '用了哪些上下文',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`diagnosis_card_id`) USING BTREE,
  INDEX `idx_plant_time`(`plant_id` ASC, `created_at` ASC) USING BTREE,
  INDEX `idx_message`(`message_id` ASC) USING BTREE,
  CONSTRAINT `diagnosis_cards_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `diagnosis_cards_ibfk_2` FOREIGN KEY (`plant_id`) REFERENCES `plants` (`plant_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '诊断卡表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of diagnosis_cards
-- ----------------------------

-- ----------------------------
-- Table structure for environment_metrics
-- ----------------------------
DROP TABLE IF EXISTS `environment_metrics`;
CREATE TABLE `environment_metrics`  (
  `metric_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '指标编码，如temperature',
  `category` enum('device','weather','soil','air') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '指标类别',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '中文名，如\"空气温度\"',
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '单位，如\"°C\"',
  `icon` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '图标emoji或类名',
  `description` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '指标说明',
  `applicable_sources` json NULL COMMENT '适用来源：[\"sensor\", \"weather_api\"]',
  `is_common` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否常用指标',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '显示排序',
  `min_value` decimal(10, 3) NULL DEFAULT NULL COMMENT '正常范围最小值（可选）',
  `max_value` decimal(10, 3) NULL DEFAULT NULL COMMENT '正常范围最大值（可选）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`metric_code`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '环境指标定义表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of environment_metrics
-- ----------------------------
INSERT INTO `environment_metrics` VALUES ('battery_level', 'device', '设备电量', '%', '🔋', '传感器设备剩余电量，设备状态监控', '[\"sensor\"]', 1, 20, 0.000, 100.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('cloud_cover', 'weather', '云量', '%', '☁️', '云量百分比，影响光照', '[\"weather_api\"]', 0, 37, 0.000, 100.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('dew_point', 'weather', '露点温度', '°C', '💧', '露点温度，与结露相关', '[\"weather_api\"]', 0, 38, -50.000, 50.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('feels_like', 'weather', '体感温度', '°C', '🌡️', '体感温度，考虑湿度和风速的人体感知温度', '[\"weather_api\"]', 0, 30, -50.000, 60.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('humidity', 'device', '湿度', '%', '💧', '空气湿度，传感器测量微环境数据，天气API提供宏观气象数据', '[\"sensor\", \"weather_api\"]', 1, 2, 0.000, 100.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('light_intensity', 'device', '光照强度', 'lux', '☀️', '光照强度，人眼感知的光照强度', '[\"sensor\"]', 1, 10, 0.000, 200000.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('precip', 'weather', '降水量', 'mm', '🌧️', '过去1小时或24小时降水量', '[\"weather_api\"]', 1, 35, 0.000, 500.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('pressure', 'device', '大气压强', 'hPa', '🌐', '大气压强，部分传感器支持采集，天气API提供标准气象数据', '[\"sensor\", \"weather_api\"]', 1, 3, 800.000, 1100.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('soil_moisture', 'soil', '土壤湿度', '%', '🌱', '土壤湿度，智能灌溉决策核心指标', '[\"sensor\"]', 1, 11, 0.000, 100.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('soil_ph', 'soil', '土壤酸碱度', 'pH', '🔬', '土壤pH值，土壤改良指导，影响养分吸收', '[\"sensor\"]', 0, 13, 3.000, 9.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('soil_temperature', 'soil', '土壤温度', '°C', '🌡️', '土壤温度，根系生长环境监测，冬季防冻', '[\"sensor\"]', 0, 12, -20.000, 60.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('temperature', 'device', '温度', '°C', '🌡️', '空气温度，传感器测量微环境数据，天气API提供宏观气象数据', '[\"sensor\", \"weather_api\"]', 1, 1, -40.000, 85.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('visibility', 'weather', '能见度', 'km', '👁️', '能见度，雾、霾天气时降低', '[\"weather_api\"]', 0, 36, 0.000, 100.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('weather_condition', 'weather', '天气状况', 'code', '☀️', '天气状况编码（如100=晴,101=多云），前端映射到文本和图标', '[\"weather_api\"]', 1, 31, 100.000, 999.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('wind_direction_360', 'weather', '风向', '°', '🧭', '风向360角度（0°正北,90°正东），前端映射到方位文字如东南风', '[\"weather_api\"]', 1, 32, 0.000, 360.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('wind_scale', 'weather', '风力等级', '级', '💨', '风力等级（0-12级），直观易懂', '[\"weather_api\"]', 1, 33, 0.000, 12.000, '2026-04-03 11:42:42');
INSERT INTO `environment_metrics` VALUES ('wind_speed', 'weather', '风速', 'km/h', '💨', '风速，公里/小时', '[\"weather_api\"]', 1, 34, 0.000, 200.000, '2026-04-03 11:42:42');

-- ----------------------------
-- Table structure for environment_reading_values
-- ----------------------------
DROP TABLE IF EXISTS `environment_reading_values`;
CREATE TABLE `environment_reading_values`  (
  `value_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '唯一标识，UUID',
  `reading_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '关联读数主表',
  `metric_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '指标编码',
  `value` decimal(10, 3) NOT NULL COMMENT '环境数值',
  PRIMARY KEY (`value_id`) USING BTREE,
  INDEX `idx_reading_metric`(`reading_id` ASC, `metric_code` ASC) USING BTREE,
  INDEX `idx_metric_value`(`metric_code` ASC, `value` ASC) USING BTREE,
  CONSTRAINT `environment_reading_values_ibfk_1` FOREIGN KEY (`reading_id`) REFERENCES `environment_readings` (`reading_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `environment_reading_values_ibfk_2` FOREIGN KEY (`metric_code`) REFERENCES `environment_metrics` (`metric_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '环境数值表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of environment_reading_values
-- ----------------------------

-- ----------------------------
-- Table structure for environment_readings
-- ----------------------------
DROP TABLE IF EXISTS `environment_readings`;
CREATE TABLE `environment_readings`  (
  `reading_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '唯一标识，UUID',
  `plant_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '关联植物（数据归属）',
  `data_source` enum('sensor','weather_api','manual','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sensor' COMMENT '数据来源',
  `source_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '来源标识：设备ID或城市编码',
  `recorded_at` datetime NOT NULL COMMENT '数据产生时间',
  `is_stale` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否为补偿数据（传感器缺失时从历史数据复制）',
  PRIMARY KEY (`reading_id`) USING BTREE,
  UNIQUE INDEX `uk_plant_source_time`(`plant_id` ASC, `data_source` ASC, `recorded_at` ASC) USING BTREE,
  INDEX `idx_plant_time`(`plant_id` ASC, `recorded_at` ASC) USING BTREE,
  INDEX `idx_source`(`data_source` ASC, `source_id` ASC) USING BTREE,
  INDEX `idx_source_stale`(`data_source` ASC, `is_stale` ASC) USING BTREE,
  CONSTRAINT `environment_readings_ibfk_1` FOREIGN KEY (`plant_id`) REFERENCES `plants` (`plant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '环境读数主表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of environment_readings
-- ----------------------------

-- ----------------------------
-- Table structure for messages
-- ----------------------------
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages`  (
  `message_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '唯一标识，UUID',
  `session_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '所属会话',
  `role` enum('user','assistant','system') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发送者角色',
  `content_type` enum('text','image','card') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '内容类型',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '消息内容',
  `image_urls` json NULL COMMENT '图片数组（可选）',
  `reply_to_message_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '回复哪条消息（可选）',
  `status` enum('normal','edited','recalled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT '消息状态',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  PRIMARY KEY (`message_id`) USING BTREE,
  INDEX `reply_to_message_id`(`reply_to_message_id` ASC) USING BTREE,
  INDEX `idx_session_time`(`session_id` ASC, `created_at` ASC) USING BTREE,
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`session_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`reply_to_message_id`) REFERENCES `messages` (`message_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '消息表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of messages
-- ----------------------------

-- ----------------------------
-- Table structure for plants
-- ----------------------------
DROP TABLE IF EXISTS `plants`;
CREATE TABLE `plants`  (
  `plant_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '唯一标识，UUID',
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '所属用户',
  `nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '植物昵称，如\"小绿\"',
  `plant_category` enum('succulent','flower','foliage','vegetable','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '植物种类',
  `species` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '具体品种，如\"绿萝\"',
  `cover_image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '封面照片URL',
  `current_device_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '当前绑定设备ID',
  `location_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '位置名称，如\"北京市朝阳区\"',
  `location_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '城市编码，如\"110105\"',
  `location_lat` decimal(10, 8) NULL DEFAULT NULL COMMENT '纬度',
  `location_lng` decimal(11, 8) NULL DEFAULT NULL COMMENT '经度',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  PRIMARY KEY (`plant_id`) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE,
  INDEX `idx_device`(`current_device_id` ASC) USING BTREE,
  CONSTRAINT `plants_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `plants_ibfk_2` FOREIGN KEY (`current_device_id`) REFERENCES `devices` (`device_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '植物档案表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of plants
-- ----------------------------

-- ----------------------------
-- Table structure for reading_tasks
-- ----------------------------
DROP TABLE IF EXISTS `reading_tasks`;
CREATE TABLE `reading_tasks`  (
  `task_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务ID',
  `plant_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '植物ID',
  `recorded_at` datetime NOT NULL COMMENT '记录时间（整点，如 00:00, 02:00）',
  `sensor_status` enum('pending','received','compensated','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '传感器数据状态：pending-等待上传, received-已接收, compensated-已补偿, failed-失败',
  `weather_status` enum('pending','received','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '天气数据状态：pending-等待获取, received-已接收, failed-失败',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  PRIMARY KEY (`task_id`) USING BTREE,
  UNIQUE INDEX `uk_reading_tasks_plant_time`(`plant_id` ASC, `recorded_at` ASC) USING BTREE,
  INDEX `idx_reading_tasks_sensor_status`(`sensor_status` ASC) USING BTREE,
  INDEX `idx_reading_tasks_weather_status`(`weather_status` ASC) USING BTREE,
  INDEX `idx_reading_tasks_plant_sensor`(`plant_id` ASC, `sensor_status` ASC) USING BTREE,
  CONSTRAINT `reading_tasks_ibfk_1` FOREIGN KEY (`plant_id`) REFERENCES `plants` (`plant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '环境数据读取任务表，追踪每个时刻的数据获取状态' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of reading_tasks
-- ----------------------------

-- ----------------------------
-- Table structure for sequelizemeta
-- ----------------------------
DROP TABLE IF EXISTS `sequelizemeta`;
CREATE TABLE `sequelizemeta`  (
  `name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  PRIMARY KEY (`name`) USING BTREE,
  UNIQUE INDEX `name`(`name` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb3 COLLATE = utf8mb3_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sequelizemeta
-- ----------------------------
INSERT INTO `sequelizemeta` VALUES ('20260327000001-create-users.js');
INSERT INTO `sequelizemeta` VALUES ('20260327000002-create-user-config.js');
INSERT INTO `sequelizemeta` VALUES ('20260327000003-create-devices.js');
INSERT INTO `sequelizemeta` VALUES ('20260327000004-create-plants.js');
INSERT INTO `sequelizemeta` VALUES ('20260327000005-create-sessions.js');
INSERT INTO `sequelizemeta` VALUES ('20260327000006-create-messages.js');
INSERT INTO `sequelizemeta` VALUES ('20260327000007-create-diagnosis-cards.js');
INSERT INTO `sequelizemeta` VALUES ('20260327000008-create-environment-metrics.js');
INSERT INTO `sequelizemeta` VALUES ('20260327000009-create-environment-readings.js');
INSERT INTO `sequelizemeta` VALUES ('20260327000010-create-environment-reading-values.js');
INSERT INTO `sequelizemeta` VALUES ('20260327000011-create-care-records.js');

-- ----------------------------
-- Table structure for sessions
-- ----------------------------
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions`  (
  `session_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '唯一标识，UUID',
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '所属用户',
  `type` enum('consultation','plant') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '会话类型',
  `plant_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '植物会话时绑定',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '会话标题',
  `context_config` json NULL COMMENT '上下文开关配置',
  `status` enum('active','closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  PRIMARY KEY (`session_id`) USING BTREE,
  INDEX `idx_user_type`(`user_id` ASC, `type` ASC) USING BTREE,
  INDEX `idx_plant`(`plant_id` ASC) USING BTREE,
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sessions_ibfk_2` FOREIGN KEY (`plant_id`) REFERENCES `plants` (`plant_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '会话表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sessions
-- ----------------------------

-- ----------------------------
-- Table structure for user_config
-- ----------------------------
DROP TABLE IF EXISTS `user_config`;
CREATE TABLE `user_config`  (
  `config_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置项唯一标识，UUID',
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '所属用户ID',
  `config_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键名，如 plant_sort_order',
  `config_value` json NOT NULL COMMENT '配置值，JSON格式',
  `config_type` enum('preference','setting','data') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'preference' COMMENT '配置类型',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  PRIMARY KEY (`config_id`) USING BTREE,
  UNIQUE INDEX `uk_user_key`(`user_id` ASC, `config_key` ASC) USING BTREE,
  INDEX `idx_user_type`(`user_id` ASC, `config_type` ASC) USING BTREE,
  CONSTRAINT `user_config_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '用户配置表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of user_config
-- ----------------------------
INSERT INTO `user_config` VALUES ('CFG_A646FA25', 'USER_1D9546F2', 'notification_settings', '{\"care_reminder\": true, \"reminder_time\": \"09:00\", \"environment_alert\": true, \"diagnosis_reminder\": true}', 'setting', '2026-04-07 08:08:24', '2026-04-07 08:08:24');

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `wx_openid` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '微信openid',
  `nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '微信昵称',
  `avatar_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '头像URL',
  `role` enum('user','expert','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user' COMMENT '用户角色',
  `status` enum('active','inactive','banned') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '用户状态',
  `last_login_at` datetime NULL DEFAULT NULL COMMENT '最后登录时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  PRIMARY KEY (`user_id`) USING BTREE,
  UNIQUE INDEX `wx_openid`(`wx_openid` ASC) USING BTREE,
  INDEX `idx_role`(`role` ASC) USING BTREE,
  INDEX `idx_wx_openid`(`wx_openid` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '用户表' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES ('USER_1D9546F2', 'wx_MGQzc3pyRmExYVlJdUwwT2Y0SWEx', '微信用户', '', 'user', 'active', '2026-04-07 08:08:24', '2026-04-07 08:08:24', '2026-04-07 08:08:24');

SET FOREIGN_KEY_CHECKS = 1;
