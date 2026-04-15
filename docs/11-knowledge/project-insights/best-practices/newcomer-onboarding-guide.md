---
id: "KNOW-2026-04-18-002"
type: "best-practice"
category: "project-insights/best-practices"
tags: ["onboarding", "newcomer", "guide", "project-structure", "consensus", "getting-started"]
created: "2026-04-18"
updated: "2026-04-18"
author: "AI"
status: "active"
---

# 新人入职指南 - 项目常识与关键文件

> 本文档汇总新人需要了解的 project 常识、关键文件位置和项目规范，帮助快速上手。

---

## 一、项目概览

### 1.1 项目基本信息

| 属性 | 值 |
|:---|:---|
| **项目名称** | PlantGPT 智能园艺助手 |
| **项目类型** | 微信小程序 + Node.js 后端 |
| **代码仓库** | GitHub (通过 GitHub Actions CI/CD) |
| **部署平台** | 微信云托管 |
| **数据库** | MySQL 8.0 (腾讯云 CynosDB) |

### 1.2 技术栈速览

**后端**:
- Node.js 18 + Express 5.2
- Sequelize ORM + MySQL 8.0
- JWT 认证 + Joi 验证
- Winston 日志 + Helmet 安全

**前端**:
- 微信小程序原生框架
- WXSS 样式
- 微信原生 API

**基础设施**:
- Docker 容器化
- GitHub Actions CI/CD
- 腾讯云 COS 文件存储
- 微信云托管部署

---

## 二、关键文件位置

### 2.1 项目入口文件

| 文件 | 路径 | 说明 |
|:---|:---|:---|
| **项目根 README** | `/README.md` | 项目总览，快速开始 |
| **后端入口** | `/backend/server/server.js` | Node.js 服务启动入口 |
| **后端主应用** | `/backend/server/src/app.js` | Express 应用配置 |
| **前端入口** | `/frontend/app.js` | 小程序应用入口 |
| **前端配置** | `/frontend/app.json` | 小程序页面配置 |

### 2.2 配置文件

| 文件 | 路径 | 说明 |
|:---|:---|:---|
| **环境变量示例** | `/backend/server/.env.example` | 所有环境变量说明 |
| **后端 package** | `/backend/server/package.json` | 依赖和脚本 |
| **数据库配置** | `/backend/server/src/config/database.js` | Sequelize 配置 |
| **AI 配置** | `/backend/server/src/config/ai.js` | AI 提供商配置 |
| **环境配置** | `/backend/server/src/config/environment.js` | 环境变量加载 |

### 2.3 CI/CD 配置

| 文件 | 路径 | 说明 |
|:---|:---|:---|
| **CI/CD 工作流** | `/.github/workflows/ci.yml` | GitHub Actions 配置 |
| **代码审查规则** | `/.github/CODEOWNERS` | 代码审查责任人 |
| **Dockerfile** | `/backend/server/Dockerfile` | 容器构建配置 |

**CI/CD 流程**:
```
代码提交 → Lint检查 → 单元测试 → 集成测试 → 构建检查 → 测试总结
```

### 2.4 测试文件

| 目录 | 路径 | 说明 |
|:---|:---|:---|
| **单元测试** | `/backend/server/tests/unit/` | 控制器、服务、中间件测试 |
| **集成测试** | `/backend/server/tests/integration/` | API 集成测试 |
| **E2E 测试** | `/backend/server/tests/e2e/` | 端到端测试 |
| **测试配置** | `/backend/server/jest.config.js` | Jest 配置 |

**测试命令**:
```bash
cd backend/server
npm test                    # 运行所有测试
npm run test:unit          # 仅单元测试
npm run test:integration   # 仅集成测试
npm run test:coverage      # 覆盖率报告
```

### 2.5 文档目录

