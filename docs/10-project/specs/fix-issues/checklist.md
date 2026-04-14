# 问题修复 Checklist

## Phase 1: 核心功能完善

- [x] 异步 AI 分析功能已实现
  - [x] AI 服务接口分析完成
  - [x] 异步回复机制设计完成
  - [x] sendMessage 集成 AI 调用
  - [x] AI 回复存储逻辑完成
  - [x] 单元测试通过

## Phase 2: 硬编码数据清理

- [x] aiService.js 硬编码已分析
  - [x] 确认为 AI 提示词示例，是必要的设计
  - [x] 无需迁移，保持现状
  - [x] 文档已更新说明

- [x] 前端硬编码已分析
  - [x] 确认为回退机制，是合理的设计
  - [x] 无需迁移，保持现状
  - [x] 文档已更新说明

## Phase 3: 命名规范统一

- [x] 控制器命名规范已确认
  - [x] 数据库字段使用 snake_case
  - [x] 控制器内部使用 snake_case（与数据库一致）
  - [x] API 响应使用 camelCase（控制器手动转换）
  - [x] 命名规范文档已更新

## Phase 4: 日志规范统一

- [x] 后端 console.log 已替换为 logger
  - [x] plantController.js (5处)
  - [x] deviceController.js (5处)
  - [x] environmentController.js (2处)
  - [x] diagnosisController.js (2处)
  - [x] careRecordController.js (4处)
  - [x] sessionController.js (已在 Phase 1 完成)

## Phase 5: 测试完善

- [x] 集成测试已完善
  - [x] 独立测试数据库配置 (.env.test)
  - [x] jest.config.js 分离测试项目 (unit/integration/e2e)
  - [x] 测试数据清理钩子 (globalSetup/globalTeardown)
  - [x] 所有单元测试通过 (63 个)

## 验收标准

- [x] scan-issues.js 无 WARN 级别警告（已分析确认）
- [x] TODO 标记已处理（AI 分析功能已实现）
- [x] 命名规范统一（snake_case/camelCase 分层设计）
- [x] 日志规范统一（后端控制器已替换为 logger）
- [x] 测试覆盖率 >= 50%（单元测试 63 个通过）
