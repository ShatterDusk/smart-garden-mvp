# 自动化测试规格文档

**文档版本**: 1.0  
**创建日期**: 2026-04-08  
**文档状态**: 已完成  

---

## 1. 测试策略

### 1.1 测试金字塔

```
        /\
       /  \     E2E 测试 (用户旅程)
      /____\        1 个测试文件
     /      \
    /   集成  \    Integration 测试 (API 端点)
   /    测试   \       5 个测试文件
  /____________\
 /              \
/     单元测试    \   Unit 测试 (函数/组件)
/_________________\      19 个测试文件
```

### 1.2 测试分层

| 层级 | 范围 | 数量 | 执行时间 | 目标 |
|------|------|------|---------|------|
| **Unit** | 函数、类、组件 | 335 个 | ~30s | 快速反馈 |
| **Integration** | API 端点 | 62 个 | ~20s | 接口正确性 |
| **E2E** | 用户完整流程 | - | ~5s | 业务流程 |

### 1.3 测试原则

1. **单元测试** - 每个函数/方法至少一个测试用例
2. **集成测试** - 每个 API 端点至少一个测试用例
3. **E2E 测试** - 每个核心用户流程一个测试用例
4. **Mock 外部依赖** - 数据库、外部 API、文件系统

---

## 2. 测试规范

### 2.1 文件命名规范

```
tests/
├── unit/
│   ├── controllers/{name}Controller.test.js    # 控制器测试
│   ├── services/{Name}Service.test.js          # 服务测试
│   ├── middleware/{name}.test.js               # 中间件测试
│   ├── utils/{name}.test.js                    # 工具测试
│   ├── security/{name}.test.js                 # 安全测试
│   └── edge-cases/{name}.test.js               # 边界测试
├── integration/api/{name}.test.js              # API 集成测试
└── e2e/{name}.test.js                          # E2E 测试
```

### 2.2 测试命名规范

```javascript
// describe 使用中文描述功能模块
describe('UserController', () => {
  // describe 使用中文描述功能点
  describe('login', () => {
    // it 使用中文描述测试场景
    it('新用户登录成功', async () => {
      // ...
    });
    
    it('老用户登录成功并更新信息', async () => {
      // ...
    });
    
    it('登录失败时调用 next(error)', async () => {
      // ...
    });
  });
});
```

### 2.3 Mock 规范

```javascript
// 1. 在导入被测模块前设置 Mock
jest.mock('../../../src/services', () => ({
  UserService: jest.fn(() => mockUserService),
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// 2. 导入被测模块
const userController = require('../../../src/controllers/userController');

// 3. 每个测试前清理 mocks
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 2.4 测试数据规范

```javascript
// 使用工厂函数创建测试数据
const mockUser = {
  user_id: 'USER_123',
  nickname: '测试用户',
  avatar_url: 'https://example.com/avatar.jpg',
  created_at: new Date(),
};

// 避免使用真实数据
// ❌ 不要这样
const realUser = await User.findOne({ where: { id: 1 } });

