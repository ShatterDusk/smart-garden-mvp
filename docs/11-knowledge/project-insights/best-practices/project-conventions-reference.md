---
id: "KNOW-2026-04-18-003"
type: "best-practice"
category: "project-insights/best-practices"
tags: ["conventions", "reference", "api", "gitignore", "sequelize", "standards", "quick-reference"]
created: "2026-04-18"
updated: "2026-04-18"
author: "AI"
status: "active"
---

# 项目规范速查手册

> 本文档汇总项目的各种规范、配置和约定，作为快速参考手册。

---

## 一、Git 忽略规范 (.gitignore)

### 1.1 根目录 .gitignore

**位置**: `/.gitignore`

**主要忽略内容**:
```
# IDE
.vscode/          # VS Code 配置（保留 settings.json 和 extensions.json）
.idea/            # JetBrains IDE
*.swp             # Vim 备份

# 系统文件
.DS_Store         # macOS
Thumbs.db         # Windows

# 微信小程序
project.private.config.json    # 私有配置（含敏感信息）
miniprogram_npm/               # 构建产物

# Node.js
node_modules/     # 依赖
*.log             # 日志
coverage/         # 测试覆盖率

# Python 工具
.venv/            # 虚拟环境
__pycache__/      # 缓存

# 环境变量（重要！）
.env              # 所有环境文件
.env.*
!*.example        # 除了示例文件

# 上传文件
uploads/          # 用户上传
temp/             # 临时文件

# 数据库
*.sqlite          # SQLite 文件
```

**共识**:
- `.env` 文件永远不要提交！
- 保留 `.env.example` 作为模板
- IDE 配置部分保留（settings.json）以便团队共享

### 1.2 后端 .gitignore

**位置**: `/backend/server/.gitignore`

**额外忽略**:
```
# 环境变量
.env
.env.local
.env.*.local
.env.development
.env.test
.env.production
!.env.example      # 保留示例

# 上传文件
uploads/          # 用户上传目录

# 测试覆盖率
coverage/
.nyc_output/
```

---

## 二、Sequelize CLI 配置

### 2.1 配置文件位置

**文件**: `/backend/server/.sequelizerc`

```javascript
const path = require('path');

module.exports = {
  config: path.resolve('src', 'config', 'sequelize-cli.js'),
  'models-path': path.resolve('src', 'models'),
  'seeders-path': path.resolve('src', 'seeders'),
  'migrations-path': path.resolve('src', 'migrations'),
};
```

### 2.2 目录结构

```
backend/server/src/
├── models/           # 模型定义
├── migrations/       # 迁移文件（数据库结构变更）
└── seeders/          # 种子数据（初始数据）
```

### 2.3 常用命令

```bash
cd backend/server

# 生成迁移文件
npx sequelize-cli migration:generate --name add-user-table

# 运行迁移
npx sequelize-cli db:migrate

# 撤销最近一次迁移
npx sequelize-cli db:migrate:undo

# 撤销所有迁移
npx sequelize-cli db:migrate:undo:all

# 生成种子文件
npx sequelize-cli seed:generate --name demo-users

# 运行种子
npx sequelize-cli db:seed:all

# 撤销种子
npx sequelize-cli db:seed:undo:all
```

### 2.4 迁移文件模板

```javascript
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      user_id: {
        type: Sequelize.STRING(32),
        primaryKey: true,
      },
      nickname: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};
```

**共识**:
- 所有数据库结构变更必须通过迁移文件
- 迁移文件命名：`YYYYMMDDHHMMSS-action-description.js`
- 不要修改已运行的迁移文件，创建新的迁移来修正

---

## 三、API 响应规范

### 3.1 统一响应格式

**文件**: `/backend/server/src/utils/response.js`

**成功响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

**错误响应**:
```json
{
  "code": 500,
  "message": "错误描述",
  "data": null
}
```

**分页响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "list": [ ... ]
  }
}
```

### 3.2 HTTP 状态码使用

| 状态码 | 使用场景 |
|:---|:---|
| **200** | GET 请求成功 |
| **201** | POST 创建成功 |
| **204** | DELETE 删除成功（无返回内容） |
| **400** | 请求参数错误 |
| **401** | 未认证/Token 无效 |
| **403** | 无权限访问 |
| **404** | 资源不存在 |
| **500** | 服务器内部错误 |

### 3.3 业务错误码 (code)

| code | 含义 |
|:---|:---|
| **0** | 成功 |
| **400** | 参数错误 |
| **401** | 认证失败 |
| **403** | 权限不足 |
| **404** | 资源不存在 |
| **500** | 服务器错误 |

**注意**: 目前项目使用 HTTP 状态码作为业务 code，未来可扩展自定义错误码。

### 3.4 使用示例

```javascript
const { success, error, paginated } = require('../utils/response');

