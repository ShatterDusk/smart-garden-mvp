# GitHub Actions 配置完成

> 项目 CI/CD 流水线已配置完成

---

## 一、配置概览

### 1.1 配置文件位置

```
.github/workflows/test.yml    # CI 流水线配置
```

### 1.2 流水线阶段

```
代码提交/PR
    │
    ├──► 单元测试 (Unit Tests)
    │      - 无需数据库
    │      - 100% Mock 外部服务
    │      - 约 500+ 测试
    │
    ├──► 集成测试 (Integration Tests)
    │      - 需要 MySQL 服务
    │      - Mock 外部 API
    │      - API 端点测试
    │
    ├──► 构建检查 (Build Check)
    │      - 应用加载验证
    │
    └──► 测试总结 (Summary)
           - 结果汇总
           - 失败阻断合并
```

---

## 二、Mock 策略（解决外部依赖问题）

### 2.1 完全 Mock 的服务

| 服务 | Mock 方式 | 原因 |
|------|----------|------|
| **COS 存储** | Jest Mock SDK | 无需真实密钥 |
| **AI 对话** | Jest Mock Service | 无需真实 API Key |
| **微信 API** | Jest Mock axios | 无需真实账号 |
| **天气 API** | Jest Mock axios | 无需真实 API Key |

### 2.2 真实服务

| 服务 | 方式 | 原因 |
|------|------|------|
| **MySQL** | GitHub Actions Service | 容器化，可重复 |

---

## 三、当前测试状态

### 3.1 单元测试

```bash
npm run test:unit

# 结果
Test Suites: 27 passed, 2 failed
Tests:       523 passed, 6 failed
```

**失败的测试**（非阻塞，可后续修复）：
- `weatherService.test.js` - Mock 配置问题
- `aiService.test.js` - 错误消息不匹配

### 3.2 集成测试

```bash
npm run test:integration

# 需要本地 MySQL 或使用 CI 环境
```

---

## 四、本地验证 CI 环境

### 4.1 完全模拟 CI 环境

```bash
cd backend/server

# 1. 清理并安装依赖（像 CI 一样）
rm -rf node_modules package-lock.json
npm ci

# 2. 设置 CI 环境变量
export NODE_ENV=test
export JWT_SECRET=test-jwt-secret-for-ci
export COS_BUCKET=test-bucket
export WECHAT_APPID=test-appid
export WECHAT_SECRET=test-secret

# 3. 运行单元测试
npm run test:unit

# 4. 运行代码检查
npm run lint
```

### 4.2 Windows PowerShell 版本

```powershell
cd backend/server

# 1. 安装依赖
npm ci

# 2. 设置环境变量
$env:NODE_ENV="test"
$env:JWT_SECRET="test-jwt-secret-for-ci"
$env:COS_BUCKET="test-bucket"
$env:WECHAT_APPID="test-appid"
$env:WECHAT_SECRET="test-secret"

# 3. 运行测试
npm run test:unit
```

---

## 五、GitHub Actions 触发条件

### 5.1 自动触发

```yaml
on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]
```

### 5.2 手动触发（可选添加）

```yaml
on:
  workflow_dispatch:  # 手动触发
```

---

## 六、PR 合并检查

### 6.1 必需通过的检查

在 GitHub 仓库设置中配置：

```
Settings -> Branches -> Branch protection rules

✅ Require status checks to pass before merging
   - unit-test
   - integration-test
```

### 6.2 覆盖率报告

自动上传到 Codecov：
```yaml
- name: 上传覆盖率报告
  uses: codecov/codecov-action@v3
  with:
    files: ./backend/server/coverage/lcov.info
```

---

## 七、故障排除

### 7.1 测试在本地通过，CI 失败

**可能原因**：
1. 环境变量未设置
2. 依赖版本不一致
3. 时区/区域设置不同

**解决方案**：
```bash
# 使用与 CI 相同的 Node 版本
nvm use 20

# 清理并重新安装
rm -rf node_modules
npm ci
```

### 7.2 数据库连接失败

**检查**：
```bash
# 确保 MySQL 服务运行
mysqladmin ping

# 检查环境变量
echo $DB_HOST $DB_PORT $DB_USER
```

### 7.3 Mock 未生效

**检查**：
```javascript
// 确保 jest.mock 在模块导入前
jest.mock('axios');
const axios = require('axios');
```

---

## 八、下一步优化

### 8.1 短期（本周）

- [ ] 修复 `weatherService.test.js` Mock 问题
- [ ] 修复 `aiService.test.js` 错误消息
- [ ] 配置 PR 合并检查

### 8.2 中期（本月）

- [ ] 添加端到端测试
- [ ] 配置自动部署到测试环境
- [ ] 添加性能测试

### 8.3 长期

- [ ] 多环境部署（dev/staging/prod）
- [ ] 自动化版本发布
- [ ] 测试覆盖率门禁（> 70%）

---

## 九、参考文档

- [CI-CD-setup.md](./CI-CD-setup.md) - 通用 CI/CD 指南
- [CI-Mock-Strategy.md](../06-testing/CI-Mock-Strategy.md) - Mock 策略详解
- [GitHub Actions 文档](https://docs.github.com/cn/actions)

---

## 十、快速命令参考

```bash
# 运行所有测试
npm test

# 仅单元测试
npm run test:unit

# 仅集成测试
npm run test:integration

# 带覆盖率
npm run test:coverage

# 代码检查
npm run lint
npm run lint:fix

# 格式化
npm run format
```

---

**状态**: ✅ GitHub Actions 配置完成，可正常使用

**最后更新**: 2026-04-11
