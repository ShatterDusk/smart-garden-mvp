---
id: "KNOW-2026-04-11-004"
type: "solution"
category: "project-insights/solutions"
tags: ["security", "api", "jwt", "sql-injection", "path-traversal", "rate-limiting", "nodejs", "express"]
created: "2026-04-11"
updated: "2026-04-11"
author: "AI"
status: "active"
---

# 日志API安全加固方案

## 摘要

日志API的安全加固实践，涵盖JWT签名验证、路径遍历防护、SQL注入防护、错误信息隐藏和API限流等关键安全措施。

## 问题背景

日志API面临的主要安全风险：
1. **JWT签名验证缺失** - 简化版JWT没有验证签名，任何人可构造有效Token
2. **路径遍历攻击** - 可构造路径读取任意文件
3. **SQL注入风险** - 参数直接拼接到SQL语句
4. **错误信息泄露** - 生产环境返回详细错误信息
5. **API限流缺失** - 可被暴力攻击

## 解决方案

### 1. JWT签名验证

```javascript
const crypto = require('crypto');

/**
 * 验证JWT签名
 * @param {string} headerB64 - Base64编码的header
 * @param {string} payloadB64 - Base64编码的payload
 * @param {string} signatureB64 - Base64编码的签名
 * @returns {boolean} 验证结果
 */
const verifySignature = (headerB64, payloadB64, signatureB64) => {
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  
  // 使用timing-safe比较防止时序攻击
  return crypto.timingSafeEqual(
    Buffer.from(signatureB64),
    Buffer.from(expectedSignature)
  );
};
```

**关键点**:
- 使用HMAC-SHA256算法
- 使用`timingSafeEqual`防止时序攻击
- 生产环境必须设置强密钥

### 2. 路径遍历防护

```javascript
const path = require('path');

/**
 * 获取安全的日志文件路径
 * @param {string} source - 日志来源
 * @param {string} fileName - 文件名
 * @returns {string|null} 安全路径或null
 */
const getSafeLogFilePath = (source, fileName) => {
  // 清理文件名：只保留基本文件名
  const safeFileName = path.basename(fileName).replace(/[\\/]/g, '');
  
  // 只允许.log文件
  if (!safeFileName.endsWith('.log')) return null;
  
  // 确保路径在基础目录内
  const fullPath = path.resolve(safeBaseDir, safeFileName);
  const baseDirWithSep = safeBaseDir.endsWith(path.sep) 
    ? safeBaseDir 
    : safeBaseDir + path.sep;
  
  if (!fullPath.startsWith(baseDirWithSep)) return null;
  
  return fullPath;
};
```

**防护要点**:
- 使用`path.basename()`提取文件名
- 正则表达式过滤路径分隔符
- 扩展名白名单验证
- 路径前缀验证确保在允许目录内

### 3. SQL注入防护

```javascript
/**
 * 转义LIKE特殊字符
 * @param {string} keyword - 搜索关键词
 * @returns {string} 转义后的关键词
 */
const sanitizeLikeKeyword = (keyword) => {
  return String(keyword)
    .substring(0, 100)  // 长度限制
    .replace(/[%_\\]/g, '\\$&');  // 转义LIKE特殊字符
};

// 使用示例
const sanitizedKeyword = sanitizeLikeKeyword(keyword);
const logs = await SystemLog.findAll({
  where: {
    message: {
      [Op.like]: `%${sanitizedKeyword}%`
    }
  }
});
```

**防护策略**:
- 输入长度限制
- LIKE特殊字符转义（%, _, \）
- 使用Sequelize参数化查询

### 4. 错误信息隐藏

```javascript
/**
 * 统一错误响应
 * @param {Error} err - 错误对象
 * @param {Response} res - Express响应对象
 */
const handleError = (err, res) => {
  const isDev = process.env.NODE_ENV === 'development';
  
  // 记录详细错误（内部使用）
  logger.error('操作失败', {
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // 返回客户端的错误（生产环境隐藏细节）
  const message = isDev 
    ? `操作失败: ${err.message}` 
    : '操作失败，请稍后重试';
  
  res.status(500).json({
    code: 500,
    message,
    data: null
  });
};
```

**原则**:
- 开发环境显示详细错误
- 生产环境只返回通用错误信息
- 详细错误记录到日志系统（内部使用）

### 5. API限流实现

```javascript
// 内存限流存储
const rateLimitStore = new Map();

/**
 * 检查限流
 * @param {string} clientId - 客户端标识
 * @returns {boolean} 是否允许请求
 */
const checkRateLimit = (clientId) => {
  const now = Date.now();
  const timestamps = rateLimitStore.get(clientId) || [];
  
  // 清理过期记录（1分钟前）
  const validTimestamps = timestamps.filter(t => now - t < 60000);
  
  // 检查是否超过限制（100请求/分钟）
  if (validTimestamps.length >= 100) {
    return false;
  }
  
  // 记录本次请求
  validTimestamps.push(now);
  rateLimitStore.set(clientId, validTimestamps);
  
  return true;
};

// 定期清理过期数据（每5分钟）
setInterval(() => {
  const now = Date.now();
  for (const [clientId, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter(t => now - t < 60000);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(clientId);
    } else {
      rateLimitStore.set(clientId, validTimestamps);
    }
  }
}, 5 * 60 * 1000);
```

**实现要点**:
- 基于内存的滑动窗口限流
- 自动清理过期数据防止内存泄漏
- 可配置限流阈值

## 最佳实践总结

| 安全措施 | 实现方式 | 关键代码 |
|:---|:---|:---|
| JWT验证 | HMAC-SHA256 + timingSafeEqual | `crypto.createHmac()` |
| 路径防护 | basename + 路径前缀验证 | `path.basename()`, `startsWith()` |
| SQL防护 | 输入转义 + 长度限制 | `replace(/[%_\\]/g, ...)` |
| 错误隐藏 | 环境判断 + 分级响应 | `process.env.NODE_ENV` |
| API限流 | 内存滑动窗口 | `Map` + 时间戳数组 |

## 相关代码

- 认证中间件: `backend/server/src/middleware/logAuth.js`
- 日志控制器: `backend/server/src/controllers/logController.js`
- 常量定义: `backend/server/src/shared/logConstants.js`

## 变更记录

| 日期 | 变更内容 |
|:---|:---|
| 2026-04-11 | 初始创建，沉淀日志API安全加固方案 |