| 目录 | 路径 | 说明 |
|:---|:---|:---|
| **产品需求** | `/docs/current/01-product/` | PRD 文档 |
| **架构设计** | `/docs/current/02-architecture/` | 系统架构 |
| **前端设计** | `/docs/current/03-frontend/` | 前端规范 |
| **后端设计** | `/docs/current/04-backend/` | 后端规范 |
| **业务流程** | `/docs/current/05-process/` | 流程文档 |
| **测试文档** | `/docs/current/06-testing/` | 测试方案 |
| **运维文档** | `/docs/current/07-operations/` | 部署运维 |
| **任务管理** | `/docs/current/08-tasks/` | 任务跟踪 |
| **知识库** | `/docs/current/11-knowledge/` | 项目知识 |
| **工作组** | `/docs/current/12-workgroups/` | 组织架构 |

### 2.6 开发工具

| 文件/目录 | 路径 | 说明 |
|:---|:---|:---|
| **数据库脚本** | `/_dev/DataBase/` | SQL 脚本和迁移 |
| **开发工具** | `/_dev/tools/` | 扫描工具、虚拟设备等 |
| **ESLint 配置** | `/backend/server/.eslintrc.js` | 代码规范 |
| **Prettier 配置** | `/backend/server/.prettierrc` | 格式化配置 |

---

## 三、后端目录结构共识

```
backend/server/src/
├── config/              # 配置文件
│   ├── ai.js           # AI 配置
│   ├── database.js     # 数据库配置
│   ├── environment.js  # 环境变量
│   └── sequelize-cli.js # CLI 配置
├── controllers/         # 控制器 (处理 HTTP 请求)
├── models/              # 数据模型 (Sequelize)
│   ├── associations.config.js  # 模型关联定义
│   └── index.js        # 模型导出
├── routes/              # 路由定义
├── services/            # 业务逻辑层
├── middleware/          # 中间件
├── utils/               # 工具函数
├── jobs/                # 定时任务
└── app.js              # Express 应用入口
```

**共识**:
- 控制器只处理 HTTP 请求，业务逻辑在 services
- 模型定义在 models/，关联在 associations.config.js
- 工具函数放在 utils/，保持纯函数
- 中间件统一在 middleware/，按功能分类

---

## 四、命名规范共识

### 4.1 数据库命名

| 类型 | 规范 | 示例 |
|:---|:---|:---|
| **表名** | snake_case, 复数 | `care_records`, `users` |
| **字段** | snake_case | `user_id`, `created_at` |
| **索引** | idx_表名_字段 | `idx_plants_user_id` |
| **外键** | fk_表名_字段 | `fk_plants_user_id` |

### 4.2 后端代码命名

| 类型 | 规范 | 示例 |
|:---|:---|:---|
| **类名** | PascalCase | `PlantService`, `UserController` |
| **文件名** | PascalCase (类) / camelCase (函数) | `PlantService.js`, `cosService.js` |
| **变量/函数** | camelCase | `getUserById`, `plantList` |
| **常量** | UPPER_SNAKE_CASE | `MAX_IMAGE_SIZE`, `CACHE_TTL` |
| **API 参数** | camelCase | `userId`, `plantName` |

### 4.3 前端代码命名

| 类型 | 规范 | 示例 |
|:---|:---|:---|
| **文件名** | kebab-case | `add-plant.js`, `api.js` |
| **页面目录** | kebab-case | `pages/add-plant/` |
| **组件** | kebab-case | `components/plant-card/` |
| **变量/函数** | camelCase | `plantList`, `getPlantDetail` |

---

## 五、开发流程共识

### 5.1 代码提交规范

**分支策略**:
- `main` / `master` - 生产环境
- `develop` - 开发环境
- `feature/*` - 功能分支
- `fix/*` - 修复分支

**提交信息规范**:
```
类型: 简短描述

详细描述（可选）

Fixes #123
```

**类型**:
- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档
- `style:` 格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建

### 5.2 代码审查规则

**CODEOWNERS 配置**:
- 所有文件默认需要 `@ShatterDusk` 审查
- 核心业务逻辑（services, controllers, models）必须审查
- 配置文件变更必须审查
- 环境变量文件变更必须审查

