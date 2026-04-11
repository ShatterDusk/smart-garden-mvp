# CI/CD 流水线准备指南

> 本文档指导如何为 PlantGPT 项目配置自动化流水线

---

## 一、前置检查清单

### 1.1 代码层面准备

- [x] **测试框架已配置** (Jest)
- [x] **测试覆盖率报告** (jest --coverage)
- [x] **代码规范工具** (ESLint + Prettier)
- [x] **环境变量管理** (.env.example)
- [ ] **构建脚本** (package.json scripts)
- [ ] **Docker 配置** (可选但推荐)

### 1.2 配置文件检查

```bash
# 必须存在的文件
backend/server/
├── .env.example          # 环境变量模板 ✅
├── .env.test            # 测试环境变量 ✅
├── jest.config.js       # Jest 配置 ✅
├── package.json         # 依赖和脚本 ✅
└── .eslintrc.js         # 代码规范 ✅
```

---

## 二、流水线阶段设计

### 2.1 推荐流水线流程

```
代码提交
    │
    ▼
┌─────────────────┐
│  Stage 1: 检出代码 │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Stage 2: 安装依赖 │
│  - npm ci       │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Stage 3: 代码检查 │
│  - ESLint       │
│  - Prettier     │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Stage 4: 单元测试 │
│  - npm run test:unit │
│  - 生成覆盖率报告   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Stage 5: 集成测试 │
│  - 启动测试数据库  │
│  - npm run test:integration │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Stage 6: 构建    │
│  - 编译/打包      │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Stage 7: 部署    │
│  - 部署到测试环境  │
│  - 部署到生产环境  │
└─────────────────┘
```

---

## 三、具体配置示例

### 3.1 GitHub Actions 配置

创建文件 `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ========== Stage 1-4: 代码检查和单元测试 ==========
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/server/package-lock.json
      
      - name: 安装依赖
        working-directory: backend/server
        run: npm ci
      
      - name: 代码规范检查
        working-directory: backend/server
        run: |
          npm run lint
          npm run format:check
      
      - name: 运行单元测试
        working-directory: backend/server
        run: npm run test:unit -- --coverage
      
      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
        with:
          directory: backend/server/coverage
          flags: unittests
          name: codecov-umbrella

  # ========== Stage 5: 集成测试 ==========
  integration-test:
    runs-on: ubuntu-latest
    needs: test
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test_password
          MYSQL_DATABASE: smart_garden_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/server/package-lock.json
      
      - name: 安装依赖
        working-directory: backend/server
        run: npm ci
      
      - name: 运行集成测试
        working-directory: backend/server
        env:
          DB_HOST: localhost
          DB_PORT: 3306
          DB_NAME: smart_garden_test
          DB_USER: root
          DB_PASSWORD: test_password
          JWT_SECRET: test_jwt_secret_for_ci
          NODE_ENV: test
        run: npm run test:integration

  # ========== Stage 6-7: 构建和部署 ==========
  deploy:
    runs-on: ubuntu-latest
    needs: [test, integration-test]
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
      
      - name: 部署到服务器
        # 根据你的部署方式配置
        run: |
          echo "部署脚本在这里"
```

### 3.2 GitLab CI 配置

创建文件 `.gitlab-ci.yml`:

