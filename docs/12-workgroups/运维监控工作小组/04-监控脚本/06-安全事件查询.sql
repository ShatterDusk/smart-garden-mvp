-- ============================================
-- 安全事件查询
-- 用途: 发现潜在安全威胁
-- 路径: 路径6-安全事件监控
-- ============================================

-- 查询认证相关错误（可能的暴力破解）
SELECT 
    ip_address,
    url,
    COUNT(*) as fail_count,
    MIN(created_at) as first_attempt,
    MAX(created_at) as last_attempt
FROM system_logs
WHERE (
    message LIKE '%认证%' 
    OR message LIKE '%登录%' 
    OR message LIKE '%token%'
    OR message LIKE '%权限%'
)
AND level IN ('error', 'warn')
AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY ip_address, url
HAVING fail_count > 5
ORDER BY fail_count DESC;

-- 查询异常IP访问
SELECT 
    ip_address,
    COUNT(DISTINCT url) as unique_urls,
    COUNT(*) as total_requests,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM system_logs
WHERE ip_address IS NOT NULL
  AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY ip_address
HAVING unique_urls > 10 OR total_requests > 100
ORDER BY total_requests DESC;

-- 查询敏感接口访问
SELECT 
    url,
    method,
    ip_address,
    COUNT(*) as access_count
FROM system_logs
WHERE (
    url LIKE '%admin%' 
    OR url LIKE '%delete%' 
    OR url LIKE '%update%'
    OR url LIKE '%config%'
)
AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY url, method, ip_address
ORDER BY access_count DESC;
