# PlantGPT Meta Rules

> 本规则定义 AI 助手与项目交互的**元级别原则**。

---

## 一、项目概况

**类型**：微信小程序 + Node.js 后端全栈项目

**技术栈**：
- **前端**：微信小程序原生框架
- **后端**：Node.js + Express + Sequelize + MySQL
- **文件存储**：腾讯云 COS (cos-nodejs-sdk-v5)
- **图片处理**：sharp
- **测试**：Jest + Supertest
- **代码规范**：ESLint + Prettier

**目录结构**：
```
MVP/
├── frontend/                    # 微信小程序前端
│   ├── pages/                   # 小程序页面
│   ├── components/              # 小程序组件
│   ├── utils/                   # 前端工具（api.js, config.js 等）
│   ├── app.js                   # 小程序入口
│   └── app.json                 # 小程序配置
├── backend/server/src/          # Node.js 后端
│   ├── config/                  # 配置文件（数据库、AI、环境）
│   ├── controllers/             # 控制器（处理请求）
│   ├── services/                # 服务层（业务逻辑）
│   ├── models/                  # 数据模型（Sequelize）
│   ├── routes/                  # 路由定义
│   ├── middleware/              # 中间件（认证、错误处理等）
│   ├── jobs/                    # 定时任务
│   ├── utils/                   # 后端工具
│   └── app.js                   # Express 应用入口
├── backend/server/tests/        # 测试文件
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── e2e/                     # 端到端测试
├── _dev/                        # 开发工具、数据库脚本
│   ├── DataBase/                # SQL 脚本
│   └── tools/                   # 开发工具（虚拟设备等）
├── docs/                        # 文档目录（已重组）
│   ├── current/                 # 当前生效文档（优先）
│   │   ├── 01-product/          # 产品需求
│   │   ├── 02-architecture/     # 架构设计
│   │   ├── 03-frontend/         # 前端设计
│   │   ├── 04-backend/          # 后端设计
│   │   ├── 05-process/          # 业务流程
│   │   ├── 06-testing/          # 测试方案
│   │   ├── 07-operations/       # 运维文档
│   │   ├── 08-tasks/            # 任务管理
│   │   │   ├── active/          # 进行中任务
│   │   │   ├── archive/         # 已归档任务
│   │   │   └── backlog/         # 待办任务
│   │   ├── 09-references/       # 参考资料
│   │   └── 10-project/          # 项目管理
│   │       └── specs/           # 各功能规格说明书
│   └── archive/                 # 归档备份
├── 设计文档/                     # 旧文档目录（已迁移至 docs/current/）
└── .trae/                       # AI 助手配置
    ├── agents/                  # Agent 定义
    ├── documents/               # 项目文档
    └── rules/                   # 规则文件
```

---

## 二、命名规范

| 层级 | 规范 | 示例 |
|:---|:---|:---|
| 数据库字段 | snake_case | `user_id`, `created_at` |
| API 参数/响应 | camelCase | `userId`, `createdAt` |
| 前端变量 | camelCase | `plantList`, `isLoading` |
| 后端文件名 | PascalCase（类）/ camelCase（函数） | `PlantService.js`, `namingConverter.js` |
| 模型类名 | PascalCase | `Plant`, `UserConfig` |

**命名转换**：后端使用 `utils/namingConverter.js` 自动转换数据库 snake_case 与 API camelCase。

---

## 三、API 规范

**响应格式**：`{ code, message, data }`
- `code`: 0 表示成功，非 0 表示错误
- `message`: 提示信息
- `data`: 响应数据

**错误处理**：
- 后端：使用 `next(error)` 传递错误，由 `errorHandler.js` 统一处理
- 前端：Promise reject，统一处理错误码

**关联查询**：优先使用 Sequelize `include`，在 `models/associations.config.js` 中定义关联

---

## 四、文件关联链

| 修改文件 | 必须同步检查 |
|:---|:---|
| `models/*.js` | `controllers/`、`services/`、前端 API 调用 |
| `services/*.js` | `controllers/`、相关测试 |
| `controllers/*.js` | `routes/`、相关测试 |
| `routes/*.js` | `frontend/utils/api.js` |
| `frontend/utils/api.js` | 相关 `frontend/pages/` |
| `middleware/*.js` | `app.js`（注册位置）、相关路由 |
| `jobs/*.js` | `app.js`（定时任务注册） |