// 成功响应
return success(res, user);

// 带消息的成功响应
return success(res, user, '用户创建成功');

// 错误响应
return error(res, '用户不存在', 404);

// 分页响应
return paginated(res, userList, total, page, pageSize);
```

---

## 四、项目目录结构共识

### 4.1 根目录结构

```
MVP/
├── .github/              # GitHub 配置
│   ├── workflows/        # CI/CD
│   └── CODEOWNERS        # 代码审查规则
├── .trae/                # AI 助手配置
│   ├── agents/           # Agent 定义
│   └── rules/            # 规则文件
├── _dev/                 # 开发工具
│   ├── DataBase/         # SQL 脚本
│   └── tools/            # 开发工具
├── backend/              # 后端代码
│   └── server/           # Node.js 服务
├── docs/                 # 文档
│   ├── current/          # 当前文档
│   └── archive/          # 归档文档
├── frontend/             # 微信小程序前端
└── README.md             # 项目说明
```

### 4.2 后端目录结构

```
backend/server/
├── src/
│   ├── config/           # 配置文件
│   ├── controllers/      # 控制器
│   ├── models/           # 数据模型
│   ├── routes/           # 路由
│   ├── services/         # 业务逻辑
│   ├── middleware/       # 中间件
│   ├── utils/            # 工具函数
│   ├── jobs/             # 定时任务
│   └── app.js            # 应用入口
├── tests/                # 测试
├── .env.example          # 环境变量示例
├── .gitignore            # Git 忽略
├── .sequelizerc          # Sequelize 配置
├── Dockerfile            # Docker 配置
├── jest.config.js        # Jest 配置
├── package.json          # 依赖
└── server.js             # 服务入口
```

### 4.3 文档目录结构

```
docs/current/
├── 01-product/           # 产品需求
├── 02-architecture/      # 架构设计
├── 03-frontend/          # 前端设计
├── 04-backend/           # 后端设计
├── 05-process/           # 业务流程
├── 06-testing/           # 测试方案
├── 07-operations/        # 运维文档
├── 08-tasks/             # 任务管理
├── 09-references/        # 参考资料
├── 10-project/           # 项目管理
├── 11-knowledge/         # 知识库 ⭐
└── 12-workgroups/        # 工作组
```

---

## 五、代码风格规范

### 5.1 ESLint 配置

**文件**: `/backend/server/.eslintrc.js`

**主要规则**:
- 使用单引号
- 2 空格缩进
- 无分号
- 未使用变量警告

### 5.2 Prettier 配置

**文件**: `/backend/server/.prettierrc`

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### 5.3 代码检查命令

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format

# 检查格式
npm run format:check
```

---

## 六、文件命名规范速查

| 类型 | 规范 | 示例 |
|:---|:---|:---|
| **后端控制器** | PascalCase + Controller | `UserController.js` |
| **后端服务** | PascalCase + Service | `UserService.js` |
| **后端模型** | PascalCase | `User.js` |
| **后端工具** | camelCase | `response.js`, `logger.js` |
| **后端中间件** | camelCase | `auth.js`, `errorHandler.js` |
| **前端页面** | kebab-case | `add-plant.js` |
| **前端组件** | kebab-case | `plant-card.js` |
| **前端工具** | camelCase | `api.js`, `config.js` |
| **测试文件** | PascalCase + .test.js | `UserService.test.js` |
| **迁移文件** | 时间戳 + snake_case | `20260418120000_add_user_table.js` |
| **文档文件** | kebab-case + .md | `api-design.md` |

---

## 七、环境变量优先级

**加载顺序**（后面的覆盖前面的）:
1. `.env` - 默认环境
2. `.env.local` - 本地覆盖
3. `.env.[mode]` - 模式特定（development/production/test）
4. `.env.[mode].local` - 模式本地覆盖

**共识**:
- 开发使用 `.env`
- 本地特殊配置使用 `.env.local`（不提交）
- 生产环境变量由部署平台设置

---

## 八、相关链接

- [新人入职指南](./newcomer-onboarding-guide.md)
- [项目技术全景](../domain-knowledge/technical/project-technical-landscape.md)
- [代码注释规范](./code-commenting-standards.md)
- [文档管理规范](./documentation-management.md)

---

## 变更记录

| 日期 | 变更内容 | 作者 |
|:---|:---|:---|
| 2026-04-18 | 初始创建，汇总项目规范速查 | AI |

---

*本文档作为快速参考，详细内容请查看相关专题文档。*
