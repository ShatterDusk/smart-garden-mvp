# Redis 缓存改造工作区

**创建日期**: 2026-04-14  
**任务**: 将内存缓存改造为支持 Redis 的缓存抽象层  
**状态**: 🔄 进行中

---

## 工作区目标

将现有的内存缓存改造为支持 Redis 的缓存抽象层，实现：
- ✅ 零侵入式改造（业务代码无需修改逻辑）
- ✅ 自动降级（Redis 失败时回退到内存缓存）
- ✅ 微信云托管兼容（提供 Dockerfile）
- ✅ 渐进式切换（通过环境变量控制）

---

## 文件结构

```
workspace-20260414-redis-cache/
├── README.md                          # 本文件
├── src/
│   ├── CacheService.js               # 缓存抽象层（核心）
│   └── weatherService-with-redis.js  # 改造后的天气服务
├── docker/
│   └── Dockerfile                    # Redis 云托管部署配置
├── tests/
│   └── CacheService.test.js          # 单元测试（待创建）
└── 改造方案.md                        # 详细改造方案
```

---

## 快速开始

### 1. 安装依赖

```bash
cd backend/server
npm install ioredis
```

### 2. 配置环境变量

```bash
# .env
# 方式1：使用内存缓存（默认，与现在完全一致）
# 不配置 REDIS_HOST 即可

# 方式2：使用 Redis（微信云托管自建 Redis）
REDIS_HOST=redis-service  # 云托管服务名
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# 方式3：使用腾讯云 Redis + 资源互联
REDIS_HOST=10.x.x.x       # 腾讯云 Redis 内网 IP
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

### 3. 部署 Redis 到微信云托管（可选）

如果使用云托管自建 Redis：

1. 在微信云托管控制台创建新服务
2. 选择「从代码仓库部署」或「从镜像拉取」
3. 使用 `docker/Dockerfile` 构建
4. 设置环境变量 `REDIS_PASSWORD`

### 4. 应用改造

将 `src/` 下的文件复制到项目中：

```bash
# 复制缓存抽象层
cp src/CacheService.js backend/server/src/services/

# 替换天气服务（或保留两者，通过配置切换）
cp src/weatherService-with-redis.js backend/server/src/services/weatherService.js
```

---

## 改造对比

### 原代码（内存缓存）
```javascript
const cityCodeCache = new Map();

// 获取缓存
const cached = cityCodeCache.get(cacheKey);
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  return cached.cityCode;
}

// 设置缓存
cityCodeCache.set(cacheKey, { cityCode, timestamp: Date.now() });
```

### 新代码（缓存抽象层）
```javascript
const cacheService = require('./CacheService');

// 获取缓存
const cached = await cacheService.get(cacheKey);
if (cached) {
  return cached.cityCode;
}

// 设置缓存
await cacheService.set(cacheKey, { cityCode, timestamp: Date.now() }, CACHE_TTL);
```

**差异点**：
- 引入 `CacheService` 替代 `Map`
- 缓存操作改为异步（`async/await`）
- TTL 作为参数传入，不再手动检查

---

## 安全回滚方案

如果改造后出现问题，可立即回滚：

1. **不配置 REDIS_HOST** → 自动使用内存缓存（与原来完全一致）
2. **还原文件** → 从 Git 恢复原始 weatherService.js
3. **删除 CacheService.js** → 项目回到改造前状态

---

## 验证清单

- [ ] CacheService 单元测试通过
- [ ] weatherService 单元测试通过
- [ ] 内存缓存模式功能正常
- [ ] Redis 缓存模式功能正常
- [ ] Redis 连接失败时自动降级
- [ ] 微信云托管部署成功
- [ ] 性能测试通过

---

## 相关文档

- [工作区模式说明](../docs/current/12-workgroups/知识工程部/04-工具与自动化/工作区模式说明.md)
- [原 weatherService.js](../backend/server/src/services/weatherService.js)
- [微信云托管 Redis 文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/practice/redis.html)

---

## 变更记录

| 日期 | 变更内容 |
|:---|:---|
| 2026-04-14 | 创建工作区，完成核心代码 |
