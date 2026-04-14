-- ============================================
-- 查询最近错误日志
-- 用途: 快速查看系统最近发生的错误
-- 路径: 路径1-系统错误监控
-- ============================================

-- 查询最近 100 条后端错误日志
SELECT 
    id,
    level,
    message,
    source,
    request_id,
    url,
    method,
    created_at,
    error_stack
FROM system_logs
WHERE level IN ('error', 'fatal')
ORDER BY created_at DESC
LIMIT 100;

-- ============================================
-- 查询最近 100 条前端错误日志
-- ============================================
SELECT 
    id,
    user_id,
    session_id,
    level,
    message,
    page_path,
    action,
    network_type,
    created_at
FROM client_logs
WHERE level IN ('error', 'fatal')
ORDER BY created_at DESC
LIMIT 100;
