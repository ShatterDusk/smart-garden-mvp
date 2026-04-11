-- ============================================
-- 数据库孤儿数据检查脚本
-- 用于检测外键悬空问题和数据一致性
-- ============================================

-- 设置输出格式
SET NAMES utf8mb4;

-- ============================================
-- 1. 用户相关表的外键检查
-- ============================================

-- 1.1 检查 plants 表中 user_id 不存在于 users 的记录
SELECT 'plants (user_id)' as check_table, COUNT(*) as orphan_count
FROM plants p
LEFT JOIN users u ON p.user_id = u.user_id
WHERE u.user_id IS NULL;

-- 1.2 检查 sessions 表中 user_id 不存在于 users 的记录
SELECT 'sessions (user_id)' as check_table, COUNT(*) as orphan_count
FROM sessions s
LEFT JOIN users u ON s.user_id = u.user_id
WHERE u.user_id IS NULL;

-- 1.3 检查 care_records 表中 user_id 不存在于 users 的记录
SELECT 'care_records (user_id)' as check_table, COUNT(*) as orphan_count
FROM care_records cr
LEFT JOIN users u ON cr.user_id = u.user_id
WHERE u.user_id IS NULL;

-- 1.4 检查 devices 表中 user_id 不存在于 users 的记录
SELECT 'devices (user_id)' as check_table, COUNT(*) as orphan_count
FROM devices d
LEFT JOIN users u ON d.user_id = u.user_id
WHERE u.user_id IS NULL;

-- 1.5 检查 user_config 表中 user_id 不存在于 users 的记录
SELECT 'user_config (user_id)' as check_table, COUNT(*) as orphan_count
FROM user_config uc
LEFT JOIN users u ON uc.user_id = u.user_id
WHERE u.user_id IS NULL;

-- ============================================
-- 2. 植物相关表的外键检查
-- ============================================

-- 2.1 检查 sessions 表中 plant_id 不存在于 plants 的记录（且 plant_id 不为空）
SELECT 'sessions (plant_id)' as check_table, COUNT(*) as orphan_count
FROM sessions s
LEFT JOIN plants p ON s.plant_id = p.plant_id
WHERE s.plant_id IS NOT NULL AND p.plant_id IS NULL;

-- 2.2 检查 diagnosis_cards 表中 plant_id 不存在于 plants 的记录（且 plant_id 不为空）
SELECT 'diagnosis_cards (plant_id)' as check_table, COUNT(*) as orphan_count
FROM diagnosis_cards d
LEFT JOIN plants p ON d.plant_id = p.plant_id
WHERE d.plant_id IS NOT NULL AND p.plant_id IS NULL;

-- 2.3 检查 environment_readings 表中 plant_id 不存在于 plants 的记录
SELECT 'environment_readings (plant_id)' as check_table, COUNT(*) as orphan_count
FROM environment_readings er
LEFT JOIN plants p ON er.plant_id = p.plant_id
WHERE p.plant_id IS NULL;

-- 2.4 检查 care_records 表中 plant_id 不存在于 plants 的记录
SELECT 'care_records (plant_id)' as check_table, COUNT(*) as orphan_count
FROM care_records cr
LEFT JOIN plants p ON cr.plant_id = p.plant_id
WHERE p.plant_id IS NULL;

-- 2.5 检查 reading_tasks 表中 plant_id 不存在于 plants 的记录
SELECT 'reading_tasks (plant_id)' as check_table, COUNT(*) as orphan_count
FROM reading_tasks rt
LEFT JOIN plants p ON rt.plant_id = p.plant_id
WHERE p.plant_id IS NULL;

-- 2.6 检查 plants 表中 current_device_id 不存在于 devices 的记录（且不为空）
SELECT 'plants (current_device_id)' as check_table, COUNT(*) as orphan_count
FROM plants p
LEFT JOIN devices d ON p.current_device_id = d.device_id
WHERE p.current_device_id IS NOT NULL AND d.device_id IS NULL;

-- ============================================
-- 3. 会话和消息相关表的外键检查
-- ============================================

-- 3.1 检查 messages 表中 session_id 不存在于 sessions 的记录
SELECT 'messages (session_id)' as check_table, COUNT(*) as orphan_count
FROM messages m
LEFT JOIN sessions s ON m.session_id = s.session_id
WHERE s.session_id IS NULL;

-- 3.2 检查 messages 表中 reply_to_message_id 不存在于 messages 的记录（且不为空）
SELECT 'messages (reply_to_message_id)' as check_table, COUNT(*) as orphan_count
FROM messages m
LEFT JOIN messages m2 ON m.reply_to_message_id = m2.message_id
WHERE m.reply_to_message_id IS NOT NULL AND m2.message_id IS NULL;

-- 3.3 检查 diagnosis_cards 表中 message_id 不存在于 messages 的记录
SELECT 'diagnosis_cards (message_id)' as check_table, COUNT(*) as orphan_count
FROM diagnosis_cards d
LEFT JOIN messages m ON d.message_id = m.message_id
WHERE m.message_id IS NULL;

