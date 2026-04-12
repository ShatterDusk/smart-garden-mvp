-- 会话性能分析查询（轻量版）
-- 基于 sendMessage completed 日志分析

-- ============================================
-- 查询1：最近24小时的响应时间统计
-- ============================================
SELECT 
    DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
    COUNT(*) as request_count,
    AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.totalTimeMs')) AS UNSIGNED)) as avg_time_ms,
    MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.totalTimeMs')) AS UNSIGNED)) as max_time_ms,
    MIN(CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.totalTimeMs')) AS UNSIGNED)) as min_time_ms
FROM system_logs
WHERE message = 'sendMessage completed'
    AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')
ORDER BY hour DESC;

-- ============================================
-- 查询2：慢请求分析（超过5秒）
-- ============================================
SELECT 
    id,
    created_at,
    JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.requestId')) as request_id,
    JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.sessionId')) as session_id,
    JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.hasImage')) as has_image,
    JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.hasDiagnosisCard')) as has_diagnosis_card,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.totalTimeMs')) AS UNSIGNED) as total_time_ms
FROM system_logs
WHERE message = 'sendMessage completed'
    AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.totalTimeMs')) AS UNSIGNED) > 5000
    AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY total_time_ms DESC
LIMIT 20;

-- ============================================
-- 查询3：按是否有图片分组统计
-- ============================================
SELECT 
    JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.hasImage')) as has_image,
    COUNT(*) as request_count,
    ROUND(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.totalTimeMs')) AS UNSIGNED)), 2) as avg_time_ms,
    ROUND(MAX(CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.totalTimeMs')) AS UNSIGNED)), 2) as max_time_ms
FROM system_logs
WHERE message = 'sendMessage completed'
    AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.hasImage'));

-- ============================================
-- 查询4：AI 服务内部耗时（从 aiService 日志）
-- ============================================
SELECT 
    created_at,
    JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.totalTime')) as ai_service_time,
    JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.hasImage')) as has_image,
    JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.provider')) as provider
FROM system_logs
WHERE message LIKE '%AI 分析成功%'
    AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 查询5：错误和超时统计
-- ============================================
SELECT 
    level,
    message,
    created_at,
    JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.totalTimeMs')) as total_time_ms,
    JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.error')) as error_msg
FROM system_logs
WHERE message = 'sendMessage failed'
    AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY created_at DESC
LIMIT 20;