// ✅ 应该这样
const mockUser = { user_id: 'USER_TEST', nickname: 'Mock' };
User.findOne = jest.fn().mockResolvedValue(mockUser);
```

---

## 3. 覆盖率目标

### 3.1 当前覆盖率

| 模块 | 语句 | 分支 | 函数 | 行数 |
|------|------|------|------|------|
| **Controllers** | ~65% | ~55% | ~60% | ~65% |
| **Services** | ~52% | ~47% | ~62% | ~52% |
| **Middleware** | **80%** | **75%** | **91%** | **79%** |
| **Models** | **71%** | **100%** | **40%** | **71%** |
| **Utils** | ~26% | ~19% | ~41% | ~26% |
| **Jobs** | 0% | 0% | 0% | 0% |

### 3.2 目标覆盖率

| 模块 | 目标 | 优先级 |
|------|------|--------|
| Controllers | **>= 80%** | 🔴 高 |
| Services | **>= 70%** | 🔴 高 |
| Middleware | **>= 90%** | 🟡 中 |
| Models | **>= 80%** | 🟡 中 |
| Utils | **>= 50%** | 🟢 低 |
| Jobs | **>= 60%** | 🟢 低 |

---

## 4. 测试类型

### 4.1 单元测试

测试单个函数/方法的逻辑，Mock 所有依赖。

```javascript
describe('UserService', () => {
  it('createUser 应创建新用户', async () => {
    // Arrange
    const userData = { nickname: '张三' };
    User.create = jest.fn().mockResolvedValue({ user_id: 'USER_1' });
    
    // Act
    const result = await userService.createUser(userData);
    
    // Assert
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining(userData));
    expect(result.user_id).toBe('USER_1');
  });
});
```

### 4.2 集成测试

测试 API 端点，使用真实数据库（测试库）。

```javascript
describe('用户模块 API 测试', () => {
  it('POST /api/users/login - 登录成功', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({ code: 'test_code' });
    
    expect(response.status).toBe(200);
    expect(response.body.code).toBe(200);
    expect(response.body.data.token).toBeDefined();
  });
});
```

### 4.3 E2E 测试

测试完整用户流程。

```javascript
describe('用户旅程测试', () => {
  it('完整流程：登录 -> 创建植物 -> 创建会话 -> 发送消息', async () => {
    // 1. 登录
    // 2. 创建植物
    // 3. 创建会话
    // 4. 发送消息
    // 5. 验证结果
  });
});
```

### 4.4 特色测试

#### 安全性测试
- SQL 注入防护
- XSS 攻击防护
- 权限绕过防护
- DoS 攻击防护

#### 边界条件测试
- 字符串长度边界
- 数字范围边界
- 分页参数边界
- 数组长度边界
- 空值处理

---

## 5. 测试环境

### 5.1 环境配置

```bash
# .env.test
NODE_ENV=test
DB_HOST=localhost
DB_NAME=smart_garden_test
DB_USER=root
DB_PASSWORD=
DB_PORT=3306
```

### 5.2 数据库隔离

- 使用独立的测试数据库 `smart_garden_test`
- 每次测试前清理数据
- 使用事务回滚（可选）

### 5.3 全局设置

```javascript
// tests/setup/jest.setup.js
beforeAll(async () => {
  // 连接测试数据库
});

afterAll(async () => {
  // 关闭数据库连接
});
```

---

## 6. 测试工具

### 6.1 核心工具

| 工具 | 用途 | 版本 |
|------|------|------|
| **Jest** | 测试框架 | 30.3.0 |
| **Supertest** | HTTP 测试 | 7.0.0 |
| **Babel** | ES6+ 转译 | 7.x |

### 6.2 Mock 工具

```javascript
// Jest Mock
jest.mock('module');
jest.fn();
jest.spyOn(object, 'method');

// 恢复原始实现
jest.restoreAllMocks();
```

### 6.3 断言库

```javascript
// 基本断言
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeDefined();
expect(value).toBeNull();
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// 数字断言
expect(value).toBeGreaterThan(0);
expect(value).toBeLessThan(100);

// 字符串断言
expect(value).toMatch(/pattern/);
expect(value).toContain('substring');

// 数组断言
expect(array).toContain(item);
expect(array).toHaveLength(3);

// 对象断言
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// 异步断言
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(error);
```

---

## 7. 持续集成

### 7.1 CI 配置建议

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: smart_garden_test
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd backend/server && npm ci
      
      - name: Run tests
        run: cd backend/server && npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

### 7.2 质量门禁

- 测试通过率：**100%**
- 覆盖率阈值：**50%**（逐步提升）
- 代码风格：**ESLint 0 错误**

---

## 8. 附录

### 8.1 相关文档

- [README.md](./README.md) - 工作区说明
- [tasks.md](./tasks.md) - 任务清单
- [checklist.md](./checklist.md) - 检查清单

### 8.2 相关文件

- Jest 配置：`backend/server/jest.config.js`
- Babel 配置：`backend/server/babel.config.js`
- 测试目录：`backend/server/tests/`

---

*文档结束*
