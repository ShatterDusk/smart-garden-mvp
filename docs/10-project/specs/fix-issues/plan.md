# 问题修复规划

## 问题总览

根据 `scan-issues.js` 扫描结果，项目存在以下待处理问题：

| 优先级 | 类型 | 数量 | 说明 |
|:---:|:---|:---:|:---|
| P0 | TODO 标记 | 1 | 异步 AI 分析功能未实现 |
| P1 | 硬编码数据 | ~20 | aiService.js 和前端页面存在硬编码 |
| P2 | 命名规范 | ~50 | snake_case/camelCase 混用 |
| P3 | console.log | ~60 | 应使用 logger 模块 |

---

## Phase 1: 核心功能完善 (P0)

### Task 1.1: 实现异步 AI 分析功能

**问题位置**: `server/src/controllers/sessionController.js:350`

**当前代码**:
```javascript
// TODO: 触发 AI 分析（异步处理）
// 这里应该调用 AI 服务，生成 AI 回复
```

**修复方案**:
1. 在 `sendMessage` 函数中集成 AI 服务调用
2. 支持异步处理：用户消息先返回，AI 回复通过轮询或 WebSocket 推送
3. 复用 `aiController.js` 中的 `analyze` 逻辑

**实现步骤**:
- [ ] 1.1.1 分析现有 AI 服务接口 (`aiService.js`)
- [ ] 1.1.2 设计异步 AI 回复机制
- [ ] 1.1.3 在 `sendMessage` 中集成 AI 调用
- [ ] 1.1.4 添加 AI 回复消息的存储逻辑
- [ ] 1.1.5 编写单元测试验证功能

---

## Phase 2: 硬编码数据清理 (P1)

### Task 2.1: 清理 aiService.js 硬编码

**问题位置**: `server/src/services/aiService.js`

**涉及行**: 97, 108, 142, 267, 268

**修复方案**:
1. 将示例数据移至 `config/ai-examples.js` 配置文件
2. 使用环境变量配置 AI 模型参数
3. 创建 mock 数据文件用于开发测试

**实现步骤**:
- [ ] 2.1.1 创建 `config/ai-examples.js` 配置文件
- [ ] 2.1.2 将硬编码示例数据迁移到配置文件
- [ ] 2.1.3 更新 aiService.js 引用配置
- [ ] 2.1.4 添加环境变量支持

### Task 2.2: 清理前端硬编码

**问题位置**: `pages/metric-detail/metric-detail.js`

**涉及行**: 14, 163-167

**修复方案**:
1. 将指标配置移至 `utils/metric-config.js`
2. 从 API 获取动态配置

**实现步骤**:
- [ ] 2.2.1 创建 `utils/metric-config.js`
- [ ] 2.2.2 迁移硬编码指标数据
- [ ] 2.2.3 更新页面引用

---

## Phase 3: 命名规范统一 (P2)

### Task 3.1: 控制器层命名规范

**问题位置**: 所有控制器文件

**涉及文件**:
- `aiController.js`
- `careRecordController.js`
- `deviceController.js`
- `diagnosisController.js`
- `environmentController.js`
- `plantController.js`
- `sessionController.js`

**修复方案**:
1. 统一使用 camelCase 作为 API 响应字段名
2. 确保中间件 `camelCase.js` 正确转换
3. 添加命名规范文档

**实现步骤**:
- [ ] 3.1.1 审查所有控制器中的字段命名
- [ ] 3.1.2 统一转换为 camelCase
- [ ] 3.1.3 更新相关测试用例
- [ ] 3.1.4 更新 API 文档

---

## Phase 4: 日志规范统一 (P3)

### Task 4.1: 替换 console.log

**问题位置**: 全项目约 60 处

**修复方案**:
1. 后端使用 `winston` logger 模块
2. 前端小程序使用封装的日志工具
3. 添加日志级别控制

**实现步骤**:
- [ ] 4.1.1 创建前端日志工具 `utils/logger.js`
- [ ] 4.1.2 替换后端 console.log 为 logger
- [ ] 4.1.3 替换前端 console.log
- [ ] 4.1.4 添加日志级别配置

---

## Phase 5: 测试完善

### Task 5.1: 补充集成测试

**问题**: 集成测试和 E2E 测试存在数据库竞争问题

**修复方案**:
1. 配置测试数据库隔离
2. 使用 `--runInBand` 串行运行集成测试
3. 添加测试数据库清理机制

**实现步骤**:
- [ ] 5.1.1 配置独立测试数据库
- [ ] 5.1.2 更新 jest.config.js 添加 `--runInBand`
- [ ] 5.1.3 添加测试数据清理钩子
- [ ] 5.1.4 验证所有测试通过

---

## 执行顺序

```
Phase 1 (P0) ──→ Phase 2 (P1) ──→ Phase 3 (P2) ──→ Phase 4 (P3) ──→ Phase 5
    │
    └── 核心功能优先
```

## 预计工作量

| Phase | 任务 | 预计时间 |
|:---:|:---|:---:|
| 1 | 异步 AI 分析 | 2-3 小时 |
| 2 | 硬编码清理 | 1-2 小时 |
| 3 | 命名规范 | 2-3 小时 |
| 4 | 日志规范 | 1-2 小时 |
| 5 | 测试完善 | 1-2 小时 |
| **总计** | | **7-12 小时** |

---

## 验收标准

- [ ] 所有 TODO 标记已处理
- [ ] 无硬编码数据警告
- [ ] 命名规范统一
- [ ] console.log 全部替换为 logger
- [ ] 所有测试通过
- [ ] 代码覆盖率 >= 50%
