# 自动化测试 - 检查清单

**文档版本**: 1.0  
**创建日期**: 2026-04-08  

---

## 测试执行检查清单

### 运行前检查

- [ ] 数据库服务已启动 (MySQL)
- [ ] 测试数据库 `smart_garden_test` 已创建
- [ ] `.env.test` 文件配置正确
- [ ] 依赖已安装 (`npm install`)

### 运行测试

```bash
cd backend/server

# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 生成覆盖率报告
npm run test:coverage
```

### 结果验证

- [ ] 所有测试通过 (Tests: XXX passed)
- [ ] 无未处理的异步操作警告
- [ ] 覆盖率报告已生成 (`coverage/lcov-report/index.html`)

---

## 新增测试检查清单

### 测试文件结构

- [ ] 文件放在正确的目录 (`tests/unit/` 或 `tests/integration/`)
- [ ] 文件名符合规范 (`{name}.test.js`)
- [ ] 使用正确的相对路径导入被测模块

### 测试代码规范

- [ ] 使用 `describe` 组织测试模块
- [ ] 使用 `it` 描述测试场景（中文）
- [ ] 使用 `beforeEach` 清理 mocks
- [ ] Mock 外部依赖（数据库、API、文件系统）
- [ ] 测试数据使用工厂函数创建

### Mock 设置

- [ ] `jest.mock()` 在导入被测模块之前
- [ ] 每个测试后调用 `jest.clearAllMocks()`
- [ ] 不要 mock 被测模块本身

### 断言使用

- [ ] 使用 `expect().toBe()` 进行精确比较
- [ ] 使用 `expect().toEqual()` 进行对象比较
- [ ] 使用 `expect().toHaveBeenCalled()` 验证函数调用
- [ ] 异步测试使用 `async/await`

---

## 覆盖率检查清单

### 语句覆盖率 (Statements)

- [ ] 每行代码至少被执行一次
- [ ] 条件分支都被覆盖
- [ ] 异常处理代码被测试

### 分支覆盖率 (Branches)

- [ ] if/else 两个分支都被测试
- [ ] switch 所有 case 都被测试
- [ ] 三元运算符两个结果都被测试

### 函数覆盖率 (Functions)

- [ ] 每个函数都被调用
- [ ] 回调函数被测试
- [ ] 异步函数被测试

### 行覆盖率 (Lines)

- [ ] 所有可执行行都被执行
- [ ] 无未覆盖的死代码

---

## 代码质量检查清单

### 测试质量

- [ ] 测试独立，不依赖其他测试
- [ ] 测试可重复执行
- [ ] 测试运行速度快 (< 100ms)
- [ ] 测试描述清晰准确

### 代码规范

- [ ] 使用 2 空格缩进
- [ ] 使用单引号
- [ ] 无分号
- [ ] 注释使用中文

### 安全性

- [ ] 不测试真实用户数据
- [ ] 不硬编码敏感信息
- [ ] Mock 外部 API 调用

---

## 问题记录

### 已知问题

| 问题 | 状态 | 解决方案 |
|------|------|---------|
| 无 | - | - |

### 待解决问题

| 问题 | 优先级 | 负责人 | 截止日期 |
|------|--------|--------|---------|
| 无 | - | - | - |

---

## 附录

### 常用命令

```bash
# 运行单个测试文件
npm run test:unit -- userController.test.js

# 运行匹配名称的测试
npm run test:unit -- --testNamePattern="登录"

# 运行测试并显示详细信息
npm run test:unit -- --verbose

# 运行测试并检测未关闭的句柄
npm run test:unit -- --detectOpenHandles
```

### 覆盖率阈值配置

在 `jest.config.js` 中配置：

```javascript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50
  }
}
```

---

*文档结束*
