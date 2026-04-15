# Redis 缓存改造 - CI/CD 完整指南

## 概述

本工作区提供了一键 CI/CD 能力，支持灰度发布、自动回滚、健康检查等功能。

## 文件结构

```
workspace-20260414-redis-cache/
├── .github/workflows/
│   ├── redis-canary-deploy.yml    # 灰度发布工作流
│   └── redis-rollback.yml          # 回滚工作流
├── scripts/
│   ├── deploy.sh                   # 部署脚本
│   ├── canary-deploy.sh            # 灰度部署脚本
│   ├── rollback.sh                 # 回滚脚本
│   └── health-check.sh             # 健康检查脚本
├── config/
│   ├── .env.example                # 环境变量模板
│   ├── env.staging                 # 测试环境配置
│   └── env.production              # 生产环境配置
├── docker/
│   ├── Dockerfile                  # Redis 镜像
│   └── docker-compose.yml          # 本地开发配置
└── CI-CD-README.md                 # 本文件
```

## 快速开始

### 1. 配置 GitHub Secrets

在 GitHub 仓库 Settings -> Secrets and variables -> Actions 中添加：

```bash
# Redis 配置
STAGING_REDIS_HOST=your-staging-redis-host
STAGING_REDIS_PASSWORD=your-staging-redis-password
PROD_REDIS_HOST=your-prod-redis-host
PROD_REDIS_PASSWORD=your-prod-redis-password

# 其他配置（如有需要）
STAGING_DB_PASSWORD=xxx
PROD_DB_PASSWORD=xxx
```

### 2. 本地开发和测试

使用 docker-compose 进行本地开发和测试：

```bash
cd workspace-20260414-redis-cache/docker

# 启动所有服务（后端 + MySQL + Redis）
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 测试 Redis 连接
docker-compose exec backend node -e "
  const cache = require('./src/services/CacheService');
  cache.init().then(() => {
    console.log('缓存类型:', cache.getStatus());
    cache.close();
  });
"

# 停止服务
docker-compose down
```

### 3. 配置环境变量

复制配置模板并填写实际值：

```bash
# 复制配置模板
cp config/.env.example .env

# 编辑配置
vim .env
```

### 4. 设置脚本执行权限

```bash
chmod +x scripts/*.sh
```

### 5. 触发灰度发布

#### 方式一：GitHub Actions 界面

1. 进入 GitHub 仓库 -> Actions
2. 选择 "Redis 缓存改造 - 灰度发布"
3. 点击 "Run workflow"
4. 选择参数：
   - **environment**: production
   - **canary_percentage**: 10
   - **use_redis**: true

#### 方式二：命令行

```bash
# 触发灰度发布
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/YOUR_ORG/YOUR_REPO/actions/workflows/redis-canary-deploy.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "environment": "production",
      "canary_percentage": "10",
      "use_redis": "true"
    }
  }'
```

### 6. 监控发布

发布过程中会自动执行：
- ✅ 代码检查
- ✅ 单元测试
- ✅ Redis 连接测试
- ✅ 构建 Docker 镜像
- ✅ 灰度部署
- ✅ 健康检查
- ✅ 监控指标收集

### 7. 提升灰度比例

如果 10% 灰度运行正常，可以逐步提升：

```bash
# 25% -> 50% -> 100%
```

在 GitHub Actions 界面重新运行 workflow，选择更高的灰度比例。

### 8. 回滚操作

如果发现问题，立即回滚：

#### 方式一：GitHub Actions

1. 进入 Actions -> "Redis 缓存改造 - 回滚"
2. 点击 "Run workflow"
3. 选择参数：
   - **environment**: production
   - **target**: canary

#### 方式二：命令行

```bash
# 回滚金丝雀实例
bash scripts/rollback.sh production canary

# 回滚到稳定版本
bash scripts/rollback.sh production stable
```

## CI/CD 流程详解

### 灰度发布流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   预检      │────→│   测试      │────→│   构建      │
│ 检查文件    │     │ 单元测试    │     │ Docker镜像  │
│ 验证语法    │     │ Redis测试   │     │ 保存产物    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
┌─────────────┐     ┌─────────────┐     ┌──────▼──────┐
│   监控      │←────│ 健康检查    │←────│  灰度部署   │
│ 收集指标    │     │ 验证服务    │     │ 10%流量    │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 环境变量说明

### 必需变量

| 变量名 | 说明 | 示例 |
|:---|:---|:---|
| `REDIS_HOST` | Redis 主机地址 | `localhost`, `redis-service`, `10.x.x.x` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | `your-password` |
| `REDIS_KEY_PREFIX` | 缓存键前缀 | `plantgpt:weather:` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|:---|:---|:---|
| `USE_REDIS` | 是否启用 Redis | `true` |
| `CANARY_PERCENTAGE` | 灰度比例 | `10` |
| `REDIS_MAXMEMORY` | Redis 内存限制 | `256mb` |

## 监控指标

部署后自动监控：
- 缓存命中率（目标 > 80%）
- 响应时间（目标 < 100ms）
- Redis 内存使用（目标 < 80%）
- 错误率（目标 < 0.1%）

## 常见问题

### Q1: 本地测试时 Redis 连接失败
**解决**: 确保 docker-compose 中的服务名正确，使用 `redis` 而不是 `localhost`

### Q2: 脚本无法执行
**解决**: 运行 `chmod +x scripts/*.sh` 添加执行权限

### Q3: 环境变量未生效
**解决**: 确保 `.env` 文件在项目根目录，或正确设置环境变量

### Q4: CI/CD 工作流触发失败
**解决**: 检查 GitHub Secrets 是否正确配置，以及是否有 workflow 执行权限
