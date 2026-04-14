# 问题修复 Spec

## Why
项目扫描发现约 140 个代码问题，包括 1 个核心 TODO（异步 AI 分析未实现）、20 处硬编码数据、50+ 处命名混用、60+ 处 console.log。这些问题影响代码质量和可维护性，需要系统性修复。

## What Changes
- 实现异步 AI 分析功能（核心 TODO）
- 清理硬编码数据，迁移至配置文件
- 统一命名规范（snake_case → camelCase）
- 替换 console.log 为 logger 模块
- 完善测试数据库隔离机制

## Impact
- Affected specs: 后端所有控制器、AI 服务、前端页面
- Affected code:
  - `server/src/controllers/sessionController.js` - AI 分析集成
  - `server/src/services/aiService.js` - 配置化
  - `server/src/controllers/*.js` - 命名规范
  - `pages/**/*.js` - 日志规范
  - `server/tests/**/*.test.js` - 测试完善

## ADDED Requirements

### Requirement: 异步 AI 分析功能
系统 SHALL 在用户发送消息后异步触发 AI 分析并生成回复。

#### Scenario: 用户发送消息触发 AI 回复
- **WHEN** 用户在会话中发送消息
- **THEN** 系统保存用户消息并返回成功
- **AND** 系统异步调用 AI 服务生成回复
- **AND** AI 回复保存到消息列表

#### Scenario: AI 分析失败处理
- **WHEN** AI 服务调用失败
- **THEN** 系统记录错误日志
- **AND** 用户消息正常返回，不阻塞用户操作

### Requirement: 配置化数据管理
系统 SHALL 将硬编码数据迁移至配置文件管理。

#### Scenario: AI 示例数据配置化
- **WHEN** AI 服务需要示例数据
- **THEN** 从配置文件读取而非硬编码

### Requirement: 命名规范统一
系统 SHALL 在 API 响应中统一使用 camelCase 命名。

#### Scenario: API 响应字段命名
- **WHEN** 控制器返回数据
- **THEN** 所有字段名使用 camelCase 格式

### Requirement: 日志规范统一
系统 SHALL 使用统一的 logger 模块记录日志。

#### Scenario: 后端日志记录
- **WHEN** 后端代码需要记录日志
- **THEN** 使用 winston logger 模块

#### Scenario: 前端日志记录
- **WHEN** 前端代码需要记录日志
- **THEN** 使用封装的日志工具

## MODIFIED Requirements

### Requirement: 测试数据库隔离
集成测试 SHALL 使用独立的测试数据库，避免数据竞争。

#### Scenario: 测试数据库配置
- **WHEN** 运行集成测试
- **THEN** 使用独立的测试数据库连接
- **AND** 测试间数据隔离
