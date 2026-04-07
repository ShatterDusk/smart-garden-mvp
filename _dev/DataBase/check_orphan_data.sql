-- 检查所有表的野数据（孤儿记录）
-- 运行此脚本找出数据库中的外键悬空问题

-- 1. 检查 plants 表中 user_id 不存在于 users 的记录
SELECT 'plants (user_id)' as check_table, COUNT(*) as orphan_count
FROM plants p
LEFT JOIN users u ON p.user_id = u.user_id
WHERE u.user_id IS NULL;

-- 2. 检查 sessions 表中 user_id 不存在于 users 的记录
SELECT 'sessions (user_id)' as check_table, COUNT(*) as orphan_count
FROM sessions s
LEFT JOIN users u ON s.user_id = u.user_id
WHERE u.user_id IS NULL;

-- 3. 检查 sessions 表中 plant_id 不存在于 plants 的记录（且 plant_id 不为空）
SELECT 'sessions (plant_id)' as check_table, COUNT(*) as orphan_count
FROM sessions s
LEFT JOIN plants p ON s.plant_id = p.plant_id
WHERE s.plant_id IS NOT NULL AND p.plant_id IS NULL;

-- 4. 检查 messages 表中 session_id 不存在于 sessions 的记录
SELECT 'messages (session_id)' as check_table, COUNT(*) as orphan_count
FROM messages m
LEFT JOIN sessions s ON m.session_id = s.session_id
WHERE s.session_id IS NULL;

-- 5. 检查 diagnosis_cards 表中 message_id 不存在于 messages 的记录
SELECT 'diagnosis_cards (message_id)' as check_table, COUNT(*) as orphan_count
FROM diagnosis_cards d
LEFT JOIN messages m ON d.message_id = m.message_id
WHERE m.message_id IS NULL;

-- 6. 检查 diagnosis_cards 表中 plant_id 不存在于 plants 的记录（且 plant_id 不为空）
SELECT 'diagnosis_cards (plant_id)' as check_table, COUNT(*) as orphan_count
FROM diagnosis_cards d
LEFT JOIN plants p ON d.plant_id = p.plant_id
WHERE d.plant_id IS NOT NULL AND p.plant_id IS NULL;

-- 7. 检查 environment_readings 表中 plant_id 不存在于 plants 的记录
SELECT 'environment_readings (plant_id)' as check_table, COUNT(*) as orphan_count
FROM environment_readings er
LEFT JOIN plants p ON er.plant_id = p.plant_id
WHERE p.plant_id IS NULL;

-- 8. 检查 care_records 表中 plant_id 不存在于 plants 的记录
SELECT 'care_records (plant_id)' as check_table, COUNT(*) as orphan_count
FROM care_records cr
LEFT JOIN plants p ON cr.plant_id = p.plant_id
WHERE p.plant_id IS NULL;

-- 9. 检查 care_records 表中 user_id 不存在于 users 的记录
SELECT 'care_records (user_id)' as check_table, COUNT(*) as orphan_count
FROM care_records cr
LEFT JOIN users u ON cr.user_id = u.user_id
WHERE u.user_id IS NULL;

-- 10. 检查 devices 表中 user_id 不存在于 users 的记录
SELECT 'devices (user_id)' as check_table, COUNT(*) as orphan_count
FROM devices d
LEFT JOIN users u ON d.user_id = u.user_id
WHERE u.user_id IS NULL;

-- 11. 检查 reading_tasks 表中 plant_id 不存在于 plants 的记录
SELECT 'reading_tasks (plant_id)' as check_table, COUNT(*) as orphan_count
FROM reading_tasks rt
LEFT JOIN plants p ON rt.plant_id = p.plant_id
WHERE p.plant_id IS NULL;

-- 12. 检查 user_config 表中 user_id 不存在于 users 的记录
SELECT 'user_config (user_id)' as check_table, COUNT(*) as orphan_count
FROM user_config uc
LEFT JOIN users u ON uc.user_id = u.user_id
WHERE u.user_id IS NULL;

-- 13. 检查 plants 表中 current_device_id 不存在于 devices 的记录（且不为空）
SELECT 'plants (current_device_id)' as check_table, COUNT(*) as orphan_count
FROM plants p
LEFT JOIN devices d ON p.current_device_id = d.device_id
WHERE p.current_device_id IS NOT NULL AND d.device_id IS NULL;
