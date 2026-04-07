-- ========================================================-- 初始化 environment_metrics 表数据-- 执行时机: 数据库迁移完成后，应用启动前-- 数据条数: 17 条环境指标定义（传感器 8 个 + 天气 API 9 个）-- 设计说明:--   - 同一个 metric_code 可以支持多个来源（sensor/weather_api）--   - 通过 applicable_sources JSON 数组标识支持的来源--   - 查询时通过 environment_readings.source_type 区分具体来源--   - unit 字段特殊值用于前端识别数据类型：--     * 'code' - 编码型（如天气状况代码，前端映射到文本/图标）--     * '°' - 角度型（如风向角度，前端映射到方位）--     * '' - 无单位（如天气状况文字，直接展示）-- ========================================================
-- 清空现有数据（如需要重新初始化）-- TRUNCATE TABLE environment_metrics;

-- --------------------------------------------------------
-- 1. 通用指标（传感器 + 天气 API）
-- --------------------------------------------------------
INSERT INTO environment_metrics (
  metric_code, category, name, unit, icon, 
  description, applicable_sources, is_common, sort_order, 
  min_value, max_value, created_at
) VALUES 
-- 1.1 温度（通用）
(
  'temperature', 
  'device', 
  '温度', 
  '°C', 
  '🌡️',
  '空气温度，传感器测量微环境数据，天气API提供宏观气象数据',
  '["sensor", "weather_api"]', 
  1, 
  1, 
  -40.0, 
  85.0, 
  NOW()
),
-- 1.2 湿度（通用）
(
  'humidity', 
  'device', 
  '湿度', 
  '%', 
  '💧',
  '空气湿度，传感器测量微环境数据，天气API提供宏观气象数据',
  '["sensor", "weather_api"]', 
  1, 
  2, 
  0.0, 
  100.0, 
  NOW()
),
-- 1.3 大气压强（通用）
(
  'pressure', 
  'device', 
  '大气压强', 
  'hPa', 
  '🌐',
  '大气压强，部分传感器支持采集，天气API提供标准气象数据',
  '["sensor", "weather_api"]', 
  1, 
  3, 
  800.0, 
  1100.0, 
  NOW()
);

-- --------------------------------------------------------
-- 2. 传感器专用指标
-- --------------------------------------------------------
INSERT INTO environment_metrics (
  metric_code, category, name, unit, icon, 
  description, applicable_sources, is_common, sort_order, 
  min_value, max_value, created_at
) VALUES 
-- 2.1 光照强度
(
  'light_intensity', 
  'device', 
  '光照强度', 
  'lux', 
  '☀️',
  '光照强度，人眼感知的光照强度',
  '["sensor"]', 
  1, 
  10, 
  0.0, 
  200000.0, 
  NOW()
),
-- 2.2 土壤湿度
(
  'soil_moisture', 
  'soil', 
  '土壤湿度', 
  '%', 
  '🌱',
  '土壤湿度，智能灌溉决策核心指标',
  '["sensor"]', 
  1, 
  11, 
  0.0, 
  100.0, 
  NOW()
),
-- 2.3 土壤温度
(
  'soil_temperature', 
  'soil', 
  '土壤温度', 
  '°C', 
  '🌡️',
  '土壤温度，根系生长环境监测，冬季防冻',
  '["sensor"]', 
  0, 
  12, 
  -20.0, 
  60.0, 
  NOW()
),
-- 2.4 土壤酸碱度
(
  'soil_ph', 
  'soil', 
  '土壤酸碱度', 
  'pH', 
  '🔬',
  '土壤pH值，土壤改良指导，影响养分吸收',
  '["sensor"]', 
  0, 
  13, 
  3.0, 
  9.0, 
  NOW()
),
-- 2.5 设备电量
(
  'battery_level', 
  'device', 
  '设备电量', 
  '%', 
  '🔋',
  '传感器设备剩余电量，设备状态监控',
  '["sensor"]', 
  1, 
  20, 
  0.0, 
  100.0, 
  NOW()
);

-- --------------------------------------------------------
-- 3. 天气 API 专用指标
-- --------------------------------------------------------
INSERT INTO environment_metrics (
  metric_code, category, name, unit, icon, 
  description, applicable_sources, is_common, sort_order, 
  min_value, max_value, created_at
) VALUES 
-- 3.1 体感温度
(
  'feels_like', 
  'weather', 
  '体感温度', 
  '°C', 
  '🌡️',
  '体感温度，考虑湿度和风速的人体感知温度',
  '["weather_api"]', 
  0, 
  30, 
  -50.0, 
  60.0, 
  NOW()
),
-- 3.2 天气状况（编码型，前端根据 code 映射到文本和图标）
(
  'weather_condition', 
  'weather', 
  '天气状况', 
  'code', 
  '☀️',
  '天气状况编码（如100=晴,101=多云），前端映射到文本和图标',
  '["weather_api"]', 
  1, 
  31, 
  100.0, 
  999.0, 
  NOW()
),
-- 3.3 风向角度（角度型，前端映射到方位文字）
(
  'wind_direction_360', 
  'weather', 
  '风向', 
  '°', 
  '🧭',
  '风向360角度（0°正北,90°正东），前端映射到方位文字如东南风',
  '["weather_api"]', 
  1, 
  32, 
  0.0, 
  360.0, 
  NOW()
),
-- 3.4 风力等级
(
  'wind_scale', 
  'weather', 
  '风力等级', 
  '级', 
  '💨',
  '风力等级（0-12级），直观易懂',
  '["weather_api"]', 
  1, 
  33, 
  0.0, 
  12.0, 
  NOW()
),
-- 3.5 风速
(
  'wind_speed', 
  'weather', 
  '风速', 
  'km/h', 
  '💨',
  '风速，公里/小时',
  '["weather_api"]', 
  1, 
  34, 
  0.0, 
  200.0, 
  NOW()
),
-- 3.6 降水量
(
  'precip', 
  'weather', 
  '降水量', 
  'mm', 
  '🌧️',
  '过去1小时或24小时降水量',
  '["weather_api"]', 
  1, 
  35, 
  0.0, 
  500.0, 
  NOW()
),
-- 3.7 能见度
(
  'visibility', 
  'weather', 
  '能见度', 
  'km', 
  '👁️',
  '能见度，雾、霾天气时降低',
  '["weather_api"]', 
  0, 
  36, 
  0.0, 
  100.0, 
  NOW()
),
-- 3.8 云量
(
  'cloud_cover', 
  'weather', 
  '云量', 
  '%', 
  '☁️',
  '云量百分比，影响光照',
  '["weather_api"]', 
  0, 
  37, 
  0.0, 
  100.0, 
  NOW()
),
-- 3.9 露点温度
(
  'dew_point', 
  'weather', 
  '露点温度', 
  '°C', 
  '💧',
  '露点温度，与结露相关',
  '["weather_api"]', 
  0, 
  38, 
  -50.0, 
  50.0, 
  NOW()
);

-- ========================================================-- 验证数据插入结果-- ========================================================

-- 查看所有指标
-- SELECT * FROM environment_metrics ORDER BY sort_order;

-- 统计总数（应返回 17）
-- SELECT COUNT(*) as total_count FROM environment_metrics;

-- 按单位类型统计
-- SELECT 
--   unit,
--   COUNT(*) as count,
--   GROUP_CONCAT(metric_code) as metrics
-- FROM environment_metrics
-- GROUP BY unit;

-- 查看特殊单位指标
-- SELECT * FROM environment_metrics WHERE unit IN ('code', '°', '');
