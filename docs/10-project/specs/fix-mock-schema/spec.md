# Mock 数据字段对齐规格

## Why
在审查 mock-data.js 时发现以下问题：
1. **字段命名与数据库不一致**: mock 中使用驼峰命名（如 `sessionId`），但数据库使用下划线命名（如 `session_id`）
2. **主键命名不一致**: mock 中诊断卡主键为 `cardId`，数据库为 `diagnosis_card_id`
3. **数据结构混乱**: `sessionList` 与 `sessions` 并存，字段定义不统一
4. **缺少必要的动态数据结构**: 运行时数据（sessions, messages）与静态数据混合

## What Changes
- **BREAKING**: 统一所有字段命名为数据库下划线命名规范
- **BREAKING**: 诊断卡主键 `cardId` → `diagnosis_card_id`
- **BREAKING**: 会话主键 `sessionId` → `session_id`
- **BREAKING**: 消息主键 `messageId` → `message_id`
- **BREAKING**: 合并 `sessionList` 和 `sessions`，统一使用 `sessions`
- 更新所有引用 mock 数据的页面逻辑
- 确保 mock 数据结构与数据库设计 100% 对齐

## Impact
- 影响文件: `utils/mock-data.js`, `pages/qna/qna.js`, `pages/quick-analyze/quick-analyze.js`, `pages/sessions/sessions.js`
- 影响范围: 所有使用 mock 数据的页面
- 需要确保数据流转正确：快速诊断 → 创建会话 → 保存消息 → 显示诊断卡

## ADDED Requirements

### Requirement: 字段命名规范
The system SHALL use database field naming convention in mock data.

#### Scenario: 主键命名
- **GIVEN** 数据库表 `diagnosis_cards` 主键为 `diagnosis_card_id`
- **WHEN** mock 数据中定义诊断卡
- **THEN** 主键名应为 `diagnosis_card_id`（下划线命名）

#### Scenario: 外键命名
- **GIVEN** 数据库表 `messages` 有外键 `session_id`
- **WHEN** mock 数据中定义消息
- **THEN** 外键名应为 `session_id`（下划线命名）

## MODIFIED Requirements

### Requirement: Mock 数据结构
**Current**: 混合使用驼峰命名和下划线命名，结构混乱
**Modified**: 严格遵循数据库设计，全部使用下划线命名

**Migration**:
- `sessionId` → `session_id`
- `cardId` → `diagnosis_card_id`
- `messageId` → `message_id`
- `plantId` → `plant_id`
- `userId` → `user_id`
- `deviceId` → `device_id`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`
- `imageUrls` → `image_urls`
- `lastMessage` → `last_message`
- `messageCount` → `message_count`
- `diagnosisCard` → `diagnosis_card`
- `healthScore` → `health_score`
- `plantName` → `plant_name`
- `statusText` → `status_text`

### Requirement: 动态数据管理
**Current**: `sessionList` 和 `sessions` 并存，逻辑混乱
**Modified**: 统一使用 `sessions` 数组存储所有会话

**Migration**:
- 删除 `sessionList`，使用 `sessions`
- 初始化 `sessions: []` 和 `messages: {}`
- 确保 `saveSession` 和 `saveMessages` 方法正确操作这些数据

## REMOVED Requirements

### Requirement: 驼峰命名字段
**Reason**: 与数据库设计不一致，导致数据映射混乱
**Migration**: 全部替换为下划线命名

### Requirement: sessionList 数组
**Reason**: 与 sessions 重复，造成数据不一致
**Migration**: 使用统一的 `sessions` 数组
