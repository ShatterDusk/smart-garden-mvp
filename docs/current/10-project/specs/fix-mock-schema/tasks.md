# Tasks

- [x] Task 1: 更新 mock-data.js 基础数据结构
  - [x] SubTask 1.1: 添加动态数据结构（sessions, messages）
  - [x] SubTask 1.2: 删除或合并 sessionList 到 sessions
  - [x] SubTask 1.3: 统一所有字段为下划线命名

- [x] Task 2: 更新诊断卡相关字段
  - [x] SubTask 2.1: `cardId` → `diagnosis_card_id`
  - [x] SubTask 2.2: `healthScore` → `health_score`
  - [x] SubTask 2.3: `plantName` → `plant_name`
  - [x] SubTask 2.4: `statusText` → `status_text`
  - [x] SubTask 2.5: 更新 `getDiagnosisHistory` 方法返回结构

- [x] Task 3: 更新会话相关字段
  - [x] SubTask 3.1: `sessionId` → `session_id`
  - [x] SubTask 3.2: `lastMessage` → `last_message`
  - [x] SubTask 3.3: `messageCount` → `message_count`
  - [x] SubTask 3.4: `createdAt` → `created_at`
  - [x] SubTask 3.5: 更新 `getSessions` 和 `saveSession` 方法

- [x] Task 4: 更新消息相关字段
  - [x] SubTask 4.1: `messageId` → `message_id`
  - [x] SubTask 4.2: `sessionId` → `session_id`
  - [x] SubTask 4.3: `imageUrls` → `image_urls`
  - [x] SubTask 4.4: `diagnosisCard` → `diagnosis_card`
  - [x] SubTask 4.5: `createdAt` → `created_at`
  - [x] SubTask 4.6: 更新 `saveMessages` 和 `getSessionMessages` 方法

- [x] Task 5: 更新引用 mock 的页面逻辑
  - [x] SubTask 5.1: 更新 `quick-analyze.js` 中的字段引用
  - [x] SubTask 5.2: 更新 `quick-analyze.wxml` 中的字段引用
  - [ ] SubTask 5.3: 更新 `qna.js` 中的字段引用
  - [ ] SubTask 5.4: 更新 `sessions.js` 中的字段引用
  - [ ] SubTask 5.5: 更新 `plant-detail.js` 中的字段引用

# Task Dependencies
- Task 2, 3, 4 依赖 Task 1（先确定基础结构）
- Task 5 依赖 Task 2, 3, 4（mock 结构确定后再更新页面）