**文件移动后**：更新所有路径引用（包括 `.gitignore`、CI/CD、本规则文件）

---

## 五、AI 行为约束

- 修改后端 API 时，同步更新 `frontend/utils/api.js`
- 修改 model 时，检查所有使用该 model 的 service 和 controller
- 修改 service 时，检查相关 controller 和测试
- 禁止假设枚举值，必须查看模型定义确认
- 文件移动后，检查所有引用该文件的路径
- 新增 API 时，检查是否需要添加认证中间件
- **文档引用优先使用 `docs/current/` 目录**

### 日志查询规范（优先使用数据库 MCP）

**何时查询日志**：
- 用户报告问题时，直接查询数据库获取相关日志进行分析
- 调试后端/前端问题时，查看最近的日志内容
- 排查错误时，搜索特定关键词的日志
- 系统异常时，检查前后端日志记录

**日志存储**：当前生产环境使用 **数据库模式**（`LOG_STORAGE_MODE: database`）

**日志表结构**：

| 表名 | 说明 | 关键字段 |
|:---|:---|:---|
| `system_logs` | 后端系统日志 | `level`, `message`, `source`, `request_id`, `created_at`, `error_stack` |
| `client_logs` | 前端客户端日志 | `user_id`, `session_id`, `level`, `message`, `page_path`, `action`, `created_at` |

**查询方式**：使用 `mcp_MySQL_execute_sql` 直接查询数据库（**优先推荐**）

**查询示例**：

```sql
-- 查询最近 100 条后端错误日志
SELECT id, level, message, source, request_id, created_at, error_stack
FROM system_logs
WHERE level IN ('error', 'fatal')
ORDER BY created_at DESC
LIMIT 100;

-- 查询最近 100 条前端错误日志
SELECT id, user_id, session_id, level, message, page_path, action, created_at
FROM client_logs
WHERE level IN ('error', 'fatal')
ORDER BY created_at DESC
LIMIT 100;

-- 按关键词搜索后端日志
SELECT id, level, message, source, created_at
FROM system_logs
WHERE message LIKE '%关键词%'
ORDER BY created_at DESC
LIMIT 50;

-- 查询特定用户的客户端日志
SELECT id, level, message, page_path, action, created_at
FROM client_logs
WHERE user_id = '用户ID'
ORDER BY created_at DESC
LIMIT 100;

-- 按时间范围查询（最近 1 小时）
SELECT id, level, message, source, created_at
FROM system_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
ORDER BY created_at DESC
LIMIT 100;

-- 按 request_id 查询关联日志（追踪请求链路）
SELECT id, level, message, source, request_id, created_at
FROM system_logs
WHERE request_id = '请求ID'
ORDER BY created_at ASC;
```

**注意**：
- 日志级别枚举：`debug`, `info`, `warn`, `error`, `fatal`
- 数据库使用 `created_at` 字段（自动 timestamps），无需手动指定
- `system_logs.metadata` 和 `client_logs.metadata` / `device_info` 为 JSON 字段，存储额外信息

---

## 六、输出偏好

- **画图**：优先使用 Mermaid 语法，而非 ASCII 艺术
- **代码风格**：2 空格缩进，单引号，无分号
- **注释**：使用中文
- **文档引用**：优先引用 `docs/current/` 目录下的文档

---

## 七、信息优先级

1. 代码本身（最可信）
2. `docs/current/` 目录下的文档
3. `设计文档/` 目录下的文档（已迁移，仅供参考）
4. 本规则文件（仅元原则）

**原则**：代码与文档冲突时，以代码为准。

---

## 八、业务领域知识

**核心功能**：植物识别、养护建议、环境监测、AI 诊断

**用户角色**：
- `user` - 普通用户
- `expert` - 专家（可回复咨询）
- `admin` - 管理员

**关键实体**：
- **User** - 用户
- **Plant** - 植物档案
- **Session** - 会话（咨询/植物）
- **Message** - 消息
- **DiagnosisCard** - 诊断卡
- **Device** - 设备
- **EnvironmentReading** - 环境读数（聚合表）
- **EnvironmentReadingValue** - 环境读数具体值
- **EnvironmentMetric** - 环境指标定义
- **CareRecord** - 养护记录
- **UserConfig** - 用户配置
- **ReadingTask** - 读数任务

