# Tasks

- [x] Task 1: 分析两份AI交互文档的差异和重复内容
  - [x] SubTask 1.1: 对比字段命名差异（inquiryId vs cardId, inquiryType vs analysisType）
  - [x] SubTask 1.2: 识别重复章节（System Prompt、AI返回结构等）
  - [x] SubTask 1.3: 提取 `AI交互JSON设计规范.md` 的独特内容（植物档案存储设计、历史分析卡片结构、上下文管理策略）

- [x] Task 2: 创建合并后的 `04-AI交互设计.md`
  - [x] SubTask 2.1: 保留原 `04-AI交互设计.md` 的基础结构
  - [x] SubTask 2.2: 统一所有字段命名为数据库设计标准（cardId, analysisType, diagnosis等）
  - [x] SubTask 2.3: 插入植物档案存储设计章节
  - [x] SubTask 2.4: 插入历史分析卡片结构章节
  - [x] SubTask 2.5: 插入上下文管理策略章节
  - [x] SubTask 2.6: 更新变更记录，说明合并内容和字段命名变更

- [x] Task 3: 删除重复的 `AI交互JSON设计规范.md`
  - [x] SubTask 3.1: 确认所有内容已合并
  - [x] SubTask 3.2: 删除文件

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
