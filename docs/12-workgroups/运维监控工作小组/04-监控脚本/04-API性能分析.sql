-- ============================================
-- API性能分析
-- 用途: 分析API响应时间和调用频率
-- 路径: 路径2-API性能监控
-- ============================================

-- 注意: 此查询需要日志中包含响应时间信息
-- 如果日志格式不同，需要相应调整

-- 按API统计调用次数（最近1小时）
SELECT 
    method,
    url,
    COUNT(*) as call_count,
    source
FROM system_logs
WHERE url IS NOT NULL
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY method, url, source
ORDER BY call_count DESC
LIMIT 50;

-- 查询高频API的错误率
SELECT 
    url,
    method,
    COUNT(*) as total_count,
    SUM(CASE WHEN level IN ('error', 'fatal') THEN 1 ELSE 0 END) as error_count,
    ROUND(SUM(CASE WHEN level IN ('error', 'fatal') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as error_rate
FROM system_logs
WHERE url IS NOT NULL
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY url, method
HAVING total_count > 10
ORDER BY error_rate DESC
LIMIT 20;
