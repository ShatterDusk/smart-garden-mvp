---
id: "KNOW-2026-04-18-001"
type: "technical"
category: "domain-knowledge/technical"
tags: ["technical-landscape", "infrastructure", "database", "testing", "deployment", "architecture", "consensus"]
created: "2026-04-18"
updated: "2026-04-18"
author: "AI"
status: "active"
---

# 项目技术全景与常识共识

> 本文档汇总项目的技术基础设施、运行状态和团队共识，作为项目技术决策的参考基础。

---

## 一、数据库基础设施

### 1.1 数据库配置

| 属性 | 值 | 共识 |
|:---|:---|:---|
| **数据库类型** | MySQL 8.0.30 | 使用 MySQL 8.0+ 版本 |
| **托管方式** | 腾讯云 CynosDB | 云托管数据库，自动备份 |
| **数据库名** | `smart_garden` | 统一数据库名 |
| **ORM 框架** | Sequelize 6.37.8 | 使用 Sequelize 作为 ORM |
| **连接池** | min: 2, max: 10 | 默认连接池配置 |
| **字符集** | utf8mb4 | 支持完整 Unicode |

### 1.2 数据表结构

当前共有 **15 个数据表**：

**核心业务表**:
- `users` - 用户表
- `plants` - 植物档案表
- `devices` - 设备表
- `sessions` - 会话表
- `messages` - 消息表
- `care_records` - 养护记录表
- `diagnosis_cards` - 诊断卡表

**环境数据表**:
- `environment_readings` - 环境读数表
- `environment_reading_values` - 环境读数值表
- `environment_metrics` - 环境指标定义表
- `reading_tasks` - 读数任务表

**日志表**:
- `system_logs` - 系统日志表
- `client_logs` - 客户端日志表

**配置表**:
- `user_config` - 用户配置表
- `sequelizemeta` - Sequelize 迁移元数据

### 1.3 数据规模（生产环境）

| 表名 | 记录数 | 说明 |
|:---|:---:|:---|
| users | 2 | 注册用户 |
| plants | 1 | 植物档案 |
| devices | 1 | 连接设备 |
| sessions | 2 | 活跃会话 |
| messages | 8 | 会话消息 |
| system_logs | 2,350 | 系统运行日志 |
| client_logs | 2,184 | 客户端日志 |

**共识**: 日志表数据量较大，需要定期归档或清理策略。

---

## 二、测试体系

### 2.1 测试框架

| 属性 | 值 | 共识 |
|:---|:---|:---|
| **测试框架** | Jest 30.3.0 | 使用 Jest 进行测试 |
| **HTTP 测试** | Supertest 7.2.2 | API 集成测试 |
| **覆盖率工具** | Jest 内置 | 生成覆盖率报告 |

### 2.2 测试结构

```
tests/
├── unit/                    # 单元测试
│   ├── controllers/         # 控制器测试 (8个)
│   ├── services/            # 服务测试 (9个)
│   ├── middleware/          # 中间件测试 (4个)
│   ├── utils/               # 工具测试 (5个)
│   ├── jobs/                # 定时任务测试 (1个)
│   ├── security/            # 安全测试 (1个)
│   └── edge-cases/          # 边界测试 (1个)
├── integration/api/         # 集成测试 (5个)
└── e2e/                     # E2E测试 (1个)
```

### 2.3 测试命令

```bash
npm test                    # 运行所有测试
npm run test:unit          # 仅单元测试
npm run test:integration   # 仅集成测试
npm run test:e2e           # 仅E2E测试
npm run test:coverage      # 生成覆盖率报告
npm run test:watch         # 监视模式
```

**共识**: 测试覆盖核心业务逻辑，但覆盖率需要持续提升。

---

## 三、部署与运行

### 3.1 部署方式

| 属性 | 值 | 共识 |
|:---|:---|:---|
| **部署平台** | 微信云托管 | 主要部署环境 |
| **容器化** | Docker | 使用容器化部署 |
| **基础镜像** | node:18-slim | Node.js 18 LTS |
| **服务端口** | 3000 | 统一端口 |
| **进程管理** | 云托管自动 | 无需 PM2 |

### 3.2 Dockerfile 配置

- 生产环境依赖安装 (`--only=production`)
- 健康检查端点 (`/health`)
- 临时存储目录 (`/tmp/uploads`)
- 自动健康检查 (每30秒)

### 3.3 运行状态检查

**健康检查端点**:
```
GET /health
```

**共识**: 生产环境通过云托管的健康检查自动重启异常实例。

---

## 四、技术栈共识

### 4.1 后端技术栈

| 层级 | 技术 | 版本 | 用途 |
|:---|:---|:---:|:---|
| **运行时** | Node.js | 18+ | JavaScript 运行时 |
| **框架** | Express | 5.2.1 | Web 框架 |
| **数据库** | MySQL | 8.0 | 关系型数据库 |
| **ORM** | Sequelize | 6.37.8 | 数据库操作 |
| **认证** | JWT | 9.0.3 | 身份认证 |
| **验证** | Joi | 18.1.1 | 参数验证 |
| **文件存储** | COS | 2.15.4 | 腾讯云对象存储 |
| **图片处理** | Sharp | 0.34.5 | 图片压缩处理 |
| **日志** | Winston | 3.19.0 | 日志记录 |
| **安全** | Helmet | 8.1.0 | HTTP 安全头 |
| **压缩** | Compression | 1.8.1 | 响应压缩 |
| **跨域** | CORS | 2.8.6 | 跨域处理 |

