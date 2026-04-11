---
**归档信息**
- **归档日期**: 2026-04-11
- **归档原因**: 内容已合并到数据库设计.md 第十七章（17.1节）
- **合并人**: AI Assistant（知识工程部）
- **原文状态**: ✅ 已完成并归档
- **文档状态**: 只读（历史参考）
---

# 数据库设计修正规格

## Why
在审查数据库设计时发现以下问题：
1. **主键命名不规范**: `diagnosis_cards` 表主键为 `card_id`，不符合命名规范（应为 `diagnosis_card_id`）
2. **字段冗余**: `diagnosis_cards` 表包含 `session_id` 和 `user_id`，但这些信息可通过 `message_id` 关联获取
3. **循环依赖**: `messages` 表有 `diagnosis_card_id` 外键，同时 `diagnosis_cards` 表有 `message_id` 外键
4. **职责边界模糊**: `raw_response` 字段存储AI回复文本，与 `messages.content` 重复

## What Changes
- **BREAKING**: `diagnosis_cards.card_id` 重命名为 `diagnosis_card_id`
- **BREAKING**: 删除 `diagnosis_cards.session_id` 字段
- **BREAKING**: 删除 `diagnosis_cards.user_id` 字段
- **BREAKING**: 删除 `diagnosis_cards.raw_response` 字段
- **BREAKING**: 删除 `messages.diagnosis_card_id` 字段
- 更新相关外键约束和索引
- 同步更新 AI 交互设计文档中的字段引用

## Impact
- 影响文档: `02-数据库设计.md`, `04-AI交互设计.md`
- 影响范围: 数据库表结构、AI交互接口定义
- 需要确保表职责清晰：messages 管消息内容，diagnosis_cards 管诊断结果

## ADDED Requirements

### Requirement: 主键命名规范
The system SHALL use consistent primary key naming convention.

#### Scenario: diagnosis_cards 主键
- **GIVEN** 表名为 `diagnosis_cards`
- **WHEN** 定义主键时
- **THEN** 主键名应为 `diagnosis_card_id`（表名缩写 + _id）

## MODIFIED Requirements

### Requirement: diagnosis_cards 表结构
**Current**: 包含冗余字段 `session_id`, `user_id`, `raw_response`，主键为 `card_id`
**Modified**: 精简字段，只保留诊断相关数据，主键为 `diagnosis_card_id`

**Migration**:
- 主键: `card_id` → `diagnosis_card_id`
- 删除: `session_id`（通过 message_id → messages.session_id 获取）
- 删除: `user_id`（通过 message_id → messages.session_id → sessions.user_id 获取）
- 删除: `raw_response`（messages.content 已存储AI回复文本）
- 保留: `message_id`, `plant_id`, `analysis_type`, `health_score`, `status`, `issues`, `suggestions`, `confidence`, `context_used`, `created_at`

### Requirement: messages 表结构
**Current**: 包含 `diagnosis_card_id` 外键
**Modified**: 删除 `diagnosis_card_id` 外键，避免循环依赖

**Migration**:
- 删除: `diagnosis_card_id` 字段
- 查询诊断信息时通过 `diagnosis_cards.message_id` 关联

## REMOVED Requirements

### Requirement: 双向外键关联
**Reason**: 循环依赖导致插入顺序复杂，且职责边界不清
**Migration**: 改为单向依赖：diagnosis_cards → messages

### Requirement: raw_response 字段
**Reason**: 与 messages.content 重复存储AI回复文本
**Migration**: 直接使用 messages.content 获取AI回复内容
