# Tasks

- [x] Task 1: 更新数据库设计文档中的 messages 表结构
  - [x] SubTask 1.1: 删除 `diagnosis_card_id` 字段定义
  - [x] SubTask 1.2: 删除 `diagnosis_card_id` 外键约束
  - [x] SubTask 1.3: 删除 `diagnosis_card_id` 索引
  - [x] SubTask 1.4: 更新字段说明表格
  - [x] SubTask 1.5: 更新 E-R 图

- [x] Task 2: 更新数据库设计文档中的 diagnosis_cards 表结构
  - [x] SubTask 2.1: 主键 `card_id` 重命名为 `diagnosis_card_id`
  - [x] SubTask 2.2: 删除 `session_id` 字段
  - [x] SubTask 2.3: 删除 `user_id` 字段
  - [x] SubTask 2.4: 删除 `raw_response` 字段
  - [x] SubTask 2.5: 删除相关外键约束（session_id, user_id）
  - [x] SubTask 2.6: 删除相关索引
  - [x] SubTask 2.7: 更新字段说明表格
  - [x] SubTask 2.8: 更新 E-R 图

- [x] Task 3: 更新 AI 交互设计文档中的字段引用
  - [x] SubTask 3.1: `cardId` → `diagnosisCardId`
  - [x] SubTask 3.2: 删除 `raw_response` 相关引用
  - [x] SubTask 3.3: 更新数据存储流程章节

- [x] Task 4: 更新文档中的关联查询示例
  - [x] SubTask 4.1: 更新通过 message_id 关联查询的示例
  - [x] SubTask 4.2: 更新数据流转图示

# Task Dependencies
- Task 2 depends on Task 1（先确定 messages 结构，再调整 diagnosis_cards）
- Task 3 depends on Task 2（数据库结构确定后再更新接口文档）
- Task 4 depends on Task 2
