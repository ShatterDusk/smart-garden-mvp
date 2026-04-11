# 单仓库多项目 CI 配置指南

> 适用于前后端在同一仓库的项目结构

---

## 一、项目结构

```
MVP/                          # 项目根目录
├── .github/workflows/        # CI 配置
│   └── ci.yml               # 主流水线
├── backend/                  # 后端代码
│   └── server/              # Node.js 服务
│       ├── package.json
│       ├── src/
│       └── tests/
├── frontend/                 # 前端代码（微信小程序）
│   ├── pages/
│   ├── components/
│   └── app.js
└── docs/                    # 文档
```

---

## 二、关键配置点

### 2.1 工作目录设置

```yaml
env:
  BACKEND_DIR: ./backend/server  # 定义后端目录

jobs:
  backend-test:
    steps:
    - name: 安装依赖
      working-directory: ${{ env.BACKEND_DIR }}  # 使用变量
      run: npm ci
```

### 2.2 缓存配置

```yaml
- name: 设置 Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
    cache-dependency-path: backend/server/package-lock.json  # 指定路径
```

### 2.3 路径引用

```yaml
# 覆盖率报告
- name: 上传覆盖率
  uses: codecov/codecov-action@v3
  with:
    files: ./backend/server/coverage/lcov.info

# 产物保存
- name: 保存报告
  uses: actions/upload-artifact@v4
  with:
    path: ${{ env.BACKEND_DIR }}/coverage/
```

---

## 三、多项目扩展

### 3.1 添加前端构建（示例）

```yaml
jobs:
  frontend-build:
    runs-on: ubuntu-latest
    name: Frontend Build
    
    steps:
    - name: 检出代码
      uses: actions/checkout@v4
    
    - name: 微信小程序检查
      working-directory: ./frontend
      run: |
        # 检查 app.json 格式
        node -e "JSON.parse(require('fs').readFileSync('./app.json'))"
        echo "✅ 小程序配置有效"
    
    - name: 检查代码规范
      run: |
        # 可以集成小程序 ESLint
        echo "前端代码检查完成"
```

### 3.2 添加文档构建

```yaml
  docs-build:
    runs-on: ubuntu-latest
    name: Documentation
    
    steps:
    - name: 检出代码
      uses: actions/checkout@v4
    
    - name: 检查文档链接
      uses: lycheeverse/lychee-action@v1
      with:
        args: ./docs/**/*.md
```

### 3.3 完整多项目流水线

```yaml
jobs:
  # 并行运行
  backend-test:
    # ...
  
  frontend-lint:
    # ...
  
  docs-check:
    # ...

  # 汇总结果
  final-check:
    needs: [backend-test, frontend-lint, docs-check]
    steps:
    - name: 检查所有任务
      run: |
        echo "后端: ${{ needs.backend-test.result }}"
        echo "前端: ${{ needs.frontend-lint.result }}"
        echo "文档: ${{ needs.docs-check.result }}"
```

---

## 四、环境变量管理

### 4.1 全局环境变量

```yaml
env:
  # 所有 job 都可以使用
  NODE_VERSION: '20'
  BACKEND_DIR: ./backend/server
```

### 4.2 Job 级别环境变量

```yaml
jobs:
  test:
    env:
      # 仅当前 job 可用
      DB_NAME: test_db
```

### 4.3 Step 级别环境变量

```yaml
steps:
- name: 运行测试
  env:
    # 仅当前 step 可用
    DEBUG: true
  run: npm test
```

### 4.4 Secrets 使用

```yaml
steps:
- name: 部署
  env:
    DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
    API_TOKEN: ${{ secrets.API_TOKEN }}
  run: |
    echo "$DEPLOY_KEY" | ssh-add -
    # 部署命令
```

---

## 五、条件执行

### 5.1 按文件路径触发

```yaml
on:
  push:
    paths:
      - 'backend/**'      # 只有后端代码变更时触发
      - '.github/workflows/**'
```

### 5.2 Job 级别条件

```yaml
jobs:
  backend-deploy:
    if: github.ref == 'refs/heads/main'
    # 只在 main 分支部署
```

### 5.3 Step 级别条件

```yaml
steps:
- name: 生产环境部署
  if: github.ref == 'refs/heads/main'
  run: echo "部署到生产环境"

- name: 测试环境部署
  if: github.ref == 'refs/heads/develop'
  run: echo "部署到测试环境"
```

---

## 六、产物管理

### 6.1 保存构建产物

```yaml
- name: 保存后端构建
  uses: actions/upload-artifact@v4
  with:
    name: backend-build
    path: |
      backend/server/dist/
      backend/server/package.json
    retention-days: 7
```

### 6.2 下载产物

```yaml
- name: 下载构建产物
  uses: actions/download-artifact@v4
  with:
    name: backend-build
    path: ./dist
```

---

## 七、矩阵构建（多版本测试）

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
    
    - run: npm test
```

---

## 八、常见问题

### 8.1 路径问题

**错误**:
```
Error: Cannot find module './package.json'
```

**解决**:
```yaml
- name: 安装依赖
  working-directory: ./backend/server  # 必须指定
  run: npm ci
```

### 8.2 缓存不生效

**解决**:
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: |
      backend/server/package-lock.json
      frontend/package-lock.json
```

### 8.3 环境变量未传递

**解决**:
```yaml
env:
  GLOBAL_VAR: "全局可用"

jobs:
  test:
    env:
      JOB_VAR: "当前 job 可用"
    steps:
    - env:
        STEP_VAR: "当前 step 可用"
      run: echo $GLOBAL_VAR $JOB_VAR $STEP_VAR
```

---

## 九、最佳实践

### 9.1 目录结构建议

```
项目根目录
├── .github/workflows/     # CI 配置
├── backend/              # 后端
├── frontend/             # 前端
├── shared/               # 共享代码（如有）
└── scripts/              # 构建脚本
    ├── build-backend.sh
    └── build-frontend.sh
```

### 9.2 命名规范

```yaml
# Job 命名
jobs:
  backend-unit-test:      # ✅ 清晰
  backend_unit_test:      # ❌ 避免下划线
  test:                   # ❌ 太笼统

# Artifact 命名
artifacts:
  backend-coverage-2024:  # ✅ 带版本/日期
  coverage:               # ❌ 容易冲突
```

### 9.3 失败处理

```yaml
steps:
- name: 可能失败的步骤
  continue-on-error: true  # 允许失败
  run: risky-command

- name: 后续步骤
  if: always()  # 即使前面失败也执行
  run: cleanup
```

---

## 十、参考配置

完整配置见：`.github/workflows/ci.yml`

关键特性：
- ✅ 单仓库多项目支持
- ✅ 工作目录自动切换
- ✅ 缓存优化
- ✅ 并行执行
- ✅ 产物保存
- ✅ 失败通知

---

**适用场景**：
- 前后端同仓库
- 微服务多包仓库
- 全栈项目
