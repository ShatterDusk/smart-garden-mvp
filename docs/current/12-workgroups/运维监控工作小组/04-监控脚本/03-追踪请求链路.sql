-- ============================================
-- 追踪请求链路
-- 用途: 根据 request_id 追踪完整请求链路
-- 路径: 路径1-系统错误监控 / 路径2-API性能监控
-- ============================================

-- 根据 request_id 查询关联日志
-- 请替换 'YOUR_REQUEST_ID' 为实际的请求ID
SELECT 
    id,
    level,
    message,
    source,
    url,
    method,
    created_at,
    error_stack
FROM system_logs
WHERE request_id = 'YOUR_REQUEST_ID'
ORDER BY created_at ASC;

-- 查询最近有错误的 request_id
SELECT 
    request_id,
    COUNT(*) as log_count,
    MIN(created_at) as start_time,
    MAX(created_at) as end_time
FROM system_logs
WHERE level IN ('error', 'fatal')
  AND request_id IS NOT NULL
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY request_id
ORDER BY log_count DESC
LIMIT 20;
