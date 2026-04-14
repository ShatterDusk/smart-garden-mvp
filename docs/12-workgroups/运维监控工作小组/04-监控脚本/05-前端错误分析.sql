-- ============================================
-- 前端错误分析
-- 用途: 分析微信小程序客户端错误
-- 路径: 路径1-系统错误监控
-- ============================================

-- 按页面统计错误数
SELECT 
    page_path,
    level,
    COUNT(*) as error_count
FROM client_logs
WHERE level IN ('error', 'fatal')
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY page_path, level
ORDER BY error_count DESC;

-- 查询特定用户的错误日志
-- 请替换 'USER_ID' 为实际的用户ID
SELECT 
    id,
    level,
    message,
    page_path,
    action,
    network_type,
    created_at
FROM client_logs
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 100;

-- 按网络类型统计错误
SELECT 
    network_type,
    COUNT(*) as error_count
FROM client_logs
WHERE level IN ('error', 'fatal')
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY network_type
ORDER BY error_count DESC;
