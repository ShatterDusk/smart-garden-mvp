# 自动化测试方案 Spec

## Why
当前项目缺少自动化测试，仅有手动 API 测试脚本。为了确保代码质量、减少回归问题、支持持续集成，需要建立完整的自动化测试体系。

## What Changes
- 搭建 Jest 测试框架基础设施
- 创建测试数据库隔离机制
- 实现单元测试覆盖核心工具函数和中间件
- 实现集成测试覆盖所有 API 端点
- 实现业务流程测试覆盖关键用户旅程
- 配置测试覆盖率报告
- 集成 CI/CD 测试流水线

## Impact
- Affected specs: 后端所有模块
- Affected code: 
  - `server/package.json` - 添加测试依赖和脚本
  - `server/jest.config.js` - 新建测试配置
  - `server/tests/` - 新建测试目录和测试文件

## ADDED Requirements

### Requirement: 测试框架基础设施
系统 SHALL 提供 Jest 测试框架配置，支持单元测试、集成测试和 E2E 测试。

#### Scenario: 测试环境初始化
- **WHEN** 运行 `npm test`
- **THEN** Jest 自动加载配置并执行所有测试文件

#### Scenario: 测试数据库隔离
- **WHEN** 执行集成测试
- **THEN** 使用独立的测试数据库，不影响开发数据库

### Requirement: 单元测试覆盖
系统 SHALL 为核心模块提供单元测试，覆盖率目标 60%+。

#### Scenario: 中间件测试
- **WHEN** 测试认证中间件
- **THEN** 验证 Token 有效、过期、无效、缺失四种场景

#### Scenario: 工具函数测试
- **WHEN** 测试 camelCase 转换函数
- **THEN** 验证 snake_case 到 camelCase 的正确转换

### Requirement: API 集成测试
系统 SHALL 为所有 API 端点提供集成测试。

#### Scenario: 用户模块 API 测试
- **WHEN** 测试用户相关 API
- **THEN** 验证登录、获取信息、更新信息等 8 个场景

#### Scenario: 植物模块 API 测试
- **WHEN** 测试植物相关 API
- **THEN** 验证 CRUD 操作、权限校验等 10 个场景

#### Scenario: 会话模块 API 测试
- **WHEN** 测试会话相关 API
- **THEN** 验证会话创建、消息发送、上下文开关等 12 个场景

### Requirement: 业务流程测试
系统 SHALL 为关键业务流程提供端到端测试。

#### Scenario: 新用户完整旅程
- **WHEN** 新用户首次使用
- **THEN** 验证登录 → 创建植物 → 发起会话 → AI 诊断完整流程

#### Scenario: 会话升级流程
- **WHEN** 咨询会话升级为植物会话
- **THEN** 验证消息历史保留、植物关联正确

### Requirement: 测试覆盖率报告
系统 SHALL 生成测试覆盖率报告。

#### Scenario: 覆盖率报告生成
- **WHEN** 运行 `npm run test:coverage`
- **THEN** 生成 HTML 和 LCOV 格式的覆盖率报告

#### Scenario: 覆盖率阈值检查
- **WHEN** 测试覆盖率低于 50%
- **THEN** 测试命令返回非零退出码

### Requirement: CI 集成
系统 SHALL 在 CI 流水线中自动运行测试。

#### Scenario: PR 测试检查
- **WHEN** 创建 Pull Request
- **THEN** 自动运行测试并报告结果

#### Scenario: 主分支保护
- **WHEN** 测试未通过
- **THEN** 阻止合并到主分支

## 测试分层策略

```
┌─────────────────────────────────────────┐
│           E2E 测试 (10%)                 │
│  用户完整旅程、会话升级流程               │
├─────────────────────────────────────────┤
│         集成测试 (30%)                    │
│  各模块 API 测试、数据一致性验证          │
├─────────────────────────────────────────┤
│          单元测试 (60%)                   │
│  工具函数、中间件、服务层逻辑             │
└─────────────────────────────────────────┘
```

## 测试目录结构

```
server/
├── tests/
│   ├── setup/                  # 测试配置
│   │   ├── jest.setup.js       # Jest 全局配置
│   │   ├── db.setup.js         # 测试数据库初始化
│   │   └── test-data.js        # 测试数据工厂
│   │
│   ├── unit/                   # 单元测试
│   │   ├── middleware/         # 中间件测试
│   │   │   ├── auth.test.js
│   │   │   ├── response.test.js
│   │   │   └── camelCase.test.js
│   │   └── utils/              # 工具函数测试
│   │       └── validators.test.js
│   │
│   ├── integration/            # 集成测试
│   │   └── api/                # API 端点测试
│   │       ├── users.test.js
│   │       ├── plants.test.js
│   │       ├── sessions.test.js
│   │       ├── devices.test.js
│   │       └── ai.test.js
│   │
│   └── e2e/                    # 端到端测试
│       └── user-journey.test.js
│
├── jest.config.js              # Jest 配置
└── package.json                # 测试依赖和脚本
```

## 覆盖率目标

| 阶段 | 目标覆盖率 |
|:---|:---:|
| 初期 | 50% |
| 稳定期 | 70% |
| 理想 | 80%+ |
