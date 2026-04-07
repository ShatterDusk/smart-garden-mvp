# AI交互设计文档合并规格

## Why
当前项目存在两份AI交互设计文档：
1. `04-AI交互设计.md` - 主要AI交互设计文档
2. `AI交互JSON设计规范.md` - 补充JSON设计规范

两份文档存在内容重复且字段命名不一致的问题（如 `inquiryId` vs `cardId`），需要合并为一份统一的文档，并严格对齐数据库设计。

## What Changes
- 将 `AI交互JSON设计规范.md` 的内容合并到 `04-AI交互设计.md`
- 统一字段命名，以数据库设计为准（使用 `card_id`, `analysis_type` 等）
- 删除重复的 `AI交互JSON设计规范.md` 文件
- **BREAKING**: 字段命名从 `inquiryId/inquiryType` 统一改为 `cardId/analysisType`

## Impact
- 影响文档: `04-AI交互设计.md`, `AI交互JSON设计规范.md`
- 影响范围: AI开发、前后端接口对接
- 需要确保前端代码中使用的字段名与合并后的文档一致

## ADDED Requirements

### Requirement: 文档合并
The system SHALL merge `AI交互JSON设计规范.md` into `04-AI交互设计.md` while maintaining all unique content.

#### Scenario: 字段命名统一
- **GIVEN** 数据库设计使用 `card_id`, `analysis_type`
- **AND** `AI交互JSON设计规范.md` 使用 `inquiryId`, `inquiryType`
- **WHEN** 合并文档时
- **THEN** 统一使用数据库设计的字段命名（`cardId`, `analysisType`）

#### Scenario: 内容去重
- **GIVEN** 两份文档存在重复章节（如 System Prompt、AI返回结构）
- **WHEN** 合并时
- **THEN** 保留 `04-AI交互设计.md` 的版本（更完整）
- **AND** 补充 `AI交互JSON设计规范.md` 中的独特内容（如植物档案存储设计、历史分析卡片结构）

#### Scenario: 结构完整性
- **GIVEN** 合并后的文档需要覆盖所有AI交互场景
- **WHEN** 整理文档结构
- **THEN** 包含以下章节：
  1. AI服务概述
  2. AI请求格式（普通分析/深度分析）
  3. System Prompt设计
  4. AI返回格式
  5. 字段说明（对齐数据库）
  6. 字段枚举
  7. 数据存储流程
  8. 植物档案存储设计
  9. 历史分析卡片结构
  10. 上下文管理策略
  11. 错误处理
  12. Prompt优化建议
  13. 变更记录

## MODIFIED Requirements

### Requirement: 04-AI交互设计.md
**Current**: 独立的AI交互设计文档
**Modified**: 合并后的完整AI交互设计文档，包含原 `AI交互JSON设计规范.md` 的所有独特内容

**Migration**:
- 保留原 `04-AI交互设计.md` 的章节结构
- 在适当位置插入 `AI交互JSON设计规范.md` 的独特内容
- 更新所有字段命名以匹配数据库设计

## REMOVED Requirements

### Requirement: AI交互JSON设计规范.md
**Reason**: 内容已合并到 `04-AI交互设计.md`，避免维护两份重复文档
**Migration**: 删除该文件，所有引用指向合并后的 `04-AI交互设计.md`
