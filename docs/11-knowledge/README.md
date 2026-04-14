---
id: "KNOW-README"
type: "meta"
category: "knowledge-base"
tags: ["meta", "index", "knowledge-management"]
created: "2026-04-09"
updated: "2026-04-11"
author: "AI"
status: "active"
---

# 知识库 (Knowledge Base)

> 本目录用于存储和管理 AI 与项目相关的知识资源。

## 目录结构

```
11-knowledge/
├── README.md                       # 本文件 - 知识库总览
├── ai-memory/                      # AI 记忆存储
│   ├── session-contexts/           # 会话上下文记录
│   ├── decisions/                  # 重要决策记录
│   └── learnings/                  # 学习总结
├── project-insights/               # 项目洞察
│   ├── patterns/                   # 代码模式和设计模式
│   ├── solutions/                  # 问题解决方案
│   └── best-practices/             # 最佳实践
├── domain-knowledge/               # 领域知识
│   ├── business/                   # 业务领域知识
│   ├── technical/                  # 技术领域知识
│   └── architecture/               # 架构知识
└── meta/                           # 元数据
    ├── index.json                  # 知识索引
    └── tags.json                   # 标签系统
```

## 快速导航

### 按类型查找

| 类型 | 目录 | 说明 |
|:---|:---|:---|
| AI 决策 | [ai-memory/decisions](./ai-memory/decisions/) | 重要技术决策和选择 |
| 学习总结 | [ai-memory/learnings](./ai-memory/learnings/) | 项目学习经验 |
| 代码模式 | [project-insights/patterns](./project-insights/patterns/) | 可复用的代码模式 |
| 解决方案 | [project-insights/solutions](./project-insights/solutions/) | 问题解决方案 |
| 最佳实践 | [project-insights/best-practices](./project-insights/best-practices/) | 开发和设计最佳实践 |
| 业务知识 | [domain-knowledge/business](./domain-knowledge/business/) | 业务规则和流程 |
| 技术知识 | [domain-knowledge/technical](./domain-knowledge/technical/) | 技术细节和原理 |
| 架构知识 | [domain-knowledge/architecture](./domain-knowledge/architecture/) | 架构设计和决策 |

## 使用指南

### 1. 存储知识

当需要保存重要信息时，创建新的知识文档：

1. 确定知识类型和分类
2. 使用模板创建文档
3. 填写元数据（frontmatter）
4. 更新索引文件

**文档模板**：
```markdown
---
id: "KNOW-YYYY-MM-DD-NNN"
type: "decision|learning|pattern|solution|insight"
category: ""
tags: []
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
author: "AI"
status: "active"
---

# 标题

## 摘要
简要描述知识内容

## 详细内容
详细的知识内容

## 相关链接
- 相关文档: 
- 相关代码: 
- 相关任务: 

## 变更记录
| 日期 | 变更内容 |
|:---|:---|
| YYYY-MM-DD | 初始创建 |
```

### 2. 查询知识

通过以下方式查找知识：
- 查看 [meta/index.json](./meta/index.json) 索引
- 按标签搜索
- 按目录浏览
- 使用 AI 搜索功能

### 3. 更新知识

编辑知识时：
1. 更新文档内容
2. 更新 `updated` 时间戳
3. 添加变更记录
4. 必要时更新索引

### 4. 归档知识

当知识过期时：
1. 将 `status` 改为 `archived`
2. 添加归档说明
3. 更新索引统计

## 文档规范

### 文件名规范
- 使用小写字母
- 单词间用连字符 `-` 分隔
- 示例: `jwt-auth-decision.md`, `api-error-handling-pattern.md`

### ID 规范
- 格式: `KNOW-YYYY-MM-DD-NNN`
- 示例: `KNOW-2026-04-09-001`

### 标签规范
- 使用预定义标签（见 [meta/tags.json](./meta/tags.json)）
- 可添加自定义标签，但需保持一致的命名风格

## 元数据文件

### 索引文件 ([meta/index.json](./meta/index.json))
包含所有知识的索引信息，支持快速检索。

### 标签文件 ([meta/tags.json](./meta/tags.json))
定义标准标签和标签分组，确保标签使用的一致性。

## 统计信息

- **总知识数**: 10
- **活跃知识**: 10
- **已归档**: 0

*最后更新: 2026-04-11*

## 最新知识

| ID | 标题 | 类型 | 创建日期 |
|:---|:---|:---:|:---:|
| KNOW-2026-04-11-006 | 未读消息红点提示模式 | pattern | 2026-04-11 |
| KNOW-2026-04-11-005 | Sequelize JSON 字段更新模式 | pattern | 2026-04-11 |
| KNOW-2026-04-11-004 | 日志API安全加固方案 | solution | 2026-04-11 |
| KNOW-2026-04-11-003 | 三线并行工作流 | best-practice | 2026-04-11 |
| KNOW-2026-04-11-002 | 文档管理规范 | best-practice | 2026-04-11 |
| KNOW-2026-04-11-001 | 工作区模式 | best-practice | 2026-04-11 |