**植物分类**：`succulent`（多肉）、`flower`（花卉）、`foliage`（绿植）、`vegetable`（蔬菜）、`other`（其他）

**环境数据来源**：
- `sensor` - 设备传感器
- `weather_api` - 天气 API
- `compensation` - 补偿数据

---

## 九、常见陷阱

| 问题 | 解决方案 |
|:---|:---|
| 微信小程序 API 回调地狱 | 使用 Promise 封装 |
| Sequelize 关联查询遗漏 | 必须测试关联数据，检查 `associations.config.js` |
| 环境数据来源混淆 | 通过 `data_source` 字段区分 sensor/weather_api/compensation |
| 补偿数据误判 | 检查 `is_stale` 字段 |
| 外键级联删除意外 | 删除前检查关联数据 |
| 命名转换遗漏 | 确保使用 `namingConverter.js` 处理所有数据转换 |
| Service 层循环依赖 | 通过 `services/index.js` 统一导出，避免直接引用 |
| 环境变量缺失 | 检查 `config/environment.js` 中所有必需变量 |
| COS 临时 URL 过期 | 检查过期时间，必要时刷新 |
| sharp 图片处理内存泄漏 | 及时销毁 sharp 实例 |

---

## 十、可用 Agent

| Agent | 用途 | 触发时机 |
|:---|:---|:---|
| [code-reviewer](../agents/code-reviewer.md) | 代码审查 | 完成功能开发后 |
| [test-generator](../agents/test-generator.md) | 生成测试 | 新增/修改 API |
| [api-sync-checker](../agents/api-sync-checker.md) | API 同步检查 | 修改路由/Controller |
| [db-migration](../agents/db-migration.md) | 数据库迁移 | 修改 Model |

**使用方式**：告诉 AI "请使用 xxx agent 检查"

---

## 十一、测试规范

**测试目录**：`backend/server/tests/`
- `unit/` - 单元测试（utils, services, middleware）
- `integration/` - 集成测试（API 端点）
- `e2e/` - 端到端测试（用户流程）

**运行测试**：
```bash
cd backend/server
npm test              # 运行所有测试
npm run test:unit     # 仅运行单元测试
npm run test:integration  # 仅运行集成测试
npm run test:e2e      # 仅运行端到端测试
npm run test:coverage # 生成覆盖率报告
```

**新增测试时机**：
- 新增 Service 方法 → 添加 unit/services/ 测试
- 新增 API 端点 → 添加 integration/api/ 测试
- 修改核心业务逻辑 → 更新相关测试

---

## 十二、数据库操作规范

**迁移文件**：使用 Sequelize CLI 生成
```bash
cd backend/server
npx sequelize-cli migration:generate --name xxx
```

**模型关联**：在 `models/associations.config.js` 中集中定义

**字段命名**：数据库使用 snake_case，通过 `namingConverter.js` 自动转换

**重要字段**：
- `created_at` / `updated_at` - 时间戳
- `deleted_at` - 软删除（如启用 paranoid）
- `data_source` - 环境数据来源标记
- `is_stale` - 数据是否过期/补偿

---

## 十三、文档管理规范

**文档目录已重组为 `docs/current/`**，采用编号分类：

| 编号 | 目录 | 用途 |
|:---|:---|:---|
| 01 | `01-product/` | 产品需求、规格说明 |
| 02 | `02-architecture/` | 系统架构、数据库设计、API 设计 |
| 03 | `03-frontend/` | 前端页面设计、组件规范 |
| 04 | `04-backend/` | 后端设计、接口规范 |
| 05 | `05-process/` | 业务流程文档 |
| 06 | `06-testing/` | 测试方案、测试计划 |
| 07 | `07-operations/` | 运维、部署文档 |
| 08 | `08-tasks/` | 任务管理（active/archive/backlog） |
| 09 | `09-references/` | 参考资料、设计文档 |
| 10 | `10-project/` | 项目管理、规格说明书 |

**规格说明书位置**：`docs/current/10-project/specs/{feature-name}/`
- 每个功能规格包含：`spec.md`、`tasks.md`、`checklist.md`

**旧文档**：`设计文档/` 和 `docs_new/` 已迁移至 `docs/current/`，不再维护
