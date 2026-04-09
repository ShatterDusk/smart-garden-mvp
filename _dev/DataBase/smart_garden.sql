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

 Date: 09/04/2026 19:45:13
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
INSERT INTO `care_records` VALUES ('CARE_4fd38fb83e6440bb', 'PLANT_46abed3703ed404d', 'USER_E2C0DBFB', 'water', '浇水', NULL, '2026-04-08 09:24:00', '2026-04-08 09:24:40');

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
INSERT INTO `diagnosis_cards` VALUES ('DIAG_2b83a259f50543b1', 'MSG_292c4ad7f0824d5c', 'PLANT_617fb5613e4d44ab', NULL, 'normal', 85, 'healthy', '[]', '[{\"type\": \"light\", \"action\": \"提供充足散射光\", \"details\": \"幼苗期需要明亮但不强烈的散射光，避免强光直射灼伤叶片\", \"priority\": \"medium\"}, {\"type\": \"watering\", \"action\": \"保持土壤微湿\", \"details\": \"观察土壤表面干燥后再浇水，避免积水导致烂根\", \"priority\": \"medium\"}, {\"type\": \"temperature\", \"action\": \"维持适宜温度\", \"details\": \"保持20-25℃的温暖环境，避免温度剧烈变化\", \"priority\": \"low\"}, {\"type\": \"other\", \"action\": \"加强通风\", \"details\": \"适当通风可以预防病虫害，促进健康生长\", \"priority\": \"low\"}]', 0.70, '{\"conversationHistory\": [{\"role\": \"user\", \"content\": \"这是什么植物？健康状况如何？\"}]}', '2026-04-08 08:02:34');
INSERT INTO `diagnosis_cards` VALUES ('DIAG_31028d54cbf74030', 'MSG_5555926a20f6407d', NULL, NULL, 'normal', 75, 'warning', '[{\"name\": \"土壤湿度偏高\", \"type\": \"watering\", \"severity\": \"low\", \"description\": \"土壤看起来较为湿润，幼苗期容易发生烂根\"}]', '[{\"type\": \"watering\", \"action\": \"控制浇水频率\", \"details\": \"等土壤表面干燥后再浇水，避免积水导致烂根\", \"priority\": \"high\"}, {\"type\": \"light\", \"action\": \"提供充足光照\", \"details\": \"幼苗期需要充足散射光，每天4-6小时为宜\", \"priority\": \"medium\"}, {\"type\": \"temperature\", \"action\": \"保持适宜温度\", \"details\": \"最适生长温度20-25°C，避免低温或高温\", \"priority\": \"medium\"}]', 0.70, '{\"conversationHistory\": [{\"role\": \"user\", \"content\": \"这是什么植物？健康状况如何？\"}]}', '2026-04-08 09:45:29');
INSERT INTO `diagnosis_cards` VALUES ('DIAG_f0b28649da2a44b5', 'MSG_f08870afb9c84994', 'PLANT_46abed3703ed404d', NULL, 'normal', 85, 'healthy', '[{\"name\": \"土壤湿度偏高\", \"type\": \"watering\", \"severity\": \"low\", \"description\": \"土壤看起来比较湿润，建议适当减少浇水频率\"}]', '[{\"type\": \"light\", \"action\": \"增加光照\", \"details\": \"提供每天6小时以上的充足阳光\", \"priority\": \"medium\"}, {\"type\": \"watering\", \"action\": \"调整浇水频率\", \"details\": \"等土壤表面干燥后再浇水，避免积水\", \"priority\": \"medium\"}, {\"type\": \"pruning\", \"action\": \"定期摘心\", \"details\": \"促进分枝，让植株更茂盛\", \"priority\": \"low\"}]', 0.75, '{\"conversationHistory\": [{\"role\": \"user\", \"content\": \"这是什么植物？健康状况如何？\"}]}', '2026-04-08 08:32:23');

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
INSERT INTO `messages` VALUES ('MSG_292c4ad7f0824d5c', 'SESSION_b27d769b8fb44460', 'assistant', 'text', '从图片来看，这是一株生长状态良好的幼苗植物！🌱\n\n### 植物识别\n根据叶片形态和生长状态，这看起来像是一株**草本植物幼苗**，可能是罗勒、薄荷或其他香草类植物。由于幼苗期特征相似，具体品种需要更多生长信息才能准确判断。\n\n### 健康状况分析\n- ✅ 叶片挺拔，颜色鲜绿，无黄化或枯萎现象\n- ✅ 茎秆直立，生长势良好\n- ✅ 土壤湿润适中，没有积水迹象\n- ✅ 整体状态健康，无明显病虫害\n\n### 养护建议\n1. **光照管理**：幼苗期需要充足散射光，避免强光直射 ☀️\n2. **水分控制**：保持土壤微湿，避免过干或过湿 💧\n3. **温度适宜**：保持在20-25℃的温暖环境 🌡️\n4. **通风良好**：适当通风有助于幼苗健康生长 🌬️\n\n随着植物长大，您可以提供更多生长环境信息，我会帮您更准确地识别品种并给出针对性建议！', NULL, NULL, 'normal', '2026-04-08 08:02:34', '2026-04-08 08:02:34');
INSERT INTO `messages` VALUES ('MSG_45bf872d620b4295', 'SESSION_77f98592c9ad4955', 'user', 'image', '这是什么植物？健康状况如何？', '[\"https://7072-prod-4g7ephngc4e53ec3-1401681523.tcb.qcloud.la/uploads/USER_E2C0DBFB/2026-04-08/1775637112364-h2dja0.jpg\"]', NULL, 'normal', '2026-04-08 08:31:53', '2026-04-08 08:31:53');
INSERT INTO `messages` VALUES ('MSG_5555926a20f6407d', 'SESSION_7fab5c16ea5441f5', 'assistant', 'text', '从图片来看，这是一株**罗勒幼苗**（也可能是其他香草或蔬菜幼苗），目前生长状态良好。\n\n### 植物识别\n- 🌱 植株特征：嫩绿色叶片，椭圆形，对生排列\n- 🪴 栽培环境：陶制花盆，土壤看起来较为湿润\n- 📅 生长阶段：处于幼苗期，需要特别关注养护\n\n### 健康状况分析\n- ✅ 叶片色泽正常，无黄化或枯萎现象\n- ✅ 茎秆直立，生长姿态健康\n- ⚠️ 土壤湿度较高，需要注意避免积水\n- 🔄 整体健康评分良好，但需注意幼苗期的特殊养护需求', NULL, NULL, 'normal', '2026-04-08 09:45:29', '2026-04-08 09:45:29');
INSERT INTO `messages` VALUES ('MSG_63b72816941047c0', 'SESSION_b27d769b8fb44460', 'assistant', 'text', '您好！由于这次没有提供新的图片，我无法进行全新的视觉诊断。不过，根据之前的诊断记录，您的**草本植物幼苗**在4月8日的健康评分为85分，状态为健康（healthy）。\n\n### 基于历史数据的养护建议\n由于这是幼苗期，我建议您重点关注以下方面：\n\n🌱 **生长阶段特点**：\n- 幼苗期需要更频繁的观察和适当的养护\n- 根系正在发育，对水分变化较为敏感\n\n💧 **浇水建议**：\n- 保持土壤微湿但不积水\n- 观察叶片状态，避免过度干旱或过湿\n\n☀️ **光照需求**：\n- 大多数草本植物喜欢充足的散射光\n- 避免强光直射，以免灼伤嫩叶\n\n🌡️ **温度管理**：\n- 保持温暖环境（18-25°C为宜）\n- 避免温度剧烈变化\n\n如果您想获得更准确的当前状态诊断，建议上传最新的植物照片，我会立即为您分析！', NULL, NULL, 'normal', '2026-04-08 08:28:25', '2026-04-08 08:28:25');
INSERT INTO `messages` VALUES ('MSG_687a7e928e554fed', 'SESSION_7fab5c16ea5441f5', 'user', 'image', '这是什么植物？健康状况如何？', '[\"https://7072-prod-4g7ephngc4e53ec3-1401681523.tcb.qcloud.la/uploads/USER_E2C0DBFB/2026-04-08/1775641502711-dxes8n.jpg\"]', NULL, 'normal', '2026-04-08 09:45:03', '2026-04-08 09:45:03');
INSERT INTO `messages` VALUES ('MSG_8f22348cd1fb410d', 'SESSION_b27d769b8fb44460', 'user', 'text', '再次诊断', NULL, NULL, 'normal', '2026-04-08 08:27:56', '2026-04-08 08:27:56');
INSERT INTO `messages` VALUES ('MSG_f08870afb9c84994', 'SESSION_77f98592c9ad4955', 'assistant', 'text', '从图片来看，这是一株**罗勒幼苗**（Ocimum basilicum），属于唇形科香草植物。\n\n### 健康状况分析\n- 🌱 **整体状态良好**：植株直立，叶片舒展，颜色鲜绿\n- 💧 **土壤湿度**：土壤看起来比较湿润，可能需要适当控水\n- 🌿 **生长状态**：作为幼苗，目前生长正常，没有明显问题\n\n### 养护建议\n1. **光照需求**：罗勒喜欢充足的阳光，建议每天至少6小时直射光\n2. **浇水管理**：等土壤表面干燥后再浇水，避免积水导致烂根\n3. **温度适宜**：最适生长温度为20-25℃，避免低温\n4. **定期修剪**：适当摘心可以促进分枝，让植株更茂盛\n\n这是一株健康的幼苗，继续保持良好的养护习惯即可！', NULL, NULL, 'normal', '2026-04-08 08:32:23', '2026-04-08 08:32:23');
INSERT INTO `messages` VALUES ('MSG_fa174d07c10c439e', 'SESSION_b27d769b8fb44460', 'user', 'image', '这是什么植物？健康状况如何？', '[\"https://7072-prod-4g7ephngc4e53ec3-1401681523.tcb.qcloud.la/uploads/USER_E2C0DBFB/2026-04-08/1775635313821-unq3wm.jpg\"]', NULL, 'normal', '2026-04-08 08:01:56', '2026-04-08 08:01:56');

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
INSERT INTO `plants` VALUES ('PLANT_46abed3703ed404d', 'USER_E2C0DBFB', '我的罗勒', 'vegetable', '罗勒', 'https://7072-prod-4g7ephngc4e53ec3-1401681523.tcb.qcloud.la/uploads/USER_E2C0DBFB/2026-04-08/1775637412518-zcorfl.jpg', NULL, '武汉市人民政府', NULL, 30.59276000, 114.30525000, '2026-04-08 08:36:54', '2026-04-08 11:37:58');
INSERT INTO `plants` VALUES ('PLANT_617fb5613e4d44ab', 'USER_E2C0DBFB', '我的草本植物幼苗', 'foliage', '草本植物幼苗', 'https://7072-prod-4g7ephngc4e53ec3-1401681523.tcb.qcloud.la/uploads/USER_E2C0DBFB/2026-04-08/1775635783405-bttnfj.jpg', NULL, NULL, NULL, NULL, NULL, '2026-04-08 08:09:44', '2026-04-08 08:09:44');

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
INSERT INTO `sessions` VALUES ('SESSION_77f98592c9ad4955', 'USER_E2C0DBFB', 'plant', 'PLANT_46abed3703ed404d', '我的罗勒 - 植物会话', '{\"careRecords\": false, \"environmentData\": false, \"historyDiagnosis\": false}', 'active', '2026-04-08 08:31:52', '2026-04-08 08:36:54');
INSERT INTO `sessions` VALUES ('SESSION_7fab5c16ea5441f5', 'USER_E2C0DBFB', 'consultation', NULL, '快速诊断', '{\"careRecords\": false, \"environmentData\": false, \"historyDiagnosis\": false}', 'active', '2026-04-08 09:45:02', '2026-04-08 09:45:02');
INSERT INTO `sessions` VALUES ('SESSION_b27d769b8fb44460', 'USER_E2C0DBFB', 'plant', 'PLANT_617fb5613e4d44ab', '我的草本植物幼苗 - 植物会话', '{\"careRecords\": false, \"environmentData\": false, \"historyDiagnosis\": false}', 'active', '2026-04-08 08:01:53', '2026-04-08 08:09:45');

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
INSERT INTO `user_config` VALUES ('CFG_1775635767276', 'USER_E2C0DBFB', 'read_positions', '{\"SESSION_14cafe263cb54cb8\": \"MSG_d9eaad63b24849af\", \"SESSION_77f98592c9ad4955\": \"MSG_f08870afb9c84994\", \"SESSION_7fab5c16ea5441f5\": \"MSG_5555926a20f6407d\", \"SESSION_b27d769b8fb44460\": \"MSG_63b72816941047c0\"}', 'preference', '2026-04-08 08:09:27', '2026-04-09 04:10:39');
INSERT INTO `user_config` VALUES ('CFG_BB6CE0AE', 'USER_E2C0DBFB', 'context_options', '{\"env\": true, \"care\": true, \"history\": true}', 'preference', '2026-04-08 08:28:02', '2026-04-08 08:28:02');
INSERT INTO `user_config` VALUES ('CFG_E1DBEDBB', 'USER_E2C0DBFB', 'notification_settings', '{\"care_reminder\": true, \"reminder_time\": \"09:00\", \"environment_alert\": true, \"diagnosis_reminder\": true}', 'setting', '2026-04-08 07:54:35', '2026-04-08 07:54:35');

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
INSERT INTO `users` VALUES ('USER_E2C0DBFB', 'wx_MGQzemh0RmExMWRldkwwWkNrSmEx', '微信用户', '', 'user', 'active', '2026-04-08 07:54:35', '2026-04-08 07:54:35', '2026-04-08 07:54:35');

