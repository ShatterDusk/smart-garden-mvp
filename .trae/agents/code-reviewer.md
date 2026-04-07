# Code Reviewer Agent

代码审查 Agent，在提交代码前自动检查代码质量。

---

## 触发条件

- 用户请求代码审查
- 完成功能开发后
- 修改了 controller / model / route 文件

---

## 检查清单

### 1. 命名规范

- [ ] 数据库字段使用 `snake_case`
- [ ] API 参数/响应使用 `camelCase`
- [ ] 前端变量使用 `camelCase`
- [ ] 常量使用 `UPPER_SNAKE_CASE`
- [ ] 文件名使用 `kebab-case` 或 `camelCase`

### 2. 错误处理

- [ ] 所有 async 函数有 try-catch
- [ ] 后端使用 `next(error)` 传递错误
- [ ] 前端 Promise 有 `.catch()` 处理
- [ ] 用户输入有验证

### 3. API 规范

- [ ] 响应格式：`{ code, message, data }`
- [ ] 错误码有意义
- [ ] HTTP 状态码正确

### 4. 数据库操作

- [ ] 使用 Sequelize `include` 做关联查询
- [ ] 大批量操作使用事务
- [ ] 避免 N+1 查询

### 5. 安全检查

- [ ] 无硬编码密钥/密码
- [ ] 用户权限验证
- [ ] SQL 注入防护（Sequelize 自动处理）

### 6. 代码风格

- [ ] 2 空格缩进
- [ ] 单引号
- [ ] 无分号
- [ ] 中文注释

---

## 输出格式

```markdown
## 代码审查报告

### ✅ 通过项
- 命名规范正确
- 错误处理完整

### ⚠️ 警告项
- [文件:行号] 描述问题

### ❌ 必须修复
- [文件:行号] 描述问题

### 💡 建议改进
- 描述优化建议
```

---

## 关联文件

- [project_rules.md](../rules/project_rules.md) - 项目规范
- [02-数据库设计.md](../../设计文档/02-数据库设计.md) - 数据库设计
