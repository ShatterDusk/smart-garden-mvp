---
id: "KNOW-2026-04-09-001"
type: "best-practice"
category: "project-insights/best-practices"
tags: ["knowledge-management", "documentation", "ai-memory", "best-practice"]
created: "2026-04-09"
updated: "2026-04-09"
author: "AI"
status: "active"
---

# 知识管理最佳实践指南

## 摘要

本文档定义了在 `docs/current/11-knowledge/` 目录中管理知识的标准方法和最佳实践。

## 何时创建知识文档

### 必须记录的场景

1. **重要技术决策**
   - 架构选择（如：为什么选择微服务）
   - 技术选型（如：为什么选择 Sequelize）
   - 设计模式选择（如：为什么使用 Repository 模式）

2. **复杂问题解决方案**
   - 花了较长时间解决的问题
   - 涉及多个组件的问题
   - 有特定约束条件的解决方案

3. **项目洞察和经验**
   - 代码复用模式
   - 性能优化技巧
   - 常见陷阱和避免方法

4. **业务规则说明**
   - 复杂的业务逻辑
   - 特殊的业务规则
   - 领域知识总结

### 不必记录的场景

- 简单的、一次性的代码修改
- 已经在其他文档中详细说明的内容
- 临时性的、很快会过时的信息

## 知识创建流程

### 步骤 1: 确定分类

根据知识内容选择合适的分类：

```
ai-memory/
  ├── session-contexts/    # 会话上下文 - 特定会话的重要信息
  ├── decisions/           # 决策记录 - 技术/架构决策
  └── learnings/           # 学习总结 - 项目经验教训

project-insights/
  ├── patterns/            # 代码模式 - 可复用的代码结构
  ├── solutions/           # 解决方案 - 特定问题的解决方法
  └── best-practices/      # 最佳实践 - 推荐的工作方式

domain-knowledge/
  ├── business/            # 业务知识 - 业务规则和流程
  ├── technical/           # 技术知识 - 技术细节和原理
  └── architecture/        # 架构知识 - 架构设计和决策
```

### 步骤 2: 生成唯一 ID

ID 格式: `KNOW-YYYY-MM-DD-NNN`

- 检查 `meta/index.json` 获取当天最新序号
- 序号递增，确保唯一性

### 步骤 3: 编写文档

使用标准模板，包含：
1. YAML frontmatter（元数据）
2. 标题和摘要
3. 详细内容
4. 相关链接
5. 变更记录

### 步骤 4: 更新索引

在 `meta/index.json` 中添加条目：

```json
{
  "id": "KNOW-2026-04-09-001",
  "title": "知识管理最佳实践指南",
  "type": "best-practice",
  "category": "project-insights/best-practices",
  "tags": ["knowledge-management", "documentation"],
  "path": "project-insights/best-practices/knowledge-management-guide.md",
  "created": "2026-04-09",
  "updated": "2026-04-09",
  "status": "active"
}
```

## 文档质量标准

### 内容要求

1. **清晰性**
   - 使用简洁明了的语言
   - 避免歧义和模糊表达
   - 提供具体示例

2. **完整性**
   - 覆盖必要的背景信息
   - 说明原因和影响
   - 提供相关上下文

3. **可维护性**
   - 使用标准模板
   - 保持一致的格式
   - 及时更新过时内容

### 格式要求

1. **文件名**
   - 小写字母
   - 连字符分隔单词
   - 描述性强

2. **标题**
   - 使用一级标题 `#`
   - 简洁明了

3. **章节**
   - 使用二级标题 `##` 组织主要章节
   - 使用三级标题 `###` 组织子章节

4. **标签**
   - 使用预定义标签
   - 标签应准确反映内容
   - 避免过多标签（3-5个为宜）

## 知识维护

### 定期审查

- 每月审查一次知识库
- 标记过时内容
- 更新或归档不再适用的知识

### 版本控制

- 重要变更添加变更记录
- 保留历史版本信息
- 重大变更考虑创建新版本文档

### 关联维护

- 建立知识间的关联
- 更新相关链接
- 维护知识网络

## 示例

### 示例 1: 决策记录

```markdown
---
id: "KNOW-2026-04-09-002"
type: "decision"
category: "ai-memory/decisions"
tags: ["architecture", "database", "decision"]
created: "2026-04-09"
updated: "2026-04-09"
author: "AI"
status: "active"
---

# 使用 Sequelize 作为 ORM 框架

## 摘要

项目选择 Sequelize 作为 Node.js 的 ORM 框架。

## 决策背景

需要选择一个 ORM 框架来简化数据库操作，提高开发效率。

## 考虑选项

1. **Sequelize**
   - 优点：功能丰富、文档完善、社区活跃
   - 缺点：学习曲线较陡

2. **TypeORM**
   - 优点：TypeScript 支持好
   - 缺点：相对较新，稳定性待验证

3. **Prisma**
   - 优点：现代化、类型安全
   - 缺点：生态系统相对较小

## 决策结果

选择 **Sequelize**。

## 原因

1. 团队已有使用经验
2. 文档完善，问题容易解决
3. 功能满足项目需求

## 影响

- 需要定义模型和关联
- 需要学习 Sequelize 查询语法

## 相关链接
- [数据库设计](../../02-architecture/数据库设计.md)
- [Sequelize 文档](https://sequelize.org/)
```

### 示例 2: 解决方案

```markdown
---
id: "KNOW-2026-04-09-003"
type: "solution"
category: "project-insights/solutions"
tags: ["api", "error-handling", "solution"]
created: "2026-04-09"
updated: "2026-04-09"
author: "AI"
status: "active"
---

# API 错误统一处理方案

## 摘要

实现统一的 API 错误处理机制，确保错误响应格式一致。

## 问题描述

不同接口返回的错误格式不一致，前端处理困难。

## 解决方案

使用 Express 错误处理中间件统一处理错误。

```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const response = {
    code: err.code || 500,
    message: err.message || 'Internal Server Error',
    data: null
  };
  res.status(200).json(response);
};
```

## 使用方式

在控制器中抛出错误：

```javascript
throw { code: 400, message: 'Invalid input' };
```

## 相关链接
- [错误处理中间件](../../../backend/server/src/middleware/errorHandler.js)
```

## 变更记录

| 日期 | 变更内容 |
|:---|:---|
| 2026-04-09 | 初始创建 |