```yaml
stages:
  - install
  - lint
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"
  NPM_CONFIG_CACHE: "$CI_PROJECT_DIR/.npm"

cache:
  paths:
    - backend/server/node_modules/
    - .npm/

# Stage 1: 安装依赖
install:
  stage: install
  image: node:$NODE_VERSION
  script:
    - cd backend/server
    - npm ci

# Stage 2: 代码检查
lint:
  stage: lint
  image: node:$NODE_VERSION
  needs: [install]
  script:
    - cd backend/server
    - npm run lint
    - npm run format:check

# Stage 3: 单元测试
unit-test:
  stage: test
  image: node:$NODE_VERSION
  needs: [install]
  script:
    - cd backend/server
    - npm run test:unit -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    paths:
      - backend/server/coverage/
    reports:
      coverage_report:
        coverage_format: cobertura
        path: backend/server/coverage/cobertura-coverage.xml

# Stage 4: 集成测试
integration-test:
  stage: test
  image: node:$NODE_VERSION
  services:
    - mysql:8.0
  variables:
    MYSQL_ROOT_PASSWORD: test_password
    MYSQL_DATABASE: smart_garden_test
    DB_HOST: mysql
    DB_PORT: 3306
    DB_USER: root
    DB_PASSWORD: test_password
    DB_NAME: smart_garden_test
    JWT_SECRET: test_jwt_secret_for_ci
    NODE_ENV: test
  needs: [install]
  script:
    - cd backend/server
    - npm run test:integration

# Stage 5: 构建
build:
  stage: build
  image: node:$NODE_VERSION
  needs: [unit-test, integration-test]
  script:
    - cd backend/server
    - npm run build
  artifacts:
    paths:
      - backend/server/dist/

# Stage 6: 部署
deploy:
  stage: deploy
  needs: [build]
  only:
    - main
  script:
    - echo "部署到生产环境"
```

---

## 四、需要补充的脚本

### 4.1 package.json 补充

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPatterns=unit",
    "test:integration": "jest --testPathPatterns=integration",
    "test:e2e": "jest --testPathPatterns=e2e",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "lint": "eslint src/ tests/",
    "lint:fix": "eslint src/ tests/ --fix",
    "format:check": "prettier --check src/ tests/",
    "format:write": "prettier --write src/ tests/",
    "build": "echo '构建命令在这里'",
    "start": "node src/app.js",
    "start:prod": "NODE_ENV=production node src/app.js"
  }
}
```

### 4.2 ESLint 配置检查

确保 `.eslintrc.js` 存在：

```javascript
module.exports = {
  env: {
    node: true,
    jest: true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    // 你的规则
  },
}
```

---

## 五、环境变量管理

### 5.1 CI/CD 环境变量配置

在流水线平台配置以下 Secrets：

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `DB_HOST` | 数据库主机 | ✅ |
| `DB_PASSWORD` | 数据库密码 | ✅ |
| `JWT_SECRET` | JWT 密钥 | ✅ |
| `WECHAT_APPID` | 微信 AppID | ❌ (测试用) |
| `WECHAT_SECRET` | 微信密钥 | ❌ (测试用) |
| `COS_BUCKET` | COS Bucket | ❌ (测试用) |
| `DEPLOY_KEY` | 部署密钥 | ❌ (部署用) |

### 5.2 测试环境隔离

```bash
# .env.test 已配置 ✅
NODE_ENV=test
DB_NAME=smart_garden_test
# ... 其他测试专用配置
```

---

## 六、质量门禁建议

### 6.1 合并前检查（PR Check）

```yaml
# 必须通过的检查
required_status_checks:
  - test (单元测试通过)
  - lint (代码规范通过)
  - coverage (覆盖率 > 60%)
```

### 6.2 覆盖率阈值

```javascript
// jest.config.js 补充
module.exports = {
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
}
```

---

## 七、下一步行动

1. **立即行动**
   - [ ] 选择 CI/CD 平台（GitHub Actions / GitLab CI / 其他）
   - [ ] 创建配置文件
   - [ ] 配置 Secrets

2. **本周完成**
   - [ ] 第一次流水线运行
   - [ ] 修复失败的测试（weatherService）
   - [ ] 配置覆盖率报告

3. **持续优化**
   - [ ] 添加构建阶段
   - [ ] 配置自动部署
   - [ ] 添加性能测试

---

## 八、参考资源

- [Jest CI 配置](https://jestjs.io/docs/continuous-integration)
- [GitHub Actions 文档](https://docs.github.com/cn/actions)
- [GitLab CI 文档](https://docs.gitlab.com/ee/ci/)
