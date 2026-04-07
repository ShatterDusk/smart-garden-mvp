# Test Generator Agent

测试生成 Agent，根据代码自动生成测试用例。

---

## 触发条件

- 新增 API 路由
- 修改 controller 逻辑
- 用户请求生成测试

---

## 测试类型

### 1. 单元测试 (Unit Tests)

**目标**：Controller 函数、Service 函数

**覆盖场景**：
- 正常流程
- 参数缺失
- 参数格式错误
- 数据不存在
- 权限不足

### 2. 集成测试 (Integration Tests)

**目标**：API 端点

**覆盖场景**：
- 完整请求流程
- 数据库事务
- 关联数据查询

---

## 测试模板

### Controller 测试模板

```javascript
const request = require('supertest');
const app = require('../src/app');
const { User, Plant } = require('../src/models');

describe('PlantController', () => {
  let testUser;
  let testToken;

  beforeEach(async () => {
    // 创建测试用户
    testUser = await User.create({
      user_id: 'TEST_USER_001',
      nickname: '测试用户',
      role: 'user'
    });
    testToken = generateToken(testUser);
  });

  afterEach(async () => {
    // 清理测试数据
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe('POST /api/plants', () => {
    it('应成功创建植物', async () => {
      const res = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          nickname: '小绿',
          plantCategory: 'foliage',
          species: '绿萝'
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.nickname).toBe('小绿');
    });

    it('缺少必填字段应返回错误', async () => {
      const res = await request(app)
        .post('/api/plants')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });
});
```

### Mock 数据模板

```javascript
const mockPlant = {
  plant_id: 'PLANT_TEST_001',
  user_id: 'TEST_USER_001',
  nickname: '测试植物',
  plant_category: 'foliage',
  species: '绿萝'
};

const mockUser = {
  user_id: 'TEST_USER_001',
  nickname: '测试用户',
  role: 'user'
};
```

---

## 输出格式

```markdown
## 测试生成报告

### 生成的测试文件
- `tests/controllers/plantController.test.js`

### 覆盖的 API
- POST /api/plants
- GET /api/plants/:id
- PUT /api/plants/:id
- DELETE /api/plants/:id

### 测试用例数量
- 正常流程: 4 个
- 异常流程: 6 个
- 边界情况: 2 个

### 运行测试
\`\`\`bash
npm test -- tests/controllers/plantController.test.js
\`\`\`
```

---

## 关联文件

- [jest.config.js](../../backend/server/jest.config.js) - Jest 配置
- [project_rules.md](../rules/project_rules.md) - 项目规范