-- ----------------------------
-- Table structure for system_logs
-- ----------------------------
DROP TABLE IF EXISTS `system_logs`;
CREATE TABLE `system_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `level` enum('debug','info','warn','error','fatal') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info' COMMENT '日志级别',
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日志消息',
  `metadata` json DEFAULT NULL COMMENT '额外数据',
  `source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源模块',
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求追踪ID',
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'User Agent',
  `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求URL',
  `method` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HTTP方法',
  `error_stack` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '错误堆栈',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_level_created` (`level`,`created_at`) USING BTREE,
  KEY `idx_source_created` (`source`,`created_at`) USING BTREE,
  KEY `idx_request_id` (`request_id`) USING BTREE,
  KEY `idx_created_at` (`created_at`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表' ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Records of system_logs
-- ----------------------------

-- ----------------------------
-- Table structure for client_logs
-- ----------------------------
DROP TABLE IF EXISTS `client_logs`;
CREATE TABLE `client_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `session_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '会话ID',
  `level` enum('debug','info','warn','error','fatal') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info' COMMENT '日志级别',
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日志消息',
  `page_path` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '页面路径',
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户行为',
  `device_info` json DEFAULT NULL COMMENT '设备信息',
  `metadata` json DEFAULT NULL COMMENT '附加数据',
  `network_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '网络类型',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_user_created` (`user_id`,`created_at`) USING BTREE,
  KEY `idx_session_created` (`session_id`,`created_at`) USING BTREE,
  KEY `idx_level_created` (`level`,`created_at`) USING BTREE,
  KEY `idx_page_created` (`page_path`,`created_at`) USING BTREE,
  KEY `idx_created_at` (`created_at`) USING BTREE,
  CONSTRAINT `client_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户端日志表' ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Records of client_logs
-- ----------------------------

SET FOREIGN_KEY_CHECKS = 1;
