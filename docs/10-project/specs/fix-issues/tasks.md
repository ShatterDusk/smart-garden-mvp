# Tasks

## Phase 1: 核心功能完善 (P0)

- [x] Task 1: 实现异步 AI 分析功能
  - [x] SubTask 1.1: 分析现有 AI 服务接口 (aiService.js)
  - [x] SubTask 1.2: 设计异步 AI 回复机制
  - [x] SubTask 1.3: 在 sendMessage 中集成 AI 调用
  - [x] SubTask 1.4: 添加 AI 回复消息的存储逻辑
  - [x] SubTask 1.5: 编写单元测试验证功能

## Phase 2: 硬编码数据清理 (P1)

- [x] Task 2: 清理 aiService.js 硬编码
  - [x] SubTask 2.1: 分析硬编码内容 → 实为 AI 提示词示例，无需修改
  - [x] SubTask 2.2: 确认是否需要迁移 → 保持现状，示例数据是必要的
  - [x] SubTask 2.3: 更新文档说明

- [x] Task 3: 清理前端硬编码
  - [x] SubTask 3.1: 分析硬编码内容 → 实为回退机制，合理设计
  - [x] SubTask 3.2: 确认是否需要迁移 → 保持现状
  - [x] SubTask 3.3: 更新文档说明

## Phase 3: 命名规范统一 (P2)

- [x] Task 4: 控制器层命名规范统一
  - [x] SubTask 4.1: 审查所有控制器中的字段命名 → snake_case/camelCase 混用是合理设计
  - [x] SubTask 4.2: 确认转换机制 → 控制器已手动转换响应为 camelCase
  - [x] SubTask 4.3: 更新文档说明命名规范

## Phase 4: 日志规范统一 (P3)

- [x] Task 5: 替换 console.log
  - [x] SubTask 5.1: plantController.js 已替换 (5处)
  - [x] SubTask 5.2: deviceController.js 已替换 (5处)
  - [x] SubTask 5.3: environmentController.js 已替换 (2处)
  - [x] SubTask 5.4: diagnosisController.js 已替换 (2处)
  - [x] SubTask 5.5: careRecordController.js 已替换 (4处)

## Phase 5: 测试完善

- [x] Task 6: 补充集成测试
  - [x] SubTask 6.1: 配置独立测试数据库 (.env.test)
  - [x] SubTask 6.2: 更新 jest.config.js 分离测试项目
  - [x] SubTask 6.3: 添加测试数据清理钩子 (globalSetup/globalTeardown)
  - [x] SubTask 6.4: 验证所有测试通过 (63 个单元测试通过)

# Task Dependencies

- [Task 1] 核心功能，无依赖
- [Task 2] 无依赖
- [Task 3] 无依赖
- [Task 4] 建议在 Task 1 完成后执行
- [Task 5] 无依赖
- [Task 6] 依赖 [Task 1-5] 完成

# Parallelizable Tasks

以下任务可以并行执行：
- Task 2, Task 3, Task 5 (硬编码清理、命名规范、日志规范)
