# TASK-001: 天气服务缓存改造

## 任务概述

- **任务ID**: TASK-001
- **优先级**: MEDIUM
- **标签**: TODO[MEDIUM]
- **代码位置**: `backend/server/src/services/weatherService.js:32`
- **创建时间**: 2026-04-11
- **计划完成**: 2026-04-25
- **负责人**: 待分配
- **状态**: 🟡 待处理

---

## 问题描述

当前天气服务使用内存缓存（Map）存储天气数据，存在以下问题：

1. **重启丢失** - 服务重启后缓存数据全部丢失
2. **多实例不共享** - 生产环境多实例部署时，各实例缓存独立，无法共享
3. **内存占用** - 长期运行可能导致内存占用持续增长

---

## 影响范围

- **生产环境**: 多实例部署时缓存命中率降低
- **用户体验**: 天气数据加载可能变慢
- **API 调用成本**: 重复请求天气 API 增加费用

---

## 建议方案

### 方案 A: Redis 缓存（推荐）

**优点**:
- 支持多实例共享
- 数据持久化
- 支持过期时间自动清理
- 性能优秀

**缺点**:
- 需要部署 Redis 服务
- 增加系统复杂度

**实现步骤**:
1. 部署 Redis 服务（或使用云 Redis）
2. 安装 Redis 客户端库（ioredis）
3. 封装 Redis 缓存工具类
4. 替换 weatherService.js 中的内存缓存

### 方案 B: 数据库缓存

**优点**:
- 无需额外服务
- 已有 MySQL 基础设施

**缺点**:
- 性能不如 Redis
- 需要设计缓存表结构

**实现步骤**:
1. 创建缓存表（cache_weather_data）
2. 封装数据库缓存工具类
3. 替换 weatherService.js 中的内存缓存

---

## 技术细节

### 当前代码

```javascript
// 天气数据缓存（同城市、同时间段的读数可复用）
const weatherDataCache = new Map();
const WEATHER_CACHE_TTL = 2 * 60 * 60 * 1000; // 2小时
```

### 改造后代码示例（Redis）

```javascript
const redis = require('../utils/redis');

// 缓存键前缀
const CACHE_PREFIX = 'weather:';
const CACHE_TTL = 2 * 60 * 60; // 2小时（秒）

async function getCachedWeather(locationKey) {
  const key = `${CACHE_PREFIX}${locationKey}`;
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

async function setCachedWeather(locationKey, data) {
  const key = `${CACHE_PREFIX}${locationKey}`;
  await redis.setex(key, CACHE_TTL, JSON.stringify(data));
}
```

---

## 验收标准

- [ ] 缓存数据在重启后仍然存在
- [ ] 多实例可以共享缓存数据
- [ ] 缓存命中率统计功能
- [ ] 缓存清理工具（用于测试）
- [ ] 性能测试通过（缓存读取 < 10ms）

---

## 相关文档

- [代码注释规范](../01-方法论与规范/代码注释规范.md)
- [代码标签跟踪](../03-流程治理/代码标签跟踪.md)

---

## 备注

- 需要评估 Redis 部署成本
- 考虑缓存预热策略
- 监控缓存命中率

---

*创建时间: 2026-04-11*  
*最后更新: 2026-04-11*  
*任务类型: 技术债务*
