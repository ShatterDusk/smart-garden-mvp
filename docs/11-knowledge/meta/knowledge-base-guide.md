---
id: "KNOW-2026-04-18-006"
type: "technical"
category: "meta"
tags: ["knowledge-base", "guide", "index", "documentation", "ai-reference"]
created: "2026-04-18"
updated: "2026-04-18"
author: "AI"
status: "active"
---

# 知识库索引指南

> 本指南帮助 AI 助手和团队成员快速定位知识库中的信息。

## 知识库定位

```
docs/current/
├── 01-product/          # 产品需求文档
├── 02-architecture/     # 架构设计（数据库DDL、API设计在此！）
├── 03-frontend/         # 前端设计文档
├── 04-backend/          # 后端设计文档
├── 05-process/          # 业务流程
├── 06-testing/          # 测试文档
├── 07-operations/       # 运维文档
├── 08-tasks/            # 任务管理
├── 09-references/       # 参考资料
├── 10-project/          # 项目管理
├── 11-knowledge/        # ⭐ 知识库（本目录）
│   ├── meta/            # 知识库元数据
│   │   ├── index.json   # 知识条目索引
│   │   └── knowledge-base-guide.md  # 本文件
│   ├── ai-memory/       # AI记忆
│   ├── project-insights/ # 项目洞察
│   └── domain-knowledge/ # 领域知识
└── 12-workgroups/       # 工作组文档
```

## 重要文档位置速查

| 要找什么 | 先看这里 | 详细文档位置 |
|:---|:---|:---|
| **数据库设计** | `11-knowledge/domain-knowledge/technical/database-schema-overview.md` | `02-architecture/数据库设计.md` ⭐ |
| **API接口** | `11-knowledge/project-insights/best-practices/api-design-standards.md` | `02-architecture/API接口设计.md` |
| **项目规范** | `11-knowledge/project-insights/best-practices/project-conventions-reference.md` | `.trae/rules/project_rules.md` |
| **新人指南** | `11-knowledge/project-insights/best-practices/newcomer-onboarding-guide.md` | - |
| **技术全景** | `11-knowledge/domain-knowledge/technical/project-technical-landscape.md` | - |

## 知识库 (11-knowledge) 结构

### 1. ai-memory/ - AI记忆
AI 会话中产生的决策、学习总结、上下文记忆。

- `decisions/` - 重要决策记录
- `learnings/` - 学习总结
- `session-contexts/` - 会话上下文（如需要）

### 2. project-insights/ - 项目洞察
项目开发过程中积累的经验、模式、解决方案。

- `best-practices/` - 最佳实践指南
  - `knowledge-management-guide.md` - 知识管理指南
  - `newcomer-onboarding-guide.md` - 新人入职指南 ⭐
  - `project-conventions-reference.md` - 项目规范速查 ⭐
  - `api-design-standards.md` - API设计规范
  - `documentation-management.md` - 文档管理规范
  - `workspace-pattern.md` - 工作区模式
  - `three-line-workflow.md` - 三线并行工作流
  - `documentation-governance.md` - 文档治理
  - `doc-health-check-mechanism.md` - 文档健康度检查
  - `doc-code-consistency.md` - 文档代码一致性
  
- `patterns/` - 代码模式
  - `sequelize-json-field-update.md` - Sequelize JSON更新
  - `unread-message-red-dot.md` - 未读消息红点
  
- `solutions/` - 解决方案
  - `session-performance-issue.md` - 会话性能问题
  - `log-api-security-hardening.md` - 日志API安全加固
  - `database-design-maintenance-status.md` - 数据库文档维护状态

### 3. domain-knowledge/ - 领域知识
业务和技术领域知识。

- `technical/` - 技术知识
  - `database-schema-overview.md` - 数据库设计概览 ⭐（索引文档）
  - `project-technical-landscape.md` - 项目技术全景 ⭐
  - `care-task-system/` - 养护任务系统

## 关键约定

### 1. 索引文档 vs 详细文档

**索引文档**（在 11-knowledge/）：
- 提供快速概览和导航
- 包含关键信息的摘要
- 指向详细文档的链接

**详细文档**（在 02-architecture/ 等）：
- 包含完整的 DDL、ER图、详细字段定义
- 是权威的参考来源
- 由架构文档维护

### 2. 文档引用优先级

```
1. 代码本身（最可信）
2. 02-architecture/ 架构文档
3. 11-knowledge/ 知识库
4. 其他文档
```

### 3. 标签使用

常用标签：
- `index-document` - 索引文档（指向详细文档）
- `reference` - 参考资料
- `ddl` - 包含数据库DDL
- `api` - API相关
- `consensus` - 团队共识
- `best-practice` - 最佳实践
- `pattern` - 代码模式
- `solution` - 问题解决方案

## AI 助手使用指南

### 查找数据库信息

❌ **错误做法**：只在 11-knowledge/ 中搜索

✅ **正确做法**：
1. 先看 `11-knowledge/domain-knowledge/technical/database-schema-overview.md` 获取概览
2. 需要详细 DDL 时，查看 `02-architecture/数据库设计.md`
3. 需要模型定义时，查看 `backend/server/src/models/`

### 查找 API 信息

❌ **错误做法**：只在知识库中搜索

✅ **正确做法**：
1. 先看 `11-knowledge/project-insights/best-practices/api-design-standards.md`
2. 需要详细接口定义时，查看 `02-architecture/API接口设计.md`
3. 需要实际代码时，查看 `backend/server/src/routes/` 和 `controllers/`

### 更新知识库时

1. 如果是**新洞察/模式/解决方案** → 添加到 11-knowledge/
2. 如果是**架构变更** → 更新 02-architecture/，并在 11-knowledge/ 中添加索引或引用
3. 更新后同步修改 `meta/index.json`

## 常见问题

### Q: 为什么数据库设计在 02-architecture/ 而不在 11-knowledge/？

A: 02-architecture/ 是架构文档的权威位置，包含完整的 DDL 和 ER 图。11-knowledge/ 中的 `database-schema-overview.md` 是一个**索引文档**，提供快速参考并指向详细文档。

### Q: 知识库和架构文档的关系是什么？

A: 
- **架构文档**（02-architecture/）：权威的、详细的、由架构师维护的设计文档
- **知识库**（11-knowledge/）：AI 和团队在开发过程中积累的洞察、模式、经验，通常更偏向实践层面

### Q: 如何确保知识库索引是最新的？

A: 
1. 定期检查 `meta/index.json` 中的条目
2. 使用 `index-document` 标签标记索引文档
3. 在索引文档顶部添加指向详细文档的明确链接

## 变更记录

| 日期 | 变更内容 |
|:---|:---|
| 2026-04-18 | 初始创建 - 建立知识库索引指南，解决 AI 检索盲区问题 |
