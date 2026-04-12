# GitHub Branch Protection 配置指南

> 配置 PR 合并检查，确保代码质量

---

## 一、配置步骤

### 1. 打开仓库设置

1. 访问 GitHub 仓库页面
2. 点击 **Settings** 标签
3. 在左侧菜单选择 **Branches**

### 2. 添加分支保护规则

点击 **Add rule** 按钮，配置以下选项：

#### 基础配置

```
Branch name pattern: main
```

#### 保护选项

✅ **Require a pull request before merging**
- Require approvals: 1（建议至少1人审核）
- Dismiss stale PR approvals when new commits are pushed
- Require review from CODEOWNERS（如有配置）

✅ **Require status checks to pass before merging**
- Require branches to be up to date before merging

**Status checks that are required:**
```
☑️ Backend Lint
☑️ Backend Unit Tests
☑️ Backend Integration Tests
☑️ Backend Build
☑️ Test Summary
```

✅ **Require conversation resolution before merging**
- 确保所有评论都已解决

✅ **Include administrators**
- 管理员也需要遵守规则（建议）

### 3. 可选配置

#### 限制推送

```
✅ Restrict pushes that create files larger than 100 MB
```

#### 允许强制推送

```
❌ Allow force pushes（不建议）
```

#### 允许删除

```
❌ Allow deletions（不建议）
```

---

## 二、配置截图示例

```
┌─────────────────────────────────────────────────────────────┐
│  Branch protection rule                                       │
├─────────────────────────────────────────────────────────────┤
│  Branch name pattern: main                                    │
│                                                              │
│  ☑️ Require a pull request before merging                     │
│     ○ Require approvals: 1                                   │
│     ☑️ Dismiss stale PR approvals when new commits are pushed │
│                                                              │
│  ☑️ Require status checks to pass before merging              │
│     ☑️ Require branches to be up to date before merging       │
│                                                              │
│     Status checks that are required:                         │
│     ☑️ Backend Lint                                           │
│     ☑️ Backend Unit Tests                                     │
│     ☑️ Backend Integration Tests                              │
│     ☑️ Backend Build                                          │
│     ☑️ Test Summary                                           │
│                                                              │
│  ☑️ Require conversation resolution before merging            │
│                                                              │
│  ☑️ Include administrators                                    │
│                                                              │
│  ❌ Allow force pushes                                        │
│  ❌ Allow deletions                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、验证配置

### 1. 创建测试 PR

```bash
# 创建新分支
git checkout -b test-branch-protection

# 修改文件
echo "# Test" >> README.md

# 提交
git add .
git commit -m "test: branch protection"

# 推送
git push origin test-branch-protection
```

### 2. 在 GitHub 创建 PR

1. 访问仓库页面
2. 点击 **Pull requests** → **New pull request**
3. 选择 `test-branch-protection` → `main`
4. 创建 PR

### 3. 观察检查状态

在 PR 页面应该看到：

```
✅ All checks have passed
   ✅ Backend Lint — Passed
   ✅ Backend Unit Tests — Passed
   ✅ Backend Integration Tests — Passed
   ✅ Backend Build — Passed
   ✅ Test Summary — Passed

🔴 Merge pull request button is disabled until all checks pass
```

---

## 四、常见问题

### Q1: 检查项没有显示

**原因**: 需要先在 main 分支上运行一次 CI，GitHub 才能识别到这些检查项

**解决**:
```bash
# 推送代码触发 CI
git push origin main

# 或者在 GitHub 上手动触发
Actions → CI/CD Pipeline → Run workflow
```

### Q2: 某个检查项不需要

**解决**: 在 Branch Protection 设置中取消勾选对应的检查项

### Q3: 紧急情况下需要绕过检查

**解决**: 
1. 临时取消 "Include administrators" 选项
2. 或使用管理员权限强制合并（不推荐）

### Q4: 检查项名称不匹配

**注意**: 检查项名称必须与 `.github/workflows/ci.yml` 中的 `name` 字段完全一致

```yaml
# ci.yml
jobs:
  backend-unit-test:
    name: Backend Unit Tests  # ← 这个名称
```

---

## 五、其他分支配置

建议对以下分支都配置保护：

| 分支 | 配置 |
|------|------|
| `main` | 严格保护，需要审核 + 检查通过 |
| `master` | 同上（如果使用） |
| `develop` | 需要检查通过，可选审核 |
| `release/*` | 需要检查通过，必须审核 |

---

## 六、CODEOWNERS 配置（可选）

创建 `.github/CODEOWNERS` 文件：

```
# 全局默认审核人
* @your-username

# 后端代码
/backend/ @backend-lead

# 前端代码
/frontend/ @frontend-lead

# 文档
/docs/ @tech-writer

# CI/CD 配置
/.github/workflows/ @devops-lead
```

然后在 Branch Protection 中启用 **Require review from CODEOWNERS**

---

## 七、完成检查清单

- [ ] Branch Protection 规则已创建
- [ ] 需要的状态检查已选择
- [ ] 测试 PR 验证配置有效
- [ ] 团队成员已通知新流程
- [ ] 文档已更新（如需要）

---

**注意**: Branch Protection 只能在 GitHub 网站上配置，无法通过代码提交配置。
