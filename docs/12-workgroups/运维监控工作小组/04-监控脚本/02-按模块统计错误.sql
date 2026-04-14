-- ============================================
-- 按模块统计错误
-- 用途: 识别错误高发模块
-- 路径: 路径1-系统错误监控
-- ============================================

-- 按来源模块统计最近1小时错误数
SELECT 
    source,
    level,
    COUNT(*) as error_count
FROM system_logs
WHERE level IN ('error', 'fatal')
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY source, level
ORDER BY error_count DESC;

-- 按小时统计错误趋势（最近24小时）
SELECT 
    DATE_FORMAT(created_at, '%Y-%m-%d %H:00') as hour,
    level,
    COUNT(*) as count
FROM system_logs
WHERE level IN ('error', 'fatal')
  AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY hour, level
ORDER BY hour DESC, level;
