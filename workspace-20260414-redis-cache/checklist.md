# Redis 缓存改造迁移检查清单

**迁移日期**: 2026-04-14  
**迁移目标**: 将内存缓存改造为支持 Redis 的缓存抽象层  
**风险等级**: 🟡 中

---

## 前置条件

- [ ] 已备份原 `weatherService.js`
- [ ] 已安装 `ioredis` 依赖
- [ ] 已配置环境变量（如使用 Redis）
- [ ] 已通过单元测试

---

## 迁移步骤

### 步骤 1: 安装依赖

```bash
cd backend/server
npm install ioredis
```

**验证**:
- [ ] `package.json` 中已添加 `ioredis`
- [ ] `node_modules/ioredis` 存在

---

### 步骤 2: 复制核心文件

```bash
# 复制缓存抽象层
cp workspace-20260414-redis-cache/src/CacheService.js backend/server/src/services/

# 备份原天气服务
cp backend/server/src/services/weatherService.js backend/server/src/services/weatherService.js.backup

# 替换天气服务
cp workspace-20260414-redis-cache/src/weatherService-with-redis.js backend/server/src/services/weatherService.js
```

**验证**:
- [ ] `backend/server/src/services/CacheService.js` 存在
- [ ] `backend/server/src/services/weatherService.js.backup` 存在
- [ ] 文件内容正确（检查路径引用）

---

### 步骤 3: 配置环境变量

**方案 A: 内存缓存（默认，与原来一致）**
```bash
# 无需配置，或显式禁用 Redis
# .env
# REDIS_HOST=    # 留空或注释掉
```

**方案 B: 微信云托管自建 Redis**
```bash
# .env
REDIS_HOST=redis-service  # 云托管服务名
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_KEY_PREFIX=plantgpt:weather:
```

**方案 C: 腾讯云 Redis + 资源互联**
```bash
# .env
REDIS_HOST=10.x.x.x       # 腾讯云 Redis 内网 IP
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_KEY_PREFIX=plantgpt:weather:
```

**验证**:
- [ ] 环境变量配置正确
- [ ] 密码强度符合要求（生产环境）

---

### 步骤 4: 运行单元测试

```bash
cd backend/server
npm test -- CacheService.test.js
```

**验证**:
- [ ] 所有测试通过
- [ ] 内存缓存模式测试通过
- [ ] 降级测试通过

---

### 步骤 5: 本地验证

```bash
# 启动服务
npm run dev

# 测试天气 API
curl http://localhost:3000/api/weather/current?location=101010100
```

**验证**:
- [ ] 服务正常启动
- [ ] 天气 API 返回正确数据
- [ ] 日志显示缓存模式（memory/redis）
- [ ] 第二次请求使用缓存（查看日志）

---

### 步骤 6: 部署 Redis 服务（如使用云托管自建）

1. 在微信云托管控制台创建新服务
2. 选择「从代码仓库部署」
3. 指定 `workspace-20260414-redis-cache/docker/Dockerfile`
4. 设置环境变量 `REDIS_PASSWORD`
5. 部署并等待服务就绪

**验证**:
- [ ] Redis 服务状态为「运行中」
- [ ] 健康检查通过
- [ ] 日志显示 Redis 启动成功

---

### 步骤 7: 生产环境灰度

**Day 1: 单实例验证**
- [ ] 选择 1 台实例启用 Redis
- [ ] 监控错误率和响应时间
- [ ] 验证缓存命中率

**Day 2: 全量发布**
- [ ] 所有实例启用 Redis
- [ ] 持续监控 24 小时

---

## 回滚方案

### 快速回滚（30秒内）

```bash
# 方式 1: 切换回内存缓存（不重启）
unset REDIS_HOST
# 服务自动降级到内存缓存

# 方式 2: 还原代码
mv backend/server/src/services/weatherService.js.backup backend/server/src/services/weatherService.js
rm backend/server/src/services/CacheService.js
npm run dev
```

### 完整回滚

```bash
# 1. 停止服务
# 2. 还原代码
git checkout backend/server/src/services/weatherService.js
rm backend/server/src/services/CacheService.js

# 3. 卸载依赖
npm uninstall ioredis

# 4. 重启服务
npm run dev
```

---

## 验证清单

### 功能验证

- [ ] 天气数据缓存正常
- [ ] 城市代码缓存正常
- [ ] 天文数据缓存正常
- [ ] 缓存过期正常
- [ ] 缓存清空正常

### 性能验证

- [ ] 缓存命中率 > 80%
- [ ] 平均响应时间 < 100ms
- [ ] Redis 内存使用 < 80%

### 稳定性验证

- [ ] 服务运行 24 小时无崩溃
- [ ] Redis 连接稳定
- [ ] 自动降级功能正常

---

## 监控指标

| 指标 | 正常范围 | 告警阈值 |
|:---|:---|:---:|
| 缓存命中率 | > 80% | < 70% |
| Redis 连接状态 | 已连接 | 断开 |
| 响应时间 | < 100ms | > 500ms |
| 错误率 | < 0.1% | > 1% |
| Redis 内存使用 | < 70% | > 85% |

---

## 常见问题

### Q1: 服务启动时报 "Cannot find module '../utils/logger'"
**原因**: 路径问题  
**解决**: 确认 CacheService.js 位于 `backend/server/src/services/` 目录

### Q2: Redis 连接失败但没有降级
**原因**: Redis 配置错误  
**解决**: 检查 `REDIS_HOST` 和 `REDIS_PORT` 配置

### Q3: 缓存没有生效
**原因**: 缓存键前缀不匹配  
**解决**: 检查 `REDIS_KEY_PREFIX` 配置

### Q4: 内存使用过高
**原因**: 缓存未过期或清理  
**解决**: 检查 TTL 配置，手动清空缓存

---

## 完成确认

- [ ] 所有验证项通过
- [ ] 监控指标正常
- [ ] 文档已更新
- [ ] 团队已通知

**迁移完成日期**: ___________  
**迁移执行人**: ___________  
**验证人**: ___________

---

## 附录

### 环境变量完整配置

```bash
# ============================================
# Redis 配置（可选）
# ============================================

# Redis 主机地址
# 不配置 = 使用内存缓存
# 云托管自建 = 服务名（如 redis-service）
# 腾讯云 Redis = 内网 IP（如 10.x.x.x）
REDIS_HOST=

# Redis 端口（默认 6379）
REDIS_PORT=6379

# Redis 密码（生产环境必须设置）
REDIS_PASSWORD=

# 缓存键前缀（用于区分不同服务）
REDIS_KEY_PREFIX=plantgpt:weather:

# Redis 内存限制（仅云托管自建时有效）
REDIS_MAXMEMORY=256mb
```

### 相关文件

- [CacheService.js](../src/CacheService.js) - 缓存抽象层
- [weatherService-with-redis.js](../src/weatherService-with-redis.js) - 改造后的天气服务
- [Dockerfile](../docker/Dockerfile) - Redis 云托管部署配置
- [CacheService.test.js](../tests/CacheService.test.js) - 单元测试
