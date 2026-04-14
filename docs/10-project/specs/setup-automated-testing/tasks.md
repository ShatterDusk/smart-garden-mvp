# Tasks

## Phase 1: 基础设施搭建

- [x] Task 1: 安装测试依赖并配置 Jest
  - [x] SubTask 1.1: 安装 jest, supertest 依赖
  - [x] SubTask 1.2: 创建 jest.config.js 配置文件
  - [x] SubTask 1.3: 更新 package.json 添加测试脚本

- [x] Task 2: 创建测试基础设施
  - [x] SubTask 2.1: 创建 tests 目录结构
  - [x] SubTask 2.2: 创建 tests/setup/jest.setup.js 全局配置
  - [x] SubTask 2.3: 创建 tests/setup/test-data.js 测试数据工厂

## Phase 2: 单元测试

- [x] Task 3: 编写中间件单元测试
  - [x] SubTask 3.1: 创建 tests/unit/middleware/auth.test.js
  - [x] SubTask 3.2: 创建 tests/unit/middleware/response.test.js
  - [x] SubTask 3.3: 创建 tests/unit/middleware/camelCase.test.js

- [x] Task 4: 编写工具函数单元测试
  - [x] SubTask 4.1: 创建 tests/unit/utils/validators.test.js

## Phase 3: 集成测试

- [x] Task 5: 编写用户模块集成测试
  - [x] SubTask 5.1: 创建 tests/integration/api/users.test.js
  - [x] SubTask 5.2: 测试游客登录、获取用户信息、更新用户信息

- [x] Task 6: 编写植物模块集成测试
  - [x] SubTask 6.1: 创建 tests/integration/api/plants.test.js
  - [x] SubTask 6.2: 测试植物 CRUD 操作和权限校验

- [x] Task 7: 编写会话模块集成测试
  - [x] SubTask 7.1: 创建 tests/integration/api/sessions.test.js
  - [x] SubTask 7.2: 测试会话创建、消息发送、消息列表

- [x] Task 8: 编写设备模块集成测试
  - [x] SubTask 8.1: 创建 tests/integration/api/devices.test.js
  - [x] SubTask 8.2: 测试设备绑定、解绑、列表查询

## Phase 4: 业务流程测试

- [x] Task 9: 编写端到端业务流程测试
  - [x] SubTask 9.1: 创建 tests/e2e/user-journey.test.js
  - [x] SubTask 9.2: 测试新用户完整旅程：登录 → 创建植物 → 会话 → AI 诊断

## Phase 5: CI 集成

- [x] Task 10: 配置 GitHub Actions CI
  - [x] SubTask 10.1: 创建 .github/workflows/test.yml
  - [x] SubTask 10.2: 配置测试自动运行和覆盖率报告

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 2]
- [Task 5] depends on [Task 2]
- [Task 6] depends on [Task 2]
- [Task 7] depends on [Task 2]
- [Task 8] depends on [Task 2]
- [Task 9] depends on [Task 5, Task 6, Task 7]
- [Task 10] depends on [Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9]

# Parallelizable Tasks

以下任务可以并行执行：
- Task 3, Task 4 (单元测试)
- Task 5, Task 6, Task 7, Task 8 (集成测试各模块)