### 4.2 前端技术栈

| 层级 | 技术 | 用途 |
|:---|:---|:---|
| **框架** | 微信小程序原生 | 小程序开发 |
| **样式** | WXSS | 样式表 |
| **存储** | 微信 Storage API | 本地存储 |
| **网络** | 微信 Request API | HTTP 请求 |
| **文件** | 微信 File API | 文件操作 |

### 4.3 开发工具

| 工具 | 用途 |
|:---|:---|
| ESLint | 代码规范检查 |
| Prettier | 代码格式化 |
| Nodemon | 开发热重载 |
| Jest | 测试框架 |
| Sequelize CLI | 数据库迁移 |

---

## 五、环境配置共识

### 5.1 必需环境变量

```bash
# 数据库
DB_HOST=                    # 数据库主机
DB_PORT=3306               # 数据库端口
DB_NAME=smart_garden       # 数据库名
DB_USER=                   # 数据库用户
DB_PASSWORD=               # 数据库密码

# 微信
WECHAT_APPID=              # 微信小程序 AppID
WECHAT_SECRET=             # 微信小程序 Secret
WECHAT_ENV_ID=             # 微信云托管环境ID

# COS
COS_BUCKET=                # COS 存储桶
COS_REGION=ap-shanghai     # COS 地域

# AI
AI_PROVIDER=glm            # AI 提供商 (openai/glm)
GLM_API_KEY=               # 智谱 AI API Key
OPENAI_API_KEY=            # OpenAI API Key (可选)

# 天气
WEATHER_API_KEY=           # 和风天气 API Key
```

### 5.2 可选环境变量

```bash
# 日志
LOG_LEVEL=info             # 日志级别
DB_LOGGING=false           # SQL 日志

# 安全
SSL_VERIFY=true            # SSL 验证
JWT_SECRET=                # JWT 密钥 (默认自动生成)

# 性能
NODE_ENV=production        # 运行环境
```

---

## 六、命名规范共识

### 6.1 数据库命名

| 层级 | 规范 | 示例 |
|:---|:---|:---|
| **表名** | snake_case, 复数 | `care_records`, `users` |
| **字段** | snake_case | `user_id`, `created_at` |
| **索引** | idx_表名_字段 | `idx_plants_user_id` |
| **外键** | fk_表名_字段 | `fk_plants_user_id` |

### 6.2 代码命名

| 层级 | 规范 | 示例 |
|:---|:---|:---|
| **后端文件** | PascalCase (类) / camelCase (函数) | `PlantService.js`, `cosService.js` |
| **前端文件** | kebab-case | `add-plant.js`, `api.js` |
| **API 参数** | camelCase | `userId`, `plantName` |
| **常量** | UPPER_SNAKE_CASE | `MAX_IMAGE_SIZE` |

---

## 七、日志规范共识

### 7.1 日志级别

| 级别 | 使用场景 |
|:---|:---|
| **debug** | 开发调试信息 |
| **info** | 正常业务流程 |
| **warn** | 警告，需要关注 |
| **error** | 错误，需要处理 |
| **fatal** | 严重错误，系统异常 |

### 7.2 日志存储

- **生产环境**: 数据库存储 (`system_logs`, `client_logs`)
- **开发环境**: 控制台输出
- **保留策略**: 建议 30 天归档，90 天清理

---

## 八、安全共识

### 8.1 认证方式

- **小程序端**: 微信登录 (code2Session)
- **管理端**: JWT Token
- **Token 有效期**: 24 小时

### 8.2 安全策略

- SQL 注入防护 (参数化查询)
- XSS 防护 (Helmet)
- 请求限流 (Rate Limiting)
- 路径遍历防护
- 敏感信息脱敏

---

## 九、性能共识

### 9.1 响应时间目标

| 操作类型 | 目标响应时间 |
|:---|:---|
| 普通 API | < 200ms |
| 数据库查询 | < 100ms |
| AI 分析 | < 10s |
| 图片上传 | < 5s |

### 9.2 缓存策略

- **天气数据**: 内存缓存，2小时 TTL
- **城市代码**: 内存缓存，7天 TTL
- **天文数据**: 内存缓存，24小时 TTL

**待优化**: 考虑使用 Redis 替代内存缓存。

---

## 十、相关链接

- [数据库设计概览](../database-schema-overview.md)
- [代码注释规范](../../project-insights/best-practices/code-commenting-standards.md)
- [API 设计规范](../../../04-backend/API设计规范.md)
- [部署文档](../../../07-operations/部署指南.md)

---

## 变更记录

| 日期 | 变更内容 | 作者 |
|:---|:---|:---|
| 2026-04-18 | 初始创建，汇总项目技术全景 | AI |

---

*本文档作为项目技术决策的参考基础，定期更新以反映最新状态。*
