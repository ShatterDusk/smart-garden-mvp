# 关键 Bug 修复队列 Spec

## Why

通过代码审查和数据库检查，发现两个关键问题需要立即修复：
1. 环境指标定义表（environment_metrics）缺少初始化数据，导致环境数据功能无法正常工作
2. 会话升级功能存在 SQL 语法错误，导致诊断卡无法正确关联到植物

## What Changes
- 初始化 environment_metrics 表数据（13 条指标定义）
- 修复 sessionController.js 中 upgradeSession 函数的 SQL 语法错误
- 验证修复结果

## Impact
- Affected specs: implement-environment-data, supplement-api
- Affected code:
  - `server/src/controllers/sessionController.js` (修复 SQL 语法)
  - 数据库 environment_metrics 表 (初始化数据)

## ADDED Requirements

### Requirement: 环境指标数据初始化
系统应预置环境指标定义数据，支持环境数据的正常查询和展示。

#### Scenario: 指标数据存在
- **WHEN** 查询 environment_metrics 表
- **THEN** 返回 13 条指标定义记录

### Requirement: 会话升级 SQL 修复
系统应使用正确的 Sequelize 语法执行诊断卡关联更新。

#### Scenario: 会话升级成功
- **WHEN** 调用 POST /api/sessions/:sessionId/upgrade
- **THEN** 会话类型变更为 plant，诊断卡正确关联到植物

## MODIFIED Requirements

### Requirement: 会话升级实现
修复 upgradeSession 函数中的 SQL 语法错误。

**原实现问题**:
- 使用 `{ in: ... }` 而不是 `{ [Op.in]: ... }`
- 存在 SQL 注入风险（直接拼接 sessionId）

**修复后实现**:
- 使用 `{ [Op.in]: messageIds }` 语法
- 先查询消息 ID 列表，再执行更新

## REMOVED Requirements
无
