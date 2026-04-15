# 测试工作组工作区

> 负责 PlantGPT 项目的自动化测试体系建设

---

## 📁 工作区文件说明

| 文件 | 用途 |
|:---|:---|
| `change-log.md` | **变更记录** - 记录重要变更的业务/技术上下文，用于生成准确的 commit message |
| `.gitmessage-template` | **Commit 模板** - 规范的提交信息格式模板 |
| `test-coverage-report/` | 测试覆盖率报告（自动生成） |

---

## 🔄 工作流程

### 进行代码变更时

1. **变更前**：在 `change-log.md` 记录：
   - 变更类型（feat/fix/test/ci/docs）
   - 影响范围
   - **变更原因**（为什么需要这个变更）
   - 预期实现方式

2. **变更后**：补充记录：
   - 实际实现细节
   - 测试结果
   - 关联的 commit hash

3. **提交时**：参考 `change-log.md` 编写准确的 commit message

---

## 📝 Commit Message 规范

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 说明

| 类型 | 用途 |
|:---|:---|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（非 feat/fix） |
| `test` | 测试相关 |
| `chore` | 构建/工具/依赖 |
| `ci` | CI/CD 配置 |

### Scope 说明

- `backend` - 后端代码
- `frontend` - 前端代码
- `test` - 测试相关
- `ci` - CI/CD 配置
- `docs` - 文档

### 示例

```
ci(github): 添加并发控制避免重复 CI 运行

同一分支多次推送时，新的 workflow 会自动取消旧的运行，
节省 CI 资源并加快反馈速度。

- 添加 concurrency 配置
- 设置 cancel-in-progress: true

Refs: CI/CD 优化
```

---

## 📊 测试覆盖目标

| 模块 | 目标覆盖率 | 当前状态 |
|:---|:---|:---|
| Controllers | 80% | 🟡 ~60% |
| Services | 70% | 🟡 ~55% |
| Middleware | 70% | 🟢 ~75% |
| Utils | 60% | 🟢 ~65% |
| **整体** | **70%** | **🟡 ~60%** |

---

## 🔗 相关文档

- [测试文档](../../docs/current/06-testing/) - 项目测试文档目录
- [CI/CD 配置](../../.github/workflows/ci.yml) - GitHub Actions 配置
- [Branch Protection 指南](../../docs/current/07-operations/Branch-Protection-Setup.md) - 分支保护设置

---

**维护者**: AI 测试助手
**最后更新**: 2026-04-12