**审查清单**:
- [ ] 代码符合命名规范
- [ ] 有适当的注释和 JSDoc
- [ ] 错误处理完善
- [ ] 测试覆盖新增代码
- [ ] 无敏感信息泄露

### 5.3 CI/CD 流程

**自动化检查**:
1. **Lint 检查** - ESLint + Prettier
2. **单元测试** - Jest 单元测试 + 覆盖率
3. **集成测试** - 带 MySQL 服务的集成测试
4. **构建检查** - 应用能否正常加载

**通过标准**:
- 所有检查通过才能合并
- 覆盖率不降低（建议保持 70%+）

---

## 六、环境配置共识

### 6.1 必需环境变量

```bash
# 数据库 (必需)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=smart_garden
DB_USER=root
DB_PASSWORD=your_password

# 微信 (必需)
WECHAT_APPID=your_appid
WECHAT_SECRET=your_secret
WECHAT_ENV_ID=your_env_id

# COS (必需)
COS_BUCKET=your_bucket
COS_SECRET_ID=your_secret_id
COS_SECRET_KEY=your_secret_key

# AI (至少一个)
GLM_API_KEY=your_glm_key
# 或
OPENAI_API_KEY=your_openai_key

# JWT (生产环境必需)
JWT_SECRET=your-strong-secret-min-32-characters
```

### 6.2 环境文件

| 文件 | 用途 |
|:---|:---|
| `.env` | 本地开发环境（不提交 Git） |
| `.env.example` | 环境变量示例模板 |
| `.env.test` | 测试环境配置 |

**共识**: `.env` 文件永远不要提交到版本控制！

---

## 七、调试与日志共识

### 7.1 日志级别使用

| 级别 | 使用场景 | 示例 |
|:---|:---|:---|
| **debug** | 开发调试信息 | 变量值、执行流程 |
| **info** | 正常业务流程 | 请求处理完成、操作成功 |
| **warn** | 警告，需要关注 | 参数缺失、降级处理 |
| **error** | 错误，需要处理 | 异常、失败操作 |
| **fatal** | 严重错误 | 系统异常、无法恢复 |

### 7.2 日志存储

- **生产环境**: 数据库存储 (`system_logs`, `client_logs`)
- **开发环境**: 控制台输出
- **查询方式**: MCP MySQL 工具或日志查询接口

### 7.3 调试技巧

```bash
# 启用 SQL 日志
DB_LOGGING=true npm run dev

# 查看日志表
SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 10;

# 按级别筛选
SELECT * FROM system_logs WHERE level = 'error';
```

---

## 八、常用命令速查

### 8.1 后端开发

```bash
cd backend/server

# 安装依赖
npm install

# 开发模式
npm run dev

# 运行测试
npm test
npm run test:unit
npm run test:integration

# 代码检查
npm run lint
npm run lint:fix
npm run format

# 生产启动
npm start
```

### 8.2 数据库操作

```bash
cd backend/server

# 运行迁移
npx sequelize-cli db:migrate

# 撤销迁移
npx sequelize-cli db:migrate:undo

# 生成迁移文件
npx sequelize-cli migration:generate --name xxx
```

### 8.3 扫描工具

```bash
# 扫描 TODO/FIXME
node _dev/tools/scan-todos.js

# 检查孤儿数据
mysql -u root -p < _dev/DataBase/check_orphan_data.sql
```

---

## 九、相关链接

- [项目技术全景](../domain-knowledge/technical/project-technical-landscape.md)
- [代码注释规范](./code-commenting-standards.md)
- [文档管理规范](./documentation-management.md)
- [工作区模式](./workspace-pattern.md)
- [三线并行工作流](./three-line-workflow.md)

---

## 十、变更记录

| 日期 | 变更内容 | 作者 |
|:---|:---|:---|
| 2026-04-18 | 初始创建，汇总新人需要了解的所有常识 | AI |

---

*本文档是新人入职的第一站，建议先通读一遍，再深入具体模块。*
