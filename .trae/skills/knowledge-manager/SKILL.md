---
name: "knowledge-manager"
description: "管理 docs/current 文件夹中的知识资源，包括存储、读取、编辑和检索知识。当需要保存重要信息、查询项目知识或更新文档时自动调用。"
---

# 知识管理器 (Knowledge Manager)

## 功能概述

本 Skill 用于管理 `docs/current` 文件夹中的知识资源，提供完整的知识生命周期管理功能。

## 何时调用

**必须调用本 Skill 当：**
- 用户要求保存/存储重要信息到文档中
- 需要查询或引用项目文档中的知识
- 需要编辑或更新现有文档
- 需要创建新的知识文档
- 需要搜索特定主题的知识
- 需要整理或归档知识

## 知识目录结构

```
docs/current/11-knowledge/          # 知识库主目录
├── README.md                       # 知识库索引
├── ai-memory/                      # AI 记忆存储
│   ├── session-contexts/           # 会话上下文
│   ├── decisions/                  # 决策记录
│   └── learnings/                  # 学习总结
├── project-insights/               # 项目洞察
│   ├── patterns/                   # 代码模式
│   ├── solutions/                  # 解决方案
│   └── best-practices/             # 最佳实践
├── domain-knowledge/               # 领域知识
│   ├── business/                   # 业务知识
│   ├── technical/                  # 技术知识
│   └── architecture/               # 架构知识
└── meta/                           # 元数据
    ├── index.json                  # 知识索引
    └── tags.json                   # 标签系统
```

## 核心功能

### 1. 存储知识 (store)

**场景**：保存重要信息、决策、学习总结

**操作步骤**：
1. 确定知识类型和分类
2. 生成唯一标识符
3. 创建或更新文档
4. 更新索引文件

**文档模板**：
```markdown
---
id: "KNOW-YYYY-MM-DD-XXX"
type: "decision|learning|pattern|solution|insight"
category: ""
tags: []
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
author: "AI"
status: "active|archived"
---

# 标题

## 摘要

## 详细内容

## 相关链接
- 相关文档: 
- 相关代码: 

## 变更记录
| 日期 | 变更内容 |
|:---|:---|
```

### 2. 读取知识 (read)

**场景**：查询特定知识、获取上下文

**操作步骤**：
1. 检查索引文件定位知识
2. 读取目标文档
3. 提取相关信息
4. 返回结构化数据

### 3. 编辑知识 (edit)

**场景**：更新知识、修正错误、补充内容

**操作步骤**：
1. 读取原始文档
2. 应用变更
3. 更新元数据（updated 时间）
4. 保存文档
5. 更新索引

### 4. 搜索知识 (search)

**场景**：查找相关知识、发现模式

**操作步骤**：
1. 查询索引文件
2. 按标签/类型/关键词过滤
3. 返回匹配结果
4. 按相关性排序

### 5. 知识索引管理 (index)

**索引文件格式** (`meta/index.json`)：
```json
{
  "version": "1.0",
  "lastUpdated": "YYYY-MM-DD",
  "knowledge": [
    {
      "id": "KNOW-2026-04-09-001",
      "title": "",
      "type": "",
      "category": "",
      "tags": [],
      "path": "",
      "created": "",
      "updated": "",
      "status": ""
    }
  ],
  "categories": [],
  "tags": []
}
```

## 使用示例

### 示例 1: 存储重要决策

用户说："记住我们决定使用 JWT 进行身份验证"

AI 操作：
1. 创建文件 `docs/current/11-knowledge/ai-memory/decisions/jwt-auth-decision.md`
2. 记录决策背景、原因、影响
3. 更新索引文件

### 示例 2: 查询项目知识

用户问："我们项目的命名规范是什么？"

AI 操作：
1. 搜索索引中 type="best-practices" AND tags=["naming"]
2. 读取相关文档
3. 返回命名规范内容

### 示例 3: 更新知识

用户说："更新环境数据流程文档，添加补偿机制说明"

AI 操作：
1. 读取现有文档
2. 添加补偿机制章节
3. 更新元数据
4. 保存文档

## 最佳实践

1. **知识分类**：按类型和领域合理分类，便于检索
2. **标签系统**：使用一致的标签，支持多维度检索
3. **定期整理**：定期归档过期知识，保持知识库活跃
4. **关联链接**：建立知识间的关联关系
5. **版本控制**：重要变更记录变更历史

## 工具函数

### 知识操作工具

- `knowledgeStore(data)` - 存储新知识
- `knowledgeRead(id)` - 读取指定知识
- `knowledgeEdit(id, changes)` - 编辑知识
- `knowledgeSearch(query)` - 搜索知识
- `knowledgeIndex()` - 获取知识索引
- `knowledgeArchive(id)` - 归档知识

### 文件操作工具

- `ensureDirectory(path)` - 确保目录存在
- `generateId()` - 生成知识唯一ID
- `updateIndex(entry)` - 更新索引
- `parseFrontmatter(content)` - 解析文档元数据
- `formatFrontmatter(meta)` - 格式化元数据

## 注意事项

1. 所有知识文档必须包含 YAML frontmatter
2. ID 格式：`KNOW-YYYY-MM-DD-NNN`
3. 路径使用相对路径 `docs/current/11-knowledge/`
4. 定期备份重要知识
5. 敏感信息不要存入知识库