-- ============================================
-- 4. 环境数据相关表的外键检查
-- ============================================

-- 4.1 检查 environment_reading_values 表中 reading_id 不存在于 environment_readings 的记录
SELECT 'environment_reading_values (reading_id)' as check_table, COUNT(*) as orphan_count
FROM environment_reading_values erv
LEFT JOIN environment_readings er ON erv.reading_id = er.reading_id
WHERE er.reading_id IS NULL;

-- 4.2 检查 environment_reading_values 表中 metric_code 不存在于 environment_metrics 的记录
SELECT 'environment_reading_values (metric_code)' as check_table, COUNT(*) as orphan_count
FROM environment_reading_values erv
LEFT JOIN environment_metrics em ON erv.metric_code = em.metric_code
WHERE em.metric_code IS NULL;

-- ============================================
-- 5. 数据一致性检查
-- ============================================

-- 5.1 检查是否有重复的用户 openid
SELECT 'duplicate_user_openid' as check_item, COUNT(*) as issue_count
FROM (
  SELECT wx_openid
  FROM users
  WHERE wx_openid IS NOT NULL
  GROUP BY wx_openid
  HAVING COUNT(*) > 1
) t;

-- 5.2 检查 plants 表中健康评分超出范围的记录
SELECT 'invalid_health_score' as check_item, COUNT(*) as issue_count
FROM plants
WHERE health_score < 0 OR health_score > 100;

-- 5.3 检查 diagnosis_cards 表中健康评分超出范围的记录
SELECT 'invalid_diagnosis_health_score' as check_item, COUNT(*) as issue_count
FROM diagnosis_cards
WHERE health_score < 0 OR health_score > 100;

-- 5.4 检查 diagnosis_cards 表中 status 字段值是否有效
SELECT 'invalid_diagnosis_status' as check_item, COUNT(*) as issue_count
FROM diagnosis_cards
WHERE status NOT IN ('healthy', 'warning', 'critical');

-- 5.5 检查 plants 表中 category 字段值是否有效
SELECT 'invalid_plant_category' as check_item, COUNT(*) as issue_count
FROM plants
WHERE plant_category NOT IN ('succulent', 'flower', 'foliage', 'vegetable', 'other');

-- 5.6 检查 environment_readings 表中 data_source 字段值是否有效
SELECT 'invalid_data_source' as check_item, COUNT(*) as issue_count
FROM environment_readings
WHERE data_source NOT IN ('sensor', 'weather_api', 'compensation');

-- 5.7 检查 care_records 表中 action_type 字段值是否有效
SELECT 'invalid_care_action_type' as check_item, COUNT(*) as issue_count
FROM care_records
WHERE action_type NOT IN ('water', 'fertilize', 'prune', 'repot', 'pest_control', 'other');

-- 5.8 检查 sessions 表中 type 字段值是否有效
SELECT 'invalid_session_type' as check_item, COUNT(*) as issue_count
FROM sessions
WHERE type NOT IN ('consultation', 'plant');

-- ============================================
-- 6. 软删除数据检查（如果启用了软删除）
-- ============================================

-- 6.1 检查被软删除的用户是否还有关联数据（假设有 deleted_at 字段）
-- 注意：需要根据实际表结构调整
SELECT 'soft_deleted_users_with_data' as check_item, 0 as issue_count
WHERE 1=0;  -- 占位，实际使用时根据表结构调整

-- ============================================
-- 7. 孤立文件检查（需要结合 COS 存储）
-- ============================================

-- 7.1 检查 plants 表中 cover_image_url 为空的记录
SELECT 'plants_without_cover_image' as check_item, COUNT(*) as issue_count
FROM plants
WHERE cover_image_url IS NULL OR cover_image_url = '';

-- 7.2 检查 users 表中 avatar_url 为空的记录（可选，可能允许为空）
SELECT 'users_without_avatar' as check_item, COUNT(*) as issue_count
FROM users
WHERE avatar_url IS NULL OR avatar_url = '';

-- ============================================
-- 8. 汇总统计
-- ============================================

-- 各表记录数统计
SELECT 
  'total_users' as stat_name, COUNT(*) as stat_value FROM users
UNION ALL SELECT 'total_plants', COUNT(*) FROM plants
UNION ALL SELECT 'total_sessions', COUNT(*) FROM sessions
UNION ALL SELECT 'total_messages', COUNT(*) FROM messages
UNION ALL SELECT 'total_diagnosis_cards', COUNT(*) FROM diagnosis_cards
UNION ALL SELECT 'total_devices', COUNT(*) FROM devices
UNION ALL SELECT 'total_care_records', COUNT(*) FROM care_records
UNION ALL SELECT 'total_environment_readings', COUNT(*) FROM environment_readings
UNION ALL SELECT 'total_reading_tasks', COUNT(*) FROM reading_tasks;
